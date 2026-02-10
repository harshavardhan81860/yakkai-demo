from sqlalchemy import String, Boolean, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.orm import mapped_column
from db.base import Base


class CICredentials(Base):
    __tablename__ = "ci_credentials"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    provider = mapped_column(String, nullable=False)
    base_url = mapped_column(String, nullable=False)
    project_id = mapped_column(String, nullable=False)
    token = mapped_column(String, nullable=False)

    is_active = mapped_column(Boolean, default=True)
    created_at = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
