"""
Scheduled background jobs for the recommendation service.

Uses APScheduler with the AsyncIO backend so all jobs run inside the same
event loop as FastAPI — no extra threads, no synchronisation issues.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import settings
from app.services.training_service import train_hybrid_model   # ← correct function name

logger = logging.getLogger(__name__)


class SchedulerService:
    _scheduler: AsyncIOScheduler | None = None

    @classmethod
    def start(cls) -> None:
        """
        Initialise and start the APScheduler.
        Training fires every TRAINING_CRON_HOURS hours.
        A 90-second initial delay lets all startup connections stabilise
        before the very first training run.
        """
        if cls._scheduler is not None:
            logger.warning("Scheduler already running — skipping re-init.")
            return

        import datetime as dt

        cls._scheduler = AsyncIOScheduler()
        first_run = dt.datetime.now() + dt.timedelta(seconds=90)

        cls._scheduler.add_job(
            cls._run_training,
            trigger="interval",
            hours=settings.TRAINING_CRON_HOURS,
            id="hybrid_training",
            name="Hybrid ALS+CBF Model Training",
            next_run_time=first_run,
            replace_existing=True,
            misfire_grace_time=600,   # tolerate up to 10 min delay before skipping
            coalesce=True,            # if multiple triggers were missed, only run once
        )

        cls._scheduler.start()
        logger.info(
            "Scheduler started. Hybrid training every %dh (first run at %s).",
            settings.TRAINING_CRON_HOURS,
            first_run.strftime("%H:%M:%S"),
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
            result = await train_hybrid_model()
            logger.info("Scheduled training finished: %s", result)
        except Exception as exc:
            logger.error("Scheduled training failed: %s", exc, exc_info=True)
