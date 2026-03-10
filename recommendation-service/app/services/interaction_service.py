from app.core.mongodb import MongoDBClient
from app.models.behavior import UserBehaviorEvent, ActionType
from datetime import datetime
import motor.motor_asyncio
import logging

logger = logging.getLogger(__name__)

async def process_user_behavior(event: UserBehaviorEvent):
    # Calculate score based on event
    score_increment = 0.0
    
    if event.actionType == ActionType.FAVORITE:
        score_increment = 5.0
    elif event.actionType == ActionType.RATING:
        score_increment = event.value - 3.0 # Max +2, Min -2
    elif event.actionType == ActionType.ADD_BOOKSHELF:
        score_increment = 4.0
    elif event.actionType == ActionType.SEARCH_CLICK:
        score_increment = 3.0
    elif event.actionType == ActionType.VIEW:
        score_increment = 1.0
    elif event.actionType == ActionType.READ_TIME:
        score_increment = event.value * 0.1 # value is read time in minutes
        
    if score_increment == 0.0:
        return

    db = MongoDBClient.get_db()
    collection = db.user_item_scores
    
    # Upsert the score
    await collection.update_one(
        {"userId": event.userId, "bookId": event.bookId},
        {
            "$inc": {"totalScore": score_increment},
            "$set": {"lastUpdatedAt": datetime.utcnow()}
        },
        upsert=True
    )
    # logger.info(f"Updated score for user {event.userId} and book {event.bookId} by {score_increment}")
