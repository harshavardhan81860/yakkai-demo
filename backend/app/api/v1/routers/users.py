# app/api/v1/routers/users.py  (adjust path as in your project)
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.user_service import UserService
from schemas.user_schema import CreateUserRequest
from core.response import ApiResponse
from utils.serializer import orm_to_dict
from typing import Optional
from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/users", tags=["Users"])
service = UserService()
resource = RESOURCE.USER

@router.get("/")
async def list_users(
    email: Optional[str] = None,
    user_id: Optional[str] = None,
    user_name : Optional[str]=None,
    active: Optional[bool] = None,
    session: AsyncSession = Depends(get_session)
):
    users = await service.list_users(session, email=email, user_id=user_id, user_name=user_name ,active=active)

    users_list = [orm_to_dict(u) for u in users]

    total = len(users_list)
    active = sum(1 for u in users_list if u.get("is_active") is True)
    inactive = sum(1 for u in users_list if u.get("is_active") is False)

    return ApiResponse.success(
        message="Users fetched successfully",
        data = {
            "header": {
                "total_users": total,
                "active_users": active,
                "inactive_users": inactive
            },
            "users": users_list
        }
    )

@router.post("/create")
@registry(resource=resource, action=ACTION.CREATE)
async def create_user(req: CreateUserRequest, session: AsyncSession = Depends(get_session)):
    try:
        user = await service.create_user(
            session=session,
            email=req.email,
            first_name=req.first_name,
            last_name=req.last_name,
            mobile=req.mobile,
            department=req.department,
            gender=req.gender,
            password=req.password
        )

        return ApiResponse.success(
            message="User created successfully",
            status_code=201,
            data={"user": orm_to_dict(user)}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)


@router.patch("/{user_id}/activate")
@registry(resource=resource, action=ACTION.ACTIVATE)
async def activate_user(user_id: str, session: AsyncSession = Depends(get_session)):
    # Inspect current state first
    existing = await service.get_user(session, user_id)
    if existing is None:
        return ApiResponse.error(message="User not found", status_code=404)

    if existing.is_active:
        # already active -> no DB change required
        return ApiResponse.success(
            message="User is already active — no changes made",
            data={"user": orm_to_dict(existing)}
        )

    # perform activation
    updated = await service.activate_user(session, user_id)
    if updated is None:
        return ApiResponse.error(message="User not found", status_code=404)

    return ApiResponse.success(
        message="User activated successfully",
        data={"user": orm_to_dict(updated)}
    )


@router.patch("/{user_id}/deactivate")
@registry(resource=resource, action=ACTION.DEACTIVATE)
async def deactivate_user(user_id: str, session: AsyncSession = Depends(get_session)):
    # Inspect current state first
    existing = await service.get_user(session, user_id)
    if existing is None:
        return ApiResponse.error(message="User not found", status_code=404)

    if not existing.is_active:
        # already inactive -> no DB change required
        return ApiResponse.success(
            message="User is already inactive — no changes made",
            data={"user": orm_to_dict(existing)}
        )

    # perform deactivation
    updated = await service.deactivate_user(session, user_id)
    if updated is None:
        return ApiResponse.error(message="User not found", status_code=404)

    return ApiResponse.success(
        message="User deactivated successfully",
        data={"user": orm_to_dict(updated)}
    )


@router.post("/auth/forgot-password")
async def forgot_password(email: str):
    try:
        await service.trigger_reset_password(email)
        return ApiResponse.success(
            message="Password reset triggered",
            data={"info": "Further implementation pending"}
        )
    except Exception as e:
        return ApiResponse.error(message=str(e), status_code=400)

@router.get("/users/me", tags=["Users"])
async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    jwt_user = getattr(request.state, "user", None)

    if not jwt_user:
        return ApiResponse.error(
            message="Authentication context missing",
            status_code=401
        )

    username = jwt_user.get("preferred_username")

    if not username:
        return ApiResponse.error(
            message="Username not found in token",
            status_code=400
        )

    user = await service.list_users(session, user_name=username)

    # user = await service.get_by_username(session, username)

    if not user:
        return ApiResponse.success(
            message="User not found in system",
            data={
                "id": None,
                "username": username,
                "email": None,
                "tenant_id": None,
                "is_active": None            }
        )

    return ApiResponse.success(
        message="User fetched successfully",
        data=[orm_to_dict(u) for u in user]
    )


@router.get("/{user_id}/access-mappings")
async def get_user_access_mappings(
    user_id: str,
    session: AsyncSession = Depends(get_session)
):
    data = await service.get_user_access_mappings(session, user_id)
    return ApiResponse.success(
        message="User access mappings fetched successfully",
        data=data
    )
