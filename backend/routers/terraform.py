from fastapi import APIRouter, Depends
from auth import get_current_user, require_role
import models

router = APIRouter(prefix="/api/terraform", tags=["Terraform"])


@router.post("/plan")
def terraform_plan(request_id: int, current_user: models.User = Depends(require_role(["admin"]))):
    return {
        "job_id": f"tf-plan-{request_id}",
        "status": "completed",
        "plan_summary": {
            "add": 3, "change": 0, "destroy": 0,
            "resources": [
                {"type": "aws_instance", "name": "web-server", "action": "create"},
                {"type": "aws_security_group", "name": "web-sg", "action": "create"},
                {"type": "aws_ebs_volume", "name": "data-vol", "action": "create"},
            ],
        },
    }


@router.post("/apply")
def terraform_apply(request_id: int, current_user: models.User = Depends(require_role(["admin"]))):
    return {
        "job_id": f"tf-apply-{request_id}",
        "status": "completed",
        "outputs": {"instance_id": "i-0abc123def456", "public_ip": "54.123.45.67"},
    }


@router.get("/status/{job_id}")
def terraform_status(job_id: str, current_user: models.User = Depends(get_current_user)):
    return {"job_id": job_id, "status": "completed", "progress": 100, "logs": ["Init complete", "Plan complete", "Apply complete"]}


@router.get("/state/{resource_id}")
def terraform_state(resource_id: int, current_user: models.User = Depends(get_current_user)):
    return {
        "resource_id": resource_id,
        "state": "applied",
        "last_applied": "2026-02-09T10:00:00Z",
        "drift_detected": False,
    }


@router.post("/destroy/{resource_id}")
def terraform_destroy(resource_id: int, current_user: models.User = Depends(require_role(["admin"]))):
    return {"job_id": f"tf-destroy-{resource_id}", "status": "completed"}


@router.get("/drift-detection")
def drift_detection(current_user: models.User = Depends(require_role(["admin"]))):
    return {
        "total_resources": 45,
        "in_sync": 42,
        "drifted": 3,
        "drifted_resources": [
            {"id": 12, "type": "aws_instance", "name": "web-prod-01", "drift": "security_group changed"},
            {"id": 23, "type": "azure_vm", "name": "api-staging", "drift": "disk size modified"},
            {"id": 34, "type": "gcp_instance", "name": "worker-03", "drift": "labels removed"},
        ],
    }
