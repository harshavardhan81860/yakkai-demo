from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from typing import List, Optional
import uuid

from repositories.resource_catalog_repository import (
    ResourceCategoryRepository,
    CanonicalResourceTypeRepository,
    ProviderResourceMappingRepository
)
from models.resource_catalog import ResourceCategory, CanonicalResourceType, ProviderResourceMapping
from schemas.resource_catalog_schema import (
    CategoryCreate, CategoryUpdate, 
    CanonicalTypeCreate, CanonicalTypeUpdate,
    ProviderMappingCreate, ProviderMappingUpdate
)

class ResourceCatalogService:
    def __init__(self):
        self.category_repo = ResourceCategoryRepository()
        self.canonical_type_repo = CanonicalResourceTypeRepository()
        self.mapping_repo = ProviderResourceMappingRepository()

    # --- Categories ---
    async def get_categories(self, session: AsyncSession) -> List[ResourceCategory]:
        return await self.category_repo.get_all(session)

    async def get_category_by_id(self, session: AsyncSession, id: uuid.UUID) -> ResourceCategory:
        obj = await self.category_repo.get_by_id(session, id)
        if not obj:
            raise HTTPException(status_code=404, detail="Category not found")
        return obj

    async def create_category(self, session: AsyncSession, data: CategoryCreate) -> ResourceCategory:
        db_obj = ResourceCategory(**data.model_dump())
        await self.category_repo.create(session, db_obj)
        await session.flush()
        return db_obj

    async def update_category(self, session: AsyncSession, id: uuid.UUID, data: CategoryUpdate) -> ResourceCategory:
        db_obj = await self.category_repo.get_by_id(session, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail="Category not found")
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        
        await session.flush()
        return db_obj

    # --- Canonical Types ---
    async def get_canonical_types(self, session: AsyncSession, category_id: Optional[uuid.UUID] = None) -> List[CanonicalResourceType]:
        return await self.canonical_type_repo.get_all(session, category_id=category_id)

    async def get_canonical_type_by_id(self, session: AsyncSession, id: uuid.UUID) -> CanonicalResourceType:
        obj = await self.canonical_type_repo.get_by_id(session, id)
        if not obj:
            raise HTTPException(status_code=404, detail="Canonical Type not found")
        return obj

    async def create_canonical_type(self, session: AsyncSession, data: CanonicalTypeCreate) -> CanonicalResourceType:
        db_obj = CanonicalResourceType(**data.model_dump())
        await self.canonical_type_repo.create(session, db_obj)
        await session.flush()
        return db_obj

    async def update_canonical_type(self, session: AsyncSession, id: uuid.UUID, data: CanonicalTypeUpdate) -> CanonicalResourceType:
        db_obj = await self.canonical_type_repo.get_by_id(session, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail="Canonical Type not found")
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
            
        await session.flush()
        return db_obj

    # --- Provider Mappings ---
    async def get_mappings(self, session: AsyncSession, provider: Optional[str] = None) -> List[ProviderResourceMapping]:
        return await self.mapping_repo.get_all(session, provider=provider)

    async def get_mapping_by_id(self, session: AsyncSession, id: uuid.UUID) -> ProviderResourceMapping:
        obj = await self.mapping_repo.get_by_id(session, id)
        if not obj:
            raise HTTPException(status_code=404, detail="Mapping not found")
        return obj

    async def create_mapping(self, session: AsyncSession, data: ProviderMappingCreate) -> ProviderResourceMapping:
        existing = await self.mapping_repo.get_by_provider_and_type(session, data.provider, data.provider_resource_type)
        if existing:
            raise HTTPException(status_code=400, detail="Mapping already exists for this provider and resource type")
            
        db_obj = ProviderResourceMapping(**data.model_dump())
        await self.mapping_repo.create(session, db_obj)
        await session.flush()
        return db_obj

    async def update_mapping(self, session: AsyncSession, id: uuid.UUID, data: ProviderMappingUpdate) -> ProviderResourceMapping:
        db_obj = await self.mapping_repo.get_by_id(session, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail="Mapping not found")
            
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
            
        await session.flush()
        return db_obj

    async def delete_mapping(self, session: AsyncSession, id: uuid.UUID) -> None:
        db_obj = await self.mapping_repo.get_by_id(session, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail="Mapping not found")
        await session.delete(db_obj)
        await session.flush()

    async def get_unmapped_types(self, session: AsyncSession) -> List[dict]:
        return await self.mapping_repo.get_unmapped_types(session)
