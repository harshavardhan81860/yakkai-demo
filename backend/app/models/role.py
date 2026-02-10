# models/role.py
from sqlalchemy import String, Boolean, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid

from db.base import Base

class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.tenants.id"), nullable=True)

    name = mapped_column(String(100), nullable=False)
    email = mapped_column(String(100), nullable=True)
    description = mapped_column(Text, nullable=True)
    is_system_role = mapped_column(Boolean, default=False)
    is_active = mapped_column(Boolean, default=True)

    created_at = mapped_column(TIMESTAMP, nullable=False)
    updated_at = mapped_column(TIMESTAMP, nullable=False)
