from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.ci_credentials import CICredentials
from typing import Optional, List


class CICredentialsRepository:

    async def list_credentials(
        self,
        session: AsyncSession,
        provider: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[CICredentials]:

        stmt = select(CICredentials)

        if provider:
            stmt = stmt.where(CICredentials.provider == provider)

        if is_active is not None:
            stmt = stmt.where(CICredentials.is_active == is_active)

        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(self, session: AsyncSession, record_id):
        stmt = select(CICredentials).where(CICredentials.id == record_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, cred: CICredentials):
        session.add(cred)
        return cred

    async def update(self, session: AsyncSession, cred: CICredentials):
        session.add(cred)
        return cred
