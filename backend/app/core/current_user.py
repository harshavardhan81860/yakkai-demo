from fastapi import Request, HTTPException


def get_current_username(request: Request) -> str:
    jwt_user = getattr(request.state, "user", None)

    if not jwt_user:
        raise HTTPException(
            status_code=401,
            detail="Authentication context missing"
        )

    username = jwt_user.get("preferred_username")

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username not found in token"
        )

    return username
