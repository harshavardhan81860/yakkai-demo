from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.cloud_account_service import CloudAccountService
from schemas.cloud_account_schema import CloudAccountCreate,CloudAccountUpdate
from core.response import ApiResponse
from utils.serializer import orm_to_dict

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
        accounts = await service.get_account_by_id(session, id)
    else:
        accounts = await service.list_accounts(session, tenant_id, is_active)

    return ApiResponse.success(
        message="Cloud accounts fetched successfully",
        data={"accounts": [orm_to_dict(a) for a in accounts]}
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
    try:
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

    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)


# ---------- ACTIVATE ----------

@router.patch("/{record_id}/activate")
@registry(resource=resource, action=ACTION.ACTIVATE)
async def activate_account(
    record_id: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        updated = await service.activate_account(session, record_id)
        return ApiResponse.success(
            message="Cloud account activated",
            data={"account": orm_to_dict(updated)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)


# ---------- DEACTIVATE ----------

@router.patch("/{record_id}/deactivate")
@registry(resource=resource, action=ACTION.DEACTIVATE)
async def deactivate_account(
    record_id: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        updated = await service.deactivate_account(session, record_id)
        return ApiResponse.success(
            message="Cloud account deactivated",
            data={"account": orm_to_dict(updated)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)



@router.patch("/{record_id}")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_cloud_account(
    record_id: str,
    req: CloudAccountUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
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

    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)
