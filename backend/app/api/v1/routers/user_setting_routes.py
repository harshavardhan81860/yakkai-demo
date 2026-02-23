from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from core.response import ApiResponse
from utils.serializer import orm_to_dict

from services.user_setting_service import UserSettingService
from schemas.user_setting_schema import UserSettingUpdate

router = APIRouter(prefix="/settings", tags=["User Settings"])
service = UserSettingService()

@router.get("/{user_id}")
async def get_settings(
    user_id: str,
    session: AsyncSession = Depends(get_session)
):
    settings = await service.get_or_create_settings(session, user_id)
    return ApiResponse.success(data={"settings": orm_to_dict(settings)})

@router.put("/{user_id}")
async def update_settings(
    user_id: str,
    req: UserSettingUpdate,
    session: AsyncSession = Depends(get_session)
):
    update_data = req.dict(exclude_unset=True)
    settings = await service.update_settings(session, user_id, update_data)
    return ApiResponse.success(message="Settings updated", data={"settings": orm_to_dict(settings)})
