from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.cloud_account import CloudAccount
from typing import Optional, List
from uuid import UUID


class CloudAccountRepository:

    async def get_account_by_id(
    self,
    session: AsyncSession,
    account_id: str
    ) -> List[CloudAccount]:
        stmt = select(CloudAccount).where(CloudAccount.id == account_id)
        result = await session.execute(stmt)
        return result.scalars().all()  # returns a list with single account


    async def list_accounts(
        self,
        session: AsyncSession,
        tenant_id: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[CloudAccount]:

        stmt = select(CloudAccount)

        if tenant_id is not None:
            stmt = stmt.where(CloudAccount.tenant_id == tenant_id)

        if is_active is not None:
            stmt = stmt.where(CloudAccount.is_active == is_active)

        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self,
        session: AsyncSession,
        record_id: str
    ) -> Optional[CloudAccount]:

        stmt = select(CloudAccount).where(CloudAccount.id == record_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
    

    async def get_by_name(
        self,
        session: AsyncSession,
        tenant_id: str,
        name: str
    ) -> Optional[CloudAccount]:
        """
        Used to enforce unique cloud account name per tenant
        """
        stmt = select(CloudAccount).where(
            CloudAccount.tenant_id == tenant_id,
            CloudAccount.name == name
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        session: AsyncSession,
        account: CloudAccount
    ) -> CloudAccount:
        session.add(account)
        return account

    async def update(
        self,
        session: AsyncSession,
        account: CloudAccount
    ) -> CloudAccount:
        session.add(account)
        return account


    async def update(self, session, account: CloudAccount):
        session.add(account)
