from enum import Enum

class ScopeType(str, Enum):
    TENANT = "tenant"
    CLOUD_ACCOUNT = "cloud_account"
    COMPONENT = "component"
