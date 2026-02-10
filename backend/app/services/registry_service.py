# services/registry_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from repositories.registry_repository import ResourceRepository, ActionRepository
from models.registry import ResourceRegistry, ActionRegistry
from schemas.registry_schema import (
    ResourceCreateRequest,
    ResourceUpdateRequest,
    ActionCreateRequest,
    ActionUpdateRequest,
)
from datetime import datetime


class RegistryService:
    def __init__(self):
        self.resource_repo = ResourceRepository()
        self.action_repo = ActionRepository()

    # -------- Resource --------
    async def list_resources(self, session: AsyncSession):
        return await self.resource_repo.list(session)

    async def create_resource(self, session: AsyncSession, req: ResourceCreateRequest):
        if await self.resource_repo.get_by_name(session, req.resource_name):
            raise HTTPException(400, "Resource already exists")

        resource = ResourceRegistry(
            resource_name=req.resource_name,
            description=req.description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await self.resource_repo.create(session, resource)
        await session.commit()
        await session.refresh(resource)
        return resource

    async def update_resource(
        self, session: AsyncSession, resource_id, req: ResourceUpdateRequest
    ):
        resource = await self.resource_repo.get_by_id(session, resource_id)
        if not resource:
            raise HTTPException(404, "Resource not found")

        if req.resource_name is not None:
            resource.resource_name = req.resource_name
        if req.description is not None:
            resource.description = req.description

        resource.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(resource)
        return resource

    # -------- Action --------
    async def list_actions(self, session: AsyncSession):
        return await self.action_repo.list(session)

    async def create_action(self, session: AsyncSession, req: ActionCreateRequest):
        if await self.action_repo.get_by_name(session, req.action_name):
            raise HTTPException(400, "Action already exists")

        action = ActionRegistry(
            action_name=req.action_name,
            description=req.description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await self.action_repo.create(session, action)
        await session.commit()
        await session.refresh(action)
        return action

    async def update_action(
        self, session: AsyncSession, action_id, req: ActionUpdateRequest
    ):
        action = await self.action_repo.get_by_id(session, action_id)
        if not action:
            raise HTTPException(404, "Action not found")

        if req.description is not None:
            action.description = req.description

        action.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(action)
        return action
