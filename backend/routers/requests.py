from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/api/requests", tags=["Resource Requests"])


def _serialize_request(r):
    return {
        "id": r.id, "user_id": r.user_id,
        "user_name": r.user.name if r.user else None,
        "tenant_id": r.tenant_id, "provider_id": r.provider_id,
        "provider_name": r.provider.name if r.provider else None,
        "provider_type": r.provider.type if r.provider else None,
        "cloud_account_id": r.cloud_account_id,
        "cloud_account_name": r.cloud_account.account_name if r.cloud_account else None,
        "resource_type": r.resource_type, "resource_category": r.resource_category,
        "config_json": r.config_json, "status": r.status,
        "estimated_cost": r.estimated_cost, "justification": r.justification,
        "expected_duration": r.expected_duration,
        "created_at": str(r.created_at) if r.created_at else None,
        "updated_at": str(r.updated_at) if r.updated_at else None,
        "approvals": [
            {"id": a.id, "approver_id": a.approver_id,
             "approver_name": a.approver.name if a.approver else None,
             "status": a.status, "comments": a.comments,
             "approved_at": str(a.approved_at) if a.approved_at else None}
            for a in r.approvals
        ],
    }


@router.get("")
def list_requests(
    status: str = None, provider_id: int = None, user_id: int = None,
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.ResourceRequest)
    role_name = current_user.role.name if current_user.role else "user"
    if role_name == "user":
        q = q.filter(models.ResourceRequest.user_id == current_user.id)
    if status:
        q = q.filter(models.ResourceRequest.status == status)
    if provider_id:
        q = q.filter(models.ResourceRequest.provider_id == provider_id)
    if user_id and role_name != "user":
        q = q.filter(models.ResourceRequest.user_id == user_id)
    return [_serialize_request(r) for r in q.order_by(models.ResourceRequest.created_at.desc()).all()]


@router.post("")
def create_request(req: schemas.ResourceRequestCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    resource_req = models.ResourceRequest(
        user_id=current_user.id, tenant_id=current_user.tenant_id,
        provider_id=req.provider_id, cloud_account_id=req.cloud_account_id,
        resource_type=req.resource_type, resource_category=req.resource_category,
        config_json=req.config_json, status="pending_approval",
        estimated_cost=req.estimated_cost, justification=req.justification,
        expected_duration=req.expected_duration,
    )
    db.add(resource_req)
    db.commit()
    db.refresh(resource_req)
    # Auto-create approval
    managers = db.query(models.User).join(models.Role).filter(models.Role.name.in_(["manager", "admin"])).all()
    if managers:
        approval = models.Approval(
            request_id=resource_req.id, approver_id=managers[0].id,
            approval_level=1, status="pending",
        )
        db.add(approval)
        db.commit()
    return _serialize_request(resource_req)


@router.get("/templates")
def get_templates(current_user: models.User = Depends(get_current_user)):
    return [
        {"name": "Small Web Server", "provider": "aws", "resource_type": "EC2", "category": "compute",
         "config": {"instanceType": "t3.small", "volumeSize": 20}, "estimated_cost": 15.18},
        {"name": "Dev Database", "provider": "aws", "resource_type": "RDS", "category": "data",
         "config": {"instanceClass": "db.t3.micro", "engine": "postgresql", "storage": 20}, "estimated_cost": 28.50},
        {"name": "Static Website", "provider": "azure", "resource_type": "Blob Storage", "category": "storage",
         "config": {"accessTier": "Hot", "replication": "LRS"}, "estimated_cost": 5.00},
        {"name": "Container Cluster", "provider": "gcp", "resource_type": "GKE", "category": "compute",
         "config": {"machineType": "e2-medium", "nodeCount": 3}, "estimated_cost": 150.00},
    ]


@router.get("/{id}")
def get_request(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    r = db.query(models.ResourceRequest).filter(models.ResourceRequest.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    return _serialize_request(r)


@router.put("/{id}")
def update_request(id: int, req: schemas.ResourceRequestUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    r = db.query(models.ResourceRequest).filter(models.ResourceRequest.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.config_json is not None: r.config_json = req.config_json
    if req.status is not None: r.status = req.status
    if req.estimated_cost is not None: r.estimated_cost = req.estimated_cost
    if req.justification is not None: r.justification = req.justification
    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return _serialize_request(r)


@router.delete("/{id}")
def delete_request(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    r = db.query(models.ResourceRequest).filter(models.ResourceRequest.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    db.delete(r)
    db.commit()
    return {"message": "Request deleted"}


@router.get("/{id}/cost-estimate")
def cost_estimate(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    r = db.query(models.ResourceRequest).filter(models.ResourceRequest.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    return {
        "monthly_cost": r.estimated_cost,
        "currency": "USD",
        "breakdown": {"compute": r.estimated_cost * 0.7, "storage": r.estimated_cost * 0.2, "network": r.estimated_cost * 0.1},
    }


@router.post("/{id}/validate")
def validate_request(id: int, current_user: models.User = Depends(get_current_user)):
    return {"valid": True, "checks": [
        {"name": "Quota Check", "status": "passed"},
        {"name": "Naming Convention", "status": "passed"},
        {"name": "Security Compliance", "status": "passed"},
    ]}
