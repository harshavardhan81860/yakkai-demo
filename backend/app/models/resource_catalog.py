import uuid
from sqlalchemy import String, TIMESTAMP, func, Boolean, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from db.base import Base

class ResourceCategory(Base):
    __tablename__ = "resource_categories"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_key = mapped_column(String(50), nullable=False, unique=True, index=True)
    display_name = mapped_column(String(100), nullable=False)
    icon = mapped_column(String(100), nullable=True)
    display_order = mapped_column(Integer, default=0)
    created_at = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    canonical_types = relationship("CanonicalResourceType", back_populates="category", cascade="all, delete-orphan")


class CanonicalResourceType(Base):
    __tablename__ = "canonical_resource_types"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_key = mapped_column(String(100), nullable=False, unique=True, index=True)
    display_name = mapped_column(String(255), nullable=False)
    category_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.resource_categories.id", ondelete="CASCADE"),
        nullable=False
    )
    is_billable = mapped_column(Boolean, default=False)
    description = mapped_column(String, nullable=True)
    icon = mapped_column(String(100), nullable=True)
    is_active = mapped_column(Boolean, default=True)
    created_at = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    category = relationship("ResourceCategory", back_populates="canonical_types")
    provider_mappings = relationship("ProviderResourceMapping", back_populates="canonical_type", cascade="all, delete-orphan")
    metrics = relationship("ResourceMetric", back_populates="canonical_type", cascade="all, delete-orphan")


class ProviderResourceMapping(Base):
    __tablename__ = "provider_resource_mappings"
    __table_args__ = (
        UniqueConstraint('provider', 'provider_resource_type', name='uq_provider_mapping'),
        {"schema": "data"}
    )

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = mapped_column(String(20), nullable=False, index=True)
    provider_resource_type = mapped_column(String(255), nullable=False, index=True)
    canonical_type_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.canonical_resource_types.id", ondelete="CASCADE"),
        nullable=False
    )
    provider_display_name = mapped_column(String(255), nullable=True)
    is_active = mapped_column(Boolean, default=True)
    created_at = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    canonical_type = relationship("CanonicalResourceType", back_populates="provider_mappings")


class ResourceMetric(Base):
    __tablename__ = "resource_metrics"
    __table_args__ = (
        UniqueConstraint('canonical_type_id', 'provider_resource_name', 'metric_name', name='uq_resource_metric'),
        {"schema": "data"}
    )

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_type_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.canonical_resource_types.id", ondelete="CASCADE"),
        nullable=False
    )
    provider_resource_name = mapped_column(String(100), nullable=False, index=True)
    metric_name = mapped_column(String(50), nullable=False)
    metric_value = mapped_column(Numeric, nullable=False)

    canonical_type = relationship("CanonicalResourceType", back_populates="metrics")
