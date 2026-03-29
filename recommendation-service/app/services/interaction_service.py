from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.models.behavior import UserBehaviorEvent, ActionType
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Score weights per action type.
ACTION_SCORES = {
    ActionType.FAVORITE:      5.0,
    ActionType.ADD_BOOKSHELF: 4.0,
    ActionType.SEARCH_CLICK:  3.0,
    ActionType.VIEW:          1.0,
}

# Actions that signal direct content interest → tracked in short-term session window
_SESSION_INTENT_ACTIONS = {ActionType.VIEW, ActionType.SEARCH_CLICK, ActionType.FAVORITE, ActionType.ADD_BOOKSHELF}

_RECENT_VIEWS_MAX = 10    # Sliding window size
_RECENT_VIEWS_TTL = 172_800   # 48h — user returning next day still gets context
_TODAY_REC_TTL    = 86_400    # 24h — session recommendation list TTL


async def process_user_behavior(event: UserBehaviorEvent):
    """
    Compute a score delta for the (user, book) pair based on the event type,
    then atomically increment the persistent score in MongoDB.

    Additionally, for high-intent actions (VIEW, SEARCH_CLICK, FAVORITE, ADD_BOOKSHELF)
    we push the bookId into a Redis sliding window (recent_views:{userId}) and
    invalidate the cached today_rec:{userId} so the next request rebuilds it fresh.

    Score logic:
        FAVORITE        → +5.0
        ADD_BOOKSHELF   → +4.0
        SEARCH_CLICK    → +3.0
        VIEW            → +1.0
        RATING          → value - 3.0 (net delta)
        READ_TIME       → value * 0.1 (minutes × weight)
    """
    score_increment = 0.0

    if event.actionType in ACTION_SCORES:
        score_increment = ACTION_SCORES[event.actionType]
    elif event.actionType == ActionType.RATING:
        score_increment = round(event.value - 3.0, 4)
    elif event.actionType == ActionType.READ_TIME:
        score_increment = round(max(event.value, 0.0) * 0.1, 4)

    if score_increment != 0.0:
        db = MongoDBClient.get_db()
        now = datetime.utcnow()
        await db.user_item_scores.update_one(
            {"userId": event.userId, "bookId": event.bookId},
            {
                "$inc": {"totalScore": score_increment},
                "$set": {
                    "lastUpdatedAt": now,
                    # lastInteractedAt enables recency-based fallback ordering
                    "lastInteractedAt": now,
                },
                "$setOnInsert": {"createdAt": now},
            },
            upsert=True,
        )
        logger.debug(
            "Updated score for user=%s book=%s delta=%.4f actionType=%s",
            event.userId, event.bookId, score_increment, event.actionType,
        )

    # ── Short-term session tracking ──────────────────────────────────────────
    # Push bookId into the user's recent-views sliding window in Redis.
    # Invalidate today_rec so the next GET rebuilds it with new context.
    if event.actionType in _SESSION_INTENT_ACTIONS and event.bookId:
        try:
            redis = RedisClient.get_client()
            recent_key = f"recent_views:{event.userId}"
            today_key = f"today_rec:{event.userId}"

            pipe = redis.pipeline()
            pipe.lpush(recent_key, event.bookId)
            pipe.ltrim(recent_key, 0, _RECENT_VIEWS_MAX - 1)
            pipe.expire(recent_key, _RECENT_VIEWS_TTL)
            pipe.delete(today_key)  # force rebuild on next request
            await pipe.execute()
        except Exception as exc:
            logger.warning("Failed to update recent_views for user=%s: %s", event.userId, exc)
