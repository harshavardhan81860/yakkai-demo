# models/role_assignment.py
from sqlalchemy import  TIMESTAMP, ForeignKey
from sqlalchemy.orm import mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid

from db.base import Base

class RoleAssignment(Base):
    __tablename__ = "role_assignments"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.users.id"), nullable=False)
    role_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.roles.id"), nullable=False)

    tenant_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.tenants.id"), nullable=True)
    cloud_account_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.cloud_accounts.id"), nullable=True)
    component_id = mapped_column(UUID(as_uuid=True), nullable=True)

    assigned_by = mapped_column(UUID(as_uuid=True), ForeignKey("data.users.id"), nullable=True)

    created_at = mapped_column(TIMESTAMP, nullable=False)
    updated_at = mapped_column(TIMESTAMP, nullable=False)
