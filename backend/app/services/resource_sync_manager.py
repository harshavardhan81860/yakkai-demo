import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone
from fastapi import HTTPException
from typing import List, Dict, Any

from models.cloud_resource import ResourceSyncJob
from models.cloud_account import CloudAccount

logger = logging.getLogger(__name__)


class ResourceSyncManager:
    """
    Manages the SCHEDULING and history of Cloud Resource sync jobs.
    This class only creates PENDING jobs — actual execution is handled
    by a separate standalone engine (engines/resource_sync/main.py).
    """

    async def get_sync_history(
        self, session: AsyncSession, cloud_account_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve the last N execution history logs for a cloud account."""
        stmt = (
            select(ResourceSyncJob)
            .where(ResourceSyncJob.cloud_account_id == cloud_account_id)
            .order_by(desc(ResourceSyncJob.created_at))
            .limit(limit)
        )
        result = await session.execute(stmt)
        jobs = result.scalars().all()

        return [
            {
                "id": str(j.id),
                "cloud_account_id": str(j.cloud_account_id),
                "status": j.status,
                "started_at": j.started_at,
                "completed_at": j.completed_at,
                "resources_found": j.resources_found,
                "error_log": j.error_log,
                "created_at": j.created_at,
            }
            for j in jobs
        ]

    async def trigger_sync(
        self, session: AsyncSession, cloud_account_id: str
    ) -> Dict[str, Any]:
        """
        Validates account exists.
        Checks no PENDING/IN_PROGRESS job exists for the account.
        Creates a PENDING job — the engine will pick it up later.
        """

        # 1. Validate account
        account = await session.get(CloudAccount, cloud_account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Cloud account not found")

        # 2. Check for active/pending jobs (prevent duplicates)
        active_stmt = select(ResourceSyncJob).where(
            ResourceSyncJob.cloud_account_id == cloud_account_id,
            ResourceSyncJob.status.in_(["PENDING", "IN_PROGRESS"]),
        )
        active_jobs = (await session.execute(active_stmt)).scalars().all()

        if active_jobs:
            raise HTTPException(
                status_code=409,
                detail=f"A resource sync job is already {active_jobs[0].status} for this account.",
            )

        # 3. Schedule a PENDING job — the engine will execute it
        new_job = ResourceSyncJob(
            cloud_account_id=cloud_account_id,
            status="PENDING",
        )
        session.add(new_job)
        await session.commit()
        await session.refresh(new_job)

        logger.info(
            f"Resource sync job {new_job.id} scheduled (PENDING) for account {cloud_account_id}"
        )

        return {
            "id": str(new_job.id),
            "status": new_job.status,
            "created_at": new_job.created_at,
        }

    async def trigger_sync_tenant(
        self, session: AsyncSession, tenant_id: str
    ) -> Dict[str, Any]:
        """
        Schedules PENDING sync jobs for ALL eligible cloud accounts in a tenant.
        Skips container-type accounts and accounts that already have active jobs.
        """
        # 1. Get all active, non-container accounts for this tenant
        CONTAINER_TYPES = ("management", "tenant", "management_group", "organizational_unit", "root")
        stmt = select(CloudAccount).where(
            CloudAccount.tenant_id == tenant_id,
            CloudAccount.is_active == True,
        )
        result = await session.execute(stmt)
        all_accounts = result.scalars().all()

        # Filter out container types
        eligible = []
        for acc in all_accounts:
            account_type = (acc.cred_metadata or {}).get("account_type", "")
            if account_type not in CONTAINER_TYPES:
                eligible.append(acc)

        if not eligible:
            raise HTTPException(status_code=404, detail="No eligible cloud accounts found in this tenant.")

        # 2. Schedule jobs, skipping accounts with existing active jobs
        scheduled = []
        skipped = []
        for acc in eligible:
            active_stmt = select(ResourceSyncJob).where(
                ResourceSyncJob.cloud_account_id == str(acc.id),
                ResourceSyncJob.status.in_(["PENDING", "IN_PROGRESS"]),
            )
            active_jobs = (await session.execute(active_stmt)).scalars().all()
            if active_jobs:
                skipped.append(str(acc.id))
                continue

            new_job = ResourceSyncJob(
                cloud_account_id=str(acc.id),
                status="PENDING",
            )
            session.add(new_job)
            scheduled.append(str(acc.id))

        await session.commit()

        logger.info(
            f"Tenant {tenant_id}: scheduled {len(scheduled)} sync jobs, skipped {len(skipped)} (already active)"
        )

        return {
            "scheduled_count": len(scheduled),
            "skipped_count": len(skipped),
            "scheduled_accounts": scheduled,
            "skipped_accounts": skipped,
        }

    async def get_sync_history_tenant(
        self, session: AsyncSession, tenant_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve recent sync jobs across ALL accounts in a tenant."""
        stmt = (
            select(ResourceSyncJob)
            .join(CloudAccount, ResourceSyncJob.cloud_account_id == CloudAccount.id)
            .where(CloudAccount.tenant_id == tenant_id)
            .order_by(desc(ResourceSyncJob.created_at))
            .limit(limit)
        )
        result = await session.execute(stmt)
        jobs = result.scalars().all()

        return [
            {
                "id": str(j.id),
                "cloud_account_id": str(j.cloud_account_id),
                "status": j.status,
                "started_at": j.started_at,
                "completed_at": j.completed_at,
                "resources_found": j.resources_found,
                "error_log": j.error_log,
                "created_at": j.created_at,
            }
            for j in jobs
        ]

