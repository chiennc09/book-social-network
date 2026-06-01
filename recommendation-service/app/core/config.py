from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Recommendation Service"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9094"
    KAFKA_TOPIC_USER_BEHAVIOR: str = "user-behavior-events"
    KAFKA_TOPIC_BOOK_EVENTS: str = "book-events"
    REDIS_URL: str = "redis://localhost:6379"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "recommendation-service"

    # MongoDB URL for the book-service database (validates stale bookIds before serving recs)
    BOOK_SERVICE_MONGODB_URL: str = "mongodb://localhost:27017"

    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_NAME: str = "books"
    EMBEDDING_MODEL_NAME: str = "intfloat/multilingual-e5-small"

    # ── Long-term recommendation cache (rec:{userId}) ────────────────────────
    # Được ghi sau mỗi chu kỳ ALS training (mặc định 6h).
    # TTL = 8h để cache không bao giờ bị stale quá 2h sau chu kỳ training.
    # Nếu training thất bại, cache vẫn phục vụ được thêm 2h trước khi hết.
    REDIS_TTL_SECONDS: int = 86_400       # 24 giờ

    # ── Training cycle ────────────────────────────────────────────────────────
    # ALS được train lại mỗi 6 giờ (= 4 lần/ngày)
    # Cân bằng giữa freshness và chi phí tính toán
    TRAINING_CRON_HOURS: int = 6

    # ── Hybrid blending weights ───────────────────────────────────────────────
    # ALS (collaborative): bắt pattern từ cộng đồng người dùng tương tự
    # CBF (content-based): bắt sở thích nội dung cụ thể của user
    HYBRID_ALS_WEIGHT: float = 0.6
    HYBRID_CBF_WEIGHT: float = 0.4

    # ── Cold start threshold ──────────────────────────────────────────────────
    # < 5 interactions: Global Trending
    # 5-20 interactions: CBF-only (content similarity)
    # > 20 + sau ALS training: Full Hybrid
    COLD_START_THRESHOLD: int = 5

    class Config:
        env_file = ".env"

settings = Settings()
