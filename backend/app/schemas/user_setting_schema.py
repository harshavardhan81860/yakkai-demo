from pydantic import BaseModel
from typing import Optional

class UserSettingResponse(BaseModel):
    id: str
    user_id: str
    notifications_enabled: bool
    in_app_alerts_enabled: bool
    theme: str
    currency: str

    class Config:
        orm_mode = True
        from_attributes = True

class UserSettingUpdate(BaseModel):
    notifications_enabled: Optional[bool] = None
    in_app_alerts_enabled: Optional[bool] = None
    theme: Optional[str] = None
    currency: Optional[str] = None
