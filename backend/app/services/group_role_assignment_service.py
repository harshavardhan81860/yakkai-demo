from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from datetime import datetime

from repositories.group_role_assignment_repository import GroupRoleAssignmentRepository
from repositories.role_repository import RoleRepository
from repositories.group_repository import GroupRepository
from models.group_role_assignment import GroupRoleAssignment
from typing import Optional

class GroupRoleAssignmentService:

    def __init__(self):
        self.repo = GroupRoleAssignmentRepository()
        self.role_repo = RoleRepository()
        self.group_repo = GroupRepository()

    async def assign_role_to_group(
        self,
        session: AsyncSession,
        group_id: str,
        role_id: str,
        tenant_id: Optional[str] = None,
        cloud_account_id: Optional[str] = None,
        component_id: Optional[str] = None,
        assigned_by: Optional[str] = None
    ):
        # Validate scope (same as user-role)
        scopes_set = sum(bool(x) for x in (tenant_id, cloud_account_id, component_id))
        if scopes_set > 1:
            raise HTTPException(
                status_code=400,
                detail="Only one scope may be specified"
            )

        group = await self.group_repo.get_by_id(session, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        role = await self.role_repo.get_by_id(session, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        existing = await self.repo.get_existing(
            session,
            group_id,
            role_id,
            tenant_id,
            cloud_account_id,
            component_id
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Role already assigned to group for this scope"
            )

        now = datetime.utcnow()
        obj = GroupRoleAssignment(
            group_id=group_id,
            role_id=role_id,
            tenant_id=tenant_id,
            cloud_account_id=cloud_account_id,
            component_id=component_id,
            assigned_by=assigned_by,
            created_at=now,
            updated_at=now
        )

        await self.repo.create(session, obj)
        await session.commit()
        await session.refresh(obj)
        return obj

    async def revoke_group_role(self, session: AsyncSession, assignment_id: str):
        assignment = await self.repo.get_by_id(session, assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        await self.repo.delete(session, assignment)
        await session.commit()
        return {"deleted": True}

    async def list_group_roles(self, session: AsyncSession, group_id: str):
        return await self.repo.list_by_group(session, group_id)

    async def list_role_groups(self, session: AsyncSession, role_id: str):
        role = await self.role_repo.get_by_id(session, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        return await self.repo.list_by_role(session, role_id)

