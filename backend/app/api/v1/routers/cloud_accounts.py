from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.cloud_account_service import CloudAccountService
from schemas.cloud_account_schema import CloudAccountCreate,CloudAccountUpdate
from core.response import ApiResponse
from utils.serializer import orm_to_dict

router = APIRouter(prefix="/cloud-accounts", tags=["Cloud Accounts"])
service = CloudAccountService()


# ---------- LIST ----------

# router
@router.get("/")
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


# ---------- CREATE ----------

@router.post("/create")
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
