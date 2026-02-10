import jwt
from jwt import PyJWKClient
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_401_UNAUTHORIZED


class JWKSAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, jwks_url: str):
        super().__init__(app)
        self.jwks_url = jwks_url
        self.jwk_client = PyJWKClient(jwks_url)

        # ✅ Public endpoint suffixes (NO AUTH)
        self.public_path_suffixes = (
            "/docs",
            "/openapi.json",
            "/redoc",
            "/health",
        )

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path

        # ✅ Skip JWT for public endpoints
        if self._is_public_path(path):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=HTTP_401_UNAUTHORIZED,
                content={"detail": "Missing or invalid token"},
            )

        token = auth_header.split(" ")[1]

        try:
            signing_key = self.jwk_client.get_signing_key_from_jwt(token).key

            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )

            request.state.user = payload

        except Exception as e:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
            )

        return await call_next(request)

    def _is_public_path(self, path: str) -> bool:
        """
        Allows:
        - /tanichai-dev
        - /tanichai-dev/docs
        - /tanichai-dev/openapi.json
        - /tanichai-dev/redoc
        - /tanichai-dev/api/v1/health
        """
        return (
            path.count("/") == 1  # root path: /{app-env}
            or path.endswith(self.public_path_suffixes)
        )
