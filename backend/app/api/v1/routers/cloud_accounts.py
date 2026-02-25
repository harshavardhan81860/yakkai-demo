from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.cloud_account_service import CloudAccountService
from schemas.cloud_account_schema import CloudAccountCreate,CloudAccountUpdate
from core.response import ApiResponse
from utils.serializer import orm_to_dict
from datetime import date, timedelta
import calendar
from sqlalchemy import select, func

from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/cloud-accounts", tags=["Cloud Accounts"])
service = CloudAccountService()
resource = RESOURCE.CLOUD_ACCOUNT


# ---------- LIST ----------

# router
@router.get("/")
@registry(resource=resource, action=ACTION.READ)
async def list_accounts(
    id: str | None = None,
    tenant_id: str | None = None,
    is_active: bool | None = None,
    session: AsyncSession = Depends(get_session)
):
    # If id is passed, ignore other filters
    if id:
        result = await service.get_account_by_id(session, id)
        accounts = result if isinstance(result, list) else ([result] if result else [])
    else:
        accounts = await service.list_accounts(session, tenant_id, is_active)

    total_count = len(accounts)
    active_count = sum(1 for a in accounts if getattr(a, 'is_active', False))
    inactive_count = total_count - active_count

    # --- Fetch FinOps Costs ---
    today = date.today()
    mtd_start = today.replace(day=1)
    last_month_end = mtd_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    from engines.finops_job.db_models import DailyCost

    # MTD
    stmt_mtd = select(
        DailyCost.account_id,
        func.sum(DailyCost.amortized_cost).label("total")
    ).where(
        DailyCost.date >= mtd_start,
        DailyCost.date <= today
    ).group_by(DailyCost.account_id)
    result_mtd = await session.execute(stmt_mtd)
    mtd_costs = {str(row.account_id): float(row.total or 0.0) for row in result_mtd.all()}

    # Last Month
    stmt_lm = select(
        DailyCost.account_id,
        func.sum(DailyCost.amortized_cost).label("total")
    ).where(
        DailyCost.date >= last_month_start,
        DailyCost.date <= last_month_end
    ).group_by(DailyCost.account_id)
    result_lm = await session.execute(stmt_lm)
    lm_costs = {str(row.account_id): float(row.total or 0.0) for row in result_lm.all()}

    account_list = []
    for a in accounts:
        d = orm_to_dict(a)
        d["mtd_cost"] = mtd_costs.get(str(a.id), 0.0)
        d["last_month_cost"] = lm_costs.get(str(a.id), 0.0)
        account_list.append(d)

    return ApiResponse.success(
        message="Cloud accounts fetched successfully",
        data={
            "header": {
                "total_accounts": total_count,
                "active_accounts": active_count,
                "inactive_accounts": inactive_count
            },
            "accounts": account_list
        }
    )


# ---------- GET BY ID ----------

@router.get("/{record_id}")
@registry(resource=resource, action=ACTION.READ)
async def get_account(
    record_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Retrieve a single cloud account by its record ID."""
    account = await service.get_account_by_id(session, record_id)
    if not account:
        return ApiResponse.error(message="Account not found", status_code=404)
    
    # get_account_by_id might return a list or single object based on service implementation
    data = orm_to_dict(account[0]) if isinstance(account, list) else orm_to_dict(account)
    
    return ApiResponse.success(
        message="Cloud account fetched successfully",
        data={"account": data}
    )


# ---------- CREATE ----------

@router.post("/create")
@registry(resource=resource, action=ACTION.CREATE)
async def create_account(
    req: CloudAccountCreate,
    session: AsyncSession = Depends(get_session)
):
    account = await service.create_account(
        session=session,
        tenant_id=req.tenant_id,
        parent_id=req.parent_id,
        name=req.name,
        cloud_provider=req.cloud_provider,
        cred_metadata=req.cred_metadata,
        ci_credentials_id=req.ci_credentials_id
    )

    return ApiResponse.success(
        message="Cloud account created successfully",
        status_code=201,
        data={"account": orm_to_dict(account)}
    )


# ---------- ACTIVATE ----------

@router.patch("/{record_id}/activate")
@registry(resource=resource, action=ACTION.ACTIVATE)
async def activate_account(
    record_id: str,
    session: AsyncSession = Depends(get_session)
):
    updated = await service.activate_account(session, record_id)
    return ApiResponse.success(
        message="Cloud account activated",
        data={"account": orm_to_dict(updated)}
    )


# ---------- DEACTIVATE ----------

@router.patch("/{record_id}/deactivate")
@registry(resource=resource, action=ACTION.DEACTIVATE)
async def deactivate_account(
    record_id: str,
    session: AsyncSession = Depends(get_session)
):
    updated = await service.deactivate_account(session, record_id)
    return ApiResponse.success(
        message="Cloud account deactivated",
        data={"account": orm_to_dict(updated)}
    )



@router.patch("/{record_id}")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_cloud_account(
    record_id: str,
    req: CloudAccountUpdate,
    session: AsyncSession = Depends(get_session),
):
    updated = await service.update_account(
        session=session,
        record_id=record_id,
        name=req.name,
        cred_metadata=req.cred_metadata,
        ci_credentials_id=req.ci_credentials_id,
    )

    return ApiResponse.success(
        message="Cloud account updated successfully",
        data={"account": orm_to_dict(updated)}
    )
