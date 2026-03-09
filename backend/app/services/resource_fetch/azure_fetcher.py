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

    async def fetch_resources(self, subscription_id: str, account_id: str) -> List[Dict[str, Any]]:
        """Executes a KQL query to fetch all normalized resources with pagination."""
        
        # KQL query to get the essential fields natively 
        query = (
            "Resources "
            "| project id, name, type, location, resourceGroup, tags, properties "
        )
        
        normalized_resources = []
        skip_token = None
        
        while True:
            options = QueryRequestOptions(
                result_format="objectArray",
                top=1000  # ARG max per page is 1000 when using skipToken
            )
            
            if skip_token:
                options.skip_token = skip_token
                
            request = QueryRequest(
                subscriptions=[subscription_id],
                query=query,
                options=options
            )
            
            response = self.rg_client.resources(request)
            
            for res in response.data:
                res_type = res.get("type", "unknown").lower()
                
                # We do not want the parent Scale Set wrapper in the inventory, only its child nodes.
                if res_type == "microsoft.compute/virtualmachinescalesets":
                    continue
                    
                normalized_resources.append({
                    "provider": "azure",
                    "resource_type": res_type,
                    "provider_resource_id": res.get("id", ""),
                    "name": res.get("name", ""),
                    "region": res.get("location", ""),
                    "resource_group": res.get("resourceGroup", ""),
                    "status": "running", # ARG doesn't easily return powerState natively for all, default to running
                    "tags": res.get("tags", {}),
                    "payload": res
                })
                
            skip_token = getattr(response, 'skip_token', None)
            if not skip_token:
                break

        # Extract existing IDs for fast O(1) deduplication
        existing_ids = {res["provider_resource_id"].lower() for res in normalized_resources}

        # --- Supplement with Missing Nested Types (VMSS Instances) ---
        # ARG summarizes scale sets and hides the individual worker instances.
        from services.cloud_services.azure import _get_azure_clients
        
        try:
            compute, _, _, sub_id = await _get_azure_clients(account_id)
            
            # Use explicit subscription from credentials, fallback to given subscription_id if None
            target_sub = sub_id or subscription_id
            
            for vmss in compute.virtual_machine_scale_sets.list_all():
                try:
                    rg_name = vmss.id.split('/')[4]
                    for vm_instance in compute.virtual_machine_scale_set_vms.list(rg_name, vmss.name):
                        if vm_instance.id.lower() not in existing_ids:
                            normalized_resources.append({
                                "provider": "azure",
                                "resource_type": "microsoft.compute/virtualmachinescalesets/virtualmachines",
                                "provider_resource_id": vm_instance.id,
                                "name": f"{vmss.name}_{vm_instance.instance_id}",
                                "region": vm_instance.location,
                                "resource_group": rg_name,
                                "status": vm_instance.provisioning_state or "running",
                                "tags": vm_instance.tags or {},
                                "payload": vm_instance.as_dict() if hasattr(vm_instance, 'as_dict') else {"id": vm_instance.id}
                            })
                            # Add to existing_ids to be safe
                            existing_ids.add(vm_instance.id.lower())
                except Exception as e:
                    # Skip problematic scale sets
                    continue
        except Exception as e:
            # If for some reason standard credential flow fails in the fetcher job, proceed without them
            pass
                
        return normalized_resources

