from sqlalchemy.orm import mapped_column
from sqlalchemy import TIMESTAMP, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from db.base import Base

class TenantUser(Base):
    __tablename__ = "tenant_users"
    __table_args__ = (
        UniqueConstraint('tenant_id', 'user_id', name='uq_tenant_user'),
        {"schema": "data"}
    )

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.tenants.id"), nullable=False)
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("data.users.id"), nullable=False)
    created_at = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
