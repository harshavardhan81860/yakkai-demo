import asyncio
import os
import sys
import argparse

# Parse Arguments BEFORE importing any custom modules so APP_CONFIG is set globally
parser = argparse.ArgumentParser(description="Run the YakkAI Resource Sync Engine standalone worker.")
parser.add_argument("-c", "--config", type=str, help="Path to the configuration YAML file.")
args, unknown = parser.parse_known_args()

if args.config:
    os.environ["APP_CONFIG"] = args.config
elif not os.getenv("APP_CONFIG"):
    os.environ["APP_CONFIG"] = "config/config.yaml"

import logging
from datetime import datetime, timezone
import traceback

# Ensure backend/app is in PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.future import select

from db.engine import engine, async_session
from models.cloud_resource import ResourceSyncJob, CloudResource
from models.cloud_account import CloudAccount
from core.cloud_auth.auth_provider import cloud_auth_provider
from services.resource_fetch.azure_fetcher import AzureResourceFetcher
from services.resource_fetch.aws_fetcher import AWSResourceFetcher

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("resource_sync_engine")


async def get_next_job(session: AsyncSession) -> ResourceSyncJob:
    """
    Pops the next available PENDING job from the queue using an atomic
    FOR UPDATE SKIP LOCKED query to prevent race conditions.
    """
    stmt = text("""
        UPDATE data.resource_sync_jobs 
        SET status = 'IN_PROGRESS', started_at = NOW() 
        WHERE id = (
            SELECT id FROM data.resource_sync_jobs 
            WHERE status = 'PENDING' 
            ORDER BY created_at ASC 
            LIMIT 1 
            FOR UPDATE SKIP LOCKED
        ) 
        RETURNING *;
    """)
    result = await session.execute(stmt)
    row = result.fetchone()
    if not row:
        return None

    job_id = row[0]
    return await session.get(ResourceSyncJob, job_id)


async def execute_job(session: AsyncSession, job: ResourceSyncJob):
    """Executes the resource fetching for a locked job."""
    try:
        # 1. Fetch Cloud Account
        account = await session.get(CloudAccount, job.cloud_account_id)
        if not account:
            raise ValueError(f"CloudAccount {job.cloud_account_id} no longer exists.")

        provider = account.cloud_provider.lower()
        logger.info(f"Processing Job {job.id} for Account {account.name} (provider={provider})")

        # 2. Get Credentials via CloudAuthProvider
        creds = await cloud_auth_provider.get_credentials(str(account.id))

        # 3. Fetch resources based on provider
        resources = []
        if provider == "aws":
            fetcher = AWSResourceFetcher(region=creds.get("region", "us-east-1"))
            # Pass AWS credentials to the boto3 client
            fetcher.client = __import__('boto3').client(
                'resource-explorer-2',
                region_name=creds.get("region", "us-east-1"),
                aws_access_key_id=creds.get("AccessKeyId"),
                aws_secret_access_key=creds.get("SecretAccessKey"),
                aws_session_token=creds.get("SessionToken"),
            )
            resources = await asyncio.to_thread(fetcher.fetch_resources)

        elif provider == "azure":
            fetcher = AzureResourceFetcher(tenant_id=creds.get("tenant_id", ""))
            # For Azure Resource Graph, override with token-based credential
            from azure.identity import AccessToken
            from azure.core.credentials import TokenCredential

            class StaticTokenCredential(TokenCredential):
                def __init__(self, token: str):
                    self._token = token
                def get_token(self, *scopes, **kwargs):
                    return AccessToken(self._token, 0)

            from azure.mgmt.resourcegraph import ResourceGraphClient
            fetcher.rg_client = ResourceGraphClient(
                credential=StaticTokenCredential(creds["access_token"])
            )
            subscription_id = creds.get("subscription_id", str(account.id))
            resources = await asyncio.to_thread(fetcher.fetch_resources, subscription_id)

        else:
            raise ValueError(f"Unsupported provider: {provider}")

        # 4. Upsert resources into database
        tenant_id = str(account.tenant_id)
        cloud_account_id = str(account.id)

        if resources:
            for res in resources:
                stmt = insert(CloudResource).values(
                    tenant_id=tenant_id,
                    cloud_account_id=cloud_account_id,
                    provider=res["provider"],
                    resource_type=res["resource_type"],
                    provider_resource_id=res["provider_resource_id"],
                    name=res["name"],
                    region=res.get("region"),
                    resource_group=res.get("resource_group"),
                    status=res.get("status", "running"),
                    tags=res.get("tags", {}),
                    last_synced_at=datetime.now(timezone.utc),
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=["provider_resource_id"],
                    set_=dict(
                        status=stmt.excluded.status,
                        tags=stmt.excluded.tags,
                        name=stmt.excluded.name,
                        region=stmt.excluded.region,
                        resource_group=stmt.excluded.resource_group,
                        last_synced_at=stmt.excluded.last_synced_at,
                    ),
                )
                await session.execute(stmt)

        # 5. Mark job as completed
        job.resources_found = len(resources)
        job.status = "COMPLETED"
        job.completed_at = datetime.now(timezone.utc)
        job.error_log = f"Successfully fetched and upserted {len(resources)} resources."
        logger.info(f"Job {job.id} completed. Upserted {len(resources)} resources.")

    except Exception as e:
        logger.error(f"Job {job.id} failed: {e}\n{traceback.format_exc()}")
        job.status = "FAILED"
        job.completed_at = datetime.now(timezone.utc)
        job.error_log = str(e)


async def run_resource_sync_engine():
    """Main loop for the Wake-Sleep worker."""
    logger.info("Starting Resource Sync Engine Worker...")
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
            await session.commit()
            jobs_processed += 1

    logger.info(f"Engine Run Complete. Processed {jobs_processed} jobs.")


if __name__ == "__main__":
    asyncio.run(run_resource_sync_engine())
