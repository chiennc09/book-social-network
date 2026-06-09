"""
Hybrid Training Service — 2-Stage Recommendation Pipeline.

Stage 1 (Collaborative Filtering — ALS):
  Reads user_item_scores from MongoDB, trains an ALS model, and produces
  top-N candidate bookIds per user along with normalized confidence scores.

Stage 2 (Content-Based Re-ranking — CBF):
  Builds a User Content Profile (mean embedding of user's highest-scored books)
  from Qdrant and re-ranks ALS candidates using a weighted blend:

      final_score = ALS_WEIGHT * als_score + CBF_WEIGHT * cosine_sim

  The top-K re-ranked bookIds (excluding books already read by the user)
  are stored in Redis with a configurable TTL.

Cold-start Handling:
  - >= ALS_MIN_INTERACTIONS + after training cycle → Full Hybrid
  - >= COLD_START_THRESHOLD (but < ALS_MIN_INTERACTIONS) → CBF-only path at request time
  - < COLD_START_THRESHOLD → Trending (handled at request time, not here)
"""
from __future__ import annotations

import asyncio
import json
import logging

import implicit
import numpy as np
import pandas as pd
import scipy.sparse as sparse

from app.core.config import settings
from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.services.embedding_service import (
    build_user_content_profile,
    cbf_recommendations_for_user,
    rerank_candidates,
)
from app.services.interaction_service import get_read_book_ids

logger = logging.getLogger(__name__)


# ─── Main training entry point ─────────────────────────────────────────────────

async def train_hybrid_model() -> dict:
    """
    Full offline training job (runs every TRAINING_CRON_HOURS hours).

    Flow:
      1. Load all user_item_scores from MongoDB.
      2. Build sparse user-item matrix.
      3. Train ALS model.
      4. For each user: ALS candidates → CBF re-rank → filter read books → Redis.
      5. Compute global trending → Redis.

    Returns a summary dict with job statistics.
    """
    logger.info("=== Hybrid training job started ===")
    db = MongoDBClient.get_db()

    # ------------------------------------------------------------------
    # 1. Load raw interaction data
    # ------------------------------------------------------------------
    cursor = db.user_item_scores.find({}, {"userId": 1, "bookId": 1, "totalScore": 1, "_id": 0})
    data = await cursor.to_list(length=None)

    if not data:
        logger.warning("No user_item_scores found — training skipped.")
        return {"status": "skipped", "reason": "no_data"}

    df = pd.DataFrame(data)
    for col in ("userId", "bookId", "totalScore"):
        if col not in df.columns:
            return {"status": "error", "reason": f"missing_column_{col}"}

    # ------------------------------------------------------------------
    # 2. Compute and cache global trending (most interacted books globally)
    # ------------------------------------------------------------------
    await _cache_global_trending(df)

    # ------------------------------------------------------------------
    # 3. Filter users with enough data for ALS
    # ------------------------------------------------------------------
    user_counts = df.groupby("userId").size()
    als_eligible = set(user_counts[user_counts >= settings.ALS_MIN_INTERACTIONS].index)

    if not als_eligible:
        logger.info("No users meet ALS threshold — running CBF-only for all qualifying users.")
        return await _run_cbf_only_for_qualifying(df)

    # Subset to ALS-eligible users
    df_als = df[df["userId"].isin(als_eligible)].copy()
    n_users = df_als["userId"].nunique()
    n_items = df_als["bookId"].nunique()

    if n_users < 2 or n_items < 2:
        # FIX: Dataset quá nhỏ cho ALS (vd: chỉ có 1 user đủ điều kiện).
        # Thay vì skip hoàn toàn, chạy CBF-only cho toàn bộ user đủ điều kiện
        # (bao gồm cả user đạt ALS_MIN_INTERACTIONS nhưng ALS không thể chạy).
        logger.warning(
            "Dataset too small for ALS (users=%d, items=%d) — CBF-only fallback for ALL qualifying users.",
            n_users, n_items,
        )
        return await _run_cbf_only_for_qualifying(df)

    # ------------------------------------------------------------------
    # 4. Build sparse matrix & train ALS
    # ------------------------------------------------------------------
    df_als["user_cat"] = df_als["userId"].astype("category")
    df_als["item_cat"] = df_als["bookId"].astype("category")
    user_categories = df_als["user_cat"].cat.categories
    item_categories = df_als["item_cat"].cat.categories

    df_als["user_code"] = df_als["user_cat"].cat.codes
    df_als["item_code"] = df_als["item_cat"].cat.codes

    sparse_item_user = sparse.csr_matrix(
        (df_als["totalScore"].astype(float), (df_als["item_code"], df_als["user_code"])),
        shape=(n_items, n_users),
    )
    sparse_user_item = sparse_item_user.T.tocsr()

    effective_factors = min(64, n_items - 1, n_users - 1)
    model = implicit.als.AlternatingLeastSquares(
        factors=effective_factors,
        regularization=0.05,
        iterations=30,
        calculate_training_loss=False,
        num_threads=1,
    )
    model.fit(sparse_item_user)
    logger.info("ALS training complete (factors=%d, users=%d, items=%d).", effective_factors, n_users, n_items)

    # ------------------------------------------------------------------
    # 5. Per-user: ALS candidates → CBF re-rank → filter read → Redis
    # ------------------------------------------------------------------
    tasks = [
        _process_als_user(
            user_i=user_i,
            user_id=str(uid),
            model=model,
            sparse_user_item=sparse_user_item,
            item_categories=item_categories,
            df=df,                 # use full df for user's top books profile
        )
        for user_i, uid in enumerate(user_categories)
    ]

    redis = RedisClient.get_client()
    pipe = redis.pipeline()
    users_ok = 0

    BATCH = 50
    for i in range(0, len(tasks), BATCH):
        batch_results = await asyncio.gather(*tasks[i:i + BATCH], return_exceptions=True)
        for res in batch_results:
            if isinstance(res, Exception):
                logger.error("User processing error: %s", res)
            elif res:
                user_id, rec_list = res
                pipe.set(f"rec:{user_id}", json.dumps(rec_list), ex=settings.REDIS_REC_TTL_SECONDS)
                users_ok += 1
        logger.info("ALS training: processed %d/%d users.", min(i + BATCH, len(tasks)), len(tasks))

    if users_ok > 0:
        await pipe.execute()

    logger.info("=== ALS Hybrid training done: %d users updated. ===", users_ok)

    # ------------------------------------------------------------------
    # 6. CBF-only pass for users who have >= COLD_START_THRESHOLD but
    #    < ALS_MIN_INTERACTIONS — these users were excluded from ALS but
    #    still deserve a pre-computed long-term list so they don't rely
    #    on the slower real-time CBF fallback at request time.
    # ------------------------------------------------------------------
    cbf_only_users = set(
        user_counts[
            (user_counts >= settings.COLD_START_THRESHOLD) &
            (user_counts < settings.ALS_MIN_INTERACTIONS)
        ].index
    )
    if cbf_only_users:
        df_cbf = df[df["userId"].isin(cbf_only_users)]
        cbf_count = await _run_cbf_only_for_qualifying(df_cbf)
        logger.info("CBF-only pass complete for %s sub-threshold users.", cbf_only_users)
    else:
        cbf_count = {"users_processed": 0}

    logger.info("=== Hybrid training fully done: ALS=%d, CBF=%s users. ===",
                users_ok, cbf_count.get("users_processed", 0))
    return {"status": "success", "users_processed": users_ok, "cbf_users": cbf_count.get("users_processed", 0)}


# ─── Per-user ALS + CBF pipeline ──────────────────────────────────────────────

async def _process_als_user(
    user_i: int,
    user_id: str,
    model,
    sparse_user_item: sparse.csr_matrix,
    item_categories,
    df: pd.DataFrame,
) -> tuple[str, list[str]] | None:
    n_items = len(item_categories)
    n_candidates = min(settings.ALS_CANDIDATE_COUNT, n_items)

    # ALS: generate candidates
    try:
        ids, raw_scores = model.recommend(
            user_i,
            sparse_user_item[user_i],
            N=n_candidates,
            filter_already_liked_items=False,
        )
    except (IndexError, Exception) as exc:
        logger.debug("ALS error for user %s: %s — falling back to CBF.", user_id, exc)
        ids, raw_scores = np.array([]), np.array([])

    candidate_ids = [str(item_categories[i]) for i in ids]

    # Normalize ALS scores to [0, 1]
    if len(raw_scores) > 0:
        max_s = float(raw_scores.max()) or 1.0
        als_score_map = {
            str(item_categories[i]): float(s) / max_s
            for i, s in zip(ids, raw_scores)
        }
    else:
        als_score_map = {}

    # User's top-interacted books for profile building (from full df)
    user_df = df[df["userId"] == user_id].nlargest(20, "totalScore")
    user_book_ids = user_df["bookId"].tolist()

    # Fallback: no ALS candidates → pure CBF
    if not candidate_ids:
        recs = await cbf_recommendations_for_user(user_book_ids, limit=settings.TOP_K_LONG_TERM)
    else:
        # CBF re-ranking
        try:
            profile = await build_user_content_profile(user_book_ids)
            if profile is not None:
                re_ranked = await rerank_candidates(candidate_ids, als_score_map, profile)
            else:
                re_ranked = candidate_ids
        except Exception as exc:
            logger.warning("Re-ranking failed for user %s: %s — using ALS order.", user_id, exc)
            re_ranked = candidate_ids
        recs = re_ranked[:settings.TOP_K_LONG_TERM]

    if not recs:
        return None

    # Filter already-read books
    read_ids = await get_read_book_ids(user_id)
    recs = [b for b in recs if b not in read_ids]

    return (user_id, recs) if recs else None


# ─── CBF-only fallback for users below ALS threshold ──────────────────────────

async def _run_cbf_only_for_qualifying(df: pd.DataFrame) -> dict:
    """
    Run pure CBF for all users with >= COLD_START_THRESHOLD interactions
    (used when ALS cannot run: too few data or ALS failed).
    """
    redis = RedisClient.get_client()
    pipe = redis.pipeline()
    count = 0

    qualifying = (
        df.groupby("userId")
        .filter(lambda g: len(g) >= settings.COLD_START_THRESHOLD)["userId"]
        .unique()
    )

    for user_id in qualifying:
        user_id = str(user_id)
        user_df = df[df["userId"] == user_id].nlargest(20, "totalScore")
        user_book_ids = user_df["bookId"].tolist()
        if not user_book_ids:
            continue
        recs = await cbf_recommendations_for_user(user_book_ids, limit=settings.TOP_K_LONG_TERM)
        if recs:
            read_ids = await get_read_book_ids(user_id)
            recs = [b for b in recs if b not in read_ids]
        if recs:
            pipe.set(f"rec:{user_id}", json.dumps(recs), ex=settings.REDIS_REC_TTL_SECONDS)
            count += 1

    if count > 0:
        await pipe.execute()

    logger.info("CBF-only run complete: %d users updated.", count)
    return {"status": "success_cbf_only", "users_processed": count}


# ─── Global trending ───────────────────────────────────────────────────────────

async def _cache_global_trending(df: pd.DataFrame) -> None:
    """
    Compute global trending as the top-20 most-interacted books
    (by number of distinct users who interacted, not total score — fairer).
    Store in Redis key: rec:global_trending.
    """
    try:
        trending = (
            df.groupby("bookId")["userId"]
            .nunique()
            .sort_values(ascending=False)
            .head(20)
            .index.tolist()
        )
        redis = RedisClient.get_client()
        await redis.set(
            "rec:global_trending",
            json.dumps(trending),
            ex=settings.REDIS_REC_TTL_SECONDS,
        )
        logger.info("Global trending cached (%d books).", len(trending))
    except Exception as exc:
        logger.warning("Failed to cache global trending: %s", exc)
