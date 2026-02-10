from sqlalchemy.orm import mapped_column
from sqlalchemy import String, TIMESTAMP, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.base import Base

class Tenant(Base):
    __tablename__ = "tenants"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = mapped_column(String, unique=True, nullable=False)
    display_name = mapped_column(String, nullable=False)
    is_active = mapped_column(Boolean, default=True)
    created_at = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
