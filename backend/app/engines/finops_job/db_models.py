from sqlalchemy import Column, String, Date, Numeric, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.schema import MetaData
from sqlalchemy.ext.declarative import declarative_base
import uuid
from datetime import datetime
import enum

# Create a specific metadata object for the 'finops' schema
finops_metadata = MetaData(schema="finops")
FinopsBase = declarative_base(metadata=finops_metadata)

class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class DailyCost(FinopsBase):
    __tablename__ = "daily_costs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    provider_account_id = Column(String, nullable=False, index=True)
    
    date = Column(Date, nullable=False, index=True)
    provider = Column(String, nullable=False) # 'aws' or 'azure'
    
    service_name = Column(String, nullable=False, index=True)
    portal_resource_type = Column(String, nullable=False, default="Other")
    
    resource_id = Column(String, nullable=True)
    creation_origin = Column(String, nullable=False, default="cloud")
    
    region = Column(String, nullable=True)
    resource_group = Column(String, nullable=True)
    
    tags = Column(JSONB, nullable=True)
    
    amortized_cost = Column(Numeric(18, 6), nullable=False)


class FetchJob(FinopsBase):
    __tablename__ = "fetch_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    
    status = Column(String, default="PENDING", index=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    error_log = Column(String, nullable=True)
