from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from core.response import ApiResponse
from services.governance_service import GovernanceService
from schemas.governance_schema import *

from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/governance", tags=["Governance"])
service = GovernanceService()
resource = RESOURCE.GOVERNANCE


@router.post("/policy_create")
@registry(resource=resource, action=ACTION.CREATE)
async def create_policy(req: GovernancePolicyCreate, session: AsyncSession = Depends(get_session)):
    print("polciy create")
    return ApiResponse.success(data=await service.create_policy(session, req))


@router.put("/policy_update/{policy_id}")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_policy(policy_id: str, req: GovernancePolicyUpdate, session: AsyncSession = Depends(get_session)):
    print("Policy_update")
    return ApiResponse.success(data=await service.update_policy(session, policy_id, req))


@router.get("/policies")
@registry(resource=resource, action=ACTION.READ)
async def get_policies(
    resource_type: str | None = None,
    action_name: str | None = None,
    scope_type: str | None = None,
    scope_id: str | None = None,
    is_active: bool | None = None,
    session: AsyncSession = Depends(get_session),
):
    return ApiResponse.success(
        data={"policies": await service.get_policies(
            session,
            resource_type=resource_type,
            action_name=action_name,
            scope_type=scope_type,
            scope_id=scope_id,
            is_active=is_active
        )}
    )


@router.post("/policy-subject")
@registry(resource=resource, action=ACTION.ASSIGN)
async def add_policy_subject(req: GovernancePolicySubjectCreate, session: AsyncSession = Depends(get_session)):
    return ApiResponse.success(data=await service.add_subject(session, req))

@router.get("/policy-subjects")
@registry(resource=resource, action=ACTION.READ)
async def get_governance_subjects(
    policy_id: str | None = None,
    subject_type: str | None = None,
    subject_id: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    return ApiResponse.success(
        data={"items": await service.get_subjects(
            session,
            policy_id=policy_id,
            subject_type=subject_type,
            subject_id=subject_id
        )}
    )

@router.put("/policy-subject/{subject_id}")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_policy_subject(
    subject_id: str,
    req: GovernancePolicySubjectUpdate,
    session: AsyncSession = Depends(get_session),
):
    return ApiResponse.success(
        data=await service.update_policy_subject(session, subject_id, req)
    )





@router.get("/resource-access")
@registry(resource=resource, action=ACTION.READ)
async def get_resource_access(
    resource_type: str | None = None,
    resource_id: str | None = None,
    action_name: str | None = None,
    subject_type: str | None = None,
    subject_id: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    return ApiResponse.success(
        data={"items": await service.get_resource_access(
            session,
            resource_type=resource_type,
            resource_id=resource_id,
            action_name=action_name,
            subject_type=subject_type,
            subject_id=subject_id
        )}
    )

@router.post("/resource-access")
@registry(resource=resource, action=ACTION.ASSIGN)
async def create_resource_access(req: GovernanceResourceAccessCreate, session: AsyncSession = Depends(get_session)):
    return ApiResponse.success(data=await service.create_resource_access(session, req))


@router.put("/resource-access/{access_id}")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_resource_access(
    access_id: str,
    req: GovernanceResourceAccessUpdate,
    session: AsyncSession = Depends(get_session),
):
    return ApiResponse.success(
        data=await service.update_resource_access(session, access_id, req)
    )

@router.post("/evaluate")
@registry(resource=resource, action=ACTION.EVALUATE)
async def evaluate_governance(req: GovernanceEvaluateRequest, session: AsyncSession = Depends(get_session)):
    return ApiResponse.success(data=await service.evaluate(session, req))
