from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, require_role
import models, schemas

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])


def _serialize_approval(a, include_request=True):
    result = {
        "id": a.id, "request_id": a.request_id,
        "approver_id": a.approver_id,
        "approver_name": a.approver.name if a.approver else None,
        "approval_level": a.approval_level, "status": a.status,
        "comments": a.comments,
        "approved_at": str(a.approved_at) if a.approved_at else None,
        "created_at": str(a.created_at) if a.created_at else None,
    }
    if include_request and a.request:
        r = a.request
        result["request"] = {
            "id": r.id, "user_name": r.user.name if r.user else None,
            "provider_type": r.provider.type if r.provider else None,
            "provider_name": r.provider.name if r.provider else None,
            "resource_type": r.resource_type, "resource_category": r.resource_category,
            "config_json": r.config_json, "status": r.status,
            "estimated_cost": r.estimated_cost,
            "justification": r.justification,
            "created_at": str(r.created_at) if r.created_at else None,
        }
    return result


@router.get("/pending")
def pending_approvals(provider_id: int = None, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["manager", "admin"]))):
    q = db.query(models.Approval).filter(models.Approval.status == "pending")
    approvals = q.all()
    results = []
    for a in approvals:
        if provider_id and a.request and a.request.provider_id != provider_id:
            continue
        results.append(_serialize_approval(a))
    return results


@router.post("/{request_id}/approve")
def approve_request(request_id: int, action: schemas.ApprovalAction, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["manager", "admin"]))):
    approval = db.query(models.Approval).filter(
        models.Approval.request_id == request_id, models.Approval.status == "pending"
    ).first()
    if not approval:
        raise HTTPException(status_code=404, detail="No pending approval found")
    approval.status = "approved"
    approval.comments = action.comments
    approval.approved_at = datetime.utcnow()
    approval.approver_id = current_user.id
    # Update request status
    req = db.query(models.ResourceRequest).filter(models.ResourceRequest.id == request_id).first()
    if req:
        req.status = "approved"
        req.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Request approved", "approval": _serialize_approval(approval, False)}


@router.post("/{request_id}/reject")
def reject_request(request_id: int, action: schemas.ApprovalAction, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["manager", "admin"]))):
    approval = db.query(models.Approval).filter(
        models.Approval.request_id == request_id, models.Approval.status == "pending"
    ).first()
    if not approval:
        raise HTTPException(status_code=404, detail="No pending approval found")
    approval.status = "rejected"
    approval.comments = action.comments
    approval.approved_at = datetime.utcnow()
    approval.approver_id = current_user.id
    req = db.query(models.ResourceRequest).filter(models.ResourceRequest.id == request_id).first()
    if req:
        req.status = "rejected"
        req.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Request rejected", "approval": _serialize_approval(approval, False)}


@router.get("/history")
def approval_history(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["manager", "admin"]))):
    approvals = db.query(models.Approval).filter(
        models.Approval.status.in_(["approved", "rejected"])
    ).order_by(models.Approval.approved_at.desc()).limit(50).all()
    return [_serialize_approval(a) for a in approvals]
