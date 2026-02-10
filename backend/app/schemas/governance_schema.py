from pydantic import BaseModel
from typing import Optional, List
import uuid


class GovernancePolicyCreate(BaseModel):
    resource_type: str
    action_name: str
    effect: str
    scope_type: str
    scope_id: Optional[str] = None


class GovernancePolicyUpdate(BaseModel):
    effect: Optional[str] =None
    is_active: Optional[bool] = None


class GovernancePolicySubjectCreate(BaseModel):
    policy_id: uuid.UUID
    subject_type: str
    subject_id: Optional[str] = None


class GovernanceResourceAccessCreate(BaseModel):
    resource_type: str
    resource_id: str
    action_name: str
    subject_type: str
    subject_id: str


class GovernanceEvaluateRequest(BaseModel):
    user_id: str
    tenant_id: Optional[str] = None
    resource_type: str
    action_name: str

class GovernancePolicySubjectUpdate(BaseModel):
    is_active: Optional[bool] = None

class GovernanceResourceAccessUpdate(BaseModel):
    is_active: Optional[bool] = None
