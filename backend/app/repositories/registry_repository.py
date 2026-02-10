# repositories/registry_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.registry import ResourceRegistry, ActionRegistry
from typing import List, Optional
import uuid


class ResourceRepository:
    async def list(self, session: AsyncSession) -> List[ResourceRegistry]:
        result = await session.execute(select(ResourceRegistry))
        return result.scalars().all()

    async def get_by_id(self, session: AsyncSession, resource_id: uuid.UUID):
        result = await session.execute(
            select(ResourceRegistry).where(ResourceRegistry.id == resource_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, session: AsyncSession, name: str):
        result = await session.execute(
            select(ResourceRegistry).where(ResourceRegistry.resource_name == name)
        )
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, resource: ResourceRegistry):
        session.add(resource)
        return resource


class ActionRepository:
    async def list(self, session: AsyncSession) -> List[ActionRegistry]:
        result = await session.execute(select(ActionRegistry))
        return result.scalars().all()

    async def get_by_id(self, session: AsyncSession, action_id: uuid.UUID):
        result = await session.execute(
            select(ActionRegistry).where(ActionRegistry.id == action_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, session: AsyncSession, name: str):
        result = await session.execute(
            select(ActionRegistry).where(ActionRegistry.action_name == name)
        )
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, action: ActionRegistry):
        session.add(action)
        return action
