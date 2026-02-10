from pydantic import BaseModel
from typing import List, Optional, Literal


class TemplateApproverSchema(BaseModel):
    approver_type: Literal["USER", "GROUP", "ROLE"]
    approver_value: str
    is_mandatory: bool = False


class TemplateLevelSchema(BaseModel):
    level_order: int
    approval_mode: Literal["MANUAL", "AUTO"]
    approval_strategy: Literal["ANY", "ALL", "QUORUM"]

    required_approvals: Optional[int] = None
    sla_minutes: Optional[int] = None

    approvers: List[TemplateApproverSchema]


class CreateApprovalTemplateRequest(BaseModel):
    template_name: str
    is_active: bool = True
    default_sla_minutes: Optional[int] = None
    levels: List[TemplateLevelSchema]


class UpdateApprovalTemplateRequest(BaseModel):
    default_sla_minutes: Optional[int] = None
    levels: List[TemplateLevelSchema]

class CloneApprovalTemplateRequest(BaseModel):
    template_name: str
    is_active: bool = False
    default_sla_minutes: int
