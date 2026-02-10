# schemas/role_assignment_schema.py
from pydantic import BaseModel
from typing import Optional

class RoleAssignmentCreateRequest(BaseModel):
    user_id: str
    role_id: str
    tenant_id: Optional[str] = None
    cloud_account_id: Optional[str] = None
    component_id: Optional[str] = None
    assigned_by: Optional[str] = None

class RoleAssignmentResponse(BaseModel):
    id: str
    user_id: str
    role_id: str
    tenant_id: Optional[str]
    cloud_account_id: Optional[str]
    component_id: Optional[str]
    assigned_by: Optional[str]

    class Config:
        from_attributes = True
