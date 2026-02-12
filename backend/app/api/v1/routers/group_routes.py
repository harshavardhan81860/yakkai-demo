from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.group_service import GroupService
from schemas.group_schema import (
    GroupCreateRequest,
    GroupUpdateRequest,
    GroupAssignmentCreateRequest
)
from core.response import ApiResponse
from utils.serializer import orm_to_dict
from typing import Optional
from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/groups", tags=["Groups"])
service = GroupService()
resource = RESOURCE.GROUP

# List groups
@router.get("/")
@registry(resource=resource, action=ACTION.READ)
async def list_groups(tenant_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    groups = await service.list_groups(session, tenant_id)
    return ApiResponse.success(
        message="Groups fetched successfully",
        data={"groups": [orm_to_dict(g) for g in groups]}
    )

# Create group
@router.post("/create")
@registry(resource=resource, action=ACTION.CREATE)
async def create_group(req: GroupCreateRequest, session: AsyncSession = Depends(get_session)):
    group = await service.create_group(session, req.tenant_id, req.name, req.email, req.description, req.is_system_group)
    return ApiResponse.success(message="Group created successfully", status_code=201, data={"group": orm_to_dict(group)})

# Update group
@router.put("/{group_id}")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_group(group_id: str, req: GroupUpdateRequest, session: AsyncSession = Depends(get_session)):
    group = await service.update_group(session, group_id, req.name, req.email, req.description, req.is_active)
    return ApiResponse.success(message="Group updated successfully", data={"group": orm_to_dict(group)})

# Activate / Deactivate
@router.patch("/{group_id}/activate")
@registry(resource=resource, action=ACTION.ACTIVATE)
async def activate_group(group_id: str, session: AsyncSession = Depends(get_session)):
    group = await service.update_group(session, group_id, None, None, None, True)
    return ApiResponse.success(message="Group activated", data={"group": orm_to_dict(group)})

@router.patch("/{group_id}/deactivate")
@registry(resource=resource, action=ACTION.DEACTIVATE)
async def deactivate_group(group_id: str, session: AsyncSession = Depends(get_session)):
    group = await service.update_group(session, group_id, None, None, None, False)
    return ApiResponse.success(message="Group deactivated", data={"group": orm_to_dict(group)})

# Assign / Revoke
@router.post("/assign")
@registry(resource=resource, action=ACTION.ASSIGN)
async def assign_group(req: GroupAssignmentCreateRequest, session: AsyncSession = Depends(get_session)):
    assignment = await service.assign_group(session, req.user_id, req.group_id, req.tenant_id, req.cloud_account_id, req.component_id, req.assigned_by)
    return ApiResponse.success(message="Group assigned", status_code=201, data={"assignment": orm_to_dict(assignment)})

@router.post("/revoke/{assignment_id}")
@registry(resource=resource, action=ACTION.REVOKE)
async def revoke_group(assignment_id: str, session: AsyncSession = Depends(get_session)):
    res = await service.revoke_group(session, assignment_id)
    return ApiResponse.success(message="Group revoked", data={"result": res})

# List groups for user
@router.get("/user/{user_id}")
@registry(resource=resource, action=ACTION.READ)
async def list_user_groups(user_id: str, session: AsyncSession = Depends(get_session)):
    assignments = await service.list_user_groups(session, user_id)
    return ApiResponse.success(message="User groups fetched", data={"assignments": [orm_to_dict(a) for a in assignments]})

# List users for a group
@router.get("/{group_id}/users")
@registry(resource=resource, action=ACTION.READ)
async def list_group_users(group_id: str, session: AsyncSession = Depends(get_session)):
    assignments = await service.list_group_users(session, group_id)
    return ApiResponse.success(message="Group users fetched", data={"assignments": [orm_to_dict(a) for a in assignments]})
