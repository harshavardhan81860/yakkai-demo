# utils/cloud_helpers.py
"""
Utility helpers for cloud account discovery:
  - Validation (AWS account_id, Azure GUID)
  - cred_metadata builder for every account type
  - Credential resolution (walk parent chain for inherited creds)
"""

import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any

_AWS_ACCOUNT_RE = re.compile(r"^\d{12}$")
_GUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

# Account types that are ORG-level containers (cannot execute resource operations)
ORG_LEVEL_TYPES = {"management", "tenant", "management_group"}


# ─────────────────── Validation ───────────────────

def validate_aws_account_id(account_id: str) -> bool:
    return bool(_AWS_ACCOUNT_RE.match(account_id))


def validate_azure_guid(value: str) -> bool:
    return bool(_GUID_RE.match(value))


def is_org_level_account(cred_metadata: Dict[str, Any]) -> bool:
    """
    Returns True if this account is an org-level container
    that should NOT be used for resource operations.
    """
    account_type = cred_metadata.get("account_type", "")
    return account_type in ORG_LEVEL_TYPES


# ─────────────────── cred_metadata builders ───────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_aws_management_metadata(
    account_id: str,
    role_name: str,
    organization_id: str,
    organization_arn: Optional[str] = None,
    external_id: Optional[str] = None,
    feature_set: str = "ALL",
) -> Dict[str, Any]:
    """Build cred_metadata for an AWS Organization management account."""
    meta: Dict[str, Any] = {
        "account_id": account_id,
        "role_name": role_name,
        "account_type": "management",
        "credential_source": "own",
        "credential_scope": "org_wide",
        "auth": {
            "role_arn": f"arn:aws:iam::{account_id}:role/{role_name}",
        },
        "organization_context": {
            "is_part_of_organization": True,
            "is_management_account": True,
            "organization_id": organization_id,
            "organization_arn": organization_arn,
            "feature_set": feature_set,
            "master_account_id": account_id,
            "detected_during_onboarding": True,
        },
        "onboarding_method": "manual",
        "last_hierarchy_sync": _now_iso(),
    }
    if external_id:
        meta["external_id"] = external_id
        meta["auth"]["external_id"] = external_id
    return meta


def build_aws_member_metadata(
    account_id: str,
    organization_id: str,
    role_name: str = "OrganizationAccountAccessRole",
    credential_source: str = "inherited",
    ou_id: Optional[str] = None,
    ou_name: Optional[str] = None,
    ou_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Build cred_metadata for an AWS Organization member account."""
    meta: Dict[str, Any] = {
        "account_id": account_id,
        "account_type": "member",
        "credential_source": credential_source,
        "auth": {
            "inherits_from_parent": credential_source == "inherited",
            "role_name": role_name,
        },
        "organization_context": {
            "is_part_of_organization": True,
            "organization_id": organization_id,
            "detected_during_onboarding": True,
        },
        "onboarding_method": "discovered",
        "last_hierarchy_sync": _now_iso(),
    }
    if credential_source == "own":
        meta["auth"]["role_arn"] = f"arn:aws:iam::{account_id}:role/{role_name}"
        meta["auth"]["inherits_from_parent"] = False
        meta["onboarding_method"] = "manual"
    if ou_id:
        meta["organization_context"]["organizational_unit_id"] = ou_id
    if ou_name:
        meta["organization_context"]["organizational_unit_name"] = ou_name
    if ou_path:
        meta["organization_context"]["ou_path"] = ou_path
    return meta


def build_aws_standalone_metadata(
    account_id: str,
    role_name: str,
    external_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build cred_metadata for a standalone AWS account (not in any org)."""
    meta: Dict[str, Any] = {
        "account_id": account_id,
        "role_name": role_name,
        "account_type": "standalone",
        "credential_source": "own",
        "auth": {
            "role_name": role_name,
            "role_arn": f"arn:aws:iam::{account_id}:role/{role_name}",
        },
        "organization_context": {
            "is_part_of_organization": False,
            "detected_during_onboarding": True,
            "last_checked": _now_iso(),
        },
        "onboarding_method": "manual",
        "last_hierarchy_sync": _now_iso(),
    }
    if external_id:
        meta["external_id"] = external_id
        meta["auth"]["external_id"] = external_id
    return meta


def build_aws_ou_metadata(
    ou_id: str,
    ou_name: str,
    organization_id: str,
    ou_path: Optional[str] = None,
    parent_ou_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build cred_metadata for an AWS Organizational Unit."""
    meta: Dict[str, Any] = {
        "account_id": ou_id,  # Using OU ID as the account_id
        "account_type": "organizational_unit",
        "credential_source": "inherited",
        "auth": {
            "inherits_from_parent": True,
        },
        "organization_context": {
            "is_part_of_organization": True,
            "organization_id": organization_id,
            "organizational_unit_id": ou_id,
            "organizational_unit_name": ou_name,
            "parent_organizational_unit_id": parent_ou_id,
            "detected_during_onboarding": True,
        },
        "onboarding_method": "discovered",
        "last_hierarchy_sync": _now_iso(),
    }
    if ou_path:
        meta["organization_context"]["ou_path"] = ou_path
    return meta


def build_azure_tenant_metadata(
    az_tenant_id: str,
    client_id: str,
    client_secret: str,
    has_management_groups: bool = False,
    total_subscriptions: int = 0,
) -> Dict[str, Any]:
    """Build cred_metadata for an Azure Tenant root."""
    return {
        "tenant_id": az_tenant_id,
        "client_id": client_id,
        "client_secret": client_secret,
        "account_type": "tenant",
        "credential_source": "own",
        "credential_scope": "tenant_wide",
        "auth": {
            "authentication_method": "service_principal",
        },
        "organization_context": {
            "is_part_of_organization": True,
            "organization_id": az_tenant_id,
            "has_management_groups": has_management_groups,
            "total_subscriptions_discovered": total_subscriptions,
            "detected_during_onboarding": True,
        },
        "onboarding_method": "manual",
        "last_hierarchy_sync": _now_iso(),
    }


def build_azure_subscription_metadata(
    az_tenant_id: str,
    subscription_id: str,
    subscription_name: Optional[str] = None,
    subscription_state: str = "Enabled",
    credential_source: str = "inherited",
    mg_id: Optional[str] = None,
    mg_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Build cred_metadata for an Azure Subscription."""
    meta: Dict[str, Any] = {
        "tenant_id": az_tenant_id,
        "subscription_id": subscription_id,
        "account_type": "subscription",
        "credential_source": credential_source,
        "auth": {
            "inherits_from_parent": credential_source == "inherited",
        },
        "organization_context": {
            "is_part_of_organization": True,
            "organization_id": az_tenant_id,
        },
        "provider_metadata": {
            "subscription_state": subscription_state,
            "subscription_name": subscription_name,
        },
        "onboarding_method": "discovered",
        "last_hierarchy_sync": _now_iso(),
    }
    if mg_id:
        meta["organization_context"]["management_group_id"] = mg_id
    if mg_name:
        meta["organization_context"]["management_group_name"] = mg_name
    return meta


def build_azure_management_group_metadata(
    az_tenant_id: str,
    mg_id: str,
    mg_name: Optional[str] = None,
    parent_mg_id: Optional[str] = None,
    subscription_count: int = 0,
) -> Dict[str, Any]:
    """Build cred_metadata for an Azure Management Group."""
    return {
        "tenant_id": az_tenant_id,
        "management_group_id": mg_id,
        "account_type": "management_group",
        "credential_source": "inherited",
        "auth": {
            "inherits_from_parent": True,
        },
        "organization_context": {
            "is_part_of_organization": True,
            "organization_id": az_tenant_id,
            "parent_management_group_id": parent_mg_id,
        },
        "provider_metadata": {
            "management_group_name": mg_name,
            "subscription_count": subscription_count,
        },
        "onboarding_method": "discovered",
        "last_hierarchy_sync": _now_iso(),
    }


# ─────────────────── Credential Resolution ───────────────────

def extract_cloud_identifier(cred_metadata: Dict[str, Any], provider: str) -> Optional[str]:
    """
    Get the unique cloud-side identifier from cred_metadata.
    AWS  → account_id (12-digit)
    Azure → subscription_id  or  tenant_id  or  management_group_id
    """
    provider = provider.lower()
    if provider == "aws":
        return cred_metadata.get("account_id")
    elif provider == "azure":
        return (
            cred_metadata.get("subscription_id")
            or cred_metadata.get("tenant_id")
            or cred_metadata.get("management_group_id")
        )
    return None
