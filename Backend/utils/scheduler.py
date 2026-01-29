
import logging
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def heartbeat_job():
    """
    This job will hit the /health endpoint to simulate a self-ping or heartbeat.
    """
    try:
        # Assuming your FastAPI app runs on http://localhost:8000
        # You might need to adjust this URL if your app is deployed elsewhere
        async with httpx.AsyncClient() as client:
            response = await client.get("https://ed-iq.onrender.com/health")
            response.raise_for_status()
            logger.info(f"Heartbeat job successfully pinged /health. Status: {response.status_code}")
    except httpx.RequestError as exc:
        logger.error(f"Heartbeat job failed to ping /health: {exc}")
    except httpx.HTTPStatusError as exc:
        logger.error(f"Heartbeat job received error response from /health: {exc.response.status_code} - {exc.response.text}")
    except Exception as e:
        logger.error(f"An unexpected error occurred in heartbeat_job: {e}")

def start_scheduler():
    """
    Starts the APScheduler and adds the heartbeat job.
    """
    if not scheduler.running:
        scheduler.add_job(heartbeat_job, "interval", minutes=15, id="heartbeat_job")
        scheduler.start()
        logger.info("Scheduler started with heartbeat job (every 15 minutes).")

def shutdown_scheduler():
    """
    Shuts down the APScheduler.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down.")
