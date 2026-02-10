from pydantic import BaseModel
from typing import Optional

class GroupCreateRequest(BaseModel):
    tenant_id: Optional[str] = None
    name: str
    email: Optional[str] = None
    description: Optional[str] = None
    is_system_group: Optional[bool] = False

class GroupUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class GroupResponse(BaseModel):
    id: str
    tenant_id: Optional[str]
    name: str
    email: Optional[str]
    description: Optional[str]
    is_system_group: bool
    is_active: bool

    class Config:
        from_attributes = True

class GroupAssignmentCreateRequest(BaseModel):
    user_id: str
    group_id: str
    tenant_id: Optional[str] = None
    cloud_account_id: Optional[str] = None
    component_id: Optional[str] = None
    assigned_by: Optional[str] = None

class GroupAssignmentResponse(BaseModel):
    id: str
    user_id: str
    group_id: str
    tenant_id: Optional[str]
    cloud_account_id: Optional[str]
    component_id: Optional[str]
    assigned_by: Optional[str]

    class Config:
        from_attributes = True
