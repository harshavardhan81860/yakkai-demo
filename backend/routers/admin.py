from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, require_role, get_password_hash
import models, schemas

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# ─── Users ──────────────────────────
@router.get("/users")
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    users = db.query(models.User).all()
    return [
        {"id": u.id, "email": u.email, "name": u.name, "is_active": u.is_active,
         "role": {"id": u.role.id, "name": u.role.name} if u.role else None,
         "tenant_id": u.tenant_id,
         "tenant_name": u.tenant.name if u.tenant else None,
         "created_at": str(u.created_at) if u.created_at else None,
         "last_login": str(u.last_login) if u.last_login else None}
        for u in users
    ]

@router.post("/users")
def create_user(req: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = models.User(
        email=req.email, name=req.name,
        hashed_password=get_password_hash(req.password),
        role_id=req.role_id, tenant_id=req.tenant_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "name": user.name}

@router.put("/users/{id}")
def update_user(id: int, req: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.email is not None: user.email = req.email
    if req.name is not None: user.name = req.name
    if req.password: user.hashed_password = get_password_hash(req.password)
    if req.role_id is not None: user.role_id = req.role_id
    if req.tenant_id is not None: user.tenant_id = req.tenant_id
    if req.is_active is not None: user.is_active = req.is_active
    db.commit()
    return {"message": "User updated"}

@router.delete("/users/{id}")
def delete_user(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

# ─── Roles ──────────────────────────
@router.get("/roles")
def list_roles(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    roles = db.query(models.Role).all()
    return [{"id": r.id, "name": r.name, "permissions_json": r.permissions_json} for r in roles]

@router.post("/roles")
def create_role(req: schemas.RoleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    role = models.Role(name=req.name, permissions_json=req.permissions_json)
    db.add(role)
    db.commit()
    db.refresh(role)
    return {"id": role.id, "name": role.name}

@router.put("/roles/{id}")
def update_role(id: int, req: schemas.RoleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    role = db.query(models.Role).filter(models.Role.id == id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role.name = req.name
    role.permissions_json = req.permissions_json
    db.commit()
    return {"message": "Role updated"}

@router.delete("/roles/{id}")
def delete_role(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    role = db.query(models.Role).filter(models.Role.id == id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    db.delete(role)
    db.commit()
    return {"message": "Role deleted"}

# ─── Tenants ────────────────────────
@router.get("/tenants")
def list_tenants(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    tenants = db.query(models.Tenant).all()
    return [
        {"id": t.id, "name": t.name, "budget_limit": t.budget_limit,
         "current_spend": t.current_spend, "multi_cloud_strategy_json": t.multi_cloud_strategy_json}
        for t in tenants
    ]

@router.post("/tenants")
def create_tenant(req: schemas.TenantCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    tenant = models.Tenant(name=req.name, budget_limit=req.budget_limit, multi_cloud_strategy_json=req.multi_cloud_strategy_json)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return {"id": tenant.id, "name": tenant.name}

# ─── Workflows ──────────────────────
@router.get("/workflows")
def list_workflows(provider_id: int = None, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    q = db.query(models.ApprovalWorkflow)
    if provider_id:
        q = q.filter(models.ApprovalWorkflow.provider_id == provider_id)
    workflows = q.all()
    return [
        {"id": w.id, "tenant_id": w.tenant_id, "provider_id": w.provider_id,
         "resource_type": w.resource_type, "name": w.name,
         "approval_chain_json": w.approval_chain_json, "cost_thresholds_json": w.cost_thresholds_json,
         "is_active": w.is_active}
        for w in workflows
    ]

@router.post("/workflows")
def create_workflow(req: schemas.WorkflowCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    wf = models.ApprovalWorkflow(
        tenant_id=req.tenant_id, provider_id=req.provider_id,
        resource_type=req.resource_type, name=req.name,
        approval_chain_json=req.approval_chain_json, cost_thresholds_json=req.cost_thresholds_json,
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return {"id": wf.id, "name": wf.name}

@router.put("/workflows/{id}")
def update_workflow(id: int, req: schemas.WorkflowCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    wf = db.query(models.ApprovalWorkflow).filter(models.ApprovalWorkflow.id == id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    wf.name = req.name
    wf.approval_chain_json = req.approval_chain_json
    wf.cost_thresholds_json = req.cost_thresholds_json
    db.commit()
    return {"message": "Workflow updated"}

@router.delete("/workflows/{id}")
def delete_workflow(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    wf = db.query(models.ApprovalWorkflow).filter(models.ApprovalWorkflow.id == id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"message": "Workflow deleted"}

# ─── Catalog ────────────────────────
@router.get("/catalog")
def list_catalog(provider_id: int = None, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    q = db.query(models.ResourceCatalog)
    if provider_id:
        q = q.filter(models.ResourceCatalog.provider_id == provider_id)
    items = q.all()
    return [
        {"id": c.id, "provider_id": c.provider_id,
         "provider_name": c.provider.name if c.provider else None,
         "provider_type": c.provider.type if c.provider else None,
         "resource_type": c.resource_type, "resource_category": c.resource_category,
         "display_name": c.display_name, "description": c.description,
         "config_schema_json": c.config_schema_json, "is_active": c.is_active,
         "request_count": c.request_count}
        for c in items
    ]

@router.post("/catalog")
def create_catalog_item(req: schemas.CatalogCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    item = models.ResourceCatalog(
        provider_id=req.provider_id, resource_type=req.resource_type,
        resource_category=req.resource_category, display_name=req.display_name,
        description=req.description, config_schema_json=req.config_schema_json,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "display_name": item.display_name}

@router.put("/catalog/{id}")
def update_catalog_item(id: int, req: schemas.CatalogUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    item = db.query(models.ResourceCatalog).filter(models.ResourceCatalog.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    if req.display_name is not None: item.display_name = req.display_name
    if req.description is not None: item.description = req.description
    if req.config_schema_json is not None: item.config_schema_json = req.config_schema_json
    if req.is_active is not None: item.is_active = req.is_active
    db.commit()
    return {"message": "Catalog item updated"}
