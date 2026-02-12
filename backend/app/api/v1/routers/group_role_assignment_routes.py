from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from core.response import ApiResponse
from utils.serializer import orm_to_dict

from services.group_role_assignment_service import GroupRoleAssignmentService
from schemas.group_role_assignment_schema import GroupRoleAssignmentCreateRequest

from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(
    prefix="/group-roles",
    tags=["Group Role Assignment"]
)

service = GroupRoleAssignmentService()
resource = RESOURCE.ROLE

@router.post("/assign")
@registry(resource=resource, action=ACTION.ASSIGN)
async def assign_role_to_group(
    req: GroupRoleAssignmentCreateRequest,
    session: AsyncSession = Depends(get_session)
):
    assignment = await service.assign_role_to_group(
        session,
        group_id=req.group_id,
        role_id=req.role_id,
        assigned_by=req.assigned_by
    )
    return ApiResponse.success(
        message="Role assigned to group",
        status_code=201,
        data={"assignment": orm_to_dict(assignment)}
    )

@router.post("/revoke/{assignment_id}")
@registry(resource=resource, action=ACTION.REVOKE)
async def revoke_group_role(
    assignment_id: str,
    session: AsyncSession = Depends(get_session)
):
    res = await service.revoke_group_role(session, assignment_id)
    return ApiResponse.success(
        message="Group role revoked",
        data=res
    )

@router.get("/group/{group_id}")
@registry(resource=resource, action=ACTION.READ)
async def list_group_roles(
    group_id: str,
    session: AsyncSession = Depends(get_session)
):
    assignments = await service.list_group_roles(session, group_id)
    return ApiResponse.success(
        message="Group roles fetched",
        data={"assignments": [orm_to_dict(a) for a in assignments]}
    )


@router.get("/role/{role_id}")
@registry(resource=resource, action=ACTION.READ)
async def list_role_groups(
    role_id: str,
    session: AsyncSession = Depends(get_session)
):
    assignments = await service.list_role_groups(session, role_id)
    return ApiResponse.success(
        message="Groups for role fetched",
        data={"assignments": [orm_to_dict(a) for a in assignments]}
    )
