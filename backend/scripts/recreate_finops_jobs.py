import sys
import os
import asyncio

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../app')))
from db.engine import engine
from engines.finops_job.db_models import FetchJob

async def run():
    async with engine.begin() as conn:
        print("Dropping fetch_jobs table...")
        await conn.run_sync(FetchJob.__table__.drop)
        print("Recreating fetch_jobs table...")
        await conn.run_sync(FetchJob.__table__.create)
    print("Done")

if __name__ == '__main__':
    asyncio.run(run())
