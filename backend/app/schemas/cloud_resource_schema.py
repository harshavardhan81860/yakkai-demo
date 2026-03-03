from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class CloudResourceBase(BaseModel):
    name: str
    provider: str
    resource_type: str
    provider_resource_id: str
    region: Optional[str] = None
    resource_group: Optional[str] = None
    status: str
    tags: Optional[Dict[str, Any]] = None

class CloudResourceResponse(CloudResourceBase):
    id: str
    tenant_id: str
    cloud_account_id: str
    creation_request_id: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Metadata for FinOps join
    mtd_cost: Optional[float] = None
    is_cost_aggregate: Optional[bool] = False

    class Config:
        from_attributes = True

class CloudResourcePayloadResponse(BaseModel):
    resource_id: str
    raw_payload: Dict[str, Any]

    class Config:
        from_attributes = True

class ResourceSyncJobResponse(BaseModel):
    id: str
    cloud_account_id: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    resources_found: Optional[int] = 0
    error_log: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
