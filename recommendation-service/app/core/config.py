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
    # Training overwrites this key every TRAINING_CRON_HOURS (6h).
    # TTL = 30 ngày chỉ là safety-net: nếu service ngừng hoạt động lâu ngày
    # thì cache cũng tự hết thay vì phục vụ dữ liệu cũ mãi mãi.
    # Không cần lo TTL "xoá" gợi ý vì training 6h sẽ ghi đè sớm hơn.
    REDIS_REC_TTL_SECONDS: int = 2_592_000    # 30 ngày

    # ── Short-term recommendation cache (today_rec:{userId}) ─────────────────
    # Invalidated on every interaction; TTL is a safety-net only.
    REDIS_TODAY_TTL_SECONDS: int = 3_600      # 1 giờ

    # ── Backup list when today_rec expires or is empty ────────────────────────
    # Stores the tail portion (books 11-20) of the previous today_rec result.
    REDIS_BACKUP_TTL_SECONDS: int = 604_800   # 7 ngày

    # ── Session window (recent_views:{userId}) ────────────────────────────────
    REDIS_RECENT_VIEWS_MAX: int = 10
    REDIS_RECENT_VIEWS_TTL_SECONDS: int = 172_800   # 48 giờ

    # ── View-cap per (user, book) ─────────────────────────────────────────────
    REDIS_VIEW_CAP_COUNT: int = 3
    REDIS_VIEW_CAP_TTL_SECONDS: int = 2_592_000     # 30 ngày

    # ── Training cycle ────────────────────────────────────────────────────────
    TRAINING_CRON_HOURS: int = 6

    # ── Hybrid blending weights ───────────────────────────────────────────────
    HYBRID_ALS_WEIGHT: float = 0.6
    HYBRID_CBF_WEIGHT: float = 0.4

    # ── Interaction thresholds ────────────────────────────────────────────────
    # < COLD_START_THRESHOLD  → Trending only
    # >= COLD_START_THRESHOLD → Short-term (CBF) + Long-term (CBF or Hybrid)
    COLD_START_THRESHOLD: int = 3

    # Minimum interactions before ALS training is useful for a user
    ALS_MIN_INTERACTIONS: int = 10

    # Number of ALS candidates before CBF re-ranking
    ALS_CANDIDATE_COUNT: int = 50

    # Final top-K stored per user in long-term cache
    TOP_K_LONG_TERM: int = 20

    # Short-term recommendations size
    TOP_K_SHORT_TERM: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
