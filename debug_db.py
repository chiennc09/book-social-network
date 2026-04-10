import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis

async def run_debug():
    print("Connecting to MongoDB...")
    mongo_client = AsyncIOMotorClient("mongodb://root:root@localhost:27017/recommendation-service?authSource=admin")
    db = mongo_client.get_database("recommendation-service")
    
    count = await db.user_item_scores.count_documents({})
    print(f"Total user_item_scores in MongoDB: {count}")
    
    if count > 0:
        cursor = db.user_item_scores.find().limit(5)
        docs = await cursor.to_list(length=5)
        print("Sample data:")
        for doc in docs:
            print(f"  User: {doc.get('userId')}, Book: {doc.get('bookId')}, Total Score: {doc.get('totalScore')}")
            
    print("\nConnecting to Redis...")
    r = redis.from_url("redis://localhost:6379", decode_responses=True)
    
    keys = await r.keys("rec:*")
    print(f"Total recommendation keys in Redis: {len(keys)}")
    
    if len(keys) > 0:
        for k in keys[:5]:
            val = await r.get(k)
            print(f"  {k} -> {val}")
            
    mongo_client.close()
    await r.close()

if __name__ == "__main__":
    asyncio.run(run_debug())
