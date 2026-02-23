from pydantic import BaseModel

class CreateTenantRequest(BaseModel):
    name: str
    display_name: str

class TenantResponse(BaseModel):
    id: str
    name: str
    display_name: str
    is_active: bool

    class Config:
        from_attributes = True

class AddTenantUserRequest(BaseModel):
    user_id: str

class TenantUserResponse(BaseModel):
    id: str
    tenant_id: str
    user_id: str
    created_at: str

    class Config:
        from_attributes = True
