from pydantic import BaseModel
from typing import Optional

class GroupRoleAssignmentCreateRequest(BaseModel):
    group_id: str
    role_id: str

    tenant_id: Optional[str] = None
    cloud_account_id: Optional[str] = None
    component_id: Optional[str] = None

    assigned_by: Optional[str] = None
