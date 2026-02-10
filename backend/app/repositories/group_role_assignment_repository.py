from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.group_role_assignment import GroupRoleAssignment
from typing import Optional, List

class GroupRoleAssignmentRepository:

    async def get_by_id(self, session: AsyncSession, assignment_id: str):
        stmt = select(GroupRoleAssignment).where(
            GroupRoleAssignment.id == assignment_id
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_existing(
        self,
        session: AsyncSession,
        group_id: str,
        role_id: str,
        tenant_id: Optional[str],
        cloud_account_id: Optional[str],
        component_id: Optional[str],
    ):
        stmt = select(GroupRoleAssignment).where(
            GroupRoleAssignment.group_id == group_id,
            GroupRoleAssignment.role_id == role_id,
            GroupRoleAssignment.tenant_id == tenant_id,
            GroupRoleAssignment.cloud_account_id == cloud_account_id,
            GroupRoleAssignment.component_id == component_id,
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_group(self, session: AsyncSession, group_id: str):
        stmt = select(GroupRoleAssignment).where(
            GroupRoleAssignment.group_id == group_id
        )
        res = await session.execute(stmt)
        return res.scalars().all()

    async def create(self, session: AsyncSession, obj: GroupRoleAssignment):
        session.add(obj)
        return obj

    async def delete(self, session: AsyncSession, obj: GroupRoleAssignment):
        await session.delete(obj)
        return True

    async def list_by_role(self, session: AsyncSession, role_id: str):
        stmt = select(GroupRoleAssignment).where(
            GroupRoleAssignment.role_id == role_id
        )
        res = await session.execute(stmt)
        return res.scalars().all()
