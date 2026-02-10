from pydantic import BaseModel
from typing import Dict, Optional


class CIPipelineTrigger(BaseModel):
    cloud_account_id: str
    action: str                 # connection_test | sandbox | destroy
    variables: Optional[Dict[str, str]] = None
