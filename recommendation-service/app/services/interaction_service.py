from app.core.mongodb import MongoDBClient
from app.models.behavior import UserBehaviorEvent, ActionType
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Score weights per action type.
# These constants make the scoring policy visible and easy to tune.
ACTION_SCORES = {
    ActionType.FAVORITE:      5.0,
    ActionType.ADD_BOOKSHELF: 4.0,
    ActionType.SEARCH_CLICK:  3.0,
    ActionType.VIEW:          1.0,
}

async def process_user_behavior(event: UserBehaviorEvent):
    """
    Compute a score delta for the (user, book) pair based on the event type,
    then atomically increment the persistent score in MongoDB.

    Score logic:
        FAVORITE        → +5.0  (strong explicit signal)
        ADD_BOOKSHELF   → +4.0  (intent to read)
        SEARCH_CLICK    → +3.0  (interest signal)
        VIEW            → +1.0  (passive engagement)
        RATING          → value - 3.0  (net delta: +2 max, -2 min, 0 for neutral=skip)
        READ_TIME       → value * 0.1  (minutes × weight; clamped ≥ 0 by validator)
    """
    score_increment = 0.0

    if event.actionType in ACTION_SCORES:
        score_increment = ACTION_SCORES[event.actionType]

    elif event.actionType == ActionType.RATING:
        # value is already validated to be in [1.0, 5.0].
        # Rating=3 is neutral → delta=0, which we skip below.
        score_increment = round(event.value - 3.0, 4)

    elif event.actionType == ActionType.READ_TIME:
        # value >= 0 guaranteed by validator; clamp defensively.
        score_increment = round(max(event.value, 0.0) * 0.1, 4)

    # Skip zero or negative increments — nothing to store.
    # (A negative final score can only come from RATING=1 or RATING=2.)
    # Negative increments ARE valid feedback; only skip pure zero.
    if score_increment == 0.0:
        return

    db = MongoDBClient.get_db()
    collection = db.user_item_scores

    # Upsert: increment totalScore and update the lastUpdatedAt timestamp.
    # Using $inc is atomic and avoids read-modify-write race conditions.
    await collection.update_one(
        {"userId": event.userId, "bookId": event.bookId},
        {
            "$inc": {"totalScore": score_increment},
            "$set": {"lastUpdatedAt": datetime.utcnow()},
            # $setOnInsert initialises createdAt only on the first upsert
            "$setOnInsert": {"createdAt": datetime.utcnow()},
        },
        upsert=True,
    )
    logger.debug(
        "Updated score for user=%s book=%s delta=%.4f actionType=%s",
        event.userId, event.bookId, score_increment, event.actionType,
    )
