from sqlalchemy import String, Integer, Text, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column
from db.base import Base
import datetime
import uuid

class QuotaLimit(Base):
    __tablename__ = "quota_limits"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope_type = mapped_column(String(50), nullable=False)
    scope_id = mapped_column(String(100), nullable=False)
    resource_type = mapped_column(String(50), nullable=False)
    limit_count = mapped_column(Integer, nullable=False)

    created_at = mapped_column(TIMESTAMP, nullable=False, default=datetime.datetime.utcnow)
    updated_at = mapped_column(TIMESTAMP, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class QuotaUsage(Base):
    __tablename__ = "quota_usage"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quota_id = mapped_column(UUID(as_uuid=True), nullable=False)
    current_count = mapped_column(Integer, default=0)
    pending_count = mapped_column(Integer, default=0)

    created_at = mapped_column(TIMESTAMP, nullable=False, default=datetime.datetime.utcnow)
    updated_at = mapped_column(TIMESTAMP, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class QuotaReservation(Base):
    __tablename__ = "quota_reservations"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quota_id = mapped_column(UUID(as_uuid=True), nullable=False)
    reserved_count = mapped_column(Integer, nullable=False)
    reserved_for = mapped_column(String(100), nullable=False)
    status = mapped_column(String(50), default="PENDING")  # PENDING / CONFIRMED / RELEASED

    created_at = mapped_column(TIMESTAMP, nullable=False, default=datetime.datetime.utcnow)
    updated_at = mapped_column(TIMESTAMP, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class QuotaOverrideRequest(Base):
    __tablename__ = "quota_override_requests"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quota_id = mapped_column(UUID(as_uuid=True), nullable=False)
    requested_by = mapped_column(String(100), nullable=False)
    requested_count = mapped_column(Integer, nullable=False)
    is_emergency = mapped_column(Boolean, default=False)
    status = mapped_column(String(50), default="PENDING")  # PENDING / APPROVED / REJECTED
    reason = mapped_column(Text, nullable=True)

    created_at = mapped_column(TIMESTAMP, nullable=False, default=datetime.datetime.utcnow)
    updated_at = mapped_column(TIMESTAMP, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
