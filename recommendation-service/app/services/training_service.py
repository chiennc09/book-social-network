import logging
import pandas as pd
import numpy as np
import json
import scipy.sparse as sparse
import implicit
from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient

logger = logging.getLogger(__name__)

async def train_als_model():
    logger.info("Starting ALS model training...")
    db = MongoDBClient.get_db()
    
    # 1. Fetch data from MongoDB
    cursor = db.user_item_scores.find({})
    data = await cursor.to_list(length=None)
    
    if not data:
        logger.warning("No data found for training.")
        return {"status": "skipped", "reason": "No data"}
        
    df = pd.DataFrame(data)
    
    # 2. Map string IDs to integer IDs for sparse matrix
    df['user_id'] = df['userId'].astype("category")
    df['item_id'] = df['bookId'].astype("category")
    
    user_cat = df['user_id'].cat.categories
    item_cat = df['item_id'].cat.categories
    
    df['user_code'] = df['user_id'].cat.codes
    df['item_code'] = df['item_id'].cat.codes
    
    # Create sparse matrix: item_code x user_code (implicit expects item-user matrix)
    sparse_item_user = sparse.csr_matrix(
        (df['totalScore'].astype(float), (df['item_code'], df['user_code'])),
        shape=(len(item_cat), len(user_cat))
    )
    
    # 3. Train the model
    # factors: Number of latent factors, iterations: number of passes, regularization: prevent overfitting
    model = implicit.als.AlternatingLeastSquares(factors=50, regularization=0.1, iterations=20, calculate_training_loss=True)
    
    # Train
    model.fit(sparse_item_user)
    logger.info("Model training completed.")
    
    # 4. Generate recommendations for all users and save to Redis
    redis = RedisClient.get_client()
    
    sparse_user_item = sparse_item_user.T.tocsr()
    
    pipeline = redis.pipeline()
    users_processed = 0
    
    for user_i, user_id_str in enumerate(user_cat):
        # We must ensure N does not exceed the total number of items to prevent IndexError
        num_items_to_recommend = min(20, len(item_cat))
        
        # If the user has interacted with all available items, we can't filter out liked ones
        filter_liked = (len(item_cat) > 1)

        try:
            ids, scores = model.recommend(
                user_i, 
                sparse_user_item[user_i], 
                N=num_items_to_recommend, 
                filter_already_liked_items=filter_liked
            )
        except IndexError:
            # Bug in implicit 0.7.2 topk when dataset is extremely small (e.g., 2 items).
            # Fallback: Just get all items they haven't interacted with, or all items if none left
            user_interacted = set(df[df['user_code'] == user_i]['item_code'].tolist())
            all_items = set(range(len(item_cat)))
            candidates = list(all_items - user_interacted) if filter_liked else list(all_items)
            
            # Simply pick top N from candidates (up to available)
            ids = candidates[:num_items_to_recommend]
            if not ids:
                 continue
        
        # map item_code back to bookId
        recommended_book_ids = [str(item_cat[item_i]) for item_i in ids]
        
        # save to redis
        redis_key = f"rec:{user_id_str}"
        pipeline.set(redis_key, json.dumps(recommended_book_ids))
        
        users_processed += 1
        
        if users_processed % 1000 == 0:
            await pipeline.execute()
            pipeline = redis.pipeline()
            
    # Execute remaining
    if users_processed % 1000 != 0:
        await pipeline.execute()

    logger.info(f"Generated updates for {users_processed} users.")
    return {"status": "success", "users_processed": users_processed}
