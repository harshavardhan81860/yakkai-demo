import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/api/statistics", tags=["Statistics"])


@router.get("/dashboard")
def dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    role_name = current_user.role.name if current_user.role else "user"
    total_users = db.query(models.User).count()
    total_requests = db.query(models.ResourceRequest).count()
    total_resources = db.query(models.ProvisionedResource).count()
    total_accounts = db.query(models.CloudAccount).count()
    pending_approvals = db.query(models.Approval).filter(models.Approval.status == "pending").count()
    active_resources = db.query(models.ProvisionedResource).filter(models.ProvisionedResource.status == "active").count()

    # Provider breakdown
    providers = db.query(models.CloudProvider).all()
    providers_breakdown = {}
    for p in providers:
        req_count = db.query(models.ResourceRequest).filter(models.ResourceRequest.provider_id == p.id).count()
        res_count = db.query(models.ProvisionedResource).filter(models.ProvisionedResource.provider_type == p.type).count()
        acct_count = db.query(models.CloudAccount).filter(models.CloudAccount.provider_id == p.id).count()
        cost = db.query(func.coalesce(func.sum(models.CloudAccount.monthly_cost), 0)).filter(models.CloudAccount.provider_id == p.id).scalar()
        providers_breakdown[p.type] = {
            "name": p.name, "requests": req_count, "resources": res_count,
            "accounts": acct_count, "monthly_cost": float(cost or 0), "icon": p.icon,
        }

    # Category breakdown
    categories = db.query(models.ProvisionedResource.resource_category, func.count()).group_by(models.ProvisionedResource.resource_category).all()
    category_breakdown = {cat: count for cat, count in categories}

    # Status breakdown
    statuses = db.query(models.ResourceRequest.status, func.count()).group_by(models.ResourceRequest.status).all()
    status_breakdown = {status: count for status, count in statuses}

    # Recent requests
    recent = db.query(models.ResourceRequest).order_by(models.ResourceRequest.created_at.desc()).limit(5).all()
    recent_requests = [
        {"id": r.id, "resource_type": r.resource_type, "status": r.status,
         "provider_type": r.provider.type if r.provider else None,
         "estimated_cost": r.estimated_cost,
         "user_name": r.user.name if r.user else None,
         "created_at": str(r.created_at) if r.created_at else None}
        for r in recent
    ]

    # Cost trend (mock 6 months)
    cost_trend = []
    for i in range(6):
        month = datetime.utcnow() - timedelta(days=30 * (5 - i))
        cost_trend.append({
            "month": month.strftime("%b %Y"),
            "aws": round(random.uniform(5000, 15000), 2),
            "azure": round(random.uniform(3000, 10000), 2),
            "gcp": round(random.uniform(2000, 8000), 2),
            "oci": round(random.uniform(1000, 5000), 2),
            "vmware": round(random.uniform(2000, 6000), 2),
        })

    total_monthly_cost = sum(float(a.monthly_cost or 0) for a in db.query(models.CloudAccount).all())

    return {
        "total_users": total_users, "total_requests": total_requests,
        "total_resources": total_resources, "total_accounts": total_accounts,
        "pending_approvals": pending_approvals, "active_resources": active_resources,
        "total_monthly_cost": round(total_monthly_cost, 2),
        "providers_breakdown": providers_breakdown,
        "category_breakdown": category_breakdown,
        "status_breakdown": status_breakdown,
        "recent_requests": recent_requests,
        "cost_trend": cost_trend,
    }


@router.get("/providers")
def provider_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    providers = db.query(models.CloudProvider).all()
    result = []
    for p in providers:
        resources = db.query(models.ProvisionedResource).filter(models.ProvisionedResource.provider_type == p.type).all()
        result.append({
            "provider_id": p.id, "name": p.name, "type": p.type,
            "resource_count": len(resources),
            "active_count": sum(1 for r in resources if r.status == "active"),
            "total_cost": sum(r.actual_cost for r in resources),
            "accounts": db.query(models.CloudAccount).filter(models.CloudAccount.provider_id == p.id).count(),
        })
    return result


@router.get("/resources")
def resource_stats(provider: str = None, category: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    q = db.query(models.ProvisionedResource)
    if provider:
        q = q.filter(models.ProvisionedResource.provider_type == provider)
    if category:
        q = q.filter(models.ProvisionedResource.resource_category == category)
    resources = q.all()
    return [
        {"id": r.id, "provider_type": r.provider_type, "resource_type": r.resource_type,
         "resource_category": r.resource_category, "resource_name": r.resource_name,
         "resource_identifier": r.resource_identifier, "actual_cost": r.actual_cost,
         "status": r.status, "region": r.region,
         "provisioned_at": str(r.provisioned_at) if r.provisioned_at else None}
        for r in resources
    ]


@router.get("/costs")
def cost_stats(provider: str = None, months: int = 6, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Generate realistic cost data
    data = []
    for i in range(months):
        month_date = datetime.utcnow() - timedelta(days=30 * (months - 1 - i))
        entry = {"month": month_date.strftime("%b %Y"), "date": month_date.strftime("%Y-%m-%d")}
        for ptype in ["aws", "azure", "gcp", "oci", "vmware"]:
            if provider and ptype != provider:
                continue
            base_costs = {"aws": 12000, "azure": 8000, "gcp": 6000, "oci": 3500, "vmware": 4500}
            entry[ptype] = round(base_costs.get(ptype, 5000) * (1 + random.uniform(-0.15, 0.20)), 2)
        data.append(entry)
    total_current = sum(data[-1].get(p, 0) for p in ["aws", "azure", "gcp", "oci", "vmware"])
    return {"trend": data, "total_current_month": round(total_current, 2), "currency": "USD"}


@router.get("/costs/comparison")
def cost_comparison(current_user: models.User = Depends(get_current_user)):
    return {
        "compute": {"aws": 4500, "azure": 3800, "gcp": 3200, "oci": 2800, "vmware": 3500},
        "storage": {"aws": 2100, "azure": 1800, "gcp": 1500, "oci": 1200, "vmware": 1800},
        "network": {"aws": 1200, "azure": 900, "gcp": 800, "oci": 600, "vmware": 700},
        "data": {"aws": 3500, "azure": 2800, "gcp": 2200, "oci": 1900, "vmware": 0},
    }


@router.get("/costs/forecast")
def cost_forecast(current_user: models.User = Depends(get_current_user)):
    return {
        "current_month": 34000,
        "next_month_forecast": 36500,
        "quarterly_forecast": 110000,
        "annual_forecast": 420000,
        "confidence": 0.85,
        "by_provider": {
            "aws": {"current": 12000, "forecast": 13200},
            "azure": {"current": 8000, "forecast": 8400},
            "gcp": {"current": 6000, "forecast": 6800},
            "oci": {"current": 3500, "forecast": 3600},
            "vmware": {"current": 4500, "forecast": 4500},
        },
    }


@router.get("/optimization")
def optimization_insights(current_user: models.User = Depends(get_current_user)):
    return {
        "total_savings_potential": 8500,
        "recommendations": [
            {"type": "idle_resource", "provider": "aws", "resource": "i-0abc123 (EC2)", "savings": 2400, "detail": "Instance idle >90% of past 14 days"},
            {"type": "right_sizing", "provider": "azure", "resource": "vm-prod-web-03", "savings": 1800, "detail": "Downsize from D4s_v3 to D2s_v3 — avg CPU 12%"},
            {"type": "reserved_instance", "provider": "aws", "resource": "EC2 Fleet", "savings": 3200, "detail": "Convert 8 on-demand to 1yr reserved — 40% savings"},
            {"type": "cross_cloud", "provider": "gcp", "resource": "Cloud SQL", "savings": 1100, "detail": "Equivalent OCI Autonomous DB costs 30% less"},
        ],
    }
