from fastapi import FastAPI
from app.core.config import settings
from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.services.kafka_consumer import KafkaConsumerService
from app.services.scheduled_tasks import SchedulerService
from app.api.endpoints import router as api_router
import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    # 1. Databases first (training jobs depend on them)
    MongoDBClient.connect()
    await RedisClient.connect()
    # 2. Kafka consumer for real-time event ingestion
    await KafkaConsumerService.start()
    # 3. Periodic training scheduler (starts after connections are live)
    SchedulerService.start()

@app.on_event("shutdown")
async def shutdown_event():
    SchedulerService.stop()
    await KafkaConsumerService.stop()
    MongoDBClient.disconnect()
    await RedisClient.disconnect()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}
