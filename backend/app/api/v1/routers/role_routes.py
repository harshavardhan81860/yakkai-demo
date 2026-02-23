# routes/role_routes.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.role_service import RoleService
from services.role_assignment_service import RoleAssignmentService
from schemas.role_schema import RoleCreateRequest, RoleResponse, RoleUpdateRequest
from schemas.role_assignment_schema import RoleAssignmentCreateRequest, RoleAssignmentResponse
from core.response import ApiResponse
from utils.serializer import orm_to_dict
from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/roles", tags=["Roles"])
service = RoleService()
assign_service = RoleAssignmentService()
resource = RESOURCE.ROLE

# Roles
@router.get("/")
@registry(resource=resource, action=ACTION.READ)
async def list_roles(is_system: Optional[bool] = None, session: AsyncSession = Depends(get_session)):
    roles = await service.list_roles(session, is_system)
    return ApiResponse.success(
        message="Roles fetched successfully",
        data={"roles": [orm_to_dict(r) for r in roles]}
    )

@router.post("/create")
@registry(resource=resource, action=ACTION.CREATE)
async def create_role(req: RoleCreateRequest, session: AsyncSession = Depends(get_session)):
    try:
        role = await service.create_role(session, req.tenant_id, req.name, req.description, req.email,req.is_system_role)
        return ApiResponse.success(
            message="Role created successfully",
            status_code=201,
            data={"role": orm_to_dict(role)}
        )
    except HTTPException as e:
        return ApiResponse.error(message=e.detail, status_code=e.status_code)
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)

@router.put("/{role_id}")
@registry(resource=resource, action=ACTION.UPDATE)
async def update_role(role_id: str, req: RoleUpdateRequest, session: AsyncSession = Depends(get_session)):
    try:
        role = await service.update_role(session, role_id, req.name, req.description, req.email, req.is_active)
        return ApiResponse.success(
            message="Role updated successfully",
            data={"role": orm_to_dict(role)}
        )
    except HTTPException as e:
        return ApiResponse.error(message=e.detail, status_code=e.status_code)
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)

@router.patch("/{role_id}/activate")
@registry(resource=resource, action=ACTION.ACTIVATE)
async def activate_role(role_id: str, session: AsyncSession = Depends(get_session)):
    try:
        role = await service.update_role(session, role_id, None, None, True)
        return ApiResponse.success(message="Role activated", data={"role": orm_to_dict(role)})
    except HTTPException as e:
        return ApiResponse.error(message=e.detail, status_code=e.status_code)
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)

@router.patch("/{role_id}/deactivate")
@registry(resource=resource, action=ACTION.DEACTIVATE)
async def deactivate_role(role_id: str, session: AsyncSession = Depends(get_session)):
    try:
        role = await service.update_role(session, role_id, None, None, False)
        return ApiResponse.success(message="Role deactivated", data={"role": orm_to_dict(role)})
    except HTTPException as e:
        return ApiResponse.error(message=e.detail, status_code=e.status_code)
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)

# Role assignments
@router.post("/assign")
@registry(resource=resource, action=ACTION.ASSIGN)
async def assign_role(req: RoleAssignmentCreateRequest, session: AsyncSession = Depends(get_session)):
    try:
        assignment = await assign_service.assign_role(
            session,
            user_id=req.user_id,
            role_id=req.role_id,
            tenant_id=req.tenant_id,
            cloud_account_id=req.cloud_account_id,
            component_id=req.component_id,
            assigned_by=req.assigned_by
        )
        return ApiResponse.success(message="Role assigned", status_code=201, data={"assignment": orm_to_dict(assignment)})
    except HTTPException as e:
        return ApiResponse.error(message=e.detail, status_code=e.status_code)
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)

@router.post("/revoke/{assignment_id}")
@registry(resource=resource, action=ACTION.REVOKE)
async def revoke_role(assignment_id: str, session: AsyncSession = Depends(get_session)):
    try:
        res = await assign_service.revoke_role(session, assignment_id)
        return ApiResponse.success(message="Role revoked", data={"result": res})
    except HTTPException as e:
        return ApiResponse.error(message=e.detail, status_code=e.status_code)
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)

@router.get("/user/{user_id}")
@registry(resource=resource, action=ACTION.READ)
async def list_user_roles(user_id: str, session: AsyncSession = Depends(get_session)):
    assignments = await assign_service.list_user_assignments(session, user_id)
    return ApiResponse.success(message="User roles fetched", data={"assignments": [orm_to_dict(a) for a in assignments]})

@router.get("/user/{user_id}/effective")
@registry(resource=resource, action=ACTION.READ)
async def list_effective_user_roles(user_id: str, session: AsyncSession = Depends(get_session)):
    assignments = await assign_service.list_effective_user_assignments(session, user_id)
    return ApiResponse.success(message="Effective user roles fetched", data={"assignments": assignments})

@router.get("/{role_id}/users")
@registry(resource=resource, action=ACTION.READ)
async def get_users_for_role(role_id: str, session: AsyncSession = Depends(get_session)):
    users = await assign_service.list_role_assignments(session, role_id)
    return ApiResponse.success(
        message="Users assigned to role fetched",
        data={"users": [orm_to_dict(u) for u in users]}
    )
