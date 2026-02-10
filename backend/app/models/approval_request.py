import uuid
from sqlalchemy import (
    Column, String, Integer, JSON, Text, DateTime, func
)
from sqlalchemy.dialects.postgresql import UUID
from db.base import Base


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    __table_args__ = {"schema": "approval"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    template_id = Column(UUID(as_uuid=True), nullable=False)
    template_version = Column(Integer, nullable=False)

    requested_by = Column(String(100), nullable=False)
    request_payload = Column(JSON)

    status = Column(String(20), default="PENDING")
    current_level = Column(Integer, default=1)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ApprovalRequestExplicitApprover(Base):
    __tablename__ = "approval_request_explicit_approvers"
    __table_args__ = {"schema": "approval"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    request_id = Column(UUID(as_uuid=True), nullable=False)
    level_order = Column(Integer, nullable=False)

    approver_type = Column(String(20), nullable=False)
    approver_value = Column(String(100), nullable=False)

    created_at = Column(DateTime, server_default=func.now())


class ApprovalAction(Base):
    __tablename__ = "approval_actions"
    __table_args__ = {"schema": "approval"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    request_id = Column(UUID(as_uuid=True), nullable=False)
    level_order = Column(Integer, nullable=False)

    approver_username = Column(String(100), nullable=False)
    approver_source = Column(String(20), nullable=False)

    decision = Column(String(20), nullable=False)
    comment = Column(Text)

    created_at = Column(DateTime, server_default=func.now())
