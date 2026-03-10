from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.api.schemas import RecommendationResponse
from app.core.redis_client import RedisClient
from app.services.training_service import train_als_model
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/recommendations/{user_id}", response_model=RecommendationResponse)
async def get_recommendations(user_id: str):
    try:
        redis_client = RedisClient.get_client()
        redis_key = f"rec:{user_id}"
        
        recs_json = await redis_client.get(redis_key)
        
        if recs_json:
            recommended_books = json.loads(recs_json)
            return RecommendationResponse(userId=user_id, recommendedBookIds=recommended_books)
        else:
            # Fallback for Cold Start users
            # In a full system, you could fetch trending books here.
            # Returning empty implies the caller gracefully falls back.
            return RecommendationResponse(userId=user_id, recommendedBookIds=[])
            
    except Exception as e:
        logger.error(f"Error serving recommendations for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/jobs/train")
async def trigger_training(background_tasks: BackgroundTasks):
    # Triggers the offline training job in the background (or manual call)
    background_tasks.add_task(train_als_model)
    return {"status": "Training job triggered"}
