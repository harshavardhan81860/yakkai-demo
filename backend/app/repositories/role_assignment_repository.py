# repositories/role_assignment_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.role_assignment import RoleAssignment
from typing import Optional, List

class RoleAssignmentRepository:

    async def get_by_id(self, session: AsyncSession, assignment_id: str) -> Optional[RoleAssignment]:
        stmt = select(RoleAssignment).where(RoleAssignment.id == assignment_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(self, session: AsyncSession, user_id: str) -> List[RoleAssignment]:
        stmt = select(RoleAssignment).where(RoleAssignment.user_id == user_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def list_by_role(self, session: AsyncSession, role_id: str) -> List[RoleAssignment]:
        stmt = select(RoleAssignment).where(RoleAssignment.role_id == role_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_scope(self, session: AsyncSession, user_id: str, tenant_id: Optional[str], cloud_account_id: Optional[str], component_id: Optional[str]) -> Optional[RoleAssignment]:
        stmt = select(RoleAssignment).where(RoleAssignment.user_id == user_id)
        if tenant_id:
            stmt = stmt.where(RoleAssignment.tenant_id == tenant_id)
        else:
            stmt = stmt.where(RoleAssignment.tenant_id.is_(None))
            
        if cloud_account_id:
            stmt = stmt.where(RoleAssignment.cloud_account_id == cloud_account_id)
        else:
            stmt = stmt.where(RoleAssignment.cloud_account_id.is_(None))
            
        if component_id:
            stmt = stmt.where(RoleAssignment.component_id == component_id)
        else:
            stmt = stmt.where(RoleAssignment.component_id.is_(None))
            
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, assignment: RoleAssignment) -> RoleAssignment:
        session.add(assignment)
        return assignment

    async def delete(self, session: AsyncSession, assignment: RoleAssignment):
        await session.delete(assignment)
        return True

