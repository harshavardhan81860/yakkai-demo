from pydantic import BaseModel
from typing import Optional, Dict, Any



# ---------- Create / Input Schema ----------

class CloudAccountCreate(BaseModel):
    tenant_id: str
    parent_id: Optional[str] = None

    # display name (normalized in service layer)
    name: str

    # cloud type
    cloud_provider: str

    # provider specific auth data (aws/azure/gcp)
    cred_metadata: Dict[str, Any]

    # write layer identity
    ci_credentials_id: Optional[str] = None


# ---------- Response Schema ----------

class CloudAccountResponse(BaseModel):
    id: str
    tenant_id: str
    parent_id: Optional[str] = None

    name: str
    cloud_provider: str

    cred_metadata: Dict[str, Any]

    ci_credentials_id: Optional[str]

    read_connection_status: str
    read_last_validated_at: Optional[str]

    write_connection_status: str
    write_last_validated_at: Optional[str]

    is_active: bool

    class Config:
        from_attributes = True



class CloudAccountUpdate(BaseModel):
    name: Optional[str] = None
    cred_metadata: Optional[Dict[str, Any]] = None
    ci_credentials_id: Optional[str] = None
