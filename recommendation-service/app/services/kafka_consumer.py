import asyncio
import json
import logging
from aiokafka import AIOKafkaConsumer
from app.core.config import settings
from app.models.behavior import UserBehaviorEvent
from app.services.interaction_service import process_user_behavior

logger = logging.getLogger(__name__)

class KafkaConsumerService:
    consumer: AIOKafkaConsumer = None
    task: asyncio.Task = None

    @classmethod
    async def start(cls):
        cls.consumer = AIOKafkaConsumer(
            settings.KAFKA_TOPIC_USER_BEHAVIOR,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id="recommendation-group",
            value_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None
        )
        
        # In a generic setup, kafka might be unavailable during startup, 
        # so we should retry connecting
        retry_count = 5
        for i in range(retry_count):
            try:
                await cls.consumer.start()
                logger.info("Kafka consumer started successfully.")
                break
            except Exception as e:
                logger.error(f"Failed to start Kafka consumer: {e}")
                if i < retry_count - 1:
                    await asyncio.sleep(5)
                else:
                    logger.warning("Continuing without Kafka consumer...")
                    return

        cls.task = asyncio.create_task(cls.consume_events())

    @classmethod
    async def consume_events(cls):
        try:
            async for msg in cls.consumer:
                try:
                    event_data = msg.value
                    if event_data:
                        event = UserBehaviorEvent(**event_data)
                        await process_user_behavior(event)
                except Exception as e:
                    logger.error(f"Error processing kafka message: {e}")
        except asyncio.CancelledError:
            logger.info("Kafka consumer task cancelled.")
        except Exception as e:
            logger.error(f"Kafka consumer error: {e}")

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
            logger.info("Kafka consumer stopped.")
