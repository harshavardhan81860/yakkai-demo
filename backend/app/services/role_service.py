# services/role_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from repositories.role_repository import RoleRepository
from models.role import Role
from typing import Optional, List
from datetime import datetime

class RoleService:
    def __init__(self):
        self.repo = RoleRepository()

    async def list_roles(self, session: AsyncSession, tenant_id: Optional[str] = None) -> List[Role]:
        return await self.repo.list_roles(session, tenant_id)

    async def create_role(self, session: AsyncSession, tenant_id: Optional[str], name: str, description: Optional[str], email: Optional[str], is_system_role: bool = False) -> Role:
        existing = await self.repo.get_by_name(session, name)
        if existing:
            raise HTTPException(status_code=400, detail="Role with this name already exists try with new name")

        now = datetime.utcnow()
        role = Role(
            tenant_id=tenant_id,
            name=name,
            description=description,
            email=email,
            is_system_role=is_system_role,
            is_active=True,
            created_at=now,
            updated_at=now
        )

        try:
            await self.repo.create(session, role)
            await session.commit()
            await session.refresh(role)
            return role
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def get_role(self, session: AsyncSession, role_id: str) -> Optional[Role]:
        return await self.repo.get_by_id(session, role_id)

    async def update_role(self, session: AsyncSession, role_id: str, name: Optional[str], description: Optional[str], email: Optional[str], is_active: Optional[bool]) -> Role:
        role = await self.repo.get_by_id(session, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        if name is not None:
            role.name = name
        if description is not None:
            role.description = description
        if email is not None:
            role.email = email
        if is_active is not None:
            role.is_active = is_active

        role.updated_at = datetime.utcnow()

        try:
            await self.repo.update(session, role)
            await session.commit()
            await session.refresh(role)
            return role
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))
