import asyncio
from db.engine import async_session
from repositories.user_setting_repository import UserSettingRepository

async def test():
    async with async_session() as session:
        repo = UserSettingRepository()
        try:
            settings = await repo.create(session, "bf095bdd-9540-4574-9085-93973ce0fd5e")
            print("OK", settings.id)
        except Exception as e:
            print("ERROR", str(e))

asyncio.run(test())
