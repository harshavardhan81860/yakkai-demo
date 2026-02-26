import asyncio
import os
import sys
import argparse

# Parse Arguments BEFORE importing any custom modules so APP_CONFIG is set globally
parser = argparse.ArgumentParser(description="Run the YakkAI FinOps Engine standalone worker.")
parser.add_argument("-c", "--config", type=str, help="Path to the configuration YAML file.")
# We use parse_known_args in case this is imported elsewhere contextually, though unlikely for main.py
args, unknown = parser.parse_known_args()

if args.config:
    os.environ["APP_CONFIG"] = args.config
elif not os.getenv("APP_CONFIG"):
    os.environ["APP_CONFIG"] = "config/config.yaml"

import logging
from datetime import date, datetime, timezone
import traceback

# Ensure backend/app is in PYTHONPATH to import db.engine and core.config properly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, delete
from sqlalchemy.future import select

from db.engine import engine, async_session
from engines.finops_job.db_models import FetchJob, DailyCost
from models.cloud_account import CloudAccount
from services.finops.aws_cost_service import aws_cost_service
from services.finops.azure_cost_service import azure_cost_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("finops_engine")

async def get_next_job(session: AsyncSession) -> FetchJob:
    """
    Pops the next available PENDING job from the queue using an atomic
    FOR UPDATE SKIP LOCKED query to prevent race conditions.
    """
    stmt = text("""
        UPDATE finops.fetch_jobs 
        SET status = 'IN_PROGRESS', started_at = NOW() 
        WHERE id = (
            SELECT id FROM finops.fetch_jobs 
            WHERE status = 'PENDING' 
            ORDER BY start_date ASC 
            LIMIT 1 
            FOR UPDATE SKIP LOCKED
        ) 
        RETURNING *;
    """)
    result = await session.execute(stmt)
    row = result.fetchone()
    if not row:
        return None
        
    # Re-fetch as a SQLAlchemy Object
    job_id = row[0]
    return await session.get(FetchJob, job_id)

async def execute_job(session: AsyncSession, job: FetchJob):
    """Executes the data fetching for a locked job."""
    try:
        # 1. Fetch Cloud Account
        account = await session.get(CloudAccount, job.account_id)
        if not account:
            raise ValueError(f"CloudAccount {job.account_id} no longer exists.")
            
        provider = account.cloud_provider.lower()
        start_date = job.start_date
        end_date = job.end_date
        
        # AWS Cost Explorer needs the "End" date to be exclusive (+1 day)
        # Azure includes the end date.
        logger.info(f"Processing Job {job.id} for Account {account.name} from {start_date} to {end_date}")
        
        costs = []
        if provider == "aws":
            costs = await aws_cost_service.fetch_costs(account, start_date, end_date + timedelta(days=1))
        elif provider == "azure":
            costs = await azure_cost_service.fetch_costs(account, start_date, end_date)
        else:
            raise ValueError(f"Unsupported provider: {provider}")
            
        # 2. Delete any existing overlapping records for this account to maintain idempotency
        del_stmt = delete(DailyCost).where(
            DailyCost.account_id == account.id,
            DailyCost.date >= start_date,
            DailyCost.date <= end_date
        )
        await session.execute(del_stmt)
        
        # 3. Batch Insert Normalized Costs
        if costs:
            db_costs = [DailyCost(**cost_data) for cost_data in costs]
            session.add_all(db_costs)
            
        # 4. Success Completion
        job.status = "COMPLETED"
        job.completed_at = datetime.now(timezone.utc)
        job.error_log = f"Successfully fetched and inserted {len(costs)} records."
        logger.info(f"Job {job.id} completed. Inserted {len(costs)} records.")
        
    except Exception as e:
        logger.error(f"Job {job.id} failed: {e}\n{traceback.format_exc()}")
        job.status = "FAILED"
        job.completed_at = datetime.now(timezone.utc)
        job.error_log = str(e)

async def run_finops_engine():
    """Main loop for the Wake-Sleep worker."""
    logger.info("Starting FinOps Engine Worker...")
    jobs_processed = 0
    
    async with async_session() as session:
        while True:
            # Atomic Queue Pop
            job = await get_next_job(session)
            
            if not job:
                logger.info("Queue is empty. Engine transitioning to SLEEP (Terminating).")
                break
                
            # Process Job
            await execute_job(session, job)
            await session.commit() # Commit transaction to apply job status and insert costs
            jobs_processed += 1
            
    logger.info(f"Engine Run Complete. Processed {jobs_processed} jobs.")

if __name__ == "__main__":
    from datetime import timedelta # deferred import for script
    asyncio.run(run_finops_engine())
