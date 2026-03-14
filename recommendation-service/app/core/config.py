from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Recommendation Service"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9094"
    KAFKA_TOPIC_USER_BEHAVIOR: str = "user-behavior-events"
    REDIS_URL: str = "redis://localhost:6379"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "recommendation-service"

    # Recommendations cached in Redis for 24h.
    # If training doesn't run before expiry, the key disappears and the
    # next request gets an empty list (cold-start path).
    REDIS_TTL_SECONDS: int = 86_400  # 24 hours

    # How often the ALS model is re-trained automatically (in hours).
    TRAINING_CRON_HOURS: int = 6

    class Config:
        env_file = ".env"

settings = Settings()
