from pydantic import BaseModel
from typing import Optional, List
import uuid
from core.enums.operator_enum import OperatorEnum

# ---------------- Condition ----------------
class ApprovalMappingConditionCreate(BaseModel):
    attribute: str
    operator: OperatorEnum
    value: str

    class Config:
        schema_extra = {
            "example": {
                "attribute": "amount",
                "operator": "=",
                "value": "10000"
            }
        }

class ApprovalMappingConditionUpdate(ApprovalMappingConditionCreate):
    id: Optional[uuid.UUID] = None

# ---------------- Group ----------------
class ApprovalMappingGroupCreate(BaseModel):
    operator: str  # AND / OR
    conditions: Optional[List[ApprovalMappingConditionCreate]] = []

    class Config:
        schema_extra = {
            "example": {
                "operator": "AND",
                "conditions": [
                    {"attribute": "amount", "operator": ">", "value": "10000"},
                    {"attribute": "requester_level", "operator": "=", "value": "junior"}
                ]
            }
        }

class ApprovalMappingGroupUpdate(ApprovalMappingGroupCreate):
    id: Optional[uuid.UUID] = None

# ---------------- Policy ----------------
class ApprovalMappingPolicyCreate(BaseModel):
    resource_name: str
    action_name: str
    scope_type: str
    scope_id: str
    template_id: uuid.UUID
    is_mandatory: bool = False
    groups: Optional[List[ApprovalMappingGroupCreate]] = []

    class Config:
        schema_extra = {
            "example": {
                "resource_name": "purchase_request",
                "action_name": "create",
                "scope_type": "department",
                "scope_id": "finance",
                "template_id": "uuid-here",
                "is_mandatory": False,
                "groups": [
                    {
                        "operator": "AND",
                        "conditions": [
                            {"attribute": "amount", "operator": ">", "value": "10000"}
                        ]
                    }
                ]
            }
        }

class ApprovalMappingPolicyUpdate(BaseModel):
    # template_id: Optional[uuid.UUID]
    is_mandatory: Optional[bool] = None
    is_active: Optional[bool] = None
    groups: Optional[List[ApprovalMappingGroupUpdate]] = []

# ---------------- Evaluation ----------------
class ApprovalMappingEvaluateRequest(BaseModel):
    resource_name: str
    action_name: str
    scope_type: str
    scope_id: str
    context: dict

    class Config:
        schema_extra = {
            "example": {
                "resource_name": "purchase_request",
                "action_name": "create",
                "scope_type": "department",
                "scope_id": "finance",
                "context": {"amount": "12000", "requester_level": "junior"}
            }
        }
