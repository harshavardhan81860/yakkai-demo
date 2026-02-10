import time
from typing import Dict, Any
from db.engine import async_session

from core.config import load_config
from core.cloud_auth.aws_auth import assume_aws_role_with_oidc
from core.cloud_auth.azure_auth import get_azure_token_with_oidc

from services.cloud_account_service import CloudAccountService


from keycloak.client import KeycloakAdminClient   # same class, different client

cfg = load_config()


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

        if provider == "aws":
            return await self._get_aws_credentials(account)

        if provider == "azure":
            return await self._get_azure_token(account)

        raise ValueError(f"Unsupported cloud provider: {provider}")

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
        role_name = meta["role_name"]
        aws_account_id = meta["account_id"]

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
        tenant_id = meta["tenant_id"]
        client_id = meta["client_id"]
        subscription_id = meta["subscription_id"]

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
