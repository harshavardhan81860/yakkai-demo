# tenant_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.tenant import Tenant
from typing import Optional, List

class TenantRepository:

    async def list_tenants(self, session: AsyncSession, is_active: Optional[bool] = None) -> List[Tenant]:
        stmt = select(Tenant)
        if is_active is not None:
            stmt = stmt.where(Tenant.is_active == is_active)

        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_name(self, session: AsyncSession, name: str) -> Optional[Tenant]:
        stmt = select(Tenant).where(Tenant.name == name)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, session: AsyncSession, tenant_id: str) -> Optional[Tenant]:
        stmt = select(Tenant).where(Tenant.id == tenant_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, tenant: Tenant) -> Tenant:
        session.add(tenant)
        await session.commit()
        await session.refresh(tenant)
        return tenant

    async def update(self, session: AsyncSession, tenant: Tenant) -> Tenant:
        session.add(tenant)
        await session.commit()
        await session.refresh(tenant)
        return tenant
