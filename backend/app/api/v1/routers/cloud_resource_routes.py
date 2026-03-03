from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from db.engine import get_session
from services.cloud_resource_service import CloudResourceService
from schemas.cloud_resource_schema import CloudResourceResponse

router = APIRouter(
    prefix="/resources",
    tags=["resources"]
)

cloud_resource_service = CloudResourceService()

@router.get("/inventory", response_model=List[CloudResourceResponse])
async def get_inventory(
    tenant_id: str = Query(..., description="Tenant ID to filter resources by"),
    cloud_account_id: Optional[str] = Query(None, description="Optional Cloud Account ID filter"),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all cloud resources for a tenant, inherently joined with FinOps MTD costs.
    """
    return await cloud_resource_service.get_inventory(
        session=session,
        tenant_id=tenant_id,
        cloud_account_id=cloud_account_id
    )
