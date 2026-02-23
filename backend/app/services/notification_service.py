from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.notification_repository import NotificationRepository

class NotificationService:
    def __init__(self):
        self.repo = NotificationRepository()

    async def get_user_notifications(self, session: AsyncSession, user_id: str, limit: int = 50):
        return await self.repo.get_by_user(session, user_id, limit)

    async def get_unread_count(self, session: AsyncSession, user_id: str):
        return await self.repo.count_unread(session, user_id)

    async def mark_as_read(self, session: AsyncSession, notification_id: str, user_id: str):
        notif = await self.repo.mark_as_read(session, notification_id, user_id)
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")
        return notif

    async def mark_all_as_read(self, session: AsyncSession, user_id: str):
        await self.repo.mark_all_as_read(session, user_id)
        return True

    async def create_notification(self, session: AsyncSession, user_id: str, title: str, message: str):
        return await self.repo.create(session, user_id, title, message)
