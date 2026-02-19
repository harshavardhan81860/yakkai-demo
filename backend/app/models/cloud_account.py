# models/cloud_account.py

import uuid
from sqlalchemy import String, Boolean, TIMESTAMP, func, ForeignKey
from sqlalchemy.orm import mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from db.base import Base


class CloudAccount(Base):
    __tablename__ = "cloud_accounts"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    tenant_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.tenants.id"),
        nullable=False
    )

    parent_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.cloud_accounts.id"),
        nullable=True
    )

    # Display name (normalized in service layer)
    name = mapped_column(String, nullable=False)

    # Cloud type (aws, azure, gcp, etc)
    cloud_provider = mapped_column(String, nullable=False)

    # Discovery and Authentication Metadata (Unified JSONB)
    # Structure:
    # {
    #   "auth": { "role_name": "...", "external_id": "...", "client_id": "...", "inherits_from_parent": bool },
    #   "identity": { "cloud_id": "...", "account_type": "standalone|management|member|tenant|subscription" },
    #   "strategy": { "source": "own|inherited" },
    #   "organization": { "org_id": "...", "ou_path": "...", "is_root": bool },
    #   "tracking": { "last_validated": "iso8601", "last_hierarchy_sync": "iso8601" }
    # }
    cred_metadata = mapped_column(JSONB, nullable=False)

    # WRITE layer identity (OIDC / CI)
    ci_credentials_id = mapped_column(UUID(as_uuid=True), nullable=True)

    # READ layer connection tracking
    read_connection_status = mapped_column(
        String,
        nullable=False,
        server_default="not_tested"
    )
    read_last_validated_at = mapped_column(TIMESTAMP, nullable=True)

    # WRITE layer connection tracking
    write_connection_status = mapped_column(
        String,
        nullable=False,
        server_default="not_tested"
    )
    write_last_validated_at = mapped_column(TIMESTAMP, nullable=True)

    is_active = mapped_column(Boolean, default=True)

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
