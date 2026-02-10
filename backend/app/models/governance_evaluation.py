# models/governance_evaluation.py

from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# ----------------- Schemas -----------------

class ResourcePermission(BaseModel):
    resource_id: str
    resource_type: str
    permissions: dict   # {permission_type_name: "ALLOW"/"DENY"}
    approval_required: bool
    approval_template_id: Optional[UUID] = None

class ResourcePermissionRequest(BaseModel):
    user_id: UUID
    resource_type: str
    resource_id: Optional[str] = None
    permission_type: Optional[str] = None

class EvalPermissionRequest(BaseModel):
    user_id: UUID
    resource_type: str
    resource_id: str
    permission_type: str
    permission: str  # ALLOW / DENY
    approval_template_id: Optional[UUID] = None

class BatchEvalRequest(BaseModel):
    requests: List[EvalPermissionRequest]
