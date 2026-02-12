from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.approval_mapping_service import ApprovalMappingService
from schemas.approval_mapping_schema import *
from core.response import ApiResponse
from core.enums.operator_enum import OperatorEnum, OPERATOR_LABELS

from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/approval-mapping", tags=["Approval Mapping"])
service = ApprovalMappingService()
resource = RESOURCE.APPROVAL_MAPPING


# -------- List Policies --------
@router.get("/policies")
@registry(resource=resource, action=ACTION.READ)
async def get_policies(
    resource_name: Optional[str] =(None),
    action_name: Optional[str] = (None),
    scope_type: Optional[str] = (None),
    is_mandatory: Optional[bool] = (None),
    session: AsyncSession = Depends(get_session),
):
    """
    Returns all policies.
    Optional filters:
    - resource_name
    - action_name
    - scope_type
    - is_mandatory
    """
    policies = await service.get_policies(
        session,
        resource_name,
        action_name,
        scope_type,
        is_mandatory,
    )

    # Map to return basic info only for list page
    result = [
        {
            "id": p.id,
            "resource_name": p.resource_name,
            "action_name": p.action_name,
            "scope_type": p.scope_type,
            "scope_id": p.scope_id,
            "template_id": p.template_id,
            "template_name": getattr(p, "template_name", ""),  # attach template name if needed
            "is_mandatory": p.is_mandatory,
            "is_active": p.is_active,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        for p in policies
    ]

    return ApiResponse.success(data={"policies": result})

# -------- Single Policy Details --------
@router.get("/policy/{policy_id}/details")
@registry(resource=resource, action=ACTION.READ)
async def get_policy_details(
    policy_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    policy = await service.get_policy_details(session, policy_id)
    if not policy:
        return ApiResponse.success(message="Policy not found", status_code=404)
    return ApiResponse.success(data={"policy": policy})


@router.post("/policy")
@registry(resource=resource, action=ACTION.CREATE)
async def create_policy(
    req: ApprovalMappingPolicyCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        policy = await service.create_policy(session, req)
        return ApiResponse.success(data=policy)
    except ValueError as e:
        return ApiResponse.success(message=str(e), status_code=400)


@router.put("/policy/{policy_id}")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_policy(policy_id: str, req: ApprovalMappingPolicyUpdate, session: AsyncSession = Depends(get_session)):
    return ApiResponse.success(data=await service.update_policy(session, policy_id, req))


@router.post("/evaluate")
@registry(resource=resource, action=ACTION.EVALUATE)
async def evaluate(req: ApprovalMappingEvaluateRequest, session: AsyncSession = Depends(get_session)):
    return ApiResponse.success(data=await service.evaluate(session, req))

# ---------------- Operator endpoint ----------------
@router.get("/operators")
@registry(resource=resource, action=ACTION.READ)
async def get_operators():
    ops = [{"value": op.value, "label": OPERATOR_LABELS[op]} for op in OperatorEnum]
    return ApiResponse.success(data={"operators": ops})
