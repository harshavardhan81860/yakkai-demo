from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from services.quota_service import QuotaService
from schemas.quota_schema import ( QuotaLimitRequest, QuotaLimitResponse, 

    QuotaOverrideRequestCreate, QuotaOverrideRequestResponse, QuotaEvaluationRequest,
    QuotaFinalizeRequest,QuotaReserveRequest)
from db.engine import get_session
from core.response import ApiResponse
from utils.serializer import orm_to_dict
import uuid

from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/quota", tags=["Quota"])
service = QuotaService()
resource = RESOURCE.QUOTA


# List all quotas
@router.get("/")
@registry(resource=resource, action=ACTION.READ)
async def list_quotas(session: AsyncSession = Depends(get_session)):
    limits = await service.list_limits(session)
    return ApiResponse.success(
        message="Quota limits fetched",
        data={"quotas": [orm_to_dict(l) for l in limits]}
    )

# Create quota
@router.post("/create")
async def create_quota(req: QuotaLimitRequest, session: AsyncSession = Depends(get_session)):
    limit = await service.create_limit(session, req)
    return ApiResponse.success(
        message="Quota created successfully",
        status_code=201,
        data={"quota": orm_to_dict(limit)}
    )

# Update quota
@router.put("/{quota_id}")
async def update_quota(quota_id: uuid.UUID, req: QuotaLimitRequest, session: AsyncSession = Depends(get_session)):
    limit = await service.update_limit(session, quota_id, req)
    return ApiResponse.success(
        message="Quota updated successfully",
        data={"quota": orm_to_dict(limit)}
    )

# Create override request
@router.post("/override")
async def create_override(req: QuotaOverrideRequestCreate, session: AsyncSession = Depends(get_session)):
    override = await service.create_override_request(session, req)
    return ApiResponse.success(
        message="Override request created",
        status_code=201,
        data={"override": orm_to_dict(override)}
    )

# Evaluate quota
@router.post("/evaluate")
async def evaluate_quota(req: QuotaEvaluationRequest, session: AsyncSession = Depends(get_session)):
    res = await service.evaluate_quota(session, req)
    return ApiResponse.success(message="Quota evaluation result", data=res)


@router.post("/reserve")
async def reserve_quota(
    req: QuotaReserveRequest,
    session: AsyncSession = Depends(get_session)
):
    result = await service.reserve_quota(session, req)
    return ApiResponse.success("Quota reserved", data=result)

@router.post("/finalize")
async def finalize_quota(
    req: QuotaFinalizeRequest,
    session: AsyncSession = Depends(get_session)
):
    result = await service.finalize_quota(session, req)
    return ApiResponse.success("Quota finalized", data=result)
