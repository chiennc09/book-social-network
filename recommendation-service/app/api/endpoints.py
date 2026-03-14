from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from app.api.schemas import RecommendationResponse
from app.core.redis_client import RedisClient
from app.core.mongodb import MongoDBClient
from app.services.training_service import train_als_model
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/recommendations/{user_id}", response_model=RecommendationResponse)
async def get_recommendations(
    user_id: str,
    limit: int = Query(default=20, ge=1, le=50, description="Max number of recommendations to return"),
):
    """
    Return personalised book recommendations for a user.

    - If the user has been through at least one training cycle (Redis key exists),
      return their top-`limit` recommended book IDs.
    - If no key exists (cold start — new user or TTL expired), return an empty list.
      The frontend is expected to hide this section and show trending books instead.
    """
    if not user_id or not user_id.strip():
        raise HTTPException(status_code=400, detail="user_id must not be empty")

    try:
        redis_client = RedisClient.get_client()
        redis_key = f"rec:{user_id.strip()}"

        recs_json = await redis_client.get(redis_key)

        if recs_json:
            recommended_books: list[str] = json.loads(recs_json)
            # Respect the requested limit even if more are stored
            return RecommendationResponse(
                userId=user_id,
                recommendedBookIds=recommended_books[:limit],
            )

        # Cold start: no recommendations yet for this user.
        # Return empty list — frontend hides this section.
        return RecommendationResponse(userId=user_id, recommendedBookIds=[])

    except Exception as e:
        logger.error("Error serving recommendations for user=%s: %s", user_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/jobs/train")
async def trigger_training(background_tasks: BackgroundTasks):
    """
    Manually trigger an ALS training job in the background.
    Useful for development or after bulk data imports.
    Returns immediately; check logs for completion status.
    """
    background_tasks.add_task(train_als_model)
    return {"status": "Training job triggered", "note": "Check service logs for completion status"}


@router.get("/health/ready")
async def readiness_check():
    """
    Kubernetes/Docker readiness probe.
    Verifies that both Redis and MongoDB connections are alive before
    the service is added to the load balancer rotation.
    """
    errors = []

    try:
        redis = RedisClient.get_client()
        await redis.ping()
    except Exception as e:
        errors.append(f"Redis: {e}")

    try:
        db = MongoDBClient.get_db()
        await db.command("ping")
    except Exception as e:
        errors.append(f"MongoDB: {e}")

    if errors:
        raise HTTPException(status_code=503, detail={"status": "not ready", "errors": errors})

    return {"status": "ready"}
