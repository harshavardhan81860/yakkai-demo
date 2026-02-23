import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import async_session
from repositories.role_repository import RoleRepository

async def run():
    async with async_session() as session:
        repo = RoleRepository()
        roles = await repo.list_roles(session)
        print("Total roles:", len(roles))
        print("---")
        for r in roles:
            print(f"Role: {r.name}, is_system: {r.is_system_role}, tenant_id: {r.tenant_id}")

if __name__ == "__main__":
    asyncio.run(run())
