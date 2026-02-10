from pydantic import BaseModel
from typing import Optional,Literal
import uuid
from datetime import datetime

# -----------------------------
# Quota Limit
# -----------------------------
class QuotaLimitRequest(BaseModel):
    scope_type: str
    scope_id: str
    resource_type: str
    limit_count: int

class QuotaLimitResponse(BaseModel):
    id: uuid.UUID
    scope_type: str
    scope_id: str
    resource_type: str
    limit_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# -----------------------------
# Quota Override
# -----------------------------
class QuotaOverrideRequestCreate(BaseModel):
    quota_id: uuid.UUID
    requested_by: str
    requested_count: int
    is_emergency: Optional[bool] = False
    reason: Optional[str]

class QuotaOverrideRequestResponse(BaseModel):
    id: uuid.UUID
    quota_id: uuid.UUID
    requested_by: str
    requested_count: int
    is_emergency: bool
    status: str
    reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# -----------------------------
# Quota Evaluation Request
# -----------------------------
class QuotaEvaluationRequest(BaseModel):
    scope_type: str
    scope_id: str
    resource_type: str
    requested_count: int


class QuotaReserveRequest(BaseModel):
    quota_id: uuid.UUID
    requested_count: int
    reference_id: uuid.UUID  # approval_request_id or workflow id

class QuotaFinalizeRequest(BaseModel):
    quota_id: uuid.UUID
    requested_count: int
    decision: Literal["APPROVED", "REJECTED"]
    reference_id: uuid.UUID
