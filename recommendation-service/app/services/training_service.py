import logging
import time
import pandas as pd
import numpy as np
import json
import scipy.sparse as sparse
import implicit
from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.core.config import settings

logger = logging.getLogger(__name__)

async def train_als_model():
    """
    ALS collaborative filtering training pipeline.

    Steps:
        1. Fetch all (userId, bookId, totalScore) rows from MongoDB.
        2. Clamp negative scores to 0 (ALS requires non-negative confidence values).
        3. Build a sparse item-user matrix and train the ALS model.
        4. Generate top-N recommendations for every user.
        5. Persist results to Redis with a configurable TTL so stale data
           automatically expires when no new training runs.

    No min-data guard: training can be triggered at any time regardless of
    how little data exists. ALS will simply produce low-quality recommendations
    until the dataset grows — which is acceptable behaviour.
    """
    start = time.monotonic()
    logger.info("ALS training started.")

    db = MongoDBClient.get_db()

    # 1. Fetch interaction data
    cursor = db.user_item_scores.find({})
    data = await cursor.to_list(length=None)

    if not data:
        logger.warning("No interaction data found — skipping training.")
        return {"status": "skipped", "reason": "No data"}

    df = pd.DataFrame(data)

    # 2. Clamp negative totalScore values to 0.
    #    Negative scores (e.g. from RATING=1 → -2) are meaningful for filtering
    #    already-liked items, but ALS uses them as *confidence weights* which
    #    must be non-negative. We set negative confidence to 0 (= "no signal")
    #    rather than dropping the row, so the item-user pair still exists in
    #    the matrix and filter_already_liked_items can work correctly.
    df['totalScore'] = df['totalScore'].clip(lower=0.0)

    # 3. Map string IDs → integer codes for sparse matrix indexing
    df['user_cat'] = df['userId'].astype("category")
    df['item_cat'] = df['bookId'].astype("category")

    user_categories = df['user_cat'].cat.categories   # index → userId
    item_categories = df['item_cat'].cat.categories   # index → bookId

    user_codes = df['user_cat'].cat.codes
    item_codes = df['item_cat'].cat.codes

    n_users = len(user_categories)
    n_items = len(item_categories)

    # Build sparse item-user matrix (implicit library expects item × user)
    sparse_item_user = sparse.csr_matrix(
        (df['totalScore'].astype(float), (item_codes, user_codes)),
        shape=(n_items, n_users),
    )

    # 4. Train ALS model
    # factors=50: latent dimension (balance quality vs memory)
    # iterations=20: enough for convergence on moderate datasets
    # regularization=0.1: L2 penalty to prevent overfitting
    # calculate_training_loss=False: faster training (no extra pass)
    model = implicit.als.AlternatingLeastSquares(
        factors=50,
        regularization=0.1,
        iterations=20,
        calculate_training_loss=False,
    )
    model.fit(sparse_item_user)
    logger.info("ALS model training complete in %.1fs. Users=%d Items=%d",
                time.monotonic() - start, n_users, n_items)

    # 5. Generate recommendations and store in Redis
    redis = RedisClient.get_client()
    sparse_user_item = sparse_item_user.T.tocsr()

    pipeline = redis.pipeline()
    users_processed = 0
    BATCH_SIZE = 500  # flush pipeline every N users to balance memory & RTT

    for user_i, user_id_str in enumerate(user_categories):
        num_recs = min(20, n_items)

        try:
            ids, _scores = model.recommend(
                user_i,
                sparse_user_item[user_i],
                N=num_recs,
                filter_already_liked_items=(n_items > 1),
            )
        except IndexError:
            # Edge case: implicit 0.7.x topk bug on tiny datasets.
            # Graceful degradation: recommend items the user hasn't interacted with.
            interacted = set(df[df['user_cat'].cat.codes == user_i]['item_cat'].cat.codes.tolist())
            candidates = list(set(range(n_items)) - interacted) if n_items > 1 else list(range(n_items))
            ids = candidates[:num_recs]
            if not ids:
                continue

        recommended_ids = [str(item_categories[i]) for i in ids]
        redis_key = f"rec:{user_id_str}"

        # Store as JSON with expiry so stale recommendations don't persist forever.
        pipeline.set(redis_key, json.dumps(recommended_ids), ex=settings.REDIS_TTL_SECONDS)

        users_processed += 1

        if users_processed % BATCH_SIZE == 0:
            await pipeline.execute()
            pipeline = redis.pipeline()
            logger.debug("Flushed %d recommendation batches...", users_processed)

    # Flush remaining
    if users_processed % BATCH_SIZE != 0:
        await pipeline.execute()

    elapsed = time.monotonic() - start
    logger.info(
        "ALS training pipeline complete. users_processed=%d elapsed=%.1fs",
        users_processed, elapsed,
    )
    return {"status": "success", "users_processed": users_processed, "elapsed_seconds": round(elapsed, 1)}
