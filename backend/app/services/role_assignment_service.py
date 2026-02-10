# services/role_assignment_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from repositories.role_assignment_repository import RoleAssignmentRepository
from repositories.role_repository import RoleRepository
from models.role_assignment import RoleAssignment
from typing import Optional, List
from datetime import datetime

class RoleAssignmentService:
    def __init__(self):
        self.repo = RoleAssignmentRepository()
        self.role_repo = RoleRepository()

    async def assign_role(self, session: AsyncSession, user_id: str, role_id: str,
                          tenant_id: Optional[str] = None, cloud_account_id: Optional[str] = None,
                          component_id: Optional[str] = None, assigned_by: Optional[str] = None):
        # validate role exists
        role = await self.role_repo.get_by_id(session, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        # validate scope: only one of tenant/cloud/component allowed
        scopes_set = sum(bool(x) for x in (tenant_id, cloud_account_id, component_id))
        if scopes_set > 1:
            raise HTTPException(status_code=400, detail="Only one scope may be specified for an assignment")

        now = datetime.utcnow()
        assignment = RoleAssignment(
            user_id=user_id,
            role_id=role_id,
            tenant_id=tenant_id,
            cloud_account_id=cloud_account_id,
            component_id=component_id,
            assigned_by=assigned_by,
            created_at=now,
            updated_at=now
        )

        try:
            await self.repo.create(session, assignment)
            await session.commit()
            await session.refresh(assignment)
            return assignment
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def revoke_role(self, session: AsyncSession, assignment_id: str):
        assignment = await self.repo.get_by_id(session, assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        try:
            await self.repo.delete(session, assignment)
            await session.commit()
            return {"deleted": True}
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def list_user_assignments(self, session: AsyncSession, user_id: str):
        return await self.repo.list_by_user(session, user_id)

    async def list_role_assignments(self, session: AsyncSession, role_id: str):
        return await self.repo.list_by_role(session, role_id)
