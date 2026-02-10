from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.group import Group, GroupAssignment
from typing import Optional, List

class GroupRepository:

    async def list_groups(self, session: AsyncSession, tenant_id: Optional[str] = None) -> List[Group]:
        stmt = select(Group)
        if tenant_id is not None:
            stmt = stmt.where(Group.tenant_id == tenant_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(self, session: AsyncSession, group_id: str) -> Optional[Group]:
        stmt = select(Group).where(Group.id == group_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, session: AsyncSession, name: str) -> Optional[Group]:
        stmt = select(Group).where(Group.name == name)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, group: Group) -> Group:
        session.add(group)
        return group

    async def update(self, session: AsyncSession, group: Group) -> Group:
        session.add(group)
        return group

class GroupAssignmentRepository:

    async def get_by_id(self, session: AsyncSession, assignment_id: str) -> Optional[GroupAssignment]:
        stmt = select(GroupAssignment).where(GroupAssignment.id == assignment_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(self, session: AsyncSession, user_id: str) -> List[GroupAssignment]:
        stmt = select(GroupAssignment).where(GroupAssignment.user_id == user_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def list_by_group(self, session: AsyncSession, group_id: str) -> List[GroupAssignment]:
        stmt = select(GroupAssignment).where(GroupAssignment.group_id == group_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def create(self, session: AsyncSession, assignment: GroupAssignment) -> GroupAssignment:
        session.add(assignment)
        return assignment

    async def delete(self, session: AsyncSession, assignment: GroupAssignment):
        await session.delete(assignment)
        return True
