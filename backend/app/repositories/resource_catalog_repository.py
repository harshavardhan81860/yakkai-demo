from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_
from sqlalchemy.orm import selectinload
from models.resource_catalog import ResourceCategory, CanonicalResourceType, ProviderResourceMapping, ResourceMetric
from models.cloud_resource import CloudResource
from typing import List, Optional
import uuid

class ResourceCategoryRepository:
    async def get_all(self, session: AsyncSession) -> List[ResourceCategory]:
        # Eagerly load canonical_types just in case serialization/logic needs them
        result = await session.execute(
            select(ResourceCategory)
            .options(selectinload(ResourceCategory.canonical_types))
            .order_by(ResourceCategory.display_order)
        )
        return list(result.scalars().all())

    async def get_by_id(self, session: AsyncSession, id: uuid.UUID) -> Optional[ResourceCategory]:
        result = await session.execute(
            select(ResourceCategory)
            .options(selectinload(ResourceCategory.canonical_types))
            .where(ResourceCategory.id == id)
        )
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, obj_in: ResourceCategory) -> ResourceCategory:
        session.add(obj_in)
        return obj_in

class CanonicalResourceTypeRepository:
    async def get_all(self, session: AsyncSession, category_id: Optional[uuid.UUID] = None) -> List[CanonicalResourceType]:
        stmt = select(CanonicalResourceType).options(selectinload(CanonicalResourceType.category))
        if category_id:
            stmt = stmt.where(CanonicalResourceType.category_id == category_id)
        result = await session.execute(stmt.order_by(CanonicalResourceType.display_name))
        return list(result.scalars().all())

    async def get_by_id(self, session: AsyncSession, id: uuid.UUID) -> Optional[CanonicalResourceType]:
        result = await session.execute(
            select(CanonicalResourceType)
            .options(selectinload(CanonicalResourceType.category))
            .where(CanonicalResourceType.id == id)
        )
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, obj_in: CanonicalResourceType) -> CanonicalResourceType:
        session.add(obj_in)
        return obj_in

class ProviderResourceMappingRepository:
    async def get_all(self, session: AsyncSession, provider: Optional[str] = None) -> List[ProviderResourceMapping]:
        stmt = select(ProviderResourceMapping).options(
            selectinload(ProviderResourceMapping.canonical_type).selectinload(CanonicalResourceType.category)
        )
        if provider:
            stmt = stmt.where(ProviderResourceMapping.provider == provider)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, session: AsyncSession, id: uuid.UUID) -> Optional[ProviderResourceMapping]:
        result = await session.execute(
            select(ProviderResourceMapping)
            .options(
                selectinload(ProviderResourceMapping.canonical_type)
                .selectinload(CanonicalResourceType.category)
            )
            .where(ProviderResourceMapping.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_provider_and_type(self, session: AsyncSession, provider: str, resource_type: str) -> Optional[ProviderResourceMapping]:
        result = await session.execute(
            select(ProviderResourceMapping)
            .where(and_(
                ProviderResourceMapping.provider == provider,
                ProviderResourceMapping.provider_resource_type == resource_type
            ))
        )
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, obj_in: ProviderResourceMapping) -> ProviderResourceMapping:
        session.add(obj_in)
        return obj_in

    async def get_unmapped_types(self, session: AsyncSession) -> List[dict]:
        stmt = (
            select(
                CloudResource.provider,
                CloudResource.resource_type,
                func.count().label('resource_count')
            )
            .outerjoin(
                ProviderResourceMapping,
                (CloudResource.provider == ProviderResourceMapping.provider) & 
                (CloudResource.resource_type == ProviderResourceMapping.provider_resource_type)
            )
            .where(ProviderResourceMapping.id.is_(None))
            .group_by(CloudResource.provider, CloudResource.resource_type)
            .order_by(func.count().desc())
        )
        result = await session.execute(stmt)
        return [
            {
                "provider": r.provider, 
                "resource_type": r.resource_type, 
                "resource_count": r.resource_count
            } 
            for r in result.all()
        ]
