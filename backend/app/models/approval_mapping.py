import uuid
import datetime
from sqlalchemy import String, Boolean, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column
from db.base import Base


class ApprovalMappingPolicy(Base):
    __tablename__ = "approval_policy"
    __table_args__ = {"schema": "approval"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    resource_name = mapped_column(String(100), nullable=False)
    action_name = mapped_column(String(50), nullable=False)

    scope_type = mapped_column(String(50), nullable=False)
    scope_id = mapped_column(String(100), nullable=False)

    template_id = mapped_column(UUID(as_uuid=True), nullable=False)

    is_mandatory = mapped_column(Boolean, default=False)
    is_active = mapped_column(Boolean, default=True)

    created_at = mapped_column(TIMESTAMP, default=datetime.datetime.utcnow)
    updated_at = mapped_column(TIMESTAMP, default=datetime.datetime.utcnow)


class ApprovalMappingConditionGroup(Base):
    __tablename__ = "approval_condition_group"
    __table_args__ = {"schema": "approval"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = mapped_column(UUID(as_uuid=True), nullable=False)
    operator = mapped_column(String(10), nullable=False)  # AND / OR
    created_at = mapped_column(TIMESTAMP, default=datetime.datetime.utcnow)


class ApprovalMappingCondition(Base):
    __tablename__ = "approval_condition"
    __table_args__ = {"schema": "approval"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = mapped_column(UUID(as_uuid=True), nullable=False)

    attribute = mapped_column(String(100), nullable=False)
    operator = mapped_column(String(50), nullable=False)
    value = mapped_column(Text, nullable=False)

    created_at = mapped_column(TIMESTAMP, default=datetime.datetime.utcnow)
