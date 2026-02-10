from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, require_role
import models, schemas

router = APIRouter(prefix="/api/cloud-accounts", tags=["Cloud Accounts"])


def _serialize_account(a):
    return {
        "id": a.id, "tenant_id": a.tenant_id, "provider_id": a.provider_id,
        "provider_name": a.provider.name if a.provider else None,
        "provider_type": a.provider.type if a.provider else None,
        "account_name": a.account_name, "account_identifier": a.account_identifier,
        "region": a.region, "metadata_json": a.metadata_json,
        "is_active": a.is_active, "status": a.status,
        "monthly_cost": a.monthly_cost, "resource_count": a.resource_count,
        "last_synced": str(a.last_synced) if a.last_synced else None,
        "created_at": str(a.created_at) if a.created_at else None,
    }


@router.get("")
def list_accounts(provider_id: int = None, status: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    q = db.query(models.CloudAccount)
    if provider_id:
        q = q.filter(models.CloudAccount.provider_id == provider_id)
    if status:
        q = q.filter(models.CloudAccount.status == status)
    return [_serialize_account(a) for a in q.all()]


@router.post("")
def create_account(req: schemas.CloudAccountCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    account = models.CloudAccount(
        tenant_id=req.tenant_id or current_user.tenant_id,
        provider_id=req.provider_id, account_name=req.account_name,
        account_identifier=req.account_identifier, region=req.region,
        credentials_encrypted=str(req.credentials), metadata_json=req.metadata_json or {},
        status="connected", last_synced=datetime.utcnow(),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _serialize_account(account)


@router.get("/{id}")
def get_account(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    a = db.query(models.CloudAccount).filter(models.CloudAccount.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Account not found")
    return _serialize_account(a)


@router.put("/{id}")
def update_account(id: int, req: schemas.CloudAccountUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    a = db.query(models.CloudAccount).filter(models.CloudAccount.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Account not found")
    if req.account_name is not None: a.account_name = req.account_name
    if req.region is not None: a.region = req.region
    if req.is_active is not None: a.is_active = req.is_active
    if req.metadata_json is not None: a.metadata_json = req.metadata_json
    db.commit()
    db.refresh(a)
    return _serialize_account(a)


@router.delete("/{id}")
def delete_account(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    a = db.query(models.CloudAccount).filter(models.CloudAccount.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(a)
    db.commit()
    return {"message": "Account deleted"}


@router.post("/{id}/sync")
def sync_account(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    a = db.query(models.CloudAccount).filter(models.CloudAccount.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Account not found")
    a.last_synced = datetime.utcnow()
    a.status = "connected"
    db.commit()
    return {"message": "Sync completed", "resources_discovered": a.resource_count}


@router.get("/{id}/quotas")
def get_quotas(id: int, current_user: models.User = Depends(get_current_user)):
    return {
        "compute": {"used": 45, "limit": 100, "unit": "instances"},
        "storage": {"used": 2048, "limit": 5120, "unit": "GB"},
        "network": {"used": 8, "limit": 20, "unit": "VPCs"},
    }
