import yaml
from pydantic import BaseModel
from typing import Optional

class AppSettings(BaseModel):
    name: str
    environment: str
    version: str

class Settings(BaseModel):
    app: AppSettings

    KEYCLOAK_REALM: str
    KEYCLOAK_AUTH_SERVER_URL: str
    KEYCLOAK_CLIENT_ID: str
    KEYCLOAK_CLIENT_SECRET: str
    KEYCLOAK_TEMP_PASSWORD: str

    KEYCLOAK_CLOUD_CLIENT_ID: str
    KEYCLOAK_CLOUD_CLIENT_SECRET: str

    KEYCLOAK_JWKS_URL: str
    KEYCLOAK_ISSUER: str

    DB_TYPE: str
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    AZURE_COST_API_VERSION: str


def load_config(path: Optional[str] = None) -> Settings:
    config_path = path or "config/config.yaml"
    print("*************************")
    print(f"loading config from path : {config_path}")
    print("*************************")

    with open(config_path, "r") as f:
        data = yaml.safe_load(f)

    app_data = data["app"]
    keycloak = data.get("keycloak", {})
    database = data.get("database", {})
    azure_cfg = data.get("azure", {})

    realm = keycloak.get("realm", "yakkai")
    auth_server_url = keycloak.get("auth_server_url", "")

    return Settings(
        app=AppSettings(
            name=app_data["name"],
            environment=app_data["environment"],
            version=app_data["version"],
        ),
        KEYCLOAK_REALM=realm,
        KEYCLOAK_AUTH_SERVER_URL=auth_server_url,
        KEYCLOAK_CLIENT_ID=keycloak["client_id"],
        KEYCLOAK_CLIENT_SECRET=keycloak["client_secret"],
        KEYCLOAK_TEMP_PASSWORD=keycloak["temp_password"],
        KEYCLOAK_CLOUD_CLIENT_ID=keycloak["cloud_client_id"],
        KEYCLOAK_CLOUD_CLIENT_SECRET=keycloak["cloud_client_secret"],
        KEYCLOAK_JWKS_URL=f"{auth_server_url}/realms/{realm}/protocol/openid-connect/certs",
        KEYCLOAK_ISSUER=f"{auth_server_url}/realms/{realm}",
        DB_TYPE=database["type"],
        DB_HOST=database["host"],
        DB_PORT=database.get("port", 5432),
        DB_NAME=database.get("name", "postgres"),
        DB_USER=database.get("username", "postgres"),
        DB_PASSWORD=database.get("password", "postgres"),
        AZURE_COST_API_VERSION=azure_cfg.get("cost_api_version", "2023-11-01")
    )
