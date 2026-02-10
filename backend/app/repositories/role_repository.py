# repositories/role_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.role import Role
from typing import Optional, List

class RoleRepository:

    async def list_roles(self, session: AsyncSession, tenant_id: Optional[str] = None) -> List[Role]:
        stmt = select(Role)
        if tenant_id is not None:
            stmt = stmt.where(Role.tenant_id == tenant_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(self, session: AsyncSession, role_id: str) -> Optional[Role]:
        stmt = select(Role).where(Role.id == role_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, session: AsyncSession, name: str, tenant_id: Optional[str] = None) -> Optional[Role]:
        stmt = select(Role).where(Role.name == name)
        if tenant_id is None:
            stmt = stmt.where(Role.tenant_id.is_(None))
        else:
            stmt = stmt.where(Role.tenant_id == tenant_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, role: Role) -> Role:
        session.add(role)
        return role

    async def update(self, session: AsyncSession, role: Role) -> Role:
        session.add(role)
        return role
