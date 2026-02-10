from pydantic import BaseModel, EmailStr
from typing import Optional

class CreateUserRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    gender: Optional[str] = None
    password: Optional[str] = None  # optional, can be used to set KC password

class UserResponse(BaseModel):
    id: str
    keycloak_id: str
    email: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    gender: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
