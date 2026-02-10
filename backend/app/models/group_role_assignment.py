from sqlalchemy import  TIMESTAMP, ForeignKey
from sqlalchemy.orm import mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid

from db.base import Base

class GroupRoleAssignment(Base):
    __tablename__ = "group_role_assignments"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    group_id = mapped_column(
    UUID(as_uuid=True), ForeignKey("data.groups.id"), nullable=False)

    role_id = mapped_column(
    UUID(as_uuid=True), ForeignKey("data.roles.id"), nullable=False)


    tenant_id = mapped_column(
    UUID(as_uuid=True), ForeignKey("data.tenants.id"), nullable=True)

    cloud_account_id = mapped_column(UUID(as_uuid=True), nullable=True)
    component_id = mapped_column(UUID(as_uuid=True), nullable=True)

    assigned_by = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at = mapped_column(TIMESTAMP, nullable=False)
    updated_at = mapped_column(TIMESTAMP, nullable=False)
