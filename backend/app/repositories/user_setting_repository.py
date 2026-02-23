from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.user_setting import UserSetting

class UserSettingRepository:
    async def get_by_user(self, session: AsyncSession, user_id: str):
        result = await session.execute(
            select(UserSetting).where(UserSetting.user_id == user_id)
        )
        return result.scalars().first()

    async def create(self, session: AsyncSession, user_id: str):
        setting = UserSetting(user_id=user_id)
        session.add(setting)
        await session.commit()
        await session.refresh(setting)
        return setting

    async def update(self, session: AsyncSession, setting: UserSetting, update_data: dict):
        for key, value in update_data.items():
            setattr(setting, key, value)
        await session.commit()
        await session.refresh(setting)
        return setting
