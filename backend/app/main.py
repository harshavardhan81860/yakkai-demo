from fastapi import FastAPI
from fastapi.openapi.models import APIKey, APIKeyIn, SecuritySchemeType
from fastapi.security import HTTPBearer
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from core.config import load_config
from core.jwt_middleware import JWKSAuthMiddleware
import os
from api.v1.routers.health import router as health_router
from api.v1.routers.users import router as users_router
from api.v1.routers.tenant import router as tenant_router
from api.v1.routers.cloud_accounts import router as cloud_accounts_router
from api.v1.routers.role_routes import router as roles_router
from api.v1.routers.group_routes import router as group_router
from api.v1.routers.group_role_assignment_routes import router as group_role_assignment_router
from api.v1.routers.ci_credentials_routes import router as ci_credentials_router
from api.v1.routers.ci_pipeline_routes import router as ci_pipeline_router
from api.v1.routers.approval_template_routes import router as approval_template_router
from api.v1.routers.approval_request_routes import router as approval_request_router
from api.v1.routers.approval_mapping_routes import router as approval_mapping_router
from api.v1.routers.quota_routes import router as quota_router
from api.v1.routers.resource_registry_routes import router as resource_registry_router
from api.v1.routers.governance_routes import router as governance_router
from api.v1.routers.cloud_routes.aws import router as aws_router
from api.v1.routers.cloud_routes.azure import router as azure_router

from services.registry_validation_service import RegistryValidationService
from db.engine import get_session

settings = load_config(os.getenv("APP_CONFIG"))

base_path = f"/{settings.app.name}-{settings.app.environment}" 
# api_prefix = f"/api/v1"
api_prefix = f"{base_path}/api/v1"


docs_url = f"{base_path}/docs"
redoc_url = f"{base_path}/redoc"
openapi_url = f"{base_path}/openapi.json"

app = FastAPI(
    title="TanichAI Backend API",
    version="v1",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url
)


# Add Keycloak Bearer Token security scheme
bearer_scheme = HTTPBearer()


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Cloud Self Service Provisioning Backend API",
        version="v1",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class ProxyHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        proto = request.headers.get("x-forwarded-proto")
        host = request.headers.get("x-forwarded-host")
        if proto:
            request.scope["scheme"] = proto
        if host:
            request.scope["server"] = (host, request.url.port or 443)
        return await call_next(request)

class RootPathMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        prefix = request.headers.get("x-forwarded-prefix")
        if prefix:
            request.scope["root_path"] = prefix
        return await call_next(request)

app.add_middleware(ProxyHeadersMiddleware)
app.add_middleware(RootPathMiddleware)


app.openapi = custom_openapi


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware

app.add_middleware(
    JWKSAuthMiddleware,
    jwks_url=settings.KEYCLOAK_JWKS_URL
)

@app.get(base_path)
async def root():
    return {"message": f"{settings.app.name} running in {settings.app.environment} environment"}


### Routers
app.include_router(health_router, prefix=api_prefix)
app.include_router(resource_registry_router, prefix=api_prefix)
app.include_router(users_router, prefix=api_prefix)
app.include_router(group_router, prefix=api_prefix)
app.include_router(roles_router, prefix=api_prefix)
app.include_router(group_role_assignment_router, prefix=api_prefix)
app.include_router(tenant_router, prefix=api_prefix)
app.include_router(cloud_accounts_router, prefix=api_prefix)
app.include_router(ci_credentials_router, prefix=api_prefix)
app.include_router(ci_pipeline_router, prefix=api_prefix)
app.include_router(quota_router, prefix=api_prefix)
app.include_router(approval_template_router, prefix=api_prefix)
app.include_router(approval_request_router, prefix=api_prefix)
app.include_router(approval_mapping_router, prefix=api_prefix)
app.include_router(governance_router, prefix=api_prefix)
app.include_router(aws_router, prefix=api_prefix)
app.include_router(azure_router, prefix=api_prefix)


#this is to validate all regitry is been created while application startup.
#commenting fo development 

@app.on_event("startup")
async def validate_registry_on_startup():
    async for session in get_session():
        await RegistryValidationService.validate_registry_map(session)