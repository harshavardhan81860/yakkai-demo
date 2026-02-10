# core/cloud_auth/azure_auth.py
import time
from typing import Dict, Any
import requests
from azure.identity import ClientAssertionCredential

from core.config import load_config

cfg = load_config()

# -----------------------------
# OIDC token exchange for Azure
# -----------------------------
def get_azure_token_with_oidc(
    tenant_id: str,
    client_id: str,
    oidc_token: str,
    scope: str = "https://management.azure.com/.default"
) -> Dict[str, Any]:
    """
    Exchanges a Keycloak OIDC token for an Azure access token using ClientAssertionCredential.
    Returns:
        {
            "access_token": str,
            "expires_on": int (unix timestamp)
        }
    """

    # 🔑 Azure expects a callable returning a client assertion (OIDC token)
    def client_assertion_func():
        return oidc_token

    # Create Azure credential
    credential = ClientAssertionCredential(
        tenant_id=tenant_id,
        client_id=client_id,
        func=client_assertion_func
    )

    # Acquire token for Azure management API
    token = credential.get_token(scope)
    return {
        "access_token": token.token,
        "expires_on": token.expires_on
    }
