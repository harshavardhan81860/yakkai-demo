from fastapi import APIRouter, Request, HTTPException
from core.response import ApiResponse

router = APIRouter()

@router.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "API is running"}

@router.get("/auth/decode_jwk",tags=["System"])
async def auth_test(request: Request):
    """
    Returns decoded JWT payload from middleware
    """
    user = getattr(request.state, "user", None)
    # return {
    #     "authenticated": True,
    #     "user": user
    # }


    return ApiResponse.success(
        message="User details decoded",
        data={"user": user},
    )
