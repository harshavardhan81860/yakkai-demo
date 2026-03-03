import uuid
from sqlalchemy import String, TIMESTAMP, func, ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from db.base import Base

class CloudResource(Base):
    __tablename__ = "cloud_resources"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    tenant_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    cloud_account_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.cloud_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    provider = mapped_column(String, nullable=False, index=True)
    resource_type = mapped_column(String, nullable=False, index=True)
    
    # AWS ARN or Azure ID (for FinOps join)
    provider_resource_id = mapped_column(String, nullable=False, unique=True, index=True)
    
    name = mapped_column(String, nullable=False)
    region = mapped_column(String, nullable=True, index=True)
    resource_group = mapped_column(String, nullable=True, index=True)
    
    status = mapped_column(String, nullable=False, index=True)
    tags = mapped_column(JSONB, nullable=True)

    # If NULL, created directly in cloud. If set, created via portal.
    creation_request_id = mapped_column(
        UUID(as_uuid=True), 
        nullable=True, 
        index=True
    )

    last_synced_at = mapped_column(TIMESTAMP, nullable=True)

    created_at = mapped_column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now()
    )

    updated_at = mapped_column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    
    payload = relationship("CloudResourcePayload", back_populates="resource", uselist=False, cascade="all, delete-orphan")


class CloudResourcePayload(Base):
    __tablename__ = "cloud_resource_payloads"
    __table_args__ = {"schema": "data"}

    resource_id = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("data.cloud_resources.id", ondelete="CASCADE"), 
        primary_key=True
    )
    
    raw_payload = mapped_column(JSONB, nullable=False)
    
    resource = relationship("CloudResource", back_populates="payload")


class ResourceSyncJob(Base):
    __tablename__ = "resource_sync_jobs"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    cloud_account_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.cloud_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    status = mapped_column(String, nullable=False, default="PENDING", index=True)
    started_at = mapped_column(TIMESTAMP(timezone=True), nullable=True, index=True)
    completed_at = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    
    resources_found = mapped_column(Integer, default=0)
    error_log = mapped_column(String, nullable=True)
    
    created_at = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )
