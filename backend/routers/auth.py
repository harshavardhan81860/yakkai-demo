from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from auth import verify_password, create_access_token, get_current_user, get_password_hash
import models
import schemas

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_access_token(data={"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": {"id": user.role.id, "name": user.role.name} if user.role else None,
            "tenant_id": user.tenant_id,
            "tenant_name": user.tenant.name if user.tenant else None,
        },
    }


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": {"id": current_user.role.id, "name": current_user.role.name} if current_user.role else None,
        "tenant_id": current_user.tenant_id,
        "tenant_name": current_user.tenant.name if current_user.tenant else None,
        "is_active": current_user.is_active,
        "created_at": str(current_user.created_at) if current_user.created_at else None,
        "last_login": str(current_user.last_login) if current_user.last_login else None,
    }


@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh(current_user: models.User = Depends(get_current_user)):
    token = create_access_token(data={"sub": current_user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "role": {"id": current_user.role.id, "name": current_user.role.name} if current_user.role else None,
            "tenant_id": current_user.tenant_id,
        },
    }
