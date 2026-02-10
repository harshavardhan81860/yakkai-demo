from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr


# Auth
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: Optional[dict] = None
    tenant_id: Optional[int] = None
    tenant_name: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role_id: int
    tenant_id: Optional[int] = None

class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    tenant_id: Optional[int] = None
    is_active: Optional[bool] = None

# Roles
class RoleOut(BaseModel):
    id: int
    name: str
    permissions_json: Any = []
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class RoleCreate(BaseModel):
    name: str
    permissions_json: Any = []

# Tenants
class TenantOut(BaseModel):
    id: int
    name: str
    budget_limit: float = 100000
    current_spend: float = 0
    multi_cloud_strategy_json: Any = {}
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TenantCreate(BaseModel):
    name: str
    budget_limit: float = 100000
    multi_cloud_strategy_json: Any = {}

# Cloud Providers
class ProviderOut(BaseModel):
    id: int
    name: str
    type: str
    icon: str = ""
    is_active: bool = True
    class Config:
        from_attributes = True

# Cloud Accounts
class CloudAccountOut(BaseModel):
    id: int
    tenant_id: Optional[int] = None
    provider_id: int
    provider_name: Optional[str] = None
    provider_type: Optional[str] = None
    account_name: str
    account_identifier: str
    region: str
    metadata_json: Any = {}
    is_active: bool = True
    status: str = "connected"
    monthly_cost: float = 0
    resource_count: int = 0
    last_synced: Optional[datetime] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class CloudAccountCreate(BaseModel):
    tenant_id: Optional[int] = None
    provider_id: int
    account_name: str
    account_identifier: str
    region: str
    credentials: Optional[Dict[str, Any]] = {}
    metadata_json: Optional[Dict[str, Any]] = {}

class CloudAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    region: Optional[str] = None
    is_active: Optional[bool] = None
    credentials: Optional[Dict[str, Any]] = None
    metadata_json: Optional[Dict[str, Any]] = None

# Resource Requests
class ResourceRequestOut(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    tenant_id: Optional[int] = None
    provider_id: int
    provider_name: Optional[str] = None
    provider_type: Optional[str] = None
    cloud_account_id: int
    cloud_account_name: Optional[str] = None
    resource_type: str
    resource_category: str
    config_json: Any = {}
    status: str = "draft"
    estimated_cost: float = 0
    justification: str = ""
    expected_duration: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    approvals: Optional[List[dict]] = []
    class Config:
        from_attributes = True

class ResourceRequestCreate(BaseModel):
    provider_id: int
    cloud_account_id: int
    resource_type: str
    resource_category: str
    config_json: Any = {}
    estimated_cost: float = 0
    justification: str = ""
    expected_duration: str = ""

class ResourceRequestUpdate(BaseModel):
    config_json: Optional[Any] = None
    status: Optional[str] = None
    estimated_cost: Optional[float] = None
    justification: Optional[str] = None

# Approvals
class ApprovalOut(BaseModel):
    id: int
    request_id: int
    approver_id: int
    approver_name: Optional[str] = None
    approval_level: int = 1
    status: str = "pending"
    comments: str = ""
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    request: Optional[dict] = None
    class Config:
        from_attributes = True

class ApprovalAction(BaseModel):
    comments: str = ""

# Workflows
class WorkflowOut(BaseModel):
    id: int
    tenant_id: Optional[int] = None
    provider_id: Optional[int] = None
    resource_type: Optional[str] = None
    name: str = "Default Workflow"
    approval_chain_json: Any = []
    cost_thresholds_json: Any = {}
    is_active: bool = True
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class WorkflowCreate(BaseModel):
    tenant_id: Optional[int] = None
    provider_id: Optional[int] = None
    resource_type: Optional[str] = None
    name: str = "Default Workflow"
    approval_chain_json: Any = []
    cost_thresholds_json: Any = {}

# Resource Catalog
class CatalogOut(BaseModel):
    id: int
    provider_id: int
    provider_name: Optional[str] = None
    provider_type: Optional[str] = None
    resource_type: str
    resource_category: str
    display_name: str
    description: str = ""
    config_schema_json: Any = {}
    is_active: bool = True
    request_count: int = 0
    class Config:
        from_attributes = True

class CatalogCreate(BaseModel):
    provider_id: int
    resource_type: str
    resource_category: str
    display_name: str
    description: str = ""
    config_schema_json: Any = {}

class CatalogUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    config_schema_json: Optional[Any] = None
    is_active: Optional[bool] = None

# Provisioned Resources
class ProvisionedResourceOut(BaseModel):
    id: int
    request_id: int
    cloud_account_id: int
    provider_type: str
    resource_type: str
    resource_category: str
    resource_name: str = ""
    resource_identifier: str
    actual_cost: float = 0
    status: str = "active"
    region: str = ""
    provisioned_at: Optional[datetime] = None
    decommissioned_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# Statistics
class DashboardStats(BaseModel):
    total_users: int = 0
    total_requests: int = 0
    total_resources: int = 0
    total_accounts: int = 0
    pending_approvals: int = 0
    active_resources: int = 0
    total_monthly_cost: float = 0
    providers_breakdown: Dict[str, Any] = {}
    category_breakdown: Dict[str, int] = {}
    status_breakdown: Dict[str, int] = {}
    recent_requests: List[dict] = []
    cost_trend: List[dict] = []
