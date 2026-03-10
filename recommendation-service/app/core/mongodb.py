from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class MongoDBClient:
    client: AsyncIOMotorClient = None

    @classmethod
    def connect(cls):
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)

    @classmethod
    def disconnect(cls):
        if cls.client:
            cls.client.close()

    @classmethod
    def get_db(cls):
        return cls.client[settings.DATABASE_NAME]
