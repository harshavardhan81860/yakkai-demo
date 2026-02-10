# schemas/role_schema.py
from pydantic import BaseModel
from typing import Optional

class RoleCreateRequest(BaseModel):
    tenant_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    email: Optional[str] = None
    is_system_role: Optional[bool] = False

class RoleResponse(BaseModel):
    id: str
    tenant_id: Optional[str]
    name: str
    description: Optional[str]
    email: Optional[str] = None
    is_system_role: bool
    is_active: bool

    class Config:
        from_attributes = True

class RoleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
