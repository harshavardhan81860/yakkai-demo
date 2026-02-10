import uuid
from sqlalchemy import (
    String, Integer, Boolean, TIMESTAMP, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, relationship

from db.base import Base


class ApprovalTemplate(Base):
    __tablename__ = "approval_templates"
    __table_args__ = {"schema": "approval"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_name = mapped_column(String(100), nullable=False)
    version = mapped_column(Integer, nullable=False)
    is_active = mapped_column(Boolean, default=True)
    default_sla_minutes = mapped_column(Integer)

    created_at = mapped_column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )

    levels = relationship(
        "ApprovalTemplateLevel",
        back_populates="template",
        cascade="all, delete-orphan"
    )


class ApprovalTemplateLevel(Base):
    __tablename__ = "approval_template_levels"
    __table_args__ = {"schema": "approval"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("approval.approval_templates.id"),
        nullable=False
    )

    level_order = mapped_column(Integer, nullable=False)
    approval_mode = mapped_column(String(50), nullable=False)
    approval_strategy = mapped_column(String(50), nullable=False)
    required_approvals = mapped_column(Integer, nullable=False)
    sla_minutes = mapped_column(Integer)

    created_at = mapped_column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )

    template = relationship("ApprovalTemplate", back_populates="levels")
    approvers = relationship(
        "ApprovalTemplateApprover",
        back_populates="level",
        cascade="all, delete-orphan"
    )


class ApprovalTemplateApprover(Base):
    __tablename__ = "approval_template_approvers"
    __table_args__ = {"schema": "approval"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_level_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("approval.approval_template_levels.id"),
        nullable=False
    )

    approver_type = mapped_column(String(50), nullable=False)
    approver_value = mapped_column(String(100), nullable=False)
    is_mandatory = mapped_column(Boolean, default=False)

    created_at = mapped_column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )

    level = relationship("ApprovalTemplateLevel", back_populates="approvers")
