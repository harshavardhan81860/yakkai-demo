from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid

from db.engine import get_session
from schemas.resource_catalog_schema import (
    CategoryResponse, CategoryCreate, CategoryUpdate,
    CanonicalTypeResponse, CanonicalTypeCreate, CanonicalTypeUpdate,
    ProviderMappingResponse, ProviderMappingCreate, ProviderMappingUpdate,
    UnmappedResourceResponse, BulkMappingCreate
)
from services.resource_catalog_service import ResourceCatalogService

router = APIRouter(prefix="/resource-catalog", tags=["Resource Catalog"])
service = ResourceCatalogService()

# --- Categories ---
@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(session: AsyncSession = Depends(get_session)):
    return await service.get_categories(session)

@router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, session: AsyncSession = Depends(get_session)):
    category = await service.create_category(session, data)
    await session.commit()
    return await service.get_category_by_id(session, category.id)

@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: uuid.UUID, data: CategoryUpdate, session: AsyncSession = Depends(get_session)):
    await service.update_category(session, category_id, data)
    await session.commit()
    return await service.get_category_by_id(session, category_id)

# --- Canonical Types ---
@router.get("/canonical-types", response_model=List[CanonicalTypeResponse])
async def list_canonical_types(category_id: Optional[uuid.UUID] = None, session: AsyncSession = Depends(get_session)):
    return await service.get_canonical_types(session, category_id)

@router.post("/canonical-types", response_model=CanonicalTypeResponse)
async def create_canonical_type(data: CanonicalTypeCreate, session: AsyncSession = Depends(get_session)):
    canonical_type = await service.create_canonical_type(session, data)
    await session.commit()
    # Re-fetch with eager loading to avoid MissingGreenlet on category relationship
    return await service.get_canonical_type_by_id(session, canonical_type.id)

@router.put("/canonical-types/{type_id}", response_model=CanonicalTypeResponse)
async def update_canonical_type(type_id: uuid.UUID, data: CanonicalTypeUpdate, session: AsyncSession = Depends(get_session)):
    await service.update_canonical_type(session, type_id, data)
    await session.commit()
    return await service.get_canonical_type_by_id(session, type_id)

# --- Provider Mappings ---
@router.get("/mappings", response_model=List[ProviderMappingResponse])
async def list_mappings(provider: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    return await service.get_mappings(session, provider)

@router.post("/mappings", response_model=ProviderMappingResponse)
async def create_mapping(data: ProviderMappingCreate, session: AsyncSession = Depends(get_session)):
    mapping = await service.create_mapping(session, data)
    await session.commit()
    # Re-fetch with eager loading to avoid MissingGreenlet on canonical_type relationship
    return await service.get_mapping_by_id(session, mapping.id)

@router.put("/mappings/{mapping_id}", response_model=ProviderMappingResponse)
async def update_mapping(mapping_id: uuid.UUID, data: ProviderMappingUpdate, session: AsyncSession = Depends(get_session)):
    await service.update_mapping(session, mapping_id, data)
    await session.commit()
    return await service.get_mapping_by_id(session, mapping_id)

@router.delete("/mappings/{mapping_id}", status_code=204)
async def delete_mapping(mapping_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    await service.delete_mapping(session, mapping_id)
    await session.commit()
    return None

# --- Unmapped Discovery ---
@router.get("/unmapped", response_model=List[UnmappedResourceResponse])
async def list_unmapped_resources(session: AsyncSession = Depends(get_session)):
    return await service.get_unmapped_types(session)

@router.post("/unmapped/bulk-map", response_model=List[ProviderMappingResponse])
async def bulk_create_mappings(data: BulkMappingCreate, session: AsyncSession = Depends(get_session)):
    results = []
    for mapping_data in data.mappings:
        try:
            mapping = await service.create_mapping(session, mapping_data)
            results.append(mapping)
        except HTTPException:
            pass
    await session.commit()
    # Re-fetch all with eager loading
    return [await service.get_mapping_by_id(session, r.id) for r in results]
