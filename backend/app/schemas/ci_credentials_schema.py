from pydantic import BaseModel
from typing import Optional


class CICredentialsCreate(BaseModel):
    provider: str
    base_url: str
    project_id: str
    token: str
    is_active: bool = True


class CICredentialsUpdate(BaseModel):
    base_url: Optional[str] = None
    project_id: Optional[str] = None
    token: Optional[str] = None
