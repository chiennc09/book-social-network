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
    delete_book as qdrant_delete_book,
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


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_valid_book_ids_from_mongo(book_ids: list[str]) -> list[str]:
    """
    Filter a list of bookIds to only those that still exist in book-service MongoDB.

    Uses the 'book-service' MongoDB database to verify existence.
    Returns bookIds in the same order, skipping deleted ones.
    """
    if not book_ids:
        return []

    try:
        # NOTE: recommendation-service connects to its own MongoDB database.
        # To verify book existence we need the book-service database.
        # The BOOK_SERVICE_MONGODB_URL env var points to that DB.
        from motor.motor_asyncio import AsyncIOMotorClient
        book_db_url = settings.BOOK_SERVICE_MONGODB_URL
        client = AsyncIOMotorClient(book_db_url)
        db = client["book-service"]

        # Use $in query — much faster than N individual lookups
        from bson import ObjectId
        oid_map: dict[str, str] = {}  # ObjectId hex string -> original book_id
        for bid in book_ids:
            try:
                oid_map[ObjectId(bid)] = bid
            except Exception:
                pass  # Non-ObjectId IDs — skip validation, keep them

        if not oid_map:
            return book_ids  # All non-ObjectId IDs, skip validation

        existing_docs = await db["books"].find(
            {"_id": {"$in": list(oid_map.keys())}},
            {"_id": 1}
        ).to_list(length=len(oid_map))

        existing_hex = {str(d["_id"]) for d in existing_docs}

        # Preserve original order
        valid = []
        for bid in book_ids:
            try:
                hex_id = str(ObjectId(bid))
                if hex_id in existing_hex:
                    valid.append(bid)
                else:
                    logger.debug(f"Recommendation filter: book '{bid}' not found in book-service DB (deleted).")
            except Exception:
                valid.append(bid)  # Non-ObjectId IDs pass through

        client.close()
        return valid

    except Exception as exc:
        logger.warning(f"_get_valid_book_ids_from_mongo failed: {exc} — returning all IDs unfiltered.")
        return book_ids  # Fail-open: don't block recommendations on DB errors


# ─── GET /recommendations/{user_id}  (Long-term: ALS + CBF) ───────────────────

@router.get("/recommendations/{user_id}", response_model=RecommendationResponse)
async def get_recommendations(user_id: str):
    try:
        redis_client = RedisClient.get_client()

        recs_json = await redis_client.get(f"rec:{user_id}")
        if recs_json:
            cached_ids = json.loads(recs_json)
            valid_ids = await _get_valid_book_ids_from_mongo(cached_ids)
            if valid_ids != cached_ids:
                # Update cache with cleaned list
                await redis_client.set(f"rec:{user_id}", json.dumps(valid_ids), ex=settings.REDIS_TTL_SECONDS)
            return RecommendationResponse(
                userId=user_id,
                recommendedBookIds=valid_ids,
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
                valid_recs = await _get_valid_book_ids_from_mongo(recs)
                return RecommendationResponse(
                    userId=user_id, recommendedBookIds=valid_recs, source="cbf-only"
                )

        # Absolute cold-start → trending
        trending_json = await redis_client.get("rec:global_trending")
        if trending_json:
            trending_ids = json.loads(trending_json)
            valid_trending = await _get_valid_book_ids_from_mongo(trending_ids)
            return RecommendationResponse(
                userId=user_id,
                recommendedBookIds=valid_trending,
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

    All returned bookIds are validated against the live book-service database
    to prevent returning stale/deleted books.
    """
    try:
        redis_client = RedisClient.get_client()
        today_key = f"today_rec:{user_id}"

        # ── 1. Cache hit ──────────────────────────────────────────────────────
        cached = await redis_client.get(today_key)
        if cached:
            cached_ids = json.loads(cached)
            valid_ids = await _get_valid_book_ids_from_mongo(cached_ids)
            if valid_ids != cached_ids:
                # Stale IDs found — update cache
                await redis_client.set(today_key, json.dumps(valid_ids), ex=settings.REDIS_TTL_SECONDS)
            return TodayRecommendationResponse(
                userId=user_id,
                todayBookIds=valid_ids,
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

        # ── Validate: remove book IDs that no longer exist in book-service ────
        if result_ids:
            result_ids = await _get_valid_book_ids_from_mongo(result_ids)

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
        valid_ids = await _get_valid_book_ids_from_mongo(similar_ids)
        return SimilarBooksResponse(bookId=book_id, similarBookIds=valid_ids)
    except Exception as exc:
        logger.error(f"Error fetching similar books for {book_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ─── POST /jobs/train ──────────────────────────────────────────────────────────

@router.post("/jobs/train")
async def trigger_training(background_tasks: BackgroundTasks):
    background_tasks.add_task(train_hybrid_model)
    return {"status": "Training job triggered"}


# ─── POST /admin/flush-cache ───────────────────────────────────────────────────

@router.post("/admin/flush-cache")
async def flush_all_recommendation_caches():
    """
    Flush ALL recommendation caches from Redis.

    USE THIS when:
      - You have reset / re-seeded the book database
      - You want to force fresh recommendations for all users
      - You suspect stale data is being served

    This is a destructive operation — all users will get rebuilt recommendations
    on their next request. Use with caution in production.
    """
    redis_client = RedisClient.get_client()
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Redis not connected")

    deleted = 0
    for pattern in ["today_rec:*", "rec:*", "recent_views:*"]:
        async for key in redis_client.scan_iter(pattern):
            await redis_client.delete(key)
            deleted += 1

    logger.info(f"Admin flush-cache: deleted {deleted} Redis keys.")
    return {"status": "ok", "deleted_keys": deleted}


# ─── POST /admin/purge-qdrant-orphans ─────────────────────────────────────────

@router.post("/admin/purge-qdrant-orphans")
async def purge_qdrant_orphans(background_tasks: BackgroundTasks):
    """
    Scan Qdrant collection and delete any vectors whose bookId no longer exists
    in the book-service MongoDB.

    Run this after:
      - A bulk book deletion that bypassed Kafka (e.g. direct DB wipe)
      - Data migration / reseed operations

    The scan runs as a background task — returns immediately.
    Monitor recommendation-service logs for progress.
    """
    background_tasks.add_task(_purge_qdrant_orphans_task)
    return {"status": "Purge job started — check logs for progress"}


async def _purge_qdrant_orphans_task():
    """Background task: scan Qdrant for orphan vectors and delete them."""
    from app.core.qdrant_client import QdrantManager
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId

    logger.info("Starting Qdrant orphan purge...")

    try:
        qdrant = QdrantManager.get_client()
        book_db_url = settings.BOOK_SERVICE_MONGODB_URL
        mongo = AsyncIOMotorClient(book_db_url)
        db = mongo["book-service"]

        # Scroll through ALL Qdrant points (paginated)
        orphan_qdrant_ids = []
        offset = None
        batch_size = 100

        while True:
            result, next_offset = await qdrant.scroll(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                offset=offset,
                limit=batch_size,
                with_payload=True,
                with_vectors=False,
            )

            if not result:
                break

            # Collect book_ids from payload
            batch_book_ids = []
            qdrant_id_map: dict[str, str] = {}  # book_id -> qdrant point id

            for point in result:
                book_id = point.payload.get("book_id") if point.payload else None
                if book_id:
                    batch_book_ids.append(book_id)
                    qdrant_id_map[book_id] = point.id

            # Check which still exist in MongoDB
            if batch_book_ids:
                oids = []
                for bid in batch_book_ids:
                    try:
                        oids.append(ObjectId(bid))
                    except Exception:
                        pass  # Non-ObjectId — assume valid

                existing_docs = await db["books"].find(
                    {"_id": {"$in": oids}}, {"_id": 1}
                ).to_list(length=len(oids))
                existing_hex = {str(d["_id"]) for d in existing_docs}

                for book_id, qdrant_id in qdrant_id_map.items():
                    try:
                        hex_id = str(ObjectId(book_id))
                        if hex_id not in existing_hex:
                            orphan_qdrant_ids.append(qdrant_id)
                    except Exception:
                        pass  # Non-ObjectId IDs are kept

            if next_offset is None:
                break
            offset = next_offset

        # Delete orphans
        if orphan_qdrant_ids:
            await qdrant.delete(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points_selector=orphan_qdrant_ids,
            )
            logger.info(f"Qdrant orphan purge: deleted {len(orphan_qdrant_ids)} orphan vectors.")
        else:
            logger.info("Qdrant orphan purge: no orphans found.")

        mongo.close()

    except Exception as exc:
        logger.error(f"Qdrant orphan purge failed: {exc}", exc_info=True)
