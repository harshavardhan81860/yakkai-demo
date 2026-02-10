import requests
from core.config import load_config
import os 


cfg = load_config(os.getenv("APP_CONFIG"))

class KeycloakAdminClient:
    def __init__(self ,client_id=None, client_secret=None):
        self.issuer = cfg.KEYCLOAK_ISSUER.rstrip('/')
        self.admin_base = f"{cfg.KEYCLOAK_ISSUER}/admin/realms/{cfg.KEYCLOAK_ISSUER.split('/')[-1]}"  # fallback
        self.auth_server = cfg.KEYCLOAK_ISSUER 
        self.token_url = f"{self.auth_server}/protocol/openid-connect/token"

        keycloak_base = cfg.KEYCLOAK_ISSUER.split('/realms/')[0]  
        realm_name = cfg.KEYCLOAK_ISSUER.split('/')[-1]       
        self.admin_url = f"{keycloak_base}/admin/realms/{realm_name}/users"


        self.client_id = client_id or cfg.KEYCLOAK_CLIENT_ID
        self.client_secret = client_secret or cfg.KEYCLOAK_CLIENT_SECRET
        self.realm = cfg.KEYCLOAK_ISSUER.split('/')[-1]

    def _get_admin_token(self):
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        r = requests.post(self.token_url, data=payload, timeout=10)
        r.raise_for_status()
        return r.json()["access_token"]
    
    def get_client_token(self) -> str:
        """
        Return an OIDC access token (for AWS / Azure credential exchange)
        """
        return self._get_admin_token()

    def create_user(self, username: str, email: str, first_name: str, last_name: str,
                password: str = None, temporary: bool = True, enabled: bool = True):
        token = self._get_admin_token()
        payload = {
            "username": username,
            "email": email,
            "firstName": first_name or "",
            "lastName": last_name or "",
            "enabled": enabled
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # 1️⃣ Create the user
        r = requests.post(f"{self.admin_url}", json=payload, headers=headers, timeout=10)
        if r.status_code not in (201, 204):
            raise Exception(f"Keycloak create user failed: {r.status_code} {r.text}")

        # 2️⃣ Fetch the created user to get the ID
        r2 = requests.get(f"{self.admin_url}", headers=headers, params={"email": email}, timeout=10)
        r2.raise_for_status()
        users = r2.json()
        if not users:
            raise Exception("Created user not found in Keycloak list")
        keycloak_user_id = users[0]["id"]

        # 3️⃣ Set password if provided
        if password:
            self.set_user_password(keycloak_user_id, password, temporary)

        return keycloak_user_id

    def set_user_password(self, keycloak_user_id: str, password: str, temporary: bool = True):
        token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {
            "type": "password",
            "value": password,
            "temporary": temporary
        }
        url = f"{self.admin_url}/{keycloak_user_id}/reset-password"
        r = requests.put(url, json=payload, headers=headers, timeout=10)
        if r.status_code not in (204, 200):
            raise Exception(f"Failed to set password: {r.status_code} {r.text}")
        return True


    def delete_user(self, keycloak_user_id: str):
        token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.delete(f"{self.admin_url}/users/{keycloak_user_id}", headers=headers, timeout=10)
        return r.status_code in (204, 404)

    def send_reset_password_email(self, keycloak_user_id: str):
        token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = ["UPDATE_PASSWORD"]
        r = requests.put(f"{self.admin_url}/users/{keycloak_user_id}/execute-actions-email", json=payload, headers=headers, timeout=10)
        if r.status_code not in (204, 200):
            raise Exception(f"Failed to trigger reset password: {r.status_code} {r.text}")
        return True

    def find_users(self, token: str, username: str = None, email: str = None):
        headers = {"Authorization": f"Bearer {token}"}
        params = {}
        if username:
            params["username"] = username
        if email:
            params["email"] = email
        r = requests.get(f"{self.admin_url}/users", headers=headers, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
