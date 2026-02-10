# models/registry.py
import uuid
import datetime
from sqlalchemy import String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column
from db.base import Base


class ResourceRegistry(Base):
    __tablename__ = "resource_registry"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_name = mapped_column(String(255), nullable=False, unique=True)
    description = mapped_column(Text, nullable=True)

    created_at = mapped_column(
        TIMESTAMP, nullable=False, default=datetime.datetime.utcnow
    )
    updated_at = mapped_column(
        TIMESTAMP,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )


class ActionRegistry(Base):
    __tablename__ = "action_registry"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_name = mapped_column(String(100), nullable=False, unique=True)
    description = mapped_column(Text, nullable=True)

    created_at = mapped_column(
        TIMESTAMP, nullable=False, default=datetime.datetime.utcnow
    )
    updated_at = mapped_column(
        TIMESTAMP,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )
