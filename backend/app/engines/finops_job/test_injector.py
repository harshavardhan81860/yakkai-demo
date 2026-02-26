import asyncio
import os
import sys
from datetime import date, timedelta
import uuid

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from db.engine import engine, async_session
from sqlalchemy.future import select
from models.cloud_account import CloudAccount
from engines.finops_job.db_models import FetchJob
from core.config import load_config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_injector")

async def inject_test_jobs():
    async with async_session() as session:
        # Find any active AWS or Azure account to test
        stmt = select(CloudAccount).limit(1)
        result = await session.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            logger.error("No Cloud Accounts found in database to test FinOps against!")
            return
            
        logger.info(f"Injecting a Test PENDING FinOps Job for Account: {account.name} ({account.cloud_provider})")
        
        # Test pulling yesterday's data
        target_date = date.today() - timedelta(days=1)
        
        new_job = FetchJob(
            account_id=account.id,
            target_date=target_date,
            status="PENDING"
        )
        session.add(new_job)
        await session.commit()
        
        logger.info(f"Successfully injected PENDING Job {new_job.id}. Target Date: {target_date}")

if __name__ == "__main__":
    asyncio.run(inject_test_jobs())
