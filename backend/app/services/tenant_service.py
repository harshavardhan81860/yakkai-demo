# tenant_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from models.tenant import Tenant
from models.tenant_user import TenantUser
from repositories.tenant_repository import TenantRepository

class TenantService:

    def __init__(self):
        self.repo = TenantRepository()

    async def list_tenants(self, session: AsyncSession, is_active: bool | None = None):
        return await self.repo.list_tenants(session, is_active)

    async def list_tenants_by_user(self, session: AsyncSession, user_id: str):
        return await self.repo.list_tenants_by_user(session, user_id)

    async def create_tenant(self, session: AsyncSession, name: str, display_name: str):
        existing = await self.repo.get_by_name(session, name)
        if existing:
            raise HTTPException(status_code=400, detail="Tenant name already exists")

        tenant = Tenant(
            name=name,
            display_name=display_name,
            is_active=True
        )

        try:
            return await self.repo.create(session, tenant)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"DB error: {exc}")

    async def activate_tenant(self, session: AsyncSession, tenant_id: str):
        tenant = await self.repo.get_by_id(session, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        if tenant.is_active:
            raise HTTPException(status_code=400, detail="Tenant is already active")

        tenant.is_active = True
        return await self.repo.update(session, tenant)

    async def deactivate_tenant(self, session: AsyncSession, tenant_id: str):
        tenant = await self.repo.get_by_id(session, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        if not tenant.is_active:
            raise HTTPException(status_code=400, detail="Tenant is already inactive")

        tenant.is_active = False
        return await self.repo.update(session, tenant)

    async def update_tenant(self, session: AsyncSession, tenant_id: str, display_name: str | None = None):
        tenant = await self.repo.get_by_id(session, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        if display_name:
            tenant.display_name = display_name
        
        return await self.repo.update(session, tenant)

    async def get_tenant_users(self, session: AsyncSession, tenant_id: str):
        # Validate tenant exists
        tenant = await self.repo.get_by_id(session, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
            
        return await self.repo.get_users_by_tenant(session, tenant_id)

    async def add_user_to_tenant(self, session: AsyncSession, tenant_id: str, user_id: str):
        # Validate tenant exists
        tenant = await self.repo.get_by_id(session, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        # Check if already mapped
        existing = await self.repo.get_tenant_user(session, tenant_id, user_id)
        if existing:
            raise HTTPException(status_code=400, detail="User already added to this tenant")
            
        # Create mapping
        tenant_user = TenantUser(
            tenant_id=tenant_id,
            user_id=user_id
        )
        return await self.repo.add_user_to_tenant(session, tenant_user)

    async def remove_user_from_tenant(self, session: AsyncSession, tenant_id: str, user_id: str):
        # Validate tenant exists
        tenant = await self.repo.get_by_id(session, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        success = await self.repo.remove_user_from_tenant(session, tenant_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User is not part of this tenant")
            
        return {"success": True, "message": "User removed from tenant and cascade revokes applied"}
