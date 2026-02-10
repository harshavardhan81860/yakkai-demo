import uuid, datetime
from sqlalchemy import String, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column
from db.base import Base


class GovernancePolicy(Base):
    __tablename__ = "governance_policy"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_type = mapped_column(String(100), nullable=False)
    action_name = mapped_column(String(50), nullable=False)
    effect = mapped_column(String(10), nullable=False)  
    scope_type = mapped_column(String(50), nullable=False)  
    scope_id = mapped_column(String(100))
    is_active = mapped_column(Boolean, default=True)
    created_at = mapped_column(TIMESTAMP, default=datetime.datetime.utcnow)
    updated_at = mapped_column(TIMESTAMP, default=datetime.datetime.utcnow)


class GovernancePolicySubject(Base):
    __tablename__ = "governance_policy_subject"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = mapped_column(UUID(as_uuid=True), nullable=False)
    subject_type = mapped_column(String(20), nullable=False)  # USER / ROLE / GROUP
    subject_id = mapped_column(String(100), nullable=False)
    is_active = mapped_column(Boolean, default=True, nullable=False)
    created_at = mapped_column(TIMESTAMP, default=datetime.datetime.utcnow)


class GovernanceResourceAccess(Base):
    """
    Controls INSTANCE level access (EC2 / CLOUD_ACCOUNT / COMPONENT)
    """
    __tablename__ = "governance_resource_access"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_type = mapped_column(String(100), nullable=False)
    resource_id = mapped_column(String(100), nullable=False)
    action_name = mapped_column(String(50), nullable=False)
    subject_type = mapped_column(String(20), nullable=False)
    subject_id = mapped_column(String(100), nullable=False)
    is_active = mapped_column(Boolean, default=True, nullable=False)
    created_at = mapped_column(TIMESTAMP, default=datetime.datetime.utcnow)
