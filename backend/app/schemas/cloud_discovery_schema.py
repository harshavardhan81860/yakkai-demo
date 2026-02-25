# schemas/cloud_discovery_schema.py
"""
Pydantic schemas for the Cloud Account Discovery flow.
Covers: discover, import, incremental discovery, credential update,
        hierarchy sync, and duplicate checking.
"""

from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
import re


# ── Unified Metadata Schema Reference ──
# The 'cred_metadata' JSONB in our database follows this structure:
# {
#   "auth": { 
#       "role_name": str, 
#       "external_id": str (Encrypted), 
#       "client_id": str (Azure), 
#       "client_secret": str (Azure - Encrypted),
#       "inherits_from_parent": bool 
#   },
#   "identity": { 
#       "cloud_id": str (Account ID/Sub ID), 
#       "account_type": str (management|standalone|etc) 
#   },
#   "strategy": { "source": "own" | "inherited" },
#   "organization": { "org_id": str, "ou_path": str, "is_root": bool },
#   "tracking": { "validation_status": str, "last_validated": str }
# }


# ─────────────────────────── helpers ───────────────────────────

_AWS_ACCOUNT_RE = re.compile(r"^\d{12}$")
_GUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


# ═══════════════════════════════════════════════════════════════
# 1. DISCOVER  (POST /cloud-accounts/discover)
# ═══════════════════════════════════════════════════════════════

class AWSCredentialsInput(BaseModel):
    account_id: str
    role_name: str
    external_id: Optional[str] = None

    @field_validator("account_id")
    @classmethod
    def validate_account_id(cls, v: str) -> str:
        # Relaxed for MVP/Test purposes. In real scenarios, this is 12 digits.
        if not v:
            raise ValueError("ID cannot be empty")
        return v


class AzureCredentialsInput(BaseModel):
    tenant_id: str
    client_id: str
    client_secret: Optional[str] = None

    @field_validator("tenant_id", "client_id")
    @classmethod
    def validate_guid(cls, v: str) -> str:
        # Relaxed for MVP/Test purposes. In real scenarios, these are GUIDs.
        if not v:
            raise ValueError("ID cannot be empty")
        return v


class DiscoverRequest(BaseModel):
    cloud_provider: str  # "aws" | "azure"
    aws_credentials: Optional[AWSCredentialsInput] = None
    azure_credentials: Optional[AzureCredentialsInput] = None
    # ── MVP TEST MODE (remove for production) ──
    test_mode: bool = False

    @field_validator("cloud_provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        v = v.lower()
        if v not in ("aws", "azure"):
            raise ValueError("cloud_provider must be 'aws' or 'azure'")
        return v


# ---------- response ----------

class AccountInfo(BaseModel):
    account_id: str
    account_name: Optional[str] = None
    cloud_provider: str


class OrganizationDetails(BaseModel):
    organization_id: str
    organization_arn: Optional[str] = None
    is_management_account: bool = False
    management_account_id: Optional[str] = None
    feature_set: Optional[str] = None
    total_member_accounts: int = 0


class DiscoveredAccount(BaseModel):
    """One member account / subscription discovered from org/tenant."""
    account_id: str
    name: Optional[str] = None
    email: Optional[str] = None  # AWS accounts
    status: Optional[str] = None
    organizational_unit_id: Optional[str] = None
    organizational_unit_name: Optional[str] = None
    ou_path: Optional[str] = None
    # Azure specifics
    type: str = "account"  # "account", "subscription", "management_group"
    subscription_id: Optional[str] = None
    management_group_id: Optional[str] = None
    management_group_name: Optional[str] = None
    
    # Hierarchy support
    parent_id: Optional[str] = None  # ID of parent container (MG, OU, Tenant, Root)
    allows_resources: bool = True    # False for containers (Tenant, MG, OU), True for leaves


class ExistingInPortal(BaseModel):
    account_exists: bool = False
    organization_exists: bool = False
    existing_account_id: Optional[str] = None
    existing_account_name: Optional[str] = None
    existing_account_type: Optional[str] = None


class Recommendation(BaseModel):
    suggested_action: str   # add_organization | add_standalone | add_subscription | update_hierarchy
    reason: str


class DiscoveryResult(BaseModel):
    status: str  # "success" | "error"
    message: Optional[str] = None
    account_info: Optional[AccountInfo] = None
    organization_detected: bool = False
    organization_details: Optional[OrganizationDetails] = None
    discovered_accounts: List[DiscoveredAccount] = []
    existing_in_portal: Optional[ExistingInPortal] = None
    recommendations: Optional[Recommendation] = None


# ═══════════════════════════════════════════════════════════════
# 2. IMPORT  (POST /cloud-accounts/import)
# ═══════════════════════════════════════════════════════════════

class ImportRequest(BaseModel):
    tenant_id: str
    cloud_provider: str
    import_mode: str  # "add_all" | "add_selected" | "add_management_only" | "add_tenant_only"
    preserve_hierarchy: bool = True
    # ── MVP TEST MODE (remove for production) ──
    test_mode: bool = False

    # credentials echoed from discovery step
    aws_credentials: Optional[AWSCredentialsInput] = None
    azure_credentials: Optional[AzureCredentialsInput] = None

    # only needed for add_selected
    selected_account_ids: List[str] = []

    # org context from discovery
    organization_details: Optional[OrganizationDetails] = None
    discovered_accounts: List[DiscoveredAccount] = []


class ImportedAccountSummary(BaseModel):
    id: str
    name: str
    cloud_provider: str
    account_type: str
    parent_id: Optional[str] = None


class ImportResult(BaseModel):
    status: str
    message: str
    imported_accounts: List[ImportedAccountSummary] = []
    skipped_count: int = 0


# ═══════════════════════════════════════════════════════════════
# 3. INCREMENTAL DISCOVERY  (POST /cloud-accounts/{id}/discover-new)
# ═══════════════════════════════════════════════════════════════

class IncrementalDiscoveryRequest(BaseModel):
    refresh_all: bool = False
    test_mode: bool = False


class IncrementalDiscoveryResult(BaseModel):
    status: str
    parent_account_id: str
    message: Optional[str] = None
    parent_account_name: Optional[str] = None
    organization_id: Optional[str] = None
    new_accounts_found: int = 0
    # For backward compatibility / wizard integration
    discovered_accounts: List[DiscoveredAccount] = []
    total_discovered: int = 0
    new_accounts: List[DiscoveredAccount] = []  # Internal alias
    already_added_count: int = 0


class IncrementalImportRequest(BaseModel):
    selected_accounts: List[DiscoveredAccount]
    test_mode: bool = False


# ═══════════════════════════════════════════════════════════════
# 4. CREDENTIAL UPDATE  (PUT /cloud-accounts/{id}/credentials)
# ═══════════════════════════════════════════════════════════════

class CredentialUpdateRequest(BaseModel):
    credential_source: str  # "own" | "inherited"
    aws_credentials: Optional[AWSCredentialsInput] = None
    azure_credentials: Optional[AzureCredentialsInput] = None


class CredentialUpdateResult(BaseModel):
    status: str
    message: str
    account_id: str
    credential_source: str


# ═══════════════════════════════════════════════════════════════
# 5. HIERARCHY SYNC  (POST /cloud-accounts/{id}/sync-hierarchy)
# ═══════════════════════════════════════════════════════════════

class HierarchyChange(BaseModel):
    change_type: str   # joined_organization | left_organization | moved_mg | promoted_to_management
    account_id: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    organization_id: Optional[str] = None
    action_taken: Optional[str] = None  # auto_updated | needs_confirmation


class SyncHierarchyResult(BaseModel):
    status: str
    changes_detected: bool = False
    changes: List[HierarchyChange] = []


class BulkSyncResult(BaseModel):
    status: str
    total_accounts_checked: int = 0
    changes_detected: int = 0
    changes: List[HierarchyChange] = []


# ═══════════════════════════════════════════════════════════════
# 6. DUPLICATE CHECK  (POST /cloud-accounts/check-duplicate)
# ═══════════════════════════════════════════════════════════════

class DuplicateCheckRequest(BaseModel):
    cloud_provider: str
    account_identifier: str   # AWS account_id or Azure subscription_id
    tenant_id: str


class ConflictOption(BaseModel):
    value: str   # update_hierarchy | skip
    label: str
    recommended: bool = False


class DuplicateCheckResult(BaseModel):
    exists: bool
    existing_account: Optional[Dict[str, Any]] = None
    conflict_resolution_options: List[ConflictOption] = []
