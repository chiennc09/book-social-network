from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Recommendation Service"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9094" # Local direct access port
    KAFKA_TOPIC_USER_BEHAVIOR: str = "user-behavior-events"
    REDIS_URL: str = "redis://localhost:6379"
    MONGODB_URL: str = "mongodb://localhost:27017" # Since microservices connect locally, assuming 27017
    DATABASE_NAME: str = "recommendation-service"
    
    class Config:
        env_file = ".env"

settings = Settings()
