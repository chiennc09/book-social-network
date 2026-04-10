"""
Scheduled background jobs for the recommendation service.

Uses APScheduler with the AsyncIO backend so all jobs run inside the same
event loop as FastAPI — no extra threads, no synchronisation issues.
"""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import settings
from app.services.training_service import train_als_model

logger = logging.getLogger(__name__)


class SchedulerService:
    _scheduler: AsyncIOScheduler | None = None

    @classmethod
    def start(cls) -> None:
        """
        Initialise and start the APScheduler.
        The training job fires every TRAINING_CRON_HOURS hours.
        A short initial delay (60 s) lets all startup connections stabilise
        before the first training run.
        """
        if cls._scheduler is not None:
            logger.warning("Scheduler is already running — skipping re-init.")
            return

        cls._scheduler = AsyncIOScheduler()

        cls._scheduler.add_job(
            cls._run_training,
            trigger="interval",
            hours=settings.TRAINING_CRON_HOURS,
            id="als_training",
            name="ALS Model Training",
            # start_date is 60 seconds from now so services have time to
            # connect to MongoDB/Redis before the first training attempt.
            seconds=60,  # initial delay via misfire_grace_time isn't available; use next_run_time instead
            replace_existing=True,
            misfire_grace_time=300,   # tolerate up to 5 min delay before skipping
            coalesce=True,            # if multiple triggers missed, only run once
        )

        cls._scheduler.start()
        logger.info(
            "Scheduler started. ALS training will run every %d hour(s).",
            settings.TRAINING_CRON_HOURS,
        )

    @classmethod
    def stop(cls) -> None:
        if cls._scheduler and cls._scheduler.running:
            cls._scheduler.shutdown(wait=False)
            cls._scheduler = None
            logger.info("Scheduler stopped.")

    @staticmethod
    async def _run_training() -> None:
        """Wrapper that catches all exceptions so the scheduler job never crashes."""
        try:
            result = await train_als_model()
            logger.info("Scheduled training finished: %s", result)
        except Exception as exc:
            logger.error("Scheduled training failed: %s", exc, exc_info=True)
