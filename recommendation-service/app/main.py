from fastapi import FastAPI
from app.core.config import settings
from app.core.mongodb import MongoDBClient
from app.core.redis_client import RedisClient
from app.services.kafka_consumer import KafkaConsumerService
from app.api.endpoints import router as api_router
import asyncio
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    # Connect to MongoDB
    MongoDBClient.connect()
    # Connect to Redis
    await RedisClient.connect()
    # Start Kafka Consumer
    await KafkaConsumerService.start()

@app.on_event("shutdown")
async def shutdown_event():
    await KafkaConsumerService.stop()
    MongoDBClient.disconnect()
    await RedisClient.disconnect()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}
