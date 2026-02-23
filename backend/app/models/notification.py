from sqlalchemy.orm import mapped_column
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.base import Base

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.users.id", ondelete="CASCADE"), nullable=False)
    
    title = mapped_column(String, nullable=False)
    message = mapped_column(String, nullable=False)
    
    is_read = mapped_column(Boolean, default=False, nullable=False)
    
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
