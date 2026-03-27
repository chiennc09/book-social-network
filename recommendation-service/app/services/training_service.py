"""
Hybrid Training Service — 2-Stage Recommendation Pipeline.

Stage 1 (Collaborative Filtering — ALS):
  Reads user_item_scores from MongoDB, trains an ALS model, and produces
  top-50 candidate bookIds per user along with normalized confidence scores.

Stage 2 (Content-Based Re-ranking — CBF):
  Builds a User Content Profile (mean embedding of user's top interacted books)
  from Qdrant and re-ranks the ALS candidates using a weighted blend:

      final_score = HYBRID_ALS_WEIGHT * als_score + HYBRID_CBF_WEIGHT * cosine_sim

  The top-20 re-ranked bookIds are stored in Redis with a configurable TTL.

Cold-start Handling:
  - >= COLD_START_THRESHOLD interactions → CBF-only (no ALS).
  - <  COLD_START_THRESHOLD interactions → skip (caller falls back to trending).
"""
import logging
import json
import asyncio
import numpy as np
import pandas as pd
import scipy.sparse as sparse
import implicit

from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.core.config import settings
from app.services.embedding_service import (
    build_user_content_profile,
    rerank_candidates,
    cbf_recommendations_for_user,
)

logger = logging.getLogger(__name__)

# How many ALS candidates to generate before re-ranking
_ALS_CANDIDATE_COUNT = 50
# Final recommendations stored per user
_TOP_K = 20


async def train_hybrid_model() -> dict:
    """
    Full offline training job.
    Returns a summary dict with stats about the run.
    """
    logger.info("=== Hybrid training job started ===")
    db = MongoDBClient.get_db()

    # ------------------------------------------------------------------
    # 1. Load raw interaction data
    # ------------------------------------------------------------------
    cursor = db.user_item_scores.find({})
    data = await cursor.to_list(length=None)

    if not data:
        logger.warning("No user_item_scores found — training skipped.")
        return {"status": "skipped", "reason": "no_data"}

    df = pd.DataFrame(data)
    # Ensure required columns exist
    for col in ("userId", "bookId", "totalScore"):
        if col not in df.columns:
            logger.error(f"Missing column '{col}' in user_item_scores.")
            return {"status": "error", "reason": f"missing_column_{col}"}

    # ------------------------------------------------------------------
    # 2. Build sparse user-item matrix for ALS
    # ------------------------------------------------------------------
    df["user_cat"] = df["userId"].astype("category")
    df["item_cat"] = df["bookId"].astype("category")
    user_categories = df["user_cat"].cat.categories
    item_categories = df["item_cat"].cat.categories
    df["user_code"] = df["user_cat"].cat.codes
    df["item_code"] = df["item_cat"].cat.codes

    n_users = len(user_categories)
    n_items = len(item_categories)

    sparse_item_user = sparse.csr_matrix(
        (df["totalScore"].astype(float), (df["item_code"], df["user_code"])),
        shape=(n_items, n_users),
    )
    sparse_user_item = sparse_item_user.T.tocsr()

    # ------------------------------------------------------------------
    # 3. Train ALS model
    # ------------------------------------------------------------------
    # Reduce factors if we have very few items to prevent shape errors
    effective_factors = min(50, n_items - 1, n_users - 1)
    if effective_factors < 1:
        logger.warning("Dataset too small for ALS — falling back to CBF-only for all users.")
        return await _run_cbf_only_for_all(df, user_categories)

    model = implicit.als.AlternatingLeastSquares(
        factors=effective_factors,
        regularization=0.1,
        iterations=20,
        calculate_training_loss=True,
        num_threads=1,  # Avoid OpenBLAS multi-thread warning in containers
    )
    model.fit(sparse_item_user)
    logger.info("ALS model training complete.")

    # ------------------------------------------------------------------
    # 4. For each user: generate ALS candidates → CBF re-rank → Redis
    # ------------------------------------------------------------------
    redis = RedisClient.get_client()
    users_processed = 0

    # Normalise ALS scores to [0, 1] for fair blending with cosine similarity
    # We'll compute this per-user below using per-user max

    # Batch CBF calls with asyncio.gather for efficiency
    tasks = [
        _process_user(
            user_i=user_i,
            user_id_str=str(user_id_str),
            model=model,
            sparse_user_item=sparse_user_item,
            item_categories=item_categories,
            df=df,
        )
        for user_i, user_id_str in enumerate(user_categories)
    ]

    BATCH = 50  # Process 50 users in parallel to bound memory usage
    all_results: list[tuple[str, list[str]]] = []
    for i in range(0, len(tasks), BATCH):
        batch = tasks[i : i + BATCH]
        batch_results = await asyncio.gather(*batch, return_exceptions=True)
        for res in batch_results:
            if isinstance(res, Exception):
                logger.error(f"User processing error: {res}")
            elif res:
                all_results.append(res)
        logger.info(f"Processed {min(i + BATCH, len(tasks))}/{len(tasks)} users.")

    # Write everything to Redis in a pipeline
    pipe = redis.pipeline()
    for user_id_str, rec_list in all_results:
        pipe.set(f"rec:{user_id_str}", json.dumps(rec_list), ex=settings.REDIS_TTL_SECONDS)
        users_processed += 1

    if users_processed > 0:
        await pipe.execute()

    logger.info(f"=== Hybrid training job done. {users_processed} users updated. ===")
    return {"status": "success", "users_processed": users_processed}


async def _process_user(
    user_i: int,
    user_id_str: str,
    model,
    sparse_user_item: sparse.csr_matrix,
    item_categories,
    df: pd.DataFrame,
) -> tuple[str, list[str]] | None:
    """
    Generate and cache recommendations for a single user.
    Returns (user_id_str, [bookId, ...]) or None on failure.
    """
    n_items = len(item_categories)
    n_candidates = min(_ALS_CANDIDATE_COUNT, n_items)

    # --- ALS Stage ---
    try:
        ids, raw_scores = model.recommend(
            user_i,
            sparse_user_item[user_i],
            N=n_candidates,
            filter_already_liked_items=(n_items > 1),
        )
    except IndexError:
        logger.debug(f"ALS IndexError for user {user_id_str} (dataset too small). Using CBF fallback.")
        ids, raw_scores = np.array([]), np.array([])

    candidate_ids = [str(item_categories[i]) for i in ids]

    # Normalise raw ALS scores to [0, 1]
    if len(raw_scores) > 0:
        max_score = float(raw_scores.max()) if raw_scores.max() > 0 else 1.0
        als_score_map = {
            str(item_categories[i]): float(s) / max_score
            for i, s in zip(ids, raw_scores)
        }
    else:
        als_score_map = {}

    # --- CBF Re-ranking Stage ---
    # Get the top-20 books this user has previously interacted with for profile building
    user_df = df[df["userId"] == user_id_str].nlargest(20, "totalScore")
    user_book_ids = user_df["bookId"].tolist()

    if not candidate_ids:
        # ALS failed — pure CBF for this user
        recs = await cbf_recommendations_for_user(user_book_ids, limit=_TOP_K)
        return (user_id_str, recs) if recs else None

    # Build content profile and re-rank
    try:
        profile = await build_user_content_profile(user_book_ids)
        if profile is not None:
            re_ranked = await rerank_candidates(candidate_ids, als_score_map, profile)
        else:
            re_ranked = candidate_ids  # Qdrant not ready yet; fall back to ALS order
    except Exception as exc:
        logger.warning(f"Re-ranking failed for user {user_id_str}: {exc}. Using ALS order.")
        re_ranked = candidate_ids

    return (user_id_str, re_ranked[:_TOP_K])


async def _run_cbf_only_for_all(df: pd.DataFrame, user_categories) -> dict:
    """
    Fallback: run CBF-only recommendations when the dataset is too small for ALS.
    """
    redis = RedisClient.get_client()
    pipe = redis.pipeline()
    count = 0

    for user_id_str in user_categories:
        user_df = df[df["userId"] == str(user_id_str)].nlargest(20, "totalScore")
        user_book_ids = user_df["bookId"].tolist()
        if len(user_book_ids) >= settings.COLD_START_THRESHOLD:
            recs = await cbf_recommendations_for_user(user_book_ids, limit=_TOP_K)
            if recs:
                pipe.set(f"rec:{user_id_str}", json.dumps(recs), ex=settings.REDIS_TTL_SECONDS)
                count += 1

    if count > 0:
        await pipe.execute()

    logger.info(f"CBF-only run complete. {count} users updated.")
    return {"status": "success_cbf_only", "users_processed": count}
