from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from models.notification import Notification

class NotificationRepository:
    async def get_by_user(self, session: AsyncSession, user_id: str, limit: int = 50):
        result = await session.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def count_unread(self, session: AsyncSession, user_id: str):
        result = await session.execute(
            select(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
        )
        return len(result.scalars().all())

    async def mark_as_read(self, session: AsyncSession, notification_id: str, user_id: str):
        result = await session.execute(
            select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
        )
        notification = result.scalars().first()
        if notification:
            notification.is_read = True
            await session.commit()
            await session.refresh(notification)
        return notification

    async def mark_all_as_read(self, session: AsyncSession, user_id: str):
        await session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        await session.commit()

    async def create(self, session: AsyncSession, user_id: str, title: str, message: str):
        notification = Notification(user_id=user_id, title=title, message=message, is_read=False)
        session.add(notification)
        await session.commit()
        await session.refresh(notification)
        return notification
