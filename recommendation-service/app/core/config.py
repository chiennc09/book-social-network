from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Recommendation Service"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9094"
    KAFKA_TOPIC_USER_BEHAVIOR: str = "user-behavior-events"
    KAFKA_TOPIC_BOOK_EVENTS: str = "book-events"           # Book created/updated events
    REDIS_URL: str = "redis://localhost:6379"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "recommendation-service"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_NAME: str = "books"
    EMBEDDING_MODEL_NAME: str = "intfloat/multilingual-e5-small"

    # Recommendations cached in Redis for 24h.
    REDIS_TTL_SECONDS: int = 86_400  # 24 hours

    # How often the ALS model is re-trained automatically (in hours).
    TRAINING_CRON_HOURS: int = 6

    # Hybrid weights: ALS collaborative score vs content-based similarity
    HYBRID_ALS_WEIGHT: float = 0.6
    HYBRID_CBF_WEIGHT: float = 0.4

    # Min interactions before ALS is applied; below this, CBF-only is used
    COLD_START_THRESHOLD: int = 5

    class Config:
        env_file = ".env"

settings = Settings()
