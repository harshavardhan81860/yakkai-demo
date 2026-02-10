# models/ci_pipeline_execution.py

from sqlalchemy import String, TIMESTAMP, func, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.orm import mapped_column
from db.base import Base


class CIPipelineExecution(Base):
    __tablename__ = "ci_pipeline_executions"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    cloud_account_id = mapped_column(UUID(as_uuid=True), nullable=False)
    ci_credentials_id = mapped_column(UUID(as_uuid=True), nullable=False)

    provider = mapped_column(String, nullable=False)
    action = mapped_column(String, nullable=False)

    pipeline_id = mapped_column(String, nullable=True)
    ref = mapped_column(String, nullable=True)

    status = mapped_column(String, nullable=False)
    raw_response = mapped_column(JSON, nullable=True)

    job_logs = mapped_column(JSON, nullable=True)
    artifacts = mapped_column(JSON, nullable=True)

    created_at = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
