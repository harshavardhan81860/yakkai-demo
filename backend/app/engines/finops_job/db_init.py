import asyncio
import os


from db.engine import engine
from engines.finops_job.db_models import finops_metadata
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("finops_setup")

async def init_finops_db():
    logger.info("Initializing FinOps Database schema and tables...")
    async with engine.begin() as conn:
        # Create schema if it doesn't exist
        logger.info("Creating schema 'finops' if it doesn't exist...")
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS finops;"))
        
        # Create tables based on metadata
        logger.info("Creating tables for FinOps models...")
        await conn.run_sync(finops_metadata.create_all)
    
    logger.info("FinOps Database setup complete.")

if __name__ == "__main__":
    asyncio.run(init_finops_db())
