import redis.asyncio as redis
from app.core.config import settings

class RedisClient:
    redis_pool = None

    @classmethod
    async def connect(cls):
        cls.redis_pool = redis.from_url(settings.REDIS_URL, decode_responses=True)

    @classmethod
    async def disconnect(cls):
        if cls.redis_pool:
            await cls.redis_pool.close()

    @classmethod
    def get_client(cls):
        return cls.redis_pool
