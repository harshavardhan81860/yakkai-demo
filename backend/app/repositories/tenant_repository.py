# tenant_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.tenant import Tenant
from models.tenant_user import TenantUser
from models.role_assignment import RoleAssignment
from models.group import GroupAssignment
from typing import Optional, List

class TenantRepository:

    async def list_tenants(self, session: AsyncSession, is_active: Optional[bool] = None) -> List[Tenant]:
        stmt = select(Tenant)
        if is_active is not None:
            stmt = stmt.where(Tenant.is_active == is_active)

        result = await session.execute(stmt)
        return result.scalars().all()

    async def list_tenants_by_user(self, session: AsyncSession, user_id: str) -> List[Tenant]:
        stmt = select(Tenant).join(TenantUser).where(TenantUser.user_id == user_id)
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

    async def get_tenant_user(self, session: AsyncSession, tenant_id: str, user_id: str) -> Optional[TenantUser]:
        stmt = select(TenantUser).where(TenantUser.tenant_id == tenant_id, TenantUser.user_id == user_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_users_by_tenant(self, session: AsyncSession, tenant_id: str) -> List[TenantUser]:
        stmt = select(TenantUser).where(TenantUser.tenant_id == tenant_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def add_user_to_tenant(self, session: AsyncSession, tenant_user: TenantUser) -> TenantUser:
        session.add(tenant_user)
        await session.commit()
        await session.refresh(tenant_user)
        return tenant_user

    async def remove_user_from_tenant(self, session: AsyncSession, tenant_id: str, user_id: str) -> bool:
        tenant_user = await self.get_tenant_user(session, tenant_id, user_id)
        if not tenant_user:
            return False
            
        # Delete cascade relationships in application layer (role assignments, group assignments within this tenant)
        stmt_roles = select(RoleAssignment).where(RoleAssignment.tenant_id == tenant_id, RoleAssignment.user_id == user_id)
        result_roles = await session.execute(stmt_roles)
        for role_assignment in result_roles.scalars().all():
            await session.delete(role_assignment)
            
        stmt_groups = select(GroupAssignment).where(GroupAssignment.tenant_id == tenant_id, GroupAssignment.user_id == user_id)
        result_groups = await session.execute(stmt_groups)
        for group_assignment in result_groups.scalars().all():
            await session.delete(group_assignment)

        # Finally delete the tenant user mapping
        await session.delete(tenant_user)
        await session.commit()
        return True
