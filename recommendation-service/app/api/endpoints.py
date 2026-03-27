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


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------
class RecommendationResponse(BaseModel):
    userId: str
    recommendedBookIds: List[str]
    source: str = "unknown"  # "hybrid-als-cbf" | "cbf-only" | "trending" | "empty"


class SimilarBooksResponse(BaseModel):
    bookId: str
    similarBookIds: List[str]


# ---------------------------------------------------------------------------
# GET /recommendations/{user_id}
# ---------------------------------------------------------------------------
@router.get("/recommendations/{user_id}", response_model=RecommendationResponse)
async def get_recommendations(user_id: str):
    try:
        redis_client = RedisClient.get_client()
        redis_key = f"rec:{user_id}"

        recs_json = await redis_client.get(redis_key)
        if recs_json:
            return RecommendationResponse(
                userId=user_id,
                recommendedBookIds=json.loads(recs_json),
                source="hybrid-als-cbf",
            )

        # --- Cold-start path ---
        db = MongoDBClient.get_db()
        user_scores = await db.user_item_scores.find(
            {"userId": user_id},
            {"bookId": 1, "totalScore": 1, "_id": 0},
        ).sort("totalScore", -1).limit(20).to_list(length=20)

        if len(user_scores) >= settings.COLD_START_THRESHOLD:
            # Enough interactions → use CBF-only (no ALS yet)
            user_book_ids = [s["bookId"] for s in user_scores]
            recs = await cbf_recommendations_for_user(user_book_ids, limit=20)
            if recs:
                return RecommendationResponse(
                    userId=user_id,
                    recommendedBookIds=recs,
                    source="cbf-only",
                )

        # --- Absolute cold-start → return trending from Redis ---
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


# ---------------------------------------------------------------------------
# GET /similar/{book_id}
# ---------------------------------------------------------------------------
@router.get("/similar/{book_id}", response_model=SimilarBooksResponse)
async def get_similar_books(book_id: str, limit: int = 10):
    try:
        similar_ids = await search_similar_books(book_id, limit=min(limit, 20))
        return SimilarBooksResponse(bookId=book_id, similarBookIds=similar_ids)
    except Exception as exc:
        logger.error(f"Error fetching similar books for {book_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# POST /jobs/train  (manual trigger)
# ---------------------------------------------------------------------------
@router.post("/jobs/train")
async def trigger_training(background_tasks: BackgroundTasks):
    background_tasks.add_task(train_hybrid_model)
    return {"status": "Training job triggered"}
