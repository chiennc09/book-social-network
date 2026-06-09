from fastapi import FastAPI
from app.core.config import settings
from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.core.qdrant_client import QdrantManager
from app.services.kafka_consumer import KafkaConsumerService
from app.services.book_event_consumer import BookEventConsumer
from app.services.embedding_service import get_model
from app.services.scheduled_tasks import SchedulerService
from app.api.endpoints import router as api_router
import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
)

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    # 1. Connect to datastores
    MongoDBClient.connect()
    await RedisClient.connect()
    await QdrantManager.connect()

    # 2. Pre-load the embedding model to avoid cold-start lag on first request
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, get_model)

    # 3. Start Kafka consumers
    await KafkaConsumerService.start()
    await BookEventConsumer.start()

    # 4. Start periodic training scheduler
    SchedulerService.start()


@app.on_event("shutdown")
async def shutdown_event():
    SchedulerService.stop()
    await KafkaConsumerService.stop()
    await BookEventConsumer.stop()
    MongoDBClient.disconnect()
    await RedisClient.disconnect()
    await QdrantManager.disconnect()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}
