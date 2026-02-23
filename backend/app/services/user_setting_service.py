from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_setting_repository import UserSettingRepository

class UserSettingService:
    def __init__(self):
        self.repo = UserSettingRepository()

    async def get_or_create_settings(self, session: AsyncSession, user_id: str):
        settings = await self.repo.get_by_user(session, user_id)
        if not settings:
            settings = await self.repo.create(session, user_id)
        return settings

    async def update_settings(self, session: AsyncSession, user_id: str, update_data: dict):
        settings = await self.get_or_create_settings(session, user_id)
        cleaned_data = {k: v for k, v in update_data.items() if v is not None}
        if cleaned_data:
            settings = await self.repo.update(session, settings, cleaned_data)
        return settings
