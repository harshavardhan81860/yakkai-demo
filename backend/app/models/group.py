from sqlalchemy import  String, Boolean, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid

from db.base import Base

class Group(Base):
    __tablename__ = "groups"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.tenants.id"), nullable=True)

    name = mapped_column(String(100), nullable=False, unique=True)
    email = mapped_column(String(100), nullable=True)
    description = mapped_column(Text, nullable=True)
    is_system_group = mapped_column(Boolean, default=False)
    is_active = mapped_column(Boolean, default=True)

    created_at = mapped_column(TIMESTAMP, nullable=False)
    updated_at = mapped_column(TIMESTAMP, nullable=False)


class GroupAssignment(Base):
    __tablename__ = "group_assignments"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = mapped_column(UUID(as_uuid=True), nullable=False)
    group_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.groups.id"), nullable=False)

    tenant_id = mapped_column(UUID(as_uuid=True), nullable=True)
    cloud_account_id = mapped_column(UUID(as_uuid=True), nullable=True)
    component_id = mapped_column(UUID(as_uuid=True), nullable=True)
    assigned_by = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at = mapped_column(TIMESTAMP, nullable=False)
    updated_at = mapped_column(TIMESTAMP, nullable=False)
