import json
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    permissions_json = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    role = relationship("Role", back_populates="users")
    tenant = relationship("Tenant", back_populates="users")
    requests = relationship("ResourceRequest", back_populates="user")
    approvals_given = relationship("Approval", back_populates="approver")


class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    budget_limit = Column(Float, default=100000.0)
    current_spend = Column(Float, default=0.0)
    multi_cloud_strategy_json = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="tenant")
    cloud_accounts = relationship("CloudAccount", back_populates="tenant")


class CloudProvider(Base):
    __tablename__ = "cloud_providers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # aws, azure, gcp, oci, vmware
    icon = Column(String(50), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    accounts = relationship("CloudAccount", back_populates="provider")
    catalog_items = relationship("ResourceCatalog", back_populates="provider")
    requests = relationship("ResourceRequest", back_populates="provider")


class CloudAccount(Base):
    __tablename__ = "cloud_accounts"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    provider_id = Column(Integer, ForeignKey("cloud_providers.id"))
    account_name = Column(String(255), nullable=False)
    account_identifier = Column(String(255), nullable=False)
    region = Column(String(100), nullable=False)
    credentials_encrypted = Column(Text, default="{}")
    metadata_json = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="connected")  # connected, disconnected, error
    monthly_cost = Column(Float, default=0.0)
    resource_count = Column(Integer, default=0)
    last_synced = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    tenant = relationship("Tenant", back_populates="cloud_accounts")
    provider = relationship("CloudProvider", back_populates="accounts")
    requests = relationship("ResourceRequest", back_populates="cloud_account")
    provisioned_resources = relationship("ProvisionedResource", back_populates="cloud_account")


class ResourceRequest(Base):
    __tablename__ = "resource_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    provider_id = Column(Integer, ForeignKey("cloud_providers.id"))
    cloud_account_id = Column(Integer, ForeignKey("cloud_accounts.id"))
    resource_type = Column(String(100), nullable=False)
    resource_category = Column(String(50), nullable=False)
    config_json = Column(JSON, default={})
    status = Column(String(30), default="draft")
    estimated_cost = Column(Float, default=0.0)
    justification = Column(Text, default="")
    expected_duration = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="requests")
    provider = relationship("CloudProvider", back_populates="requests")
    cloud_account = relationship("CloudAccount", back_populates="requests")
    approvals = relationship("Approval", back_populates="request")
    provisioned_resources = relationship("ProvisionedResource", back_populates="request")


class Approval(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("resource_requests.id"))
    approver_id = Column(Integer, ForeignKey("users.id"))
    approval_level = Column(Integer, default=1)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    comments = Column(Text, default="")
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    request = relationship("ResourceRequest", back_populates="approvals")
    approver = relationship("User", back_populates="approvals_given")


class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    provider_id = Column(Integer, ForeignKey("cloud_providers.id"), nullable=True)
    resource_type = Column(String(100), nullable=True)
    name = Column(String(255), default="Default Workflow")
    approval_chain_json = Column(JSON, default=[])
    cost_thresholds_json = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProvisionedResource(Base):
    __tablename__ = "provisioned_resources"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("resource_requests.id"))
    cloud_account_id = Column(Integer, ForeignKey("cloud_accounts.id"))
    provider_type = Column(String(20), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_category = Column(String(50), nullable=False)
    resource_name = Column(String(255), default="")
    resource_identifier = Column(String(255), nullable=False)
    terraform_state_json = Column(JSON, default={})
    actual_cost = Column(Float, default=0.0)
    status = Column(String(20), default="active")  # active, stopped, terminated
    region = Column(String(100), default="")
    provisioned_at = Column(DateTime, default=datetime.utcnow)
    decommissioned_at = Column(DateTime, nullable=True)
    request = relationship("ResourceRequest", back_populates="provisioned_resources")
    cloud_account = relationship("CloudAccount", back_populates="provisioned_resources")
    cost_records = relationship("CostTracking", back_populates="resource")


class CostTracking(Base):
    __tablename__ = "cost_tracking"
    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("provisioned_resources.id"))
    provider_type = Column(String(20), nullable=False)
    date = Column(DateTime, nullable=False)
    cost = Column(Float, default=0.0)
    cost_category = Column(String(50), default="")
    currency = Column(String(10), default="USD")
    metadata_json = Column(JSON, default={})
    resource = relationship("ProvisionedResource", back_populates="cost_records")


class CostRate(Base):
    __tablename__ = "cost_rates"
    id = Column(Integer, primary_key=True, index=True)
    provider_type = Column(String(20), nullable=False)
    resource_type = Column(String(100), nullable=False)
    region = Column(String(100), default="")
    rate_per_hour = Column(Float, default=0.0)
    rate_per_gb = Column(Float, default=0.0)
    rate_per_request = Column(Float, default=0.0)
    effective_date = Column(DateTime, default=datetime.utcnow)
    currency = Column(String(10), default="USD")


class ResourceCatalog(Base):
    __tablename__ = "resource_catalog"
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("cloud_providers.id"))
    resource_type = Column(String(100), nullable=False)
    resource_category = Column(String(50), nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    config_schema_json = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    request_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    provider = relationship("CloudProvider", back_populates="catalog_items")
