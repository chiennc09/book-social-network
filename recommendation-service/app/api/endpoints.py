from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List
from app.core.config import settings
from app.core.redis_client import RedisClient
from app.core.mongodb import MongoDBClient
from app.services.training_service import train_hybrid_model
from app.services.embedding_service import (
    search_similar_books,
    cbf_recommendations_for_user,
)
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Response schemas ──────────────────────────────────────────────────────────

class RecommendationResponse(BaseModel):
    userId: str
    recommendedBookIds: List[str]
    # "hybrid-als-cbf" | "cbf-only" | "trending" | "empty"
    source: str = "unknown"


class SimilarBooksResponse(BaseModel):
    bookId: str
    similarBookIds: List[str]


class TodayRecommendationResponse(BaseModel):
    userId: str
    todayBookIds: List[str]
    # "session-cbf": built from recent_views
    # "recency-cbf": built from recently interacted books (fallback)
    # "trending"   : ultimate fallback
    source: str


# ─── GET /recommendations/{user_id}  (Long-term: ALS + CBF) ───────────────────

@router.get("/recommendations/{user_id}", response_model=RecommendationResponse)
async def get_recommendations(user_id: str):
    try:
        redis_client = RedisClient.get_client()

        recs_json = await redis_client.get(f"rec:{user_id}")
        if recs_json:
            return RecommendationResponse(
                userId=user_id,
                recommendedBookIds=json.loads(recs_json),
                source="hybrid-als-cbf",
            )

        # Cold-start: enough interactions → CBF-only
        db = MongoDBClient.get_db()
        user_scores = await db.user_item_scores.find(
            {"userId": user_id},
            {"bookId": 1, "totalScore": 1, "_id": 0},
        ).sort("totalScore", -1).limit(20).to_list(length=20)

        if len(user_scores) >= settings.COLD_START_THRESHOLD:
            user_book_ids = [s["bookId"] for s in user_scores]
            recs = await cbf_recommendations_for_user(user_book_ids, limit=20)
            if recs:
                return RecommendationResponse(
                    userId=user_id, recommendedBookIds=recs, source="cbf-only"
                )

        # Absolute cold-start → trending
        trending_json = await redis_client.get("rec:global_trending")
        if trending_json:
            return RecommendationResponse(
                userId=user_id,
                recommendedBookIds=json.loads(trending_json),
                source="trending",
            )

        return RecommendationResponse(userId=user_id, recommendedBookIds=[], source="empty")

    except Exception as exc:
        logger.error(f"Error serving recommendations for {user_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ─── GET /recommendations/{user_id}/today  (Short-term: Session CBF) ──────────

@router.get("/recommendations/{user_id}/today", response_model=TodayRecommendationResponse)
async def get_today_recommendations(user_id: str, limit: int = 10):
    """
    Short-term 'Today's Picks' recommendation.

    Build strategy (3-tier fallback):
      1. Cache hit  → return today_rec:{userId} (TTL 24h, invalidated on each interaction)
      2. recent_views exists → CBF from ≤10 recent bookIds (live session intent)
      3. lastInteractedAt fallback → CBF from ≤10 most recently interacted books in MongoDB
      4. No data  → global trending

    today_rec is deleted on every VIEW/FAVORITE/etc. event so the next call
    always reflects the user's freshest intent.
    """
    try:
        redis_client = RedisClient.get_client()
        today_key = f"today_rec:{user_id}"

        # ── 1. Cache hit ──────────────────────────────────────────────────────
        cached = await redis_client.get(today_key)
        if cached:
            return TodayRecommendationResponse(
                userId=user_id,
                todayBookIds=json.loads(cached),
                source="session-cbf",
            )

        limit = min(limit, 20)
        result_ids: list[str] = []
        source = "empty"

        # ── 2. Build from recent_views (session window) ───────────────────────
        recent_ids_raw = await redis_client.lrange(f"recent_views:{user_id}", 0, -1)
        recent_ids = [b.decode() if isinstance(b, bytes) else b for b in recent_ids_raw]

        if recent_ids:
            result_ids = await cbf_recommendations_for_user(recent_ids, limit=limit)
            source = "session-cbf"

        # ── 3. Fallback: most recently interacted books from MongoDB ──────────
        if not result_ids:
            db = MongoDBClient.get_db()
            recent_docs = await db.user_item_scores.find(
                {"userId": user_id},
                {"bookId": 1, "_id": 0},
            ).sort("lastInteractedAt", -1).limit(10).to_list(length=10)

            fallback_book_ids = [d["bookId"] for d in recent_docs]
            if fallback_book_ids:
                result_ids = await cbf_recommendations_for_user(fallback_book_ids, limit=limit)
                source = "recency-cbf"

        # ── 4. Ultimate fallback: trending ────────────────────────────────────
        if not result_ids:
            trending_json = await redis_client.get("rec:global_trending")
            if trending_json:
                result_ids = json.loads(trending_json)[:limit]
                source = "trending"

        # Write to cache (even empty result, prevents thunder-herd)
        await redis_client.set(today_key, json.dumps(result_ids), ex=settings.REDIS_TTL_SECONDS)

        return TodayRecommendationResponse(
            userId=user_id, todayBookIds=result_ids, source=source
        )

    except Exception as exc:
        logger.error(f"Error building today recs for {user_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ─── GET /similar/{book_id} ────────────────────────────────────────────────────

@router.get("/similar/{book_id}", response_model=SimilarBooksResponse)
async def get_similar_books(book_id: str, limit: int = 10):
    try:
        similar_ids = await search_similar_books(book_id, limit=min(limit, 20))
        return SimilarBooksResponse(bookId=book_id, similarBookIds=similar_ids)
    except Exception as exc:
        logger.error(f"Error fetching similar books for {book_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ─── POST /jobs/train ──────────────────────────────────────────────────────────

@router.post("/jobs/train")
async def trigger_training(background_tasks: BackgroundTasks):
    background_tasks.add_task(train_hybrid_model)
    return {"status": "Training job triggered"}
