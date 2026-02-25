# services/hierarchy_sync_service.py
"""
Automatic hierarchy synchronisation:
  - Detect if standalone accounts joined / left an org
  - Detect Azure subscription moves between management groups
  - Auto-update safe changes, flag risky ones for user
  - Bulk-sync all accounts for a tenant (daily job)
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

import boto3
from botocore.exceptions import ClientError

from sqlalchemy.ext.asyncio import AsyncSession

from core.cloud_auth.aws_auth import assume_aws_role_with_oidc
from keycloak.client import KeycloakAdminClient
from core.config import load_config
import os

from models.cloud_account import CloudAccount
from repositories.cloud_account_repository import CloudAccountRepository
from schemas.cloud_discovery_schema import (
    HierarchyChange, SyncHierarchyResult, BulkSyncResult,
)

logger = logging.getLogger(__name__)
cfg = load_config(os.getenv("APP_CONFIG"))


class HierarchySyncService:
    """Detect and apply hierarchy changes for cloud accounts."""

    def __init__(self):
        self.repo = CloudAccountRepository()
        self._kc_client = KeycloakAdminClient(
            client_id=cfg.KEYCLOAK_CLOUD_CLIENT_ID,
            client_secret=cfg.KEYCLOAK_CLOUD_CLIENT_SECRET,
        )

    def _get_oidc_token(self) -> str:
        return self._kc_client.get_client_token()

    # ═══════════════════════════════════════════════
    #  Single-account sync
    # ═══════════════════════════════════════════════

    async def sync_account_hierarchy(
        self,
        account_id: str,
        db: AsyncSession,
    ) -> SyncHierarchyResult:
        """Re-check a single account's org status and update if needed."""
        account = await self.repo.get_by_id(db, account_id)
        if not account:
            return SyncHierarchyResult(status="error")

        provider = account.cloud_provider.lower()
        changes: List[HierarchyChange] = []

        if provider == "aws":
            change = await self._detect_aws_changes(account, db)
            if change:
                changes.append(change)
        elif provider == "azure":
            change = await self._detect_azure_changes(account, db)
            if change:
                changes.append(change)

        # Update last_hierarchy_sync timestamp
        meta = dict(account.cred_metadata)
        meta["last_hierarchy_sync"] = datetime.now(timezone.utc).isoformat()
        account.cred_metadata = meta
        await self.repo.update(db, account)
        await db.commit()

        return SyncHierarchyResult(
            status="success",
            changes_detected=len(changes) > 0,
            changes=changes,
        )


    # ═══════════════════════════════════════════════
    #  AWS change detection
    # ═══════════════════════════════════════════════

    async def _detect_aws_changes(
        self, account: CloudAccount, db: AsyncSession
    ) -> Optional[HierarchyChange]:
        """Check if an AWS account's org membership changed."""
        meta = account.cred_metadata
        account_type = meta.get("account_type", "standalone")
        aws_account_id = meta.get("account_id")
        org_ctx = meta.get("organization_context", {})
        was_in_org = org_ctx.get("is_part_of_organization", False)

        if not aws_account_id:
            return None

        # Need own credentials to check
        if meta.get("credential_source") == "inherited":
            return None  # can't independently check, skip

        try:
            oidc_token = self._get_oidc_token()
            creds = assume_aws_role_with_oidc(
                role_name=meta.get("role_name", meta.get("auth", {}).get("role_name", "")),
                account_id=aws_account_id,
                oidc_token=oidc_token,
            )
        except Exception as e:
            logger.warning("Cannot sync AWS account %s: %s", aws_account_id, e)
            return None

        org_client = boto3.client(
            "organizations",
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
            region_name="us-east-1",
        )

        now_in_org = False
        now_is_management = False
        current_org_id = None

        try:
            org_response = org_client.describe_organization()
            now_in_org = True
            current_org_id = org_response["Organization"]["Id"]
            master_id = org_response["Organization"]["MasterAccountId"]
            now_is_management = (master_id == aws_account_id)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code in ("AWSOrganizationsNotInUseException", "AccessDeniedException"):
                now_in_org = False
            else:
                return None  # can't determine, skip

        # ─── Detect transitions ───

        # Case 1: Standalone → joined org
        if not was_in_org and now_in_org:
            new_type = "management" if now_is_management else "member"

            # Auto-update
            new_meta = dict(meta)
            new_meta["account_type"] = new_type
            new_meta["organization_context"] = {
                "is_part_of_organization": True,
                "organization_id": current_org_id,
                "is_management_account": now_is_management,
            }
            account.cred_metadata = new_meta

            # If the org already exists in DB, set parent_id
            if not now_is_management and current_org_id:
                parent = await self.repo.get_by_org_id(db, str(account.tenant_id), current_org_id)
                if parent:
                    account.parent_id = parent.id

            await self.repo.update(db, account)

            return HierarchyChange(
                change_type="joined_organization" if not now_is_management else "promoted_to_management",
                account_id=str(account.id),
                old_status=account_type,
                new_status=new_type,
                organization_id=current_org_id,
                action_taken="auto_updated",
            )

        # Case 2: Was in org → left org
        if was_in_org and not now_in_org:
            new_meta = dict(meta)
            new_meta["account_type"] = "standalone"
            new_meta["organization_context"] = {
                "is_part_of_organization": False,
                "last_checked": datetime.now(timezone.utc).isoformat(),
            }
            account.cred_metadata = new_meta
            account.parent_id = None
            await self.repo.update(db, account)

            return HierarchyChange(
                change_type="left_organization",
                account_id=str(account.id),
                old_status=account_type,
                new_status="standalone",
                organization_id=org_ctx.get("organization_id"),
                action_taken="auto_updated",
            )

        # Case 3: Standalone → became management (created org)
        if was_in_org and now_in_org and account_type == "standalone" and now_is_management:
            new_meta = dict(meta)
            new_meta["account_type"] = "management"
            new_meta["organization_context"]["is_management_account"] = True
            new_meta["organization_context"]["organization_id"] = current_org_id
            account.cred_metadata = new_meta
            await self.repo.update(db, account)

            return HierarchyChange(
                change_type="promoted_to_management",
                account_id=str(account.id),
                old_status="standalone",
                new_status="management",
                organization_id=current_org_id,
                action_taken="auto_updated",
            )

        return None

    # ═══════════════════════════════════════════════
    #  Azure change detection
    # ═══════════════════════════════════════════════

    async def _detect_azure_changes(
        self, account: CloudAccount, db: AsyncSession
    ) -> Optional[HierarchyChange]:
        """
        Check if an Azure subscription moved to a different management group.
        Only applicable for subscription-type accounts.
        """
        meta = account.cred_metadata
        account_type = meta.get("account_type", "")

        if account_type != "subscription":
            return None

        # Subscriptions with inherited creds need parent's creds
        if meta.get("credential_source") == "inherited":
            # Find parent tenant to get credentials
            if not account.parent_id:
                return None
            parent = await self.repo.get_by_id(db, str(account.parent_id))
            if not parent:
                return None
            parent_meta = parent.cred_metadata
        else:
            parent_meta = meta

        tenant_id = parent_meta.get("tenant_id")
        client_id = parent_meta.get("client_id")
        client_secret = parent_meta.get("client_secret")

        if not all([tenant_id, client_id]):
            return None

        try:
            from azure.mgmt.resource import SubscriptionClient

            if client_secret:
                from azure.identity import ClientSecretCredential
                credential = ClientSecretCredential(
                    tenant_id=tenant_id,
                    client_id=client_id,
                    client_secret=client_secret,
                )
            else:
                from azure.identity import ClientAssertionCredential
                oidc_token = self._get_oidc_token()
                credential = ClientAssertionCredential(
                    tenant_id=tenant_id,
                    client_id=client_id,
                    func=lambda: oidc_token
                )
                
            sub_client = SubscriptionClient(credential)

            sub_id = meta.get("subscription_id")
            if not sub_id:
                return None

            # Check if subscription still exists / accessible
            try:
                sub = sub_client.subscriptions.get(sub_id)
            except Exception:
                return HierarchyChange(
                    change_type="subscription_inaccessible",
                    account_id=str(account.id),
                    old_status="subscription",
                    new_status="inaccessible",
                    action_taken="needs_confirmation",
                )

        except Exception as e:
            logger.warning("Azure sync failed for %s: %s", account.id, e)
            return None

        return None
