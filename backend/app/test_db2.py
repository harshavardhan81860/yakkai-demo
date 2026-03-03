import asyncio
from db.engine import async_session
from models.user_setting import UserSetting
import uuid

async def test():
    async with async_session() as session:
        setting = UserSetting(user_id=uuid.UUID("bf095bdd-9540-4574-9085-93973ce0fd5e"))
        session.add(setting)
        try:
            await session.commit()
            await session.refresh(setting)
            print("OK", setting.id)
        except Exception as e:
            print("ERROR", str(e))

asyncio.run(test())
