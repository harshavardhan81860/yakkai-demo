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
        from repositories.group_repository import GroupRepository, GroupAssignmentRepository
        from repositories.group_role_assignment_repository import GroupRoleAssignmentRepository
        self.group_repo = GroupRepository()
        self.group_assign_repo = GroupAssignmentRepository()
        self.group_role_repo = GroupRoleAssignmentRepository()

    async def assign_role(self, session: AsyncSession, user_id: str, role_id: str,
                          tenant_id: Optional[str] = None, cloud_account_id: Optional[str] = None,
                          component_id: Optional[str] = None, assigned_by: Optional[str] = None):
        # validate role exists
        role = await self.role_repo.get_by_id(session, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        # explicitly validate tenant user mapping if non-system role and tenant scope
        if tenant_id and not role.is_system_role:
            from repositories.tenant_repository import TenantRepository
            tenant_repo = TenantRepository()
            tenant_user = await tenant_repo.get_tenant_user(session, tenant_id, user_id)
            if not tenant_user:
                raise HTTPException(status_code=403, detail="User is not a member of this tenant")

        # validate scope logic
        scopes_count = sum(bool(x) for x in (tenant_id, cloud_account_id, component_id))
        
        if role.is_system_role:
            if scopes_count > 0:
                raise HTTPException(status_code=400, detail="System roles cannot have tenant, cloud, or component specific assignments")
        else:
            # Tenant role
            if scopes_count == 0:
                raise HTTPException(status_code=400, detail="Tenant roles must be assigned to a specific scope (tenant, cloud account, or component)")
            if scopes_count > 1:
                raise HTTPException(status_code=400, detail="Only one scope may be specified for an assignment")

        # Find any existing assignment at this exact scope for this user
        existing = await self.repo.get_by_scope(session, user_id, tenant_id, cloud_account_id, component_id)
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="User cannot have duplicate roles assigned at this level. Please remove the existing role before assigning a new one."
            )

        # Check for inherited roles at the same scope
        effective = await self.list_effective_user_assignments(session, user_id)
        for a in effective:
            if a["is_inherited"] and a["tenant_id"] == tenant_id and a["cloud_account_id"] == cloud_account_id and a["component_id"] == component_id:
                raise HTTPException(status_code=400, detail=f"User already has an inherited role at this scope via group '{a['source_group_name']}'")

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

    async def list_effective_user_assignments(self, session: AsyncSession, user_id: str):
        # 1. Direct assignments
        direct_assignments = await self.repo.list_by_user(session, user_id)
        
        effective = []
        for a in direct_assignments:
            a_dict = {
                "id": a.id,
                "user_id": a.user_id,
                "role_id": a.role_id,
                "tenant_id": a.tenant_id,
                "cloud_account_id": a.cloud_account_id,
                "component_id": a.component_id,
                "assigned_by": a.assigned_by,
                "is_inherited": False,
                "source_group_name": None
            }
            effective.append(a_dict)

        # 2. Group assignments
        group_assignments = await self.group_assign_repo.list_by_user(session, user_id)
        for ga in group_assignments:
            group = await self.group_repo.get_by_id(session, ga.group_id)
            if not group:
                continue
                
            group_roles = await self.group_role_repo.list_by_group(session, ga.group_id)
            for gr in group_roles:
                # Inherited assignments take on the group_role mapping's scope
                effective.append({
                    "id": f"inherited_{gr.id}",
                    "user_id": user_id,
                    "role_id": gr.role_id,
                    "tenant_id": gr.tenant_id,
                    "cloud_account_id": gr.cloud_account_id,
                    "component_id": gr.component_id,
                    "assigned_by": None,
                    "is_inherited": True,
                    "source_group_name": group.name
                })
                
        return effective
