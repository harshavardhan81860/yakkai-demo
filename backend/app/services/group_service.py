from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from models.group import Group, GroupAssignment
from repositories.group_repository import GroupRepository, GroupAssignmentRepository
from typing import Optional, List
from datetime import datetime

class GroupService:
    def __init__(self):
        self.repo = GroupRepository()
        self.assignment_repo = GroupAssignmentRepository()

    # Groups
    async def list_groups(self, session: AsyncSession, tenant_id: Optional[str] = None) -> List[Group]:
        return await self.repo.list_groups(session, tenant_id)

    async def create_group(self, session: AsyncSession, tenant_id: Optional[str], name: str, email: Optional[str], description: Optional[str], is_system_group: bool = False) -> Group:
        existing = await self.repo.get_by_name(session, name)
        if existing:
            raise HTTPException(status_code=400, detail="Group with this name already exists")

        now = datetime.utcnow()
        group = Group(
            tenant_id=tenant_id,
            name=name,
            email=email,
            description=description,
            is_system_group=is_system_group,
            is_active=True,
            created_at=now,
            updated_at=now
        )

        try:
            await self.repo.create(session, group)
            await session.commit()
            await session.refresh(group)
            return group
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def update_group(self, session: AsyncSession, group_id: str, name: Optional[str], email: Optional[str], description: Optional[str], is_active: Optional[bool]) -> Group:
        group = await self.repo.get_by_id(session, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        if name is not None:
            group.name = name
        if email is not None:
            group.email = email
        if description is not None:
            group.description = description
        if is_active is not None:
            group.is_active = is_active

        group.updated_at = datetime.utcnow()

        try:
            await self.repo.update(session, group)
            await session.commit()
            await session.refresh(group)
            return group
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    # Group Assignments
    async def assign_group(self, session: AsyncSession, user_id: str, group_id: str, tenant_id: Optional[str] = None, cloud_account_id: Optional[str] = None, component_id: Optional[str] = None, assigned_by: Optional[str] = None):
        now = datetime.utcnow()
        assignment = GroupAssignment(
            user_id=user_id,
            group_id=group_id,
            tenant_id=tenant_id,
            cloud_account_id=cloud_account_id,
            component_id=component_id,
            assigned_by=assigned_by,
            created_at=now,
            updated_at=now
        )

        try:
            await self.assignment_repo.create(session, assignment)
            await session.commit()
            await session.refresh(assignment)
            return assignment
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def revoke_group(self, session: AsyncSession, assignment_id: str):
        assignment = await self.assignment_repo.get_by_id(session, assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        try:
            await self.assignment_repo.delete(session, assignment)
            await session.commit()
            return {"deleted": True}
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def list_user_groups(self, session: AsyncSession, user_id: str):
        return await self.assignment_repo.list_by_user(session, user_id)

    async def list_group_users(self, session: AsyncSession, group_id: str):
        return await self.assignment_repo.list_by_group(session, group_id)
