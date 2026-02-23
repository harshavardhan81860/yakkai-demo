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

        # Enforcement of strict cross-mapping rules
        if group.is_system_group:
            if not role.is_system_role:
                raise HTTPException(status_code=400, detail="System groups can only be mapped to System roles")
            if tenant_id or cloud_account_id or component_id:
                raise HTTPException(status_code=400, detail="System groups cannot have tenant/cloud/component specific assignments")
        else:
            # Tenant Group
            if role.is_system_role:
                raise HTTPException(status_code=400, detail="Tenant groups cannot be mapped to System roles")
            if str(role.tenant_id) != str(group.tenant_id):
                raise HTTPException(status_code=400, detail="Tenant groups can only be mapped to roles within the same tenant")
            
            # If tenant_id is provided in scope, it must match
            if tenant_id and str(tenant_id) != str(group.tenant_id):
                raise HTTPException(status_code=400, detail="Assignment scope must match the group's tenant")
            
            # If no specific scope is provided for a tenant group assignment, we default it to the group's tenant
            if not tenant_id and not cloud_account_id and not component_id:
                tenant_id = group.tenant_id

        # Find any existing assignment at this exact scope for this group
        existing = await self.repo.get_by_scope(
            session,
            group_id,
            tenant_id,
            cloud_account_id,
            component_id
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Group cannot have duplicate roles assigned at this level. Please remove the existing role before assigning a new one."
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

        try:
            await self.repo.create(session, obj)
            await session.commit()
            await session.refresh(obj)
            return obj
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

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

