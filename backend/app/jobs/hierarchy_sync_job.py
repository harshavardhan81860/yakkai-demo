# jobs/hierarchy_sync_job.py
"""
Background job for periodic hierarchy synchronisation.

Can be triggered via:
  - Admin API endpoint: POST /cloud-discovery/sync-all-hierarchies
  - Cron / scheduler calling this module directly
  - Python APScheduler (if integrated later)

Usage (standalone):
    python -m jobs.hierarchy_sync_job --tenant-id <UUID> [--provider aws|azure]
"""

import asyncio
import argparse
import logging
import sys
import os

# Ensure the app directory is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.engine import async_session
from services.hierarchy_sync_service import HierarchySyncService

logger = logging.getLogger("hierarchy_sync_job")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


async def run_sync(tenant_id: str, cloud_provider: str = None):
    """Run hierarchy sync for a single tenant."""
    service = HierarchySyncService()

    async with async_session() as db:
        logger.info(
            "Starting hierarchy sync for tenant=%s provider=%s",
            tenant_id, cloud_provider or "all",
        )

        result = await service.sync_all_accounts_for_tenant(
            tenant_id=tenant_id,
            db=db,
            cloud_provider=cloud_provider,
        )

        logger.info(
            "Sync complete: checked=%d changes=%d",
            result.total_accounts_checked,
            result.changes_detected,
        )

        if result.changes:
            for change in result.changes:
                logger.info(
                    "  Change: type=%s account=%s old=%s new=%s action=%s",
                    change.change_type,
                    change.account_id,
                    change.old_status,
                    change.new_status,
                    change.action_taken,
                )

        return result


def main():
    parser = argparse.ArgumentParser(description="Cloud account hierarchy sync job")
    parser.add_argument("--tenant-id", required=True, help="Tenant UUID to sync")
    parser.add_argument(
        "--provider",
        choices=["aws", "azure"],
        default=None,
        help="Optional: limit sync to a specific cloud provider",
    )
    args = parser.parse_args()

    asyncio.run(run_sync(args.tenant_id, args.provider))


if __name__ == "__main__":
    main()
