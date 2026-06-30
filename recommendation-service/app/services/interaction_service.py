"""
Interaction Service — accumulates behavioral signals into (user, book) scores.

Redis key schema
────────────────
view_cap:{userId}:{bookId}   Counter (int),  TTL = VIEW_CAP_TTL (30d)
recent_views:{userId}        List[bookId],   TTL = RECENT_VIEWS_TTL (48h), max 10
today_rec:{userId}           JSON list,      TTL = TODAY_TTL (1h) — deleted on each interaction
read_books:{userId}          Set[bookId],    no TTL (permanent until unfavorite/re-shelve)
"""
from __future__ import annotations

import logging
from datetime import datetime

from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.core.config import settings
from app.models.behavior import UserBehaviorEvent, ActionType

logger = logging.getLogger(__name__)

# ── ADD_BOOKSHELF ReadStatus values sent by book-service ──────────────────────
# WANT_TO_READ = 4.0  (có ý định đọc)
# READING      = 1.0  (đang đọc)
# READ         = 6.0  (đã đọc xong — highest signal, cũng mark as "read")
_BOOKSHELF_READ_SCORE = 6.0   # Ngưỡng để coi là "đã đọc hoàn toàn"

# ── Session intent actions — update sliding window + invalidate today_rec ─────
_SESSION_INTENT_ACTIONS = {
    ActionType.VIEW,
    ActionType.SEARCH_CLICK,
    ActionType.FAVORITE,
    ActionType.ADD_BOOKSHELF,
}


# ─── Public entry point ────────────────────────────────────────────────────────

async def process_user_behavior(event: UserBehaviorEvent) -> None:
    """
    Compute score delta for (user, book) pair and persist to MongoDB.

    Score logic:
        FAVORITE        → +5.0
        UNFAVORITE      → -4.0  (negative feedback — also removes from read_books)
        ADD_BOOKSHELF   → event.value (WANT=4, READING=1, READ=6)
                          READ status additionally marks book as permanently read.
        SEARCH_CLICK    → +3.0
        VIEW            → +1.0  (capped at VIEW_CAP_COUNT times per 30 days per pair)
        RATING          → value - 3.0 (net delta: 5★ → +2.0, 1★ → -2.0)
        READ_TIME       → value × 0.1 (minutes × weight)
    """
    score_delta = _compute_score_delta(event)

    if score_delta != 0.0:
        await _upsert_score(event, score_delta)

    # ── Mark / unmark "already read" ──────────────────────────────────────────
    if event.actionType == ActionType.ADD_BOOKSHELF and event.value >= _BOOKSHELF_READ_SCORE:
        await _mark_book_read(event.userId, event.bookId)
    elif event.actionType == ActionType.UNFAVORITE:
        # If user un-favorites a book, remove from read set (optional signal cleanup)
        await _unmark_book_read(event.userId, event.bookId)

    # ── Update short-term session window ─────────────────────────────────────
    if event.actionType in _SESSION_INTENT_ACTIONS and event.bookId:
        await _update_session_window(event)


# ─── Score computation ─────────────────────────────────────────────────────────

def _compute_score_delta(event: UserBehaviorEvent) -> float:
    """Return score delta; 0.0 means no MongoDB update needed."""
    match event.actionType:
        case ActionType.VIEW:
            # VIEW cap is checked asynchronously — defer to caller
            return None  # sentinel: needs async cap check
        case ActionType.FAVORITE:
            return 5.0
        case ActionType.UNFAVORITE:
            return -4.0
        case ActionType.ADD_BOOKSHELF:
            return round(float(event.value), 4) if event.value else 0.0
        case ActionType.SEARCH_CLICK:
            return 3.0
        case ActionType.RATING:
            return round(event.value - 3.0, 4)
        case ActionType.READ_TIME:
            return round(max(event.value, 0.0) * 0.1, 4)
        case _:
            return 0.0


async def _compute_score_delta_async(event: UserBehaviorEvent) -> float:
    """Async wrapper that handles VIEW cap check."""
    if event.actionType == ActionType.VIEW:
        capped = await _check_and_increment_view_cap(event.userId, event.bookId)
        if capped:
            logger.debug(
                "VIEW capped for user=%s book=%s (max %d reached)",
                event.userId, event.bookId, settings.REDIS_VIEW_CAP_COUNT,
            )
            return 0.0
        return 1.0
    delta = _compute_score_delta(event)
    return delta if delta is not None else 0.0


# Override process_user_behavior to use async compute
async def process_user_behavior(event: UserBehaviorEvent) -> None:  # noqa: F811
    score_delta = await _compute_score_delta_async(event)

    if score_delta != 0.0:
        await _upsert_score(event, score_delta)

    if event.actionType == ActionType.ADD_BOOKSHELF and event.value >= _BOOKSHELF_READ_SCORE:
        await _mark_book_read(event.userId, event.bookId)
    elif event.actionType == ActionType.UNFAVORITE:
        await _unmark_book_read(event.userId, event.bookId)

    if event.actionType in _SESSION_INTENT_ACTIONS and event.bookId:
        await _update_session_window(event)


# ─── MongoDB ───────────────────────────────────────────────────────────────────

async def _upsert_score(event: UserBehaviorEvent, delta: float) -> None:
    db = MongoDBClient.get_db()
    now = datetime.utcnow()
    await db.user_item_scores.update_one(
        {"userId": event.userId, "bookId": event.bookId},
        {
            "$inc": {"totalScore": delta},
            "$set": {
                "lastUpdatedAt": now,
                "lastInteractedAt": now,
            },
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True,
    )
    logger.debug(
        "score upsert user=%s book=%s delta=%.4f action=%s",
        event.userId, event.bookId, delta, event.actionType,
    )


# ─── Redis helpers ─────────────────────────────────────────────────────────────

async def _check_and_increment_view_cap(user_id: str, book_id: str) -> bool:
    """
    Increment VIEW counter for (user, book).
    Returns True if already at cap (view should NOT be scored).
    Fail-open: if Redis is unavailable return False (allow scoring).
    """
    try:
        redis = RedisClient.get_client()
        cap_key = f"view_cap:{user_id}:{book_id}"
        current = await redis.incr(cap_key)
        if current == 1:
            await redis.expire(cap_key, settings.REDIS_VIEW_CAP_TTL_SECONDS)
        return current > settings.REDIS_VIEW_CAP_COUNT
    except Exception as exc:
        logger.warning("view_cap check failed user=%s: %s", user_id, exc)
        return False


async def _update_session_window(event: UserBehaviorEvent) -> None:
    """
    Push bookId into the user's recent_views sliding window.
    Invalidate today_rec so the next request always rebuilds with fresh intent.
    """
    try:
        redis = RedisClient.get_client()
        recent_key = f"recent_views:{event.userId}"
        today_key = f"today_rec:{event.userId}"

        pipe = redis.pipeline()
        pipe.lpush(recent_key, event.bookId)
        pipe.ltrim(recent_key, 0, settings.REDIS_RECENT_VIEWS_MAX - 1)
        pipe.expire(recent_key, settings.REDIS_RECENT_VIEWS_TTL_SECONDS)
        pipe.delete(today_key)   # force rebuild on next request
        await pipe.execute()
    except Exception as exc:
        logger.warning("session_window update failed user=%s: %s", event.userId, exc)


async def _mark_book_read(user_id: str, book_id: str) -> None:
    """Persist book as permanently read for the user (no TTL — persists forever)."""
    try:
        redis = RedisClient.get_client()
        await redis.sadd(f"read_books:{user_id}", book_id)
    except Exception as exc:
        logger.warning("mark_book_read failed user=%s book=%s: %s", user_id, book_id, exc)


async def _unmark_book_read(user_id: str, book_id: str) -> None:
    """Remove book from the read set (e.g. when user un-favorites)."""
    try:
        redis = RedisClient.get_client()
        await redis.srem(f"read_books:{user_id}", book_id)
    except Exception as exc:
        logger.warning("unmark_book_read failed user=%s book=%s: %s", user_id, book_id, exc)


# ─── Public helpers used by other services ────────────────────────────────────

async def get_read_book_ids(user_id: str) -> set[str]:
    """
    Return the set of bookIds the user has already fully read.
    Falls back to empty set if Redis is unavailable.
    """
    try:
        redis = RedisClient.get_client()
        raw = await redis.smembers(f"read_books:{user_id}")
        return {b.decode() if isinstance(b, bytes) else b for b in raw}
    except Exception as exc:
        logger.warning("get_read_book_ids failed user=%s: %s", user_id, exc)
        return set()
