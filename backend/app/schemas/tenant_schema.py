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
