from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.ci_credentials_service import CICredentialsService
from schemas.ci_credentials_schema import CICredentialsCreate, CICredentialsUpdate
from core.response import ApiResponse
from utils.serializer import orm_to_dict

from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/ci-credentials", tags=["CI Credentials"])
service = CICredentialsService()
resource = RESOURCE.CI_CREDENTIALS


@router.get("/")
@registry(resource=resource, action=ACTION.READ)
async def list_credentials(
    provider: str | None = None,
    is_active: bool | None = None,
    session: AsyncSession = Depends(get_session)
):
    creds = await service.list_credentials(session, provider, is_active)
    return ApiResponse.success(
        message="CI credentials fetched successfully",
        data={"credentials": [orm_to_dict(c) for c in creds]}
    )


@router.post("/create")
@registry(resource=resource, action=ACTION.CREATE)
async def create_credentials(
    req: CICredentialsCreate,
    session: AsyncSession = Depends(get_session)
):
    try:
        cred = await service.create_credentials(session, **req.model_dump())
        return ApiResponse.success(
            message="CI credentials created successfully",
            status_code=201,
            data={"credentials": orm_to_dict(cred)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)


@router.patch("/{record_id}/activate")
@registry(resource=resource, action=ACTION.ACTIVATE)
async def activate_credentials(
    record_id: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        cred = await service.activate_credentials(session, record_id)
        return ApiResponse.success(
            message="CI credentials activated",
            data={"credentials": orm_to_dict(cred)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)


@router.patch("/{record_id}/deactivate")
@registry(resource=resource, action=ACTION.DEACTIVATE)
async def deactivate_credentials(
    record_id: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        cred = await service.deactivate_credentials(session, record_id)
        return ApiResponse.success(
            message="CI credentials deactivated",
            data={"credentials": orm_to_dict(cred)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)


@router.patch("/{record_id}/update")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_credentials(
    record_id: str,
    req: CICredentialsUpdate,
    session: AsyncSession = Depends(get_session)
):
    try:
        cred = await service.update_credentials(session, record_id, **req.model_dump(exclude_unset=True))
        return ApiResponse.success(
            message="CI credentials updated",
            data={"credentials": orm_to_dict(cred)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)
