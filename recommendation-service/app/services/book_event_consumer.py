"""
Kafka consumer for book-events topic.

Listens to CREATE / UPDATE / DELETE events published by book-service
and keeps the Qdrant vector index + Redis recommendation caches in sync.

Expected Kafka message schema (JSON):
{
  "eventType": "BOOK_CREATED" | "BOOK_UPDATED" | "BOOK_DELETED",
  "book": {
    "id":            "string",
    "title":         "string",
    "description":   "string",
    "authors":       ["string", ...],
    "category_id":   "string",
    "category_name": "string"
  }
}
"""
import asyncio
import json
import logging
from aiokafka import AIOKafkaConsumer
from app.core.config import settings
from app.core.redis_client import RedisClient
from app.services.embedding_service import index_book, delete_book

logger = logging.getLogger(__name__)


async def flush_redis_caches_for_book(book_id: str) -> None:
    """
    Invalidate all Redis recommendation caches that might contain a deleted book.

    Keys invalidated:
      - today_rec:*          — per-user 24h short-term cache (scan pattern)
      - rec:*                — per-user long-term ALS cache (scan pattern)
      - rec:global_trending  — global trending list
      - recent_views:*       — session view history (scan pattern, remove bookId)

    NOTE: scan + delete is O(N) on large Redis databases.
    For production scale, use a sorted-set index of "which users saw <bookId>".
    Here the dataset is small so a full SCAN is acceptable.
    """
    redis = RedisClient.get_client()
    if redis is None:
        logger.warning("flush_redis_caches_for_book: Redis not connected, skip.")
        return

    deleted_count = 0

    # -- Flush today_rec:* and rec:* (simple delete — next request rebuilds fresh) --
    for pattern in ["today_rec:*", "rec:*"]:
        async for key in redis.scan_iter(pattern):
            await redis.delete(key)
            deleted_count += 1

    # -- Clean recent_views:* lists (remove the deleted bookId from each) --
    async for key in redis.scan_iter("recent_views:*"):
        # LREM 0 = remove all occurrences of book_id from the list
        removed = await redis.lrem(key, 0, book_id)
        if removed:
            logger.debug(f"Removed bookId '{book_id}' from {key}")

    logger.info(
        f"Redis cache flush for BOOK_DELETED '{book_id}': "
        f"deleted {deleted_count} cache keys."
    )


class BookEventConsumer:
    consumer: AIOKafkaConsumer = None
    task: asyncio.Task = None

    @classmethod
    async def start(cls):
        cls.consumer = AIOKafkaConsumer(
            settings.KAFKA_TOPIC_BOOK_EVENTS,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id="recommendation-book-indexer",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")) if m else None,
            auto_offset_reset="earliest",
        )

        retry_count = 5
        for attempt in range(retry_count):
            try:
                await cls.consumer.start()
                logger.info("BookEventConsumer started successfully.")
                break
            except Exception as exc:
                logger.error(f"BookEventConsumer start attempt {attempt + 1} failed: {exc}")
                if attempt < retry_count - 1:
                    await asyncio.sleep(5)
                else:
                    logger.warning("BookEventConsumer could not start — book indexing will be unavailable.")
                    return

        cls.task = asyncio.create_task(cls._consume())

    @classmethod
    async def _consume(cls):
        try:
            async for msg in cls.consumer:
                if not msg.value:
                    continue
                try:
                    await cls._handle(msg.value)
                except Exception as exc:
                    logger.error(f"BookEventConsumer error handling message: {exc}", exc_info=True)
        except asyncio.CancelledError:
            logger.info("BookEventConsumer task cancelled.")
        except Exception as exc:
            logger.error(f"BookEventConsumer fatal error: {exc}", exc_info=True)

    @classmethod
    async def _handle(cls, payload: dict):
        event_type = payload.get("eventType", "")
        book = payload.get("book")

        if not book:
            logger.warning(f"BookEventConsumer: missing 'book' in payload: {payload}")
            return

        book_id = book.get("id")
        if not book_id:
            logger.warning("BookEventConsumer: 'book.id' is missing, skipping.")
            return

        if event_type in ("BOOK_CREATED", "BOOK_UPDATED"):
            await index_book(book)

        elif event_type == "BOOK_DELETED":
            # 1. Remove vector from Qdrant
            await delete_book(book_id)
            # 2. Invalidate all recommendation caches that could contain this book
            await flush_redis_caches_for_book(book_id)
            logger.info(f"BOOK_DELETED '{book_id}': Qdrant vector removed + Redis caches flushed.")

        else:
            logger.debug(f"BookEventConsumer: unknown eventType '{event_type}', skipping.")

    @classmethod
    async def stop(cls):
        if cls.task:
            cls.task.cancel()
            try:
                await cls.task
            except asyncio.CancelledError:
                pass
        if cls.consumer:
            await cls.consumer.stop()
            logger.info("BookEventConsumer stopped.")
