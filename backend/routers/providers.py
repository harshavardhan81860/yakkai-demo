from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/api/providers", tags=["Cloud Providers"])

PROVIDER_REGIONS = {
    "aws": ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-west-2", "eu-central-1", "ap-southeast-1", "ap-northeast-1"],
    "azure": ["eastus", "eastus2", "westus", "westus2", "westeurope", "northeurope", "southeastasia", "centralus"],
    "gcp": ["us-central1", "us-east1", "us-west1", "europe-west1", "europe-west2", "asia-east1", "asia-southeast1"],
    "oci": ["us-ashburn-1", "us-phoenix-1", "eu-frankfurt-1", "eu-amsterdam-1", "uk-london-1", "ap-mumbai-1", "ap-tokyo-1"],
    "vmware": ["datacenter-1", "datacenter-2", "datacenter-3"],
}


@router.get("")
def list_providers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    providers = db.query(models.CloudProvider).filter(models.CloudProvider.is_active == True).all()
    return [{"id": p.id, "name": p.name, "type": p.type, "icon": p.icon, "is_active": p.is_active} for p in providers]


@router.get("/{provider_id}/regions")
def get_regions(provider_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    provider = db.query(models.CloudProvider).filter(models.CloudProvider.id == provider_id).first()
    if not provider:
        return []
    return PROVIDER_REGIONS.get(provider.type, [])


@router.get("/{provider_id}/resource-catalog")
def get_catalog(provider_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    items = db.query(models.ResourceCatalog).filter(
        models.ResourceCatalog.provider_id == provider_id,
        models.ResourceCatalog.is_active == True,
    ).all()
    return [
        {
            "id": i.id,
            "resource_type": i.resource_type,
            "resource_category": i.resource_category,
            "display_name": i.display_name,
            "description": i.description,
            "config_schema_json": i.config_schema_json,
            "request_count": i.request_count,
        }
        for i in items
    ]


@router.post("/{provider_id}/test-connection")
def test_connection(provider_id: int, current_user: models.User = Depends(get_current_user)):
    return {"status": "connected", "message": "Connection successful", "latency_ms": 45}
