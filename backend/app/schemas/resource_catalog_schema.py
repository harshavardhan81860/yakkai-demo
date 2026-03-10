from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class CategoryBase(BaseModel):
    category_key: str
    display_name: str
    icon: Optional[str] = None
    display_order: Optional[int] = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    display_name: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None

class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime


class CanonicalTypeBase(BaseModel):
    canonical_key: str
    display_name: str
    category_id: UUID
    is_billable: Optional[bool] = False
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = True

class CanonicalTypeCreate(CanonicalTypeBase):
    pass

class CanonicalTypeUpdate(BaseModel):
    display_name: Optional[str] = None
    category_id: Optional[UUID] = None
    is_billable: Optional[bool] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class CanonicalTypeResponse(CanonicalTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None


class ProviderMappingBase(BaseModel):
    provider: str
    provider_resource_type: str
    canonical_type_id: UUID
    provider_display_name: Optional[str] = None
    is_active: Optional[bool] = True

class ProviderMappingCreate(ProviderMappingBase):
    pass

class ProviderMappingUpdate(BaseModel):
    canonical_type_id: Optional[UUID] = None
    provider_display_name: Optional[str] = None
    is_active: Optional[bool] = None

class ProviderMappingResponse(ProviderMappingBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    canonical_type: Optional[CanonicalTypeResponse] = None

class UnmappedResourceResponse(BaseModel):
    provider: str
    resource_type: str
    resource_count: int

class BulkMappingCreate(BaseModel):
    mappings: List[ProviderMappingCreate]

class ResourceMetricBase(BaseModel):
    canonical_type_id: UUID
    provider_resource_name: str
    metric_name: str
    metric_value: float

class ResourceMetricCreate(ResourceMetricBase):
    pass

class ResourceMetricResponse(ResourceMetricBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
