# api/v1/routers/cloud_discovery.py
"""
Discovery API Router – 8 endpoints for the cloud account discovery flow.
Includes MVP test_mode for dummy account generation (remove for production).
"""

import logging
import random
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_session
from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

from schemas.cloud_discovery_schema import (
    DiscoverRequest, DiscoveryResult,
    ImportRequest, ImportResult,
    IncrementalDiscoveryRequest, IncrementalDiscoveryResult,
    IncrementalImportRequest,
    CredentialUpdateRequest, CredentialUpdateResult,
    SyncHierarchyResult, BulkSyncResult,
    DuplicateCheckRequest, DuplicateCheckResult,
    DiscoveredAccount,
)
from core.response import ApiResponse

from services.cloud_discovery_service import CloudDiscoveryService
from services.cloud_import_service import CloudAccountImportService
from services.hierarchy_sync_service import HierarchySyncService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cloud-discovery", tags=["Cloud Discovery"])

# Service singletons
discovery_service = CloudDiscoveryService()
import_service = CloudAccountImportService()
sync_service = HierarchySyncService()


# ═══════════════════════════════════════════════════════════════
# ── MVP TEST MODE HELPERS  (remove entire block for production) ──
# ═══════════════════════════════════════════════════════════════

_AWS_NAMES = [
    "Production", "Staging", "Development", "Data-Analytics",
    "Security-Audit", "Logging", "Shared-Services", "Sandbox",
    "ML-Training", "Backup-DR",
]
_AZURE_NAMES = [
    "Corp-Production", "Corp-Staging", "Corp-Dev", "Data-Platform",
    "Security-Hub", "Monitoring", "Identity-Services", "Test-Lab",
    "AI-Workloads", "DR-Replica",
]


def _generate_dummy_aws_accounts(count: int = 4) -> List[dict]:
    """Generate random dummy AWS member accounts."""
    names = random.sample(_AWS_NAMES, min(count, len(_AWS_NAMES)))
    return [
        {
            "account_id": f"{random.randint(100000000000, 999999999999)}",
            "name": name,
            "account_type": "member",
            "status": "ACTIVE",
            "email": f"{name.lower().replace('-', '.')}@example.com",
            "already_imported": False,
        }
        for name in names
    ]


def _generate_dummy_azure_subscriptions(count: int = 4) -> List[dict]:
    """Generate random dummy Azure subscriptions."""
    names = random.sample(_AZURE_NAMES, min(count, len(_AZURE_NAMES)))
    return [
        {
            "subscription_id": str(uuid.uuid4()),
            "name": name,
            "account_type": "subscription",
            "status": "Enabled",
            "already_imported": False,
        }
        for name in names
    ]


def _build_test_discovery_result(provider: str) -> dict:
    """Build a full DiscoveryResult-shaped dict for test mode."""
    if provider == "aws":
        org_id = f"o-{''.join(random.choices('abcdefghijklmnop0123456789', k=10))}"
        mgmt_id = f"{random.randint(100000000000, 999999999999)}"
        members = _generate_dummy_aws_accounts(random.randint(3, 5))
        return {
            "status": "success",
            "message": "TEST MODE — dummy AWS Organization discovered",
            "cloud_provider": "aws",
            "is_organization": True,
            "organization_id": org_id,
            "management_account_id": mgmt_id,
            "management_account_name": "Management-Account",
            "account_type": "management",
            "discovered_accounts": members,
            "total_discovered": len(members),
            "already_imported_count": 0,
            "new_accounts_count": len(members),
        }
    else:  # azure
        tenant_id = str(uuid.uuid4())
        subs = _generate_dummy_azure_subscriptions(random.randint(3, 5))
        return {
            "status": "success",
            "message": "TEST MODE — dummy Azure Tenant discovered",
            "cloud_provider": "azure",
            "is_organization": True,
            "organization_id": tenant_id,
            "management_account_id": tenant_id,
            "management_account_name": "Contoso-Tenant",
            "account_type": "tenant",
            "discovered_accounts": subs,
            "total_discovered": len(subs),
            "already_imported_count": 0,
            "new_accounts_count": len(subs),
        }


def _build_test_import_result(provider: str, count: int) -> dict:
    """Build a fake ImportResult for test mode (no DB writes)."""
    return {
        "status": "success",
        "message": f"TEST MODE — {count} dummy {provider.upper()} accounts simulated (no DB writes)",
        "accounts_created": count,
        "accounts_skipped": 0,
        "accounts_failed": 0,
        "created_account_ids": [str(uuid.uuid4()) for _ in range(count)],
    }


# ── END MVP TEST MODE HELPERS ──


# ═══════════════════════════════════════════════════════════════
# 1. DISCOVER
# ═══════════════════════════════════════════════════════════════

@router.post("/discover")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.CREATE)
async def discover_cloud_account(
    req: DiscoverRequest,
    tenant_id: str,
    db: AsyncSession = Depends(get_session),
):
    """
    Validate credentials and detect organization structure.
    Returns account info, org detection, and discovered member accounts.
    """
    provider = req.cloud_provider.lower()

    # ── MVP TEST MODE (remove for production) ──
    if req.test_mode:
        logger.info("TEST MODE discovery for provider=%s tenant=%s", provider, tenant_id)
        data = _build_test_discovery_result(provider)
        return ApiResponse.success(message=data["message"], data=data)
    # ── END TEST MODE ──

    if provider == "aws":
        if not req.aws_credentials:
            return ApiResponse.error(message="AWS credentials required")
        result = await discovery_service.discover_aws_account(
            account_id=req.aws_credentials.account_id,
            role_name=req.aws_credentials.role_name,
            external_id=req.aws_credentials.external_id,
            tenant_id=tenant_id,
            db=db,
        )
    elif provider == "azure":
        if not req.azure_credentials:
            return ApiResponse.error(message="Azure credentials required")
        result = await discovery_service.discover_azure_tenant(
            az_tenant_id=req.azure_credentials.tenant_id,
            client_id=req.azure_credentials.client_id,
            client_secret=req.azure_credentials.client_secret,
            tenant_id=tenant_id,
            db=db,
        )
    else:
        return ApiResponse.error(message=f"Unsupported provider: {provider}")

    if result.status == "error":
        return JSONResponse(
            status_code=400,
            content=ApiResponse.error(message=result.message or "Discovery failed")
        )

    return ApiResponse.success(
        message=result.message or "Discovery completed",
        data=result.model_dump(),
    )


# ═══════════════════════════════════════════════════════════════
# 2. IMPORT
# ═══════════════════════════════════════════════════════════════

@router.post("/import")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.CREATE)
async def import_cloud_accounts(
    req: ImportRequest,
    db: AsyncSession = Depends(get_session),
):
    """
    Import discovered accounts into the system.
    Accepts an import_mode: add_all | add_selected | add_management_only | add_tenant_only
    """
    # ── MVP TEST MODE (remove for production) ──
    if req.test_mode:
        count = len(req.selected_account_ids or []) or 3
        data = _build_test_import_result(req.cloud_provider, count)
        return ApiResponse.success(message=data["message"], data=data)
    # ── END TEST MODE ──

    result = await import_service.import_accounts(req, db)
    return ApiResponse.success(
        message=result.message,
        data=result.model_dump(),
    )


# ═══════════════════════════════════════════════════════════════
# 3. INCREMENTAL DISCOVERY
# ═══════════════════════════════════════════════════════════════

@router.post("/{account_id}/discover-new")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.READ)
async def discover_new_accounts(
    account_id: str,
    req: IncrementalDiscoveryRequest = IncrementalDiscoveryRequest(),
    db: AsyncSession = Depends(get_session),
):
    """
    Re-query cloud provider for the given org/tenant account
    and return newly discovered accounts not yet imported.
    """
    result = await discovery_service.discover_new_accounts_in_organization(
        parent_account_id=account_id,
        db=db,
        test_mode=req.test_mode,
    )

    if result.status == "error":
        return JSONResponse(
            status_code=400,
            content=ApiResponse.error(message=result.message or "Incremental discovery failed")
        )

    return ApiResponse.success(
        message=f"Found {result.new_accounts_found} new accounts",
        data=result.model_dump(),
    )


# ═══════════════════════════════════════════════════════════════
# 4. IMPORT INCREMENTAL
# ═══════════════════════════════════════════════════════════════

@router.post("/{account_id}/import-new")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.CREATE)
async def import_new_accounts(
    account_id: str,
    req: IncrementalImportRequest,
    db: AsyncSession = Depends(get_session),
):
    """Import newly discovered accounts under an existing parent."""
    # ── MVP TEST MODE (remove for production) ──
    if req.test_mode:
        count = len(req.selected_accounts)
        data = _build_test_import_result("cloud", count)  # Generic cloud for incremental test
        return ApiResponse.success(message=data["message"], data=data)
    # ── END TEST MODE ──

    result = await import_service.import_incremental_accounts(
        parent_account_id=account_id,
        selected_accounts=req.selected_accounts,
        db=db,
    )

    return ApiResponse.success(
        message=result.message,
        data=result.model_dump(),
    )


# ═══════════════════════════════════════════════════════════════
# 5. CREDENTIAL UPDATE
# ═══════════════════════════════════════════════════════════════

@router.put("/{account_id}/credentials")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.UPDATE)
async def update_account_credentials(
    account_id: str,
    req: CredentialUpdateRequest,
    db: AsyncSession = Depends(get_session),
):
    """Update credential source from inherited→own or own→inherited."""
    result = await import_service.update_account_credentials(
        account_id=account_id,
        req=req,
        db=db,
    )

    return ApiResponse.success(
        message=result.message,
        data=result.model_dump(),
    )


# ═══════════════════════════════════════════════════════════════
# 6. HIERARCHY SYNC (single account)
# ═══════════════════════════════════════════════════════════════

@router.post("/{account_id}/sync-hierarchy")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.UPDATE)
async def sync_account_hierarchy(
    account_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Manually sync an account's hierarchy status with the cloud provider."""
    result = await sync_service.sync_account_hierarchy(
        account_id=account_id,
        db=db,
    )

    return ApiResponse.success(
        message="Hierarchy sync completed"
        + (f" with {len(result.changes)} changes" if result.changes else ""),
        data=result.model_dump(),
    )


# ═══════════════════════════════════════════════════════════════
# 7. DUPLICATE CHECK
# ═══════════════════════════════════════════════════════════════

@router.post("/check-duplicate")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.READ)
async def check_duplicate_account(
    req: DuplicateCheckRequest,
    db: AsyncSession = Depends(get_session),
):
    """Pre-import check: does this account already exist in the tenant?"""
    result = await discovery_service.check_duplicate_account(
        cloud_provider=req.cloud_provider,
        account_identifier=req.account_identifier,
        tenant_id=req.tenant_id,
        db=db,
    )

    return ApiResponse.success(
        message="Duplicate found" if result.exists else "No duplicate",
        data=result.model_dump(),
    )


# ═══════════════════════════════════════════════════════════════
# 8. BULK SYNC (admin/cron)
# ═══════════════════════════════════════════════════════════════

@router.post("/sync-all-hierarchies")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.UPDATE)
async def sync_all_hierarchies(
    tenant_id: str,
    cloud_provider: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Bulk hierarchy sync for all accounts in a tenant. Used by admin or cron job."""
    result = await sync_service.sync_all_accounts_for_tenant(
        tenant_id=tenant_id,
        db=db,
        cloud_provider=cloud_provider,
    )

    return ApiResponse.success(
        message=f"Checked {result.total_accounts_checked} accounts, {result.changes_detected} changes",
        data=result.model_dump(),
    )


@router.post("/{account_id}/test-connection")
@registry(resource=RESOURCE.CLOUD_ACCOUNT, action=ACTION.READ)
async def test_connection(
    account_id: str,
    test_type: str = "read",  # "read" or "write"
    test_mode: bool = False,
    db: AsyncSession = Depends(get_session),
):
    """Trigger a credential check (Read or Write) and update status."""
    result = await discovery_service.test_connection(
        account_id=account_id,
        db=db,
        test_mode=test_mode,
        test_type=test_type
    )
    if result["status"] == "success":
        return ApiResponse.success(message=result["message"])
    return ApiResponse.error(message=result["message"])
