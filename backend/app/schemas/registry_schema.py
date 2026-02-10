# schemas/registry_schema.py
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


# -------- Resource --------
class ResourceCreateRequest(BaseModel):
    resource_name: str
    description: Optional[str] = None


class ResourceUpdateRequest(BaseModel):
    resource_name: Optional[str] = None
    description: Optional[str] = None


class ResourceResponse(BaseModel):
    id: uuid.UUID
    resource_name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# -------- Action --------
class ActionCreateRequest(BaseModel):
    action_name: str
    description: Optional[str] = None


class ActionUpdateRequest(BaseModel):
    description: Optional[str] = None


class ActionResponse(BaseModel):
    id: uuid.UUID
    action_name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
