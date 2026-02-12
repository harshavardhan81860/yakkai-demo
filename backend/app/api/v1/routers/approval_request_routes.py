# routes/approval_request_routes.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_session
from services.approval_request_service import ApprovalRequestService
from schemas.approval_request_schema import (
    SubmitApprovalRequestSchema,
    ApprovalDecisionSchema
)
from core.response import ApiResponse
from utils.serializer import orm_to_dict
from core.current_user import get_current_username

from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(
    prefix="/approval",
    tags=["Approval Requests"]
)

service = ApprovalRequestService()
resource = RESOURCE.APPROVAL_REQUEST


# ===============================
# Submit approval request
# ===============================
@router.post("/requests")
@registry(resource=resource, action=ACTION.SUBMIT)
async def submit_request(
    req: SubmitApprovalRequestSchema,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    username = get_current_username(request)

    result = await service.submit_request(
        session=session,
        current_user=username,
        data=req
    )

    return ApiResponse.success(
        message="Approval request submitted",
        status_code=201,
        data={"request": orm_to_dict(result)}
    )


# ===============================
# List approval requests (summary)
# ===============================
@router.get("/requests")
@registry(resource=resource, action=ACTION.READ)
async def list_requests(
    request: Request,
    username: str | None = None,
    use_current_user: bool = False,
    session: AsyncSession = Depends(get_session)
):
    current_user = get_current_username(request) if use_current_user else None

    result = await service.list_requests(
        session=session,
        username=username,
        current_user=current_user
    )

    return ApiResponse.success(
        message="Approval requests fetched",
        data=result
    )


# ===============================
# Approval request full details
# ===============================
@router.get("/requests/{request_id}/details")
@registry(resource=resource, action=ACTION.READ)
async def get_request_details(
    request_id: str,
    session: AsyncSession = Depends(get_session)
):
    result = await service.get_request_details(
        session=session,
        request_id=request_id
    )

    return ApiResponse.success(
        message="Approval request details fetched",
        data=result
    )


# ===============================
# Submit approval decision
# ===============================
@router.post("/requests/{request_id}/decision")
@registry(resource=resource, action=ACTION.UPDATE)
async def submit_decision(
    request_id: str,
    req: ApprovalDecisionSchema,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    username = get_current_username(request)

    action = await service.submit_decision(
        session=session,
        request_id=request_id,
        current_user=username,
        data=req
    )

    return ApiResponse.success(
        message="Decision recorded",
        data={"action": orm_to_dict(action)}
    )


# ===============================
# Pending approvals (admin + user)
# ===============================
@router.get("/approvals/pending")
@registry(resource=resource, action=ACTION.READ)
async def get_pending_approvals(
    request: Request,
    username: str | None = None,
    use_current_user: bool = False,
    session: AsyncSession = Depends(get_session)
):
    current_user = get_current_username(request) if use_current_user else None

    result = await service.get_pending_approvals(
        session=session,
        username=username,
        current_user=current_user
    )

    return ApiResponse.success(
        message="Pending approvals fetched",
        data=result
    )


# ===============================
# Approval actions (audit/history)
# ===============================
@router.get("/approvals/actions")
@registry(resource=resource, action=ACTION.READ)
async def get_approval_actions(
    request: Request,
    username: str | None = None,
    use_current_user: bool = False,
    session: AsyncSession = Depends(get_session)
):
    current_user = get_current_username(request) if use_current_user else None

    result = await service.get_approval_actions(
        session=session,
        username=username,
        current_user=current_user
    )

    return ApiResponse.success(
        message="Approval actions fetched",
        data=result
    )

@router.post("/requests/{request_id}/close")
@registry(resource=resource, action=ACTION.CANCEL)
async def close_request(
    request_id: str,
    request: Request,
    reason: str | None = None,
    session: AsyncSession = Depends(get_session)
):
    username = get_current_username(request)

    action = await service.close_request(
        session=session,
        request_id=request_id,
        current_user=username,
        reason=reason
    )

    return ApiResponse.success(
        message="Approval request closed manually",
        data={"action": orm_to_dict(action)}
    )