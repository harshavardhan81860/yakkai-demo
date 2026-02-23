from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class NotificationCreate(BaseModel):
    title: str
    message: str
