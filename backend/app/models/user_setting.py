from sqlalchemy.orm import mapped_column
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.base import Base

class UserSetting(Base):
    __tablename__ = "user_settings"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    notifications_enabled = mapped_column(Boolean, default=True, nullable=False)
    in_app_alerts_enabled = mapped_column(Boolean, default=True, nullable=False)
    
    theme = mapped_column(String, default="dark", nullable=False)
    currency = mapped_column(String, default="USD", nullable=False)
