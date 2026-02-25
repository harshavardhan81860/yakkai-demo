from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from datetime import date, timedelta
import logging

from db.engine import get_session
from core.response import ApiResponse
from models.cloud_account import CloudAccount
from services.finops.aws_cost_service import aws_cost_service
from services.finops.azure_cost_service import azure_cost_service
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/finops",
    tags=["finops"]
)

@router.get("/costs/resource/{resource_id}/realtime")
async def get_realtime_resource_cost(
    resource_id: str,
    db: AsyncSession = Depends(get_session)
):
    """
    On-demand real-time extraction of amortized costs for a SPECIFIC resource.
    AWS Support: PLACEHOLDER (Requires CUR integration).
    Azure Support: Fetches via native ResourceId parameters.
    """
    # TODO: Implement resource-specific localized fetching logic here
    # 1. Lookup which Account the resource belongs to
    # 2. Invoke azure_cost_service specifically filtering for this resource_id
    
    return ApiResponse.success(
        message="Realtime resource fetching not yet implemented.",
        data={"resource_id": resource_id, "cost": 0.0}
    )

@router.get("/jobs/account/{account_id}")
async def get_account_sync_jobs(
    account_id: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_session)
):
    """Retrieves the FinOps Sync Job History for a specific account."""
    from engines.finops_job.db_models import FetchJob
    from sqlalchemy import select, desc
    
    stmt = select(FetchJob).where(
        FetchJob.account_id == account_id
    ).order_by(desc(FetchJob.created_at)).limit(limit)
    
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    
    return ApiResponse.success(
        message="Fetched Account Job History",
        data=[
            {
                "id": str(j.id),
                "start_date": j.start_date.isoformat(),
                "end_date": j.end_date.isoformat(),
                "status": j.status,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
                "error_log": j.error_log
            } for j in jobs
        ]
    )

@router.get("/jobs/tenant/{tenant_id}")
async def get_tenant_sync_jobs(
    tenant_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_session)
):
    """
    Retrieves the aggregate FinOps Sync Job History for all accounts under a Tenant.
    Used to check if the Tenant-Level 'Sync Costs' button should be disabled.
    """
    from engines.finops_job.db_models import FetchJob
    from models.cloud_account import CloudAccount
    from sqlalchemy import select, desc
    
    stmt = (
        select(FetchJob, CloudAccount.name)
        .join(CloudAccount, FetchJob.account_id == CloudAccount.id)
        .where(CloudAccount.tenant_id == tenant_id)
        .order_by(desc(FetchJob.created_at))
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return ApiResponse.success(
        message="Fetched Tenant Job History",
        data=[
            {
                "id": str(j.id),
                "account_name": name,
                "start_date": j.start_date.isoformat(),
                "end_date": j.end_date.isoformat(),
                "status": j.status,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
                "error_log": j.error_log
            } for j, name in rows
        ]
    )

@router.post("/trigger-sync/tenant/{tenant_id}")
async def trigger_tenant_sync(
    tenant_id: str,
    start_date: str,
    end_date: str,
    db: AsyncSession = Depends(get_session)
):
    """
    Bulk inserts PENDING jobs for ALL active cloud accounts belonging to a Tenant.
    """
    from engines.finops_job.db_models import FetchJob, JobStatus
    from models.cloud_account import CloudAccount
    from sqlalchemy import select
    
    parsed_start = date.fromisoformat(start_date)
    parsed_end = date.fromisoformat(end_date)
    
    if parsed_end < parsed_start:
        raise HTTPException(status_code=400, detail="End date must be >= Start date.")
        
    delta = parsed_end - parsed_start
    if delta.days > 366:
        raise HTTPException(status_code=400, detail="Cannot request more than 365 days of history.")
        
    # Get all active Cloud Accounts for this tenant that are NOT container accounts
    stmt = select(CloudAccount.id).where(
        CloudAccount.tenant_id == tenant_id,
        CloudAccount.cred_metadata['account_type'].astext.notin_(
            ['management', 'tenant', 'management_group', 'organizational_unit', 'root']
        )
    )
    result = await db.execute(stmt)
    account_ids = result.scalars().all()
    
    if not account_ids:
        raise HTTPException(status_code=404, detail="No Cloud Accounts found for this tenant.")
        
    new_jobs = []
    for acc_id in account_ids:
        new_jobs.append(FetchJob(
            account_id=acc_id,
            start_date=parsed_start,
            end_date=parsed_end,
            status=JobStatus.PENDING
        ))
            
    db.add_all(new_jobs)
    await db.commit()
    
    return ApiResponse.success(message=f"Successfully queued {len(new_jobs)} jobs across {len(account_ids)} accounts.")


@router.post("/trigger-sync/account/{account_id}")
async def trigger_account_sync(
    account_id: str,
    start_date: str, # Format: YYYY-MM-DD
    end_date: str,   # Format: YYYY-MM-DD
    db: AsyncSession = Depends(get_session)
):
    """
    Inserts a batch of PENDING jobs into the queue for a specific account over a date range.
    The Standalone Engine will wake up and execute these from the DB.
    Ideal for Delta Syncs (yesterday only) OR Historic Backfills (last 365 days).
    """
    from engines.finops_job.db_models import FetchJob, JobStatus
    
    parsed_start = date.fromisoformat(start_date)
    parsed_end = date.fromisoformat(end_date)
    
    if parsed_end < parsed_start:
        raise HTTPException(status_code=400, detail="End date must be greater than or equal to Start date.")
        
    delta = parsed_end - parsed_start
    if delta.days > 366:
        raise HTTPException(status_code=400, detail="Cannot request more than 365 days of history at once.")
        
    # Generate a single job queue task encompassing the requested date range
    new_jobs = [FetchJob(
        account_id=account_id,
        start_date=parsed_start,
        end_date=parsed_end,
        status=JobStatus.PENDING
    )]
        
    db.add_all(new_jobs)
    await db.commit()
    
    return ApiResponse.success(message=f"Successfully queued {len(new_jobs)} jobs for account {account_id} from {start_date} to {end_date}")

def _build_dashboard_base_query(db_model, tenant_id: Optional[str], account_id: Optional[str], start_date: str, end_date: str):
    from sqlalchemy import select
    parsed_start = date.fromisoformat(start_date)
    parsed_end = date.fromisoformat(end_date)
    
    stmt = select(db_model).where(
        db_model.date >= parsed_start,
        db_model.date <= parsed_end
    )
    
    if account_id:
        stmt = stmt.where(db_model.account_id == account_id)
    elif tenant_id:
        # For tenant-wide dashboard, exclude container accounts from the aggregation
        from models.cloud_account import CloudAccount
        stmt = stmt.join(CloudAccount, db_model.account_id == CloudAccount.id).where(
            db_model.tenant_id == tenant_id,
            CloudAccount.cred_metadata['account_type'].astext.notin_(
                ['management', 'tenant', 'management_group', 'organizational_unit', 'root']
            )
        )
        
    return stmt

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    start_date: str,
    end_date: str,
    tenant_id: Optional[str] = None,
    account_id: Optional[str] = None,
    db: AsyncSession = Depends(get_session)
):
    """Returns the high-level KPI cards: Total Cost, AWS Spend, Azure Spend."""
    from engines.finops_job.db_models import DailyCost
    from sqlalchemy import select, func
    
    base_stmt = _build_dashboard_base_query(DailyCost, tenant_id, account_id, start_date, end_date)
    
    # Aggregate total cost by provider
    stmt = select(
        DailyCost.provider,
        func.sum(DailyCost.amortized_cost).label("total")
    ).select_from(base_stmt.subquery()).group_by(DailyCost.provider)
    
    # Wait, the subquery approach with func.sum needs to be built directly on the table for asyncpg to not complain about aliases sometimes.
    # Let's build the direct query.
    parsed_start = date.fromisoformat(start_date)
    parsed_end = date.fromisoformat(end_date)
    
    stmt = select(
        DailyCost.provider,
        func.sum(DailyCost.amortized_cost).label("total")
    ).where(
        DailyCost.date >= parsed_start,
        DailyCost.date <= parsed_end
    )
    
    if account_id:
        stmt = stmt.where(DailyCost.account_id == account_id)
    elif tenant_id:
        from models.cloud_account import CloudAccount
        stmt = stmt.join(CloudAccount, DailyCost.account_id == CloudAccount.id).where(
            DailyCost.tenant_id == tenant_id,
            CloudAccount.cred_metadata['account_type'].astext.notin_(
                ['management', 'tenant', 'management_group', 'organizational_unit', 'root']
            )
        )
        
    stmt = stmt.group_by(DailyCost.provider)

    result = await db.execute(stmt)
    rows = result.all()
    
    summary = {
        "total_cost": 0.0,
        "aws_cost": 0.0,
        "azure_cost": 0.0
    }
    
    for row in rows:
        val = float(row.total) if row.total else 0.0
        summary["total_cost"] += val
        if row.provider == "aws":
            summary["aws_cost"] += val
        elif row.provider == "azure":
            summary["azure_cost"] += val
            
    return ApiResponse.success(message="Summary Fetched", data=summary)

@router.get("/dashboard/trend")
async def get_dashboard_trend(
    start_date: str,
    end_date: str,
    tenant_id: Optional[str] = None,
    account_id: Optional[str] = None,
    db: AsyncSession = Depends(get_session)
):
    """Returns the daily chronological cost array for the Line Chart."""
    from engines.finops_job.db_models import DailyCost
    from sqlalchemy import select, func, asc
    
    parsed_start = date.fromisoformat(start_date)
    parsed_end = date.fromisoformat(end_date)
    
    stmt = select(
        DailyCost.date,
        func.sum(DailyCost.amortized_cost).label("daily_total")
    ).where(
        DailyCost.date >= parsed_start,
        DailyCost.date <= parsed_end
    )
    
    if account_id:
        stmt = stmt.where(DailyCost.account_id == account_id)
    elif tenant_id:
        from models.cloud_account import CloudAccount
        stmt = stmt.join(CloudAccount, DailyCost.account_id == CloudAccount.id).where(
            DailyCost.tenant_id == tenant_id,
            CloudAccount.cred_metadata['account_type'].astext.notin_(
                ['management', 'tenant', 'management_group', 'organizational_unit', 'root']
            )
        )
        
    stmt = stmt.group_by(DailyCost.date).order_by(asc(DailyCost.date))

    result = await db.execute(stmt)
    rows = result.all()
    
    trend_data = [{"date": row.date.isoformat(), "cost": float(row.daily_total) if row.daily_total else 0.0} for row in rows]
    
    return ApiResponse.success(message="Trend Fetched", data={"trend": trend_data})

@router.get("/dashboard/services")
async def get_dashboard_services(
    start_date: str,
    end_date: str,
    tenant_id: Optional[str] = None,
    account_id: Optional[str] = None,
    db: AsyncSession = Depends(get_session)
):
    """Returns costs grouped by portal_resource_type OR service_name for Pie Charts and Tables."""
    from engines.finops_job.db_models import DailyCost
    from sqlalchemy import select, func, desc
    
    parsed_start = date.fromisoformat(start_date)
    parsed_end = date.fromisoformat(end_date)
    
    stmt = select(
        DailyCost.service_name,
        func.sum(DailyCost.amortized_cost).label("service_total")
    ).where(
        DailyCost.date >= parsed_start,
        DailyCost.date <= parsed_end
    )
    if account_id:
        stmt = stmt.where(DailyCost.account_id == account_id)
    elif tenant_id:
        from models.cloud_account import CloudAccount
        stmt = stmt.join(CloudAccount, DailyCost.account_id == CloudAccount.id).where(
            DailyCost.tenant_id == tenant_id,
            CloudAccount.cred_metadata['account_type'].astext.notin_(
                ['management', 'tenant', 'management_group', 'organizational_unit', 'root']
            )
        )
        
    stmt = stmt.group_by(DailyCost.service_name).order_by(desc("service_total"))

    result = await db.execute(stmt)
    rows = result.all()
    
    services_data = [{"name": row.service_name, "cost": float(row.service_total) if row.service_total else 0.0} for row in rows]
    
    return ApiResponse.success(message="Services Built", data={"services": services_data})


@router.get("/dashboard/services_table")
async def get_dashboard_services_table(
    start_date: str,
    end_date: str,
    tenant_id: Optional[str] = None,
    account_id: Optional[str] = None,
    db: AsyncSession = Depends(get_session)
):
    """Returns detailed service cost arrays grouping by date for Table Sparklines."""
    from engines.finops_job.db_models import DailyCost
    from sqlalchemy import select, func, asc
    
    parsed_start = date.fromisoformat(start_date)
    parsed_end = date.fromisoformat(end_date)
    
    stmt = select(
        DailyCost.service_name,
        DailyCost.date,
        func.sum(DailyCost.amortized_cost).label("daily_total")
    ).where(
        DailyCost.date >= parsed_start,
        DailyCost.date <= parsed_end
    )
    if account_id:
        stmt = stmt.where(DailyCost.account_id == account_id)
    elif tenant_id:
        from models.cloud_account import CloudAccount
        stmt = stmt.join(CloudAccount, DailyCost.account_id == CloudAccount.id).where(
            DailyCost.tenant_id == tenant_id,
            CloudAccount.cred_metadata['account_type'].astext.notin_(
                ['management', 'tenant', 'management_group', 'organizational_unit', 'root']
            )
        )
        
    stmt = stmt.group_by(DailyCost.service_name, DailyCost.date).order_by(asc(DailyCost.date))

    result = await db.execute(stmt)
    rows = result.all()
    
    svcs: dict = {}
    for row in rows:
        sn = row.service_name
        dt = row.date.isoformat()
        c = float(row.daily_total) if row.daily_total else 0.0
        
        if sn not in svcs:
            svcs[sn] = {"name": sn, "cost": 0.0, "trend": []}
            
        svcs[sn]["cost"] += c
        svcs[sn]["trend"].append({"date": dt, "cost": c})
        
    out_list = list(svcs.values())
    out_list.sort(key=lambda x: x["cost"], reverse=True)
    
    return ApiResponse.success(message="Services Table Built", data={"services": out_list})
