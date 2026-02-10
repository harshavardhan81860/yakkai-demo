from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List, Literal


class ExplicitApproverSchema(BaseModel):
    level_order: int
    approver_type: Literal["USER", "ROLE", "GROUP"]
    approver_value: str


class SubmitApprovalRequestSchema(BaseModel):
    template_id: str
    template_version: int
    request_payload: Optional[Dict[str, Any]] = None
    explicit_approvers: Optional[List[ExplicitApproverSchema]] = []


class ApprovalDecisionSchema(BaseModel):
    decision: Literal["APPROVED", "REJECTED"]
    comment: Optional[str] = None



class ExplicitApproverSchema(BaseModel):
    level_order: int
    approver_type: Literal["USER", "ROLE", "GROUP"]
    approver_value: str

    @validator("approver_value")
    def not_empty(cls, v):
        if not v:
            raise ValueError("approver_value must not be empty")
        return v
