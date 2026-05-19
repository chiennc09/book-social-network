from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.models.behavior import UserBehaviorEvent, ActionType
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Score weights per action type.
ACTION_SCORES = {
    ActionType.FAVORITE:       5.0,
    ActionType.UNFAVORITE:    -4.0,   # Negative feedback: bỏ thích
    ActionType.ADD_BOOKSHELF:  0.0,   # Điểm được truyền vào qua event.value (tách theo status)
    ActionType.SEARCH_CLICK:   3.0,   # Tìm kiếm và click: intent cao
    ActionType.VIEW:           1.0,
}

# VIEW cap: tối đa cộng 3 lần VIEW cho mỗi cặp (userId, bookId) trong 30 ngày
# Ngăn chặn tích lũy điểm vô hạn khi user đọc sách nhiều phiên
_VIEW_CAP_COUNT = 3
_VIEW_CAP_TTL   = 86_400 * 30      # 30 ngày

# Actions that signal direct content interest → tracked in short-term session window
_SESSION_INTENT_ACTIONS = {ActionType.VIEW, ActionType.SEARCH_CLICK, ActionType.FAVORITE, ActionType.ADD_BOOKSHELF}

_RECENT_VIEWS_MAX = 10    # Sliding window size
_RECENT_VIEWS_TTL = 172_800   # 48h — user returning next day still gets context
_TODAY_REC_TTL    = 86_400    # 24h — session recommendation list TTL


async def process_user_behavior(event: UserBehaviorEvent):
    """
    Compute a score delta for the (user, book) pair based on the event type,
    then atomically increment the persistent score in MongoDB.

    Score logic:
        FAVORITE        → +5.0
        UNFAVORITE      → -4.0  (negative feedback)
        ADD_BOOKSHELF   → event.value (truyền từ backend: WANT=4, READING=1, READ=6)
        SEARCH_CLICK    → +3.0
        VIEW            → +1.0  (tối đa 3 lần/30 ngày per user-book pair)
        RATING          → value - 3.0 (net delta, e.g. 5 sao → +2.0, 1 sao → -2.0)
        READ_TIME       → value * 0.1 (minutes × weight)
    """
    score_increment = 0.0

    if event.actionType == ActionType.VIEW:
        # Kiểm tra VIEW cap bằng Redis để tránh cộng dồn vô hạn
        capped = await _check_and_increment_view_cap(event.userId, event.bookId)
        if capped:
            logger.debug(
                "VIEW capped for user=%s book=%s (already reached max %d views)",
                event.userId, event.bookId, _VIEW_CAP_COUNT,
            )
            # Vẫn cập nhật session window ngay cả khi cap, nhưng không cộng điểm
            await _update_session_window(event)
            return
        score_increment = ACTION_SCORES[ActionType.VIEW]

    elif event.actionType == ActionType.ADD_BOOKSHELF:
        # Điểm được truyền vào qua event.value để phân cấp theo ReadStatus:
        # WANT_TO_READ=4.0, READING=1.0, READ=6.0
        score_increment = round(float(event.value), 4) if event.value else 0.0

    elif event.actionType in ACTION_SCORES:
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
    if event.actionType in _SESSION_INTENT_ACTIONS and event.bookId:
        await _update_session_window(event)


async def _check_and_increment_view_cap(user_id: str, book_id: str) -> bool:
    """
    Tăng bộ đếm VIEW cho cặp (userId, bookId).
    Trả về True nếu đã đạt giới hạn (view không được tính điểm).
    Trả về False nếu chưa đạt giới hạn (view được tính điểm bình thường).
    """
    try:
        redis = RedisClient.get_client()
        cap_key = f"view_cap:{user_id}:{book_id}"
        current = await redis.incr(cap_key)
        if current == 1:
            # Lần đầu tiên, đặt TTL 30 ngày
            await redis.expire(cap_key, _VIEW_CAP_TTL)
        return current > _VIEW_CAP_COUNT
    except Exception as exc:
        logger.warning("Failed to check view cap for user=%s: %s", user_id, exc)
        return False  # Fail-open: nếu Redis lỗi thì vẫn cho tính điểm


async def _update_session_window(event: UserBehaviorEvent):
    """
    Đẩy bookId vào sliding window recent_views của user trong Redis.
    Xóa cache today_rec để rebuild với context mới.
    """
    try:
        redis = RedisClient.get_client()
        recent_key = f"recent_views:{event.userId}"
        today_key  = f"today_rec:{event.userId}"

        pipe = redis.pipeline()
        pipe.lpush(recent_key, event.bookId)
        pipe.ltrim(recent_key, 0, _RECENT_VIEWS_MAX - 1)
        pipe.expire(recent_key, _RECENT_VIEWS_TTL)
        pipe.delete(today_key)  # force rebuild on next request
        await pipe.execute()
    except Exception as exc:
        logger.warning("Failed to update recent_views for user=%s: %s", event.userId, exc)

