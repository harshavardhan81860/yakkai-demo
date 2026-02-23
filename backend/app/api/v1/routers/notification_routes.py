from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from core.response import ApiResponse
from utils.serializer import orm_to_dict

from services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])
service = NotificationService()

@router.get("/")
async def get_notifications(
    user_id: str,
    limit: int = 50,
    session: AsyncSession = Depends(get_session)
):
    notifs = await service.get_user_notifications(session, user_id, limit)
    return ApiResponse.success(data={"notifications": [orm_to_dict(n) for n in notifs]})

@router.get("/unread-count")
async def get_unread_count(
    user_id: str,
    session: AsyncSession = Depends(get_session)
):
    count = await service.get_unread_count(session, user_id)
    return ApiResponse.success(data={"count": count})

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    user_id: str,
    session: AsyncSession = Depends(get_session)
):
    notif = await service.mark_as_read(session, notification_id, user_id)
    return ApiResponse.success(message="Notification marked as read", data={"notification": orm_to_dict(notif)})

@router.put("/read-all")
async def mark_all_as_read(
    user_id: str,
    session: AsyncSession = Depends(get_session)
):
    await service.mark_all_as_read(session, user_id)
    return ApiResponse.success(message="All notifications marked as read")

@router.post("/")
async def create_notification(
    user_id: str,
    title: str,
    message: str,
    session: AsyncSession = Depends(get_session)
):
    notif = await service.create_notification(session, user_id, title, message)
    return ApiResponse.success(message="Notification created", data={"notification": orm_to_dict(notif)}, status_code=201)
