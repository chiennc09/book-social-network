"""
Recommendation API endpoints.

Recommendation model
────────────────────
The API returns at most 3 recommendation lists per user:

  ┌──────────────────────────────────────────────────────────────────┐
  │ User type          │ Lists returned                              │
  ├──────────────────────────────────────────────────────────────────┤
  │ New (<threshold)   │ trending only                               │
  │ Qualified user     │ long_term  + short_term (+ trending if cold │
  │                    │ start for long_term)                        │
  └──────────────────────────────────────────────────────────────────┘

long_term  (rec:{userId})       — ALS+CBF hybrid, written every 6h by training job
                                    (30-day TTL as safety-net only)
short_term (today_rec:{userId}) — Session-CBF, rebuilt on each interaction
                                    (NO filtering of read books — session-based context)

Redis key schema (read-only in this module)
───────────────────────────────────────────
rec:{userId}                  JSON list[str]  — long-term recs
today_rec:{userId}            JSON list[str]  — short-term cache
today_rec_backup:{userId}     JSON list[str]  — tail of previous today_rec
recent_views:{userId}         List[str]       — sliding session window
read_books:{userId}           Set[str]        — books user has fully read
rec:global_trending           JSON list[str]  — global trending
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from app.core.config import settings
from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.services.embedding_service import (
    cbf_recommendations_for_user,
    delete_book as qdrant_delete_book,
    search_similar_books,
)
from app.services.interaction_service import get_read_book_ids
from app.services.training_service import train_hybrid_model

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Response schemas ──────────────────────────────────────────────────────────

class BookList(BaseModel):
    bookIds: list[str]
    source: str  # "hybrid-als-cbf" | "cbf-only" | "session-cbf" | "recency-cbf" | "backup" | "trending"


class RecommendationsResponse(BaseModel):
    userId: str
    longTerm: Optional[BookList] = None   # Present when user is qualified
    shortTerm: Optional[BookList] = None  # Present when user is qualified
    trending: Optional[BookList] = None   # Present when user is new OR as supplement


class SimilarBooksResponse(BaseModel):
    bookId: str
    similarBookIds: list[str]


# ─── Book existence validation ────────────────────────────────────────────────

async def _validate_books(book_ids: list[str]) -> list[str]:
    """
    Filter a list of bookIds to only those that still exist in book-service MongoDB.
    Preserves original order. Non-ObjectId IDs pass through without validation.
    Fail-open: returns all IDs unfiltered if MongoDB is unreachable.
    """
    if not book_ids:
        return []
    try:
        client = AsyncIOMotorClient(settings.BOOK_SERVICE_MONGODB_URL)
        db = client["book-service"]

        oid_map: dict = {}   # ObjectId → original str
        passthrough: list[str] = []
        for bid in book_ids:
            try:
                oid_map[ObjectId(bid)] = bid
            except Exception:
                passthrough.append(bid)

        valid_oids: set[str] = set()
        if oid_map:
            docs = await db["books"].find(
                {"_id": {"$in": list(oid_map.keys())}},
                {"_id": 1},
            ).to_list(length=len(oid_map))
            valid_oids = {str(d["_id"]) for d in docs}

        client.close()

        result = []
        for bid in book_ids:
            try:
                if str(ObjectId(bid)) in valid_oids:
                    result.append(bid)
            except Exception:
                result.append(bid)   # non-ObjectId passthrough
        return result

    except Exception as exc:
        logger.warning("_validate_books failed: %s — returning unfiltered.", exc)
        return book_ids


async def _filter_books(
    book_ids: list[str],
    *,
    exclude: set[str],
    validate: bool = True,
) -> list[str]:
    """
    Remove books in `exclude` set, then optionally validate against book-service DB.
    """
    filtered = [b for b in book_ids if b not in exclude]
    if validate:
        filtered = await _validate_books(filtered)
    return filtered


# ─── Short-term recommendation builder ────────────────────────────────────────

async def _build_short_term(
    user_id: str,
    limit: int,
) -> tuple[list[str], str]:
    """
    Build short-term (Today's Picks) recommendations for a qualified user.

    NOTE: Short-term is session-intent based and does NOT filter out
    books the user has already read. The goal is to surface related books
    around current browsing context, not long-term personalization.

    Strategy (4-tier waterfall):
      1. recent_views session window  → session-cbf
      2. 10 most recently interacted books (lastInteractedAt) → recency-cbf
      3. today_rec_backup (tail of previous today result, TTL 7 days) → backup
      4. global_trending (last resort)

    Returns (book_ids, source).
    """
    redis = RedisClient.get_client()

    # ── 1. Session window ─────────────────────────────────────────────────────
    raw = await redis.lrange(f"recent_views:{user_id}", 0, -1)
    recent_ids = [b.decode() if isinstance(b, bytes) else b for b in raw]

    if recent_ids:
        recs = await cbf_recommendations_for_user(recent_ids, limit=limit + 10)
        # Only exclude the seed books themselves (already seen this session)
        recs = [b for b in recs if b not in set(recent_ids)]
        if recs:
            return recs[:limit], "session-cbf"

    # ── 2. MongoDB recency fallback ───────────────────────────────────────────
    db = MongoDBClient.get_db()
    docs = await db.user_item_scores.find(
        {"userId": user_id},
        {"bookId": 1, "_id": 0},
    ).sort("lastInteractedAt", -1).limit(10).to_list(length=10)

    recency_ids = [d["bookId"] for d in docs]
    if recency_ids:
        recs = await cbf_recommendations_for_user(recency_ids, limit=limit + 10)
        recs = [b for b in recs if b not in set(recency_ids)]
        if recs:
            return recs[:limit], "recency-cbf"

    # ── 3. Backup (tail of previous today_rec, kept 7 days) ──────────────────
    backup_raw = await redis.get(f"today_rec_backup:{user_id}")
    if backup_raw:
        backup_ids = await _validate_books(json.loads(backup_raw))
        if backup_ids:
            return backup_ids[:limit], "backup"

    # ── 4. Global trending ────────────────────────────────────────────────────
    trending_raw = await redis.get("rec:global_trending")
    if trending_raw:
        return json.loads(trending_raw)[:limit], "trending"

    return [], "empty"


# ─── GET /recommendations/{user_id} ───────────────────────────────────────────

@router.get("/recommendations/{user_id}", response_model=RecommendationsResponse)
async def get_recommendations(user_id: str, limit: int = 10):
    """
    Unified recommendation endpoint.

    Returns:
      - New users (< COLD_START_THRESHOLD interactions):
            Only `trending` list.
      - Qualified users (>= COLD_START_THRESHOLD):
            `longTerm`  = hybrid-als-cbf (from Redis cache, set by training job)
                          Falls back to live CBF-only when ALS cache is missing
                          (i.e. training hasn’t run yet or Redis was flushed).
                          READ books are filtered out from this list.
            `shortTerm` = session-CBF (rebuilt after every interaction).
                          Does NOT filter read books — session context only.
    """
    try:
        redis = RedisClient.get_client()
        db = MongoDBClient.get_db()
        short_limit = min(limit, settings.TOP_K_SHORT_TERM)
        long_limit = settings.TOP_K_LONG_TERM

        # ── Check total interaction count (cold-start gate) ───────────────────
        total_count = await db.user_item_scores.count_documents({"userId": user_id})

        if total_count < settings.COLD_START_THRESHOLD:
            # New user — trending only
            trending_raw = await redis.get("rec:global_trending")
            if trending_raw:
                trending_ids = await _validate_books(json.loads(trending_raw))
                return RecommendationsResponse(
                    userId=user_id,
                    trending=BookList(bookIds=trending_ids[:long_limit], source="trending"),
                )
            return RecommendationsResponse(userId=user_id)

        # ── Qualified user ────────────────────────────────────────────────────
        # Read books are fetched once and used ONLY for long-term filtering.
        read_ids = await get_read_book_ids(user_id)

        # ════════════════════════════════════════════════════════════════════
        # LONG-TERM
        # ════════════════════════════════════════════════════════════════════
        long_term_list: Optional[BookList] = None
        cached_lt = await redis.get(f"rec:{user_id}")

        if cached_lt:
            lt_ids = [b for b in json.loads(cached_lt) if b not in read_ids]
            lt_ids = await _validate_books(lt_ids)
            # FIX: Chỉ cập nhật cache và trả kết quả khi danh sách không rỗng
            if lt_ids:
                await redis.set(f"rec:{user_id}", json.dumps(lt_ids), keepttl=True)
                long_term_list = BookList(bookIds=lt_ids[:long_limit], source="hybrid-als-cbf")
            # Nếu lt_ids rỗng (toàn bộ đã đọc hoặc đã xóa), để long_term_list = None
            # → sẽ fallback xuống CBF-only phía dưới
            if not lt_ids:
                await redis.delete(f"rec:{user_id}")  # Xóa cache cũ đã lỗi thời
        if not cached_lt or long_term_list is None:
            # ALS cache miss hoặc cache đã hết sách hợp lệ — build CBF-only fallback
            score_docs = await db.user_item_scores.find(
                {"userId": user_id},
                {"bookId": 1, "totalScore": 1, "_id": 0},
            ).sort("totalScore", -1).limit(20).to_list(length=20)

            if score_docs:
                top_books = [d["bookId"] for d in score_docs]
                lt_ids = await cbf_recommendations_for_user(top_books, limit=long_limit + len(read_ids))
                lt_ids = [b for b in lt_ids if b not in read_ids]
                lt_ids = await _validate_books(lt_ids)
                if lt_ids:
                    long_term_list = BookList(bookIds=lt_ids[:long_limit], source="cbf-only")

        # ════════════════════════════════════════════════════════════════════
        # SHORT-TERM (today_rec) — session-intent, NO read-books filtering
        # ════════════════════════════════════════════════════════════════════
        short_term_list: Optional[BookList] = None
        today_key = f"today_rec:{user_id}"

        cached_st = await redis.get(today_key)
        if cached_st:
            # Return cached result as-is (validated only)
            st_ids = await _validate_books(json.loads(cached_st))
            short_term_list = BookList(bookIds=st_ids[:short_limit], source="session-cbf")
        else:
            st_ids, st_source = await _build_short_term(user_id, limit=short_limit + 10)
            st_ids = await _validate_books(st_ids)

            if st_ids:
                # Cache the fresh result
                await redis.set(today_key, json.dumps(st_ids), ex=settings.REDIS_TODAY_TTL_SECONDS)
                # Write tail (11-20) as backup for next time
                if len(st_ids) > short_limit:
                    backup = st_ids[short_limit:]
                    await redis.set(
                        f"today_rec_backup:{user_id}",
                        json.dumps(backup),
                        ex=settings.REDIS_BACKUP_TTL_SECONDS,
                    )
                short_term_list = BookList(bookIds=st_ids[:short_limit], source=st_source)

        return RecommendationsResponse(
            userId=user_id,
            longTerm=long_term_list,
            shortTerm=short_term_list,
        )

    except Exception as exc:
        logger.error("Error in get_recommendations for %s: %s", user_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ─── GET /similar/{book_id} ────────────────────────────────────────────────────

@router.get("/similar/{book_id}", response_model=SimilarBooksResponse)
async def get_similar_books(book_id: str, limit: int = 10):
    """
    Return the top-N most content-similar books to the given bookId.
    Used on the Book Detail screen ("Bạn cũng có thể thích").
    """
    try:
        similar_ids = await search_similar_books(book_id, limit=min(limit, 20))
        valid_ids = await _validate_books(similar_ids)
        return SimilarBooksResponse(bookId=book_id, similarBookIds=valid_ids)
    except Exception as exc:
        logger.error("Error in get_similar_books for %s: %s", book_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ─── POST /jobs/train ──────────────────────────────────────────────────────────

@router.post("/jobs/train")
async def trigger_training(background_tasks: BackgroundTasks):
    """Manually trigger the hybrid training job (runs in background)."""
    background_tasks.add_task(train_hybrid_model)
    return {"status": "Training job triggered"}


# ─── POST /admin/flush-cache ───────────────────────────────────────────────────

@router.post("/admin/flush-cache")
async def flush_all_caches():
    """
    Flush ALL recommendation caches from Redis.
    Use after a full DB reset or when stale data must be cleared immediately.
    """
    redis = RedisClient.get_client()
    if redis is None:
        raise HTTPException(status_code=503, detail="Redis not connected")

    deleted = 0
    for pattern in ["today_rec:*", "today_rec_backup:*", "rec:*", "recent_views:*"]:
        async for key in redis.scan_iter(pattern):
            await redis.delete(key)
            deleted += 1

    logger.info("Admin flush-cache: deleted %d Redis keys.", deleted)
    return {"status": "ok", "deleted_keys": deleted}


# ─── POST /admin/purge-qdrant-orphans ─────────────────────────────────────────

@router.post("/admin/purge-qdrant-orphans")
async def purge_qdrant_orphans(background_tasks: BackgroundTasks):
    """
    Scan Qdrant and delete any vectors whose bookId no longer exists in book-service MongoDB.
    Runs as a background task — returns immediately.
    """
    background_tasks.add_task(_purge_qdrant_orphans_task)
    return {"status": "Purge job started — check logs for progress"}


async def _purge_qdrant_orphans_task() -> None:
    from app.core.qdrant_client import QdrantManager

    logger.info("Starting Qdrant orphan purge...")
    try:
        qdrant = QdrantManager.get_client()
        client = AsyncIOMotorClient(settings.BOOK_SERVICE_MONGODB_URL)
        db = client["book-service"]

        orphan_ids: list = []
        offset = None

        while True:
            result, next_offset = await qdrant.scroll(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                offset=offset,
                limit=100,
                with_payload=True,
                with_vectors=False,
            )
            if not result:
                break

            batch_book_ids: list[str] = []
            qdrant_id_map: dict[str, str] = {}
            for point in result:
                book_id = (point.payload or {}).get("book_id")
                if book_id:
                    batch_book_ids.append(book_id)
                    qdrant_id_map[book_id] = point.id

            if batch_book_ids:
                oids = []
                for bid in batch_book_ids:
                    try:
                        oids.append(ObjectId(bid))
                    except Exception:
                        pass
                existing_docs = await db["books"].find(
                    {"_id": {"$in": oids}}, {"_id": 1}
                ).to_list(length=len(oids))
                existing_hex = {str(d["_id"]) for d in existing_docs}

                for book_id, qdrant_id in qdrant_id_map.items():
                    try:
                        if str(ObjectId(book_id)) not in existing_hex:
                            orphan_ids.append(qdrant_id)
                    except Exception:
                        pass

            if next_offset is None:
                break
            offset = next_offset

        if orphan_ids:
            await qdrant.delete(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points_selector=orphan_ids,
            )
            logger.info("Qdrant orphan purge: deleted %d vectors.", len(orphan_ids))
        else:
            logger.info("Qdrant orphan purge: no orphans found.")

        client.close()
    except Exception as exc:
        logger.error("Qdrant orphan purge failed: %s", exc, exc_info=True)
