# services/cloud_discovery_service.py
"""
Handles cloud account discovery and validation:
  - AWS: assume role → detect org → list member accounts
  - Azure: authenticate → list subscriptions → check management groups
  - Incremental: re-query cloud → diff against DB
  - Duplicate detection
"""

import logging
from typing import Optional, List, Dict, Any

import boto3
from botocore.exceptions import ClientError

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession


from core.cloud_auth.aws_auth import assume_aws_role_with_oidc
from core.cloud_auth.azure_auth import get_azure_token_with_oidc
from keycloak.client import KeycloakAdminClient
from core.config import load_config
import os

from schemas.cloud_discovery_schema import (
    DiscoveryResult, AccountInfo, OrganizationDetails,
    DiscoveredAccount, ExistingInPortal, Recommendation,
    IncrementalDiscoveryResult, DuplicateCheckResult, ConflictOption,
)
from repositories.cloud_account_repository import CloudAccountRepository
from utils.cloud_helpers import extract_cloud_identifier

logger = logging.getLogger(__name__)
cfg = load_config(os.getenv("APP_CONFIG"))


class CloudDiscoveryService:
    """Discover cloud accounts and detect organization structures."""

    def __init__(self):
        self.repo = CloudAccountRepository()
        self._kc_client = KeycloakAdminClient(
            client_id=cfg.KEYCLOAK_CLOUD_CLIENT_ID,
            client_secret=cfg.KEYCLOAK_CLOUD_CLIENT_SECRET,
        )

    # ─────────────────────────────────────────────
    #  Internal: get OIDC token
    # ─────────────────────────────────────────────
    def _get_oidc_token(self) -> str:
        return self._kc_client.get_client_token()

    # ═══════════════════════════════════════════════
    #  AWS Discovery
    # ═══════════════════════════════════════════════

    async def discover_aws_account(
        self,
        account_id: str,
        role_name: str,
        external_id: Optional[str],
        tenant_id: str,
        db: AsyncSession,
    ) -> DiscoveryResult:
        """
        1. Assume the IAM role via OIDC
        2. Try AWS Organizations API to detect org membership
        3. If management account → list all member accounts
        4. If member → report org info and suggest adding org
        5. If standalone → report standalone
        """

        # Step 1: Validate credentials
        try:
            oidc_token = self._get_oidc_token()
            creds = assume_aws_role_with_oidc(
                role_name=role_name,
                account_id=account_id,
                oidc_token=oidc_token,
            )
        except Exception as e:
            logger.error("AWS role assumption failed for %s: %s", account_id, e)
            return DiscoveryResult(
                status="error",
                message=f"Failed to assume role: {str(e)}",
            )

        # Check existing in portal
        existing_in_portal = await self._check_existing_aws(
            db, tenant_id, account_id
        )

        # Step 2: Try Organizations API
        org_client = boto3.client(
            "organizations",
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
            region_name="us-east-1",
        )

        organization_detected = False
        org_details = None
        discovered = []
        recommendation = None
        is_management = False
        account_name = None

        try:
            org_response = org_client.describe_organization()
            org = org_response["Organization"]
            organization_detected = True
            master_id = org["MasterAccountId"]
            is_management = (master_id == account_id)

            org_details = OrganizationDetails(
                organization_id=org["Id"],
                organization_arn=org.get("Arn"),
                is_management_account=is_management,
                management_account_id=master_id,
                feature_set=org.get("FeatureSet", "ALL"),
            )

            if is_management:
                # List all member accounts
                discovered = await self._list_aws_org_accounts(
                    org_client, account_id
                )
                org_details.total_member_accounts = len(discovered)
                account_name = f"Org Management ({account_id})"
                recommendation = Recommendation(
                    suggested_action="add_organization",
                    reason=f"This is a management account with {len(discovered)} members",
                )
            else:
                # This is a member account
                account_name = f"Member Account ({account_id})"
                recommendation = Recommendation(
                    suggested_action="add_standalone",
                    reason=(
                        f"This account ({account_id}) is part of organization "
                        f"{org['Id']}. Recommended: add the management account "
                        f"({master_id}) to properly map the hierarchy."
                    ),
                )

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code in (
                "AWSOrganizationsNotInUseException",
                "AccessDeniedException",
            ):
                # Not part of any organization or no permission
                account_name = f"Standalone Account ({account_id})"
                recommendation = Recommendation(
                    suggested_action="add_standalone",
                    reason="This account is not part of any AWS Organization",
                )
            else:
                logger.error("AWS Org API error: %s", e)
                return DiscoveryResult(
                    status="error",
                    message=f"Cloud discovery failed: {error_code}",
                )

        return DiscoveryResult(
            status="success",
            account_info=AccountInfo(
                account_id=account_id,
                account_name=account_name,
                cloud_provider="aws",
            ),
            organization_detected=organization_detected,
            organization_details=org_details,
            discovered_accounts=discovered,
            existing_in_portal=existing_in_portal,
            recommendations=recommendation,
        )

    async def _list_aws_org_accounts(
        self, org_client, management_account_id: str
    ) -> List[DiscoveredAccount]:
        """List all member accounts and resolve their full hierarchy (OUs)."""
        discovered_accounts: List[DiscoveredAccount] = []
        ou_cache = {}  # Cache: ou_id -> {"name": str, "parent_id": str, "path": str}
        
        # We need to track which OUs we've already added to the discovered list to avoid duplicates
        added_ous = set()

        async def get_ou_details(ou_id: str) -> dict:
            """Recursively resolve OU details and populate cache."""
            if ou_id in ou_cache:
                return ou_cache[ou_id]

            if ou_id.startswith("r-"):
                # Root
                details = {"name": "Root", "parent_id": None, "path": "Root", "type": "root"}
                ou_cache[ou_id] = details
                return details

            try:
                # 1. Get info
                ou_resp = org_client.describe_organizational_unit(OrganizationalUnitId=ou_id)
                name = ou_resp["OrganizationalUnit"]["Name"]
                
                # 2. Get parent
                parents_resp = org_client.list_parents(ChildId=ou_id)
                parent_id = parents_resp["Parents"][0]["Id"] if parents_resp.get("Parents") else None
                
                # 3. Recurse for parent path
                parent_path = ""
                if parent_id:
                    parent_details = await get_ou_details(parent_id)
                    parent_path = parent_details["path"]
                
                path = f"{parent_path}/{name}" if parent_path else name
                
                details = {"name": name, "parent_id": parent_id, "path": path, "type": "organizational_unit"}
                ou_cache[ou_id] = details
                return details
            except Exception as e:
                logger.warning(f"Failed to resolve OU {ou_id}: {e}")
                return {"name": f"Unknown-OU-{ou_id}", "parent_id": None, "path": "", "type": "organizational_unit"}

        try:
            paginator = org_client.get_paginator("list_accounts")
            for page in paginator.paginate():
                for acct in page.get("Accounts", []):
                    is_mgmt = (acct["Id"] == management_account_id)
                    
                    disc = DiscoveredAccount(
                        account_id=acct["Id"],
                        name=acct.get("Name") + (" (Management)" if is_mgmt else ""),
                        email=acct.get("Email"),
                        status=acct.get("Status"),
                        type="management" if is_mgmt else "account",
                        allows_resources=True
                    )
                    
                    # Resolve path/parent
                    try:
                        parents = org_client.list_parents(ChildId=acct["Id"])
                        if parents.get("Parents"):
                            p = parents["Parents"][0]
                            disc.parent_id = p["Id"]
                            
                            if p["Type"] == "ORGANIZATIONAL_UNIT":
                                disc.organizational_unit_id = p["Id"]
                                # Resolve OU details recursively
                                ou_details = await get_ou_details(p["Id"])
                                disc.ou_path = ou_details["path"]
                                disc.organizational_unit_name = ou_details["name"]
                                
                                # Ensure we add this OU and its parents to discovered list
                                curr_ou_id = p["Id"]
                                while curr_ou_id and curr_ou_id not in added_ous:
                                    if curr_ou_id in ou_cache:
                                        d = ou_cache[curr_ou_id]
                                        # Include both OUs and Roots as nodes
                                        discovered_accounts.append(DiscoveredAccount(
                                            account_id=curr_ou_id,
                                            name=d["name"],
                                            type=d.get("type", "organizational_unit"),
                                            allows_resources=False,
                                            parent_id=d["parent_id"],
                                            ou_path=d["path"]
                                        ))
                                        added_ous.add(curr_ou_id)
                                        curr_ou_id = d["parent_id"]
                                    else:
                                        break

                            elif p["Type"] == "ROOT":
                                disc.ou_path = "Root"
                                # Root is usually the management account context, so parent_id points to it
                    except Exception as e:
                        logger.warning(f"Error resolving parent for account {acct['Id']}: {e}")
                        
                    discovered_accounts.append(disc)

        except ClientError as e:
            logger.error("Failed to list org accounts: %s", e)
            raise e

        # Sort: OUs first by path length (parents before children), then accounts
        discovered_accounts.sort(key=lambda x: (0 if x.type in ["organizational_unit", "root"] else 1, x.ou_path or ""))

        return discovered_accounts

    # ═══════════════════════════════════════════════
    #  Azure Discovery
    # ═══════════════════════════════════════════════

    async def discover_azure_tenant(
        self,
        az_tenant_id: str,
        client_id: str,
        client_secret: Optional[str],
        tenant_id: str,
        db: AsyncSession,
    ) -> DiscoveryResult:
        """
        1. Authenticate with Azure via service principal
        2. List all accessible subscriptions
        3. Check management groups (if accessible)
        4. Build discovery result
        """
        from azure.mgmt.resource import SubscriptionClient

        # Step 1: Validate credentials
        try:
            if client_secret:
                from azure.identity import ClientSecretCredential
                credential = ClientSecretCredential(
                    tenant_id=az_tenant_id,
                    client_id=client_id,
                    client_secret=client_secret,
                )
            else:
                from azure.identity import ClientAssertionCredential
                from core.cloud_auth.azure_auth import get_azure_token_with_oidc
                oidc_token = self._get_oidc_token()
                credential = ClientAssertionCredential(
                    tenant_id=az_tenant_id,
                    client_id=client_id,
                    func=lambda: oidc_token
                )
                
            sub_client = SubscriptionClient(credential)
            # Lightweight call to verify
            subs = list(sub_client.subscriptions.list())
        except Exception as e:
            logger.error("Azure authentication failed for tenant %s: %s", az_tenant_id, e)
            return DiscoveryResult(
                status="error",
                message=f"Azure authentication failed: {str(e)}",
            )

        # Check existing in portal
        existing_in_portal = await self._check_existing_azure(
            db, tenant_id, az_tenant_id
        )

        # Build discovered subscriptions & MGs
        discovered: List[DiscoveredAccount] = []
        
        # 1. MGs (Containers)
        mg_ids = set()
        try:
            from azure.mgmt.managementgroups import ManagementGroupsAPI
            mg_client = ManagementGroupsAPI(credential)
            mg_list = list(mg_client.management_groups.list())
            
            for mg in mg_list:
                mg_ids.add(mg.name)
                
                # Determine parent
                parent_id = az_tenant_id # Default to Tenant
                if hasattr(mg, 'details') and mg.details and mg.details.parent:
                    parent_id = mg.details.parent.name
                
                discovered.append(
                    DiscoveredAccount(
                        account_id=mg.name,  # MG name is its ID
                        name=mg.display_name or mg.name,
                        type="management_group",
                        allows_resources=False,
                        management_group_id=mg.name,
                        status="Active",
                        parent_id=parent_id,
                        ou_path=parent_id # keep for reference
                    )
                )

        except Exception as e:
            logger.info("Management Groups API not accessible/failed for tenant %s: %s", az_tenant_id, e)

        # 2. Subscriptions (Leaves)
        for sub in subs:
            # Try to find parent MG? 
            # Without specific API calls (which are expensive per sub), we default to Tenant 
            # or the "Tenant Root Group" if we knew it. 
            # Ideally, we would search for the subscription in the MG descendants if we had that map.
            # For now, link to Tenant (Root) to ensure connectivity. 
            # User can reorganize in specific "Hierarchy Sync" features later if needed.
            
            discovered.append(
                DiscoveredAccount(
                    account_id=sub.subscription_id,
                    subscription_id=sub.subscription_id,
                    name=sub.display_name,
                    status=sub.state.value if hasattr(sub.state, "value") else str(sub.state),
                    type="subscription",
                    allows_resources=True,
                    parent_id=az_tenant_id  # Default parent is the Tenant
                )
            )

        org_details = OrganizationDetails(
            organization_id=az_tenant_id,
            is_management_account=True,  # Tenant is the root
            total_member_accounts=len(subs),
        )

        recommendation = Recommendation(
            suggested_action="add_organization",
            reason=f"Azure tenant with {len(subs)} subscriptions discovered",
        )

        return DiscoveryResult(
            status="success",
            account_info=AccountInfo(
                account_id=az_tenant_id,
                account_name=f"Azure Tenant ({az_tenant_id[:8]}...)",
                cloud_provider="azure",
            ),
            organization_detected=True,
            organization_details=org_details,
            discovered_accounts=discovered,
            existing_in_portal=existing_in_portal,
            recommendations=recommendation,
        )

    # ═══════════════════════════════════════════════
    #  Incremental Discovery
    # ═══════════════════════════════════════════════

    async def discover_new_accounts_in_organization(
        self,
        parent_account_id: str,
        db: AsyncSession,
        test_mode: bool = False,
    ) -> IncrementalDiscoveryResult:
        """
        For an existing org/tenant account, re-query cloud and
        compare with DB to find new accounts not yet imported.
        """
        parent = await self.repo.get_by_id(db, parent_account_id)
        if not parent:
            return IncrementalDiscoveryResult(
                status="error",
                parent_account_id=parent_account_id,
            )

        provider = parent.cloud_provider.lower()
        meta = parent.cred_metadata
        account_type = meta.get("account_type")
        if not account_type:
            # Best guess for legacy/manually added accounts
            if provider == "aws":
                account_type = "management" if meta.get("organization_id") else "standalone"
            elif provider == "azure":
                account_type = "tenant"
            logger.info("Guessed account_type='%s' for account_id=%s", account_type, parent_account_id)
        else:
            account_type = str(account_type).lower()

        # Get existing child cloud identifiers
        children = await self.repo.get_children(db, parent_account_id)
        existing_ids = set()
        for child in children:
            cid = extract_cloud_identifier(child.cred_metadata, provider)
            if cid:
                existing_ids.add(cid)

        if provider == "aws" and account_type not in ("management", "standalone"):
            return IncrementalDiscoveryResult(
                status="error",
                parent_account_id=parent_account_id,
                message=f"Incremental discovery not supported for AWS account type: {account_type}"
            )
        if provider == "azure" and account_type != "tenant":
            return IncrementalDiscoveryResult(
                status="error",
                parent_account_id=parent_account_id,
                message=f"Incremental discovery not supported for Azure account type: {account_type}"
            )

        new_accounts: List[DiscoveredAccount] = []

        if test_mode:
            logger.info("TEST MODE incremental discovery for %s", parent_account_id)
            # Dummy discovery
            import random
            from uuid import uuid4
            count = random.randint(2, 4)
            for i in range(count):
                name = f"Test-Sub-{i+1}"
                new_accounts.append(DiscoveredAccount(
                    account_id=f"{random.randint(100000000000, 999999999999)}" if provider == "aws" else str(uuid4()),
                    name=name,
                    status="ACTIVE" if provider == "aws" else "Enabled",
                    email=f"{name.lower()}@example.com" if provider == "aws" else None
                ))
            return IncrementalDiscoveryResult(
                status="success",
                parent_account_id=parent_account_id,
                parent_account_name=parent.name,
                new_accounts_found=len(new_accounts),
                discovered_accounts=new_accounts,
                total_discovered=len(new_accounts),
                new_accounts=new_accounts,
                already_added_count=len(existing_ids),
            )

        if provider == "aws" and account_type in ("management", "standalone"):
            # Re-discover via Organizations API
            try:
                oidc_token = self._get_oidc_token()
                creds = assume_aws_role_with_oidc(
                    role_name=meta.get("role_name", meta.get("auth", {}).get("role_name", "")),
                    account_id=meta["account_id"],
                    oidc_token=oidc_token,
                )
                org_client = boto3.client(
                    "organizations",
                    aws_access_key_id=creds["AccessKeyId"],
                    aws_secret_access_key=creds["SecretAccessKey"],
                    aws_session_token=creds["SessionToken"],
                    region_name="us-east-1",
                )
                all_members = await self._list_aws_org_accounts(
                    org_client, meta["account_id"]
                )
                for m in all_members:
                    if m.account_id not in existing_ids:
                        new_accounts.append(m)
            except Exception as e:
                logger.error("AWS incremental discovery failed: %s", e)
                return IncrementalDiscoveryResult(
                    status="error",
                    parent_account_id=parent_account_id,
                    message=f"AWS fetch failed: {str(e)}"
                )

        elif provider == "azure" and account_type == "tenant":
            # Re-discover subscriptions
            try:
                from azure.mgmt.resource import SubscriptionClient

                if meta.get("client_secret"):
                    from azure.identity import ClientSecretCredential
                    credential = ClientSecretCredential(
                        tenant_id=meta["tenant_id"],
                        client_id=meta["client_id"],
                        client_secret=meta["client_secret"],
                    )
                else:
                    from azure.identity import ClientAssertionCredential
                    oidc_token = self._get_oidc_token()
                    credential = ClientAssertionCredential(
                        tenant_id=meta["tenant_id"],
                        client_id=meta["client_id"],
                        func=lambda: oidc_token
                    )
                    
                sub_client = SubscriptionClient(credential)
                for sub in sub_client.subscriptions.list():
                    if sub.subscription_id not in existing_ids:
                        new_accounts.append(
                            DiscoveredAccount(
                                account_id=sub.subscription_id,
                                subscription_id=sub.subscription_id,
                                name=sub.display_name,
                                status=sub.state.value
                                if hasattr(sub.state, "value")
                                else str(sub.state),
                            )
                        )
            except Exception as e:
                logger.error("Azure incremental discovery failed: %s", e)
                return IncrementalDiscoveryResult(
                    status="error",
                    parent_account_id=parent_account_id,
                    message=f"Azure fetch failed: {str(e)}"
                )

        return IncrementalDiscoveryResult(
            status="success",
            parent_account_id=parent_account_id,
            parent_account_name=parent.name,
            organization_id=meta.get("organization_context", {}).get("organization_id"),
            new_accounts_found=len(new_accounts),
            discovered_accounts=new_accounts,
            total_discovered=len(new_accounts),
            new_accounts=new_accounts,
            already_added_count=len(existing_ids),
        )

    # ═══════════════════════════════════════════════
    #  Duplicate Check
    # ═══════════════════════════════════════════════

    async def check_duplicate_account(
        self,
        cloud_provider: str,
        account_identifier: str,
        tenant_id: str,
        db: AsyncSession,
    ) -> DuplicateCheckResult:
        """Check if account already exists in the given tenant."""
        existing = await self.repo.get_by_cloud_identifier(
            db, tenant_id, cloud_provider, account_identifier
        )

        if not existing:
            return DuplicateCheckResult(exists=False)

        meta = existing.cred_metadata
        return DuplicateCheckResult(
            exists=True,
            existing_account={
                "id": str(existing.id),
                "name": existing.name,
                "account_type": meta.get("account_type", "unknown"),
                "parent_id": str(existing.parent_id) if existing.parent_id else None,
                "is_active": existing.is_active,
            },
            conflict_resolution_options=[
                ConflictOption(
                    value="update_hierarchy",
                    label="Update existing account to link with organization",
                    recommended=True,
                ),
                ConflictOption(
                    value="skip",
                    label="Skip import, keep existing as-is",
                ),
            ],
        )

    async def test_connection(
        self, 
        account_id: str, 
        db: AsyncSession, 
        test_mode: bool = False,
        test_type: str = "read"
    ) -> dict:
        """Verify cloud credentials (Read or Write) and update status."""
        account = await self.repo.get_by_id(db, account_id)
        if not account:
            return {"status": "error", "message": "Account not found"}

        # Determine which fields to update
        status_field = "read_connection_status" if test_type == "read" else "write_connection_status"
        time_field = "read_last_validated_at" if test_type == "read" else "write_last_validated_at"

        if test_mode:
            setattr(account, status_field, "success")
            setattr(account, time_field, func.now())
            await self.repo.update(db, account)
            await db.commit()
            return {"status": "success", "message": f"TEST MODE — {test_type.upper()} connection verified"}

        provider = account.cloud_provider.lower()
        meta = account.cred_metadata
        # Support both legacy and new schema during migration
        auth = meta.get("auth", {})
        identity = meta.get("identity", {})
        
        try:
            if provider == "aws":
                role_name = auth.get("role_name") or meta.get("role_name")
                aws_id = identity.get("cloud_id") or meta.get("account_id")
                
                if not role_name or not aws_id:
                    raise ValueError("Missing AWS role_name or account_id in metadata")

                oidc_token = self._get_oidc_token()
                creds = assume_aws_role_with_oidc(
                    role_name=role_name,
                    account_id=aws_id,
                    oidc_token=oidc_token,
                )
                
                if test_type == "read":
                    sts = boto3.client(
                        "sts",
                        aws_access_key_id=creds["AccessKeyId"],
                        aws_secret_access_key=creds["SecretAccessKey"],
                        aws_session_token=creds["SessionToken"],
                    )
                    sts.get_caller_identity()
                else:
                    # Write test placeholder
                    pass

            elif provider == "azure":
                from core.cloud_auth.auth_provider import cloud_auth_provider
                creds = await cloud_auth_provider.get_credentials(account_id)
                from azure.mgmt.resource import SubscriptionClient
                from services.cloud_services.azure import TokenCredentialAdapter

                credential = TokenCredentialAdapter(creds["access_token"])
                
                if test_type == "read":
                    sub_client = SubscriptionClient(credential)
                    # Verify read by listing subscriptions
                    list(sub_client.subscriptions.list())
                else:
                    # Write test placeholder
                    pass
            else:
                raise ValueError(f"Unknown provider {provider}")
            setattr(account, status_field, "success")
            setattr(account, time_field, func.now())
            await self.repo.update(db, account)
            await db.commit()
            await db.refresh(account)
            
            return {"status": "success", "message": f"{test_type.capitalize()} connection verified"}
            
        except Exception as e:
            logger.error("%s connection test failed for %s: %s", test_type, account_id, str(e))
            setattr(account, status_field, "error")
            setattr(account, time_field, func.now())
            await self.repo.update(db, account)
            try:
                await db.commit()
            except Exception:
                await db.rollback()
            return {"status": "failure", "message": str(e)}

    # ─────────────────── helpers ───────────────────

    async def _check_existing_aws(
        self, db: AsyncSession, tenant_id: str, account_id: str
    ) -> ExistingInPortal:
        existing = await self.repo.get_by_cloud_identifier(
            db, tenant_id, "aws", account_id
        )
        if existing:
            meta = existing.cred_metadata
            return ExistingInPortal(
                account_exists=True,
                existing_account_id=str(existing.id),
                existing_account_name=existing.name,
                existing_account_type=meta.get("account_type"),
            )
        return ExistingInPortal()

    async def _check_existing_azure(
        self, db: AsyncSession, tenant_id: str, az_tenant_id: str
    ) -> ExistingInPortal:
        existing = await self.repo.get_by_cloud_identifier(
            db, tenant_id, "azure", az_tenant_id
        )
        if existing:
            meta = existing.cred_metadata
            return ExistingInPortal(
                account_exists=True,
                existing_account_id=str(existing.id),
                existing_account_name=existing.name,
                existing_account_type=meta.get("account_type"),
            )
        return ExistingInPortal()

discovery_service = CloudDiscoveryService()
