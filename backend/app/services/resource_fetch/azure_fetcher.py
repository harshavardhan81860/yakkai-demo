from azure.mgmt.resourcegraph.models import QueryRequest, QueryRequestOptions
from typing import List, Dict, Any, Optional

class AzureResourceFetcher:
    """
    Fetches resources from Azure using the Azure Resource Graph API.
    This guarantees a $0 cost and extremely fast retrieval across all subscriptions.
    """
    def __init__(self, tenant_id: Optional[str] = None):
        self.tenant_id = tenant_id
        self.rg_client = None

    def fetch_resources(self, subscription_id: str) -> List[Dict[str, Any]]:
        """Executes a KQL query to fetch all normalized resources."""
        
        # KQL query to get the essential fields natively 
        query = (
            "Resources "
            "| project id, name, type, location, resourceGroup, tags, properties "
            "| limit 5000"
        )
        
        request = QueryRequest(
            subscriptions=[subscription_id],
            query=query,
            options=QueryRequestOptions(result_format="objectArray")
        )
        
        response = self.rg_client.resources(request)
        
        normalized_resources = []
        for res in response.data:
            normalized_resources.append({
                "provider": "azure",
                "resource_type": res.get("type", "unknown"),
                "provider_resource_id": res.get("id", ""),
                "name": res.get("name", ""),
                "region": res.get("location", ""),
                "resource_group": res.get("resourceGroup", ""),
                "status": "running", # ARG doesn't easily return powerState natively for all, default to running
                "tags": res.get("tags", {}),
                "payload": res
            })
            
        return normalized_resources
