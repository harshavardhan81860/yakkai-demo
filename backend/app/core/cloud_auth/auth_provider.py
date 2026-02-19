import time
from typing import Dict, Any, Optional
from db.engine import async_session
import os
from core.config import load_config
from core.cloud_auth.aws_auth import assume_aws_role_with_oidc
from core.cloud_auth.azure_auth import get_azure_token_with_oidc

from services.cloud_account_service import CloudAccountService


from keycloak.client import KeycloakAdminClient   # same class, different client

cfg = load_config(os.getenv("APP_CONFIG"))

class CloudAuthProvider:
    """
    Central credential manager for all cloud providers.
    Handles:
    - cloud account metadata fetch
    - oidc token creation
    - cloud credential exchange
    - in-memory cache with expiry
    """

    def __init__(self):
        self._cache: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._account_service = CloudAccountService()
        # Cloud OIDC client (separate from login client)
        self._cloud_kc_client = KeycloakAdminClient(
            client_id=cfg.KEYCLOAK_CLOUD_CLIENT_ID,
            client_secret=cfg.KEYCLOAK_CLOUD_CLIENT_SECRET,
        )

    # -----------------------------
    # Public entry point
    # -----------------------------

    async def get_credentials(self, account_id: str):
        async with async_session() as session:
                account = await self._account_service.get_account_by_id(
                    session,
                    account_id
                )

        if not account:
            raise ValueError(f"Cloud account not found: {account_id}")
        if isinstance(account, list):
            account = account[0] if account else None

        provider = account.cloud_provider.lower()
        meta = account.cred_metadata

        # ── Org-level guard ──
        # Management accounts / tenants / management groups are containers.
        # They must NOT execute resource operations.
        account_type = meta.get("account_type", "")
        if account_type in ("management", "tenant", "management_group"):
            raise ValueError(
                f"Account '{account.name}' is an org-level container "
                f"(type={account_type}). Resource operations are not "
                f"permitted on org-level accounts.  Use a member / "
                f"subscription / standalone account instead."
            )

        # ── Inherited credential resolution ──
        # If this account inherits creds from its parent, walk up the chain.
        if meta.get("credential_source") == "inherited" and account.parent_id:
            account = await self._resolve_inherited_account(account)
            if not account:
                raise ValueError(
                    "Could not resolve inherited credentials for account"
                )

        provider = account.cloud_provider.lower()

        if provider == "aws":
            return await self._get_aws_credentials(account)

        if provider == "azure":
            return await self._get_azure_token(account)

        raise ValueError(f"Unsupported cloud provider: {provider}")

    async def _resolve_inherited_account(self, account) -> Optional[Any]:
        """
        Walk up the parent_id chain to find an account whose
        credential_source is 'own'.
        Prevents infinite loops with a max-depth of 10.
        """
        visited = set()
        current = account
        for _ in range(10):
            if not current.parent_id or current.id in visited:
                return None
            visited.add(current.id)
            async with async_session() as session:
                parent = await self._account_service.get_account_by_id(
                    session, str(current.parent_id)
                )
            if not parent:
                return None
            if isinstance(parent, list):
                parent = parent[0] if parent else None
            if not parent:
                return None
            parent_meta = parent.cred_metadata
            if parent_meta.get("credential_source", "own") != "inherited":
                return parent
            current = parent
        return None

    # -----------------------------
    # AWS handling
    # -----------------------------

    # -----------------------------
    # Credential Extraction Helper
    # -----------------------------
    def _extract_field(self, meta: Dict[str, Any], keys: list) -> str:
        """
        Helper to find a value in metadata by checking multiple possible keys/paths.
        Used to support both the new nested structure and legacy flat structure.
        """
        for path in keys:
            value = meta
            if isinstance(path, str):
                value = value.get(path)
            else:
                for step in path:
                    if isinstance(value, dict):
                        value = value.get(step)
                    else:
                        value = None
                        break
            
            if value:
                return value
        return None

    # -----------------------------
    # AWS handling
    # -----------------------------

    async def _get_aws_credentials(self, account) -> Dict[str, Any]:

        aws_cache = self._cache.setdefault("aws", {})
        cache_key = account.id

        cached = aws_cache.get(cache_key)
        now = time.time()

        if cached and cached["expiry"] > now + 60:
            return cached["creds"]

        oidc_token = self._get_oidc_token()

        meta = account.cred_metadata
        
        # Robust extraction for new vs old structure
        role_name = self._extract_field(meta, [("auth", "role_name"), "role_name", ("auth", "role_arn")])
        aws_account_id = self._extract_field(meta, [("identity", "cloud_id"), "account_id"])

        if not role_name or not aws_account_id:
             raise ValueError(f"Missing AWS credentials in metadata for account {account.id}")

        # If role_name is an ARN, extract the name
        if role_name.startswith("arn:"):
             role_name = role_name.split("/")[-1]

        creds = assume_aws_role_with_oidc(
            role_name=role_name,
            account_id=aws_account_id,
            oidc_token=oidc_token
        )

        expiry = creds["Expiration"].timestamp()

        aws_cache[cache_key] = {
            "creds": creds,
            "expiry": expiry
        }

        return creds

    # -----------------------------
    # Azure handling
    # -----------------------------
    async def _get_azure_token(self, account) -> Dict[str, Any]:
        
        azure_cache = self._cache.setdefault("azure", {})
        
        cache_key = account.id
        now = time.time()

        cached = azure_cache.get(cache_key)
        if cached and cached["expiry"] > now + 60:
            return cached["creds"]

        # Get Keycloak OIDC token
        oidc_token = self._get_oidc_token()

        meta = account.cred_metadata
        
        # Robust extraction
        tenant_id = self._extract_field(meta, [("auth", "tenant_id"), "tenant_id"])
        client_id = self._extract_field(meta, [("auth", "client_id"), "client_id"])
        subscription_id = self._extract_field(meta, [("identity", "cloud_id"), "subscription_id"])

        if not tenant_id or not client_id:
             raise ValueError(f"Missing Azure credentials in metadata for account {account.id}")

        # Exchange OIDC token for Azure token
        token = get_azure_token_with_oidc(
            tenant_id=tenant_id,
            client_id=client_id,
            oidc_token=oidc_token
        )

        creds = {
            "access_token": token["access_token"],
            "subscription_id": subscription_id
        }

        # Cache for future use
        azure_cache[cache_key] = {
            "creds": creds,
            "expiry": token["expires_on"]
        }

        return creds


    # -----------------------------
    # OIDC token
    # -----------------------------

    def _get_oidc_token(self) -> str:
        """
        Uses Keycloak cloud client to get OIDC token.
        """
        return self._cloud_kc_client.get_client_token()


# Singleton instance
cloud_auth_provider = CloudAuthProvider()
