import logging
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Distance, VectorParams, OptimizersConfigDiff
from app.core.config import settings

logger = logging.getLogger(__name__)

class QdrantManager:
    """Singleton async Qdrant client wrapper."""
    _client: AsyncQdrantClient = None

    @classmethod
    def get_client(cls) -> AsyncQdrantClient:
        if cls._client is None:
            raise RuntimeError("QdrantManager is not initialized. Call connect() first.")
        return cls._client

    @classmethod
    async def connect(cls):
        cls._client = AsyncQdrantClient(url=settings.QDRANT_URL)
        await cls._ensure_collection()
        logger.info(f"Qdrant connected at {settings.QDRANT_URL}")

    @classmethod
    async def _ensure_collection(cls):
        """Create the 'books' collection if it does not exist yet."""
        collections = await cls._client.get_collections()
        existing = {c.name for c in collections.collections}
        if settings.QDRANT_COLLECTION_NAME not in existing:
            await cls._client.create_collection(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=384,           # multilingual-e5-small output dimension
                    distance=Distance.COSINE,
                ),
                optimizers_config=OptimizersConfigDiff(
                    indexing_threshold=0,  # Index immediately even on small datasets
                ),
            )
            logger.info(f"Qdrant collection '{settings.QDRANT_COLLECTION_NAME}' created.")
        else:
            logger.info(f"Qdrant collection '{settings.QDRANT_COLLECTION_NAME}' already exists.")

    @classmethod
    async def disconnect(cls):
        if cls._client:
            await cls._client.close()
            cls._client = None
            logger.info("Qdrant client disconnected.")
