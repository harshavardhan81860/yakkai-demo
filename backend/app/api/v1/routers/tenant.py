# tenant_routes.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.tenant_service import TenantService
from core.response import ApiResponse
from utils.serializer import orm_to_dict
from schemas.tenant_schema import CreateTenantRequest

router = APIRouter(prefix="/tenants", tags=["Tenants"])
service = TenantService()


@router.get("/")
async def list_tenants(
    is_active: bool | None = None,
    session: AsyncSession = Depends(get_session)
):
    tenants = await service.list_tenants(session, is_active)

    tenants_list = [orm_to_dict(u) for u in tenants]

    total = len(tenants_list)
    active = sum(1 for u in tenants_list if u.get("is_active") is True)
    inactive = sum(1 for u in tenants_list if u.get("is_active") is False)

    return ApiResponse.success(
        message="Tenants fetched successfully",
        data = {
            "header": {
                "total_tenants": total,
                "active_tenants": active,
                "inactive_tenants": inactive
            },
            "tenants": tenants_list
        }
    )


@router.post("/create")
async def create_tenant(
    req: CreateTenantRequest,
    session: AsyncSession = Depends(get_session)
):
    try:
        tenant = await service.create_tenant(
            session=session,
            name=req.name,
            display_name=req.display_name
        )
        return ApiResponse.success(
            message="Tenant created successfully",
            status_code=201,
            data={"tenant": orm_to_dict(tenant)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)


@router.patch("/{tenant_id}/activate")
async def activate_tenant(tenant_id: str, session: AsyncSession = Depends(get_session)):
    try:
        tenant = await service.activate_tenant(session, tenant_id)
        return ApiResponse.success(
            message="Tenant activated successfully",
            data={"tenant": orm_to_dict(tenant)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)


@router.patch("/{tenant_id}/deactivate")
async def deactivate_tenant(tenant_id: str, session: AsyncSession = Depends(get_session)):
    try:
        tenant = await service.deactivate_tenant(session, tenant_id)
        return ApiResponse.success(
            message="Tenant deactivated successfully",
            data={"tenant": orm_to_dict(tenant)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)

@router.patch("/{tenant_id}")
async def update_tenant(
    tenant_id: str,
    req: CreateTenantRequest,
    session: AsyncSession = Depends(get_session)
):
    try:
        tenant = await service.update_tenant(
            session=session,
            tenant_id=tenant_id,
            display_name=req.display_name
        )
        return ApiResponse.success(
            message="Tenant updated successfully",
            data={"tenant": orm_to_dict(tenant)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)
