import time
from typing import List, Dict, Any

from azure.mgmt.resource import SubscriptionClient
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.containerservice import ContainerServiceClient
from azure.core.credentials import AccessToken

from core.cloud_auth.auth_provider import cloud_auth_provider

# --------------------------------------------------
# Region cache
# --------------------------------------------------
_REGION_CACHE: Dict[str, Dict[str, Any]] = {}
REGION_TTL_SECONDS = 12 * 60 * 60  # 12 hours

def _get_cached_regions(account_id: str):
    cached = _REGION_CACHE.get(account_id)
    if not cached:
        return None
    if cached["expiry"] < time.time():
        _REGION_CACHE.pop(account_id, None)
        return None
    return cached["regions"]

def _set_cached_regions(account_id: str, regions: List[str]):
    _REGION_CACHE[account_id] = {
        "regions": regions,
        "expiry": time.time() + REGION_TTL_SECONDS
    }

# --------------------------------------------------
# Token adapter for Azure SDK
# --------------------------------------------------
class TokenCredentialAdapter:
    """Wraps a raw access token into Azure SDK credential"""
    def __init__(self, token: str):
        self._token = token

    def get_token(self, *scopes, **kwargs):
        # expires in 1 hour from now
        return AccessToken(self._token, int(time.time()) + 3600)

# --------------------------------------------------
# Azure clients helper
# --------------------------------------------------
async def _get_azure_clients(account_id: str):
    """
    Returns compute, aks, subscription client, and primary subscription id
    """
    auth = await cloud_auth_provider.get_credentials(account_id)
    token = auth["access_token"]
    subscription_id = auth["subscription_id"]

    credential = TokenCredentialAdapter(token)

    compute_client = ComputeManagementClient(credential, subscription_id)
    aks_client = ContainerServiceClient(credential, subscription_id)
    sub_client = SubscriptionClient(credential)

    return compute_client, aks_client, sub_client, subscription_id


async def test_connection(cloud_account_id: str) -> dict:
    """
    Test Azure connection using given cloud account.
    Returns success/failure message.
    """
    try:
        auth = await cloud_auth_provider.get_credentials(cloud_account_id)
        token = auth["access_token"]
        subscription_id = auth["subscription_id"]

        credential = TokenCredentialAdapter(token)
        sub_client = SubscriptionClient(credential)

        # Lightweight read-only call
        list(sub_client.subscriptions.list())

        return {"status": "success", "message": "Azure connection successful"}

    except Exception as e:
        return {"status": "failure", "message": f"Azure connection failed: {str(e)}"}

# --------------------------------------------------
# Regions (cached)
# --------------------------------------------------
async def get_regions(account_id: str, refresh: bool = False) -> List[str]:
    if not refresh:
        cached = _get_cached_regions(account_id)
        if cached:
            return cached

    _, _, sub_client, subscription_id = await _get_azure_clients(account_id)

    regions = [loc.name for loc in sub_client.subscriptions.list_locations(subscription_id)]
    regions.sort()
    _set_cached_regions(account_id, regions)
    return regions

# --------------------------------------------------
# Virtual Machines
# --------------------------------------------------
async def get_instances(account_id: str, region: str) -> List[Dict]:
    compute, _, _, _ = await _get_azure_clients(account_id)

    results = []
    
    # 1. Fetch individual Virtual Machines
    for vm in compute.virtual_machines.list_all():
        if vm.location.lower() != region.lower():
            continue

        results.append({
            "vm_id": vm.id,
            "name": vm.name,
            "location": vm.location,
            "type": "microsoft.compute/virtualmachines",
            "size": vm.hardware_profile.vm_size if vm.hardware_profile else None,
            "provisioning_state": vm.provisioning_state,
            "source_service": "Manual / Direct",
            "_raw": vm.as_dict() if hasattr(vm, 'as_dict') else {"id": vm.id, "name": vm.name}
        })

    # 2. Fetch Virtual Machine Scale Set Instances (AKS Nodes)
    # Most AKS nodes live here, and the portal expands them implicitly.
    for vmss in compute.virtual_machine_scale_sets.list_all():
        if vmss.location.lower() != region.lower():
            continue

        try:
            # Extract Resource Group name from VMSS ID
            # ID format: /subscriptions/.../resourceGroups/{rg}/providers/...
            rg_name = vmss.id.split('/')[4]
            
            # Identify exact source service name
            if rg_name.lower().startswith("mc_"):
                # AKS Resource Groups follow pattern: MC_{resourceGroup}_{clusterName}_{region}
                parts = rg_name.split('_')
                if len(parts) >= 4:
                    # The cluster name is usually the second to last part
                    cluster_name = "_".join(parts[2:-1])
                    source_svc = f"Azure Kubernetes Service ({cluster_name})"
                else:
                    source_svc = "Azure Kubernetes Service"
            else:
                source_svc = f"Virtual Machine Scale Set ({vmss.name})"
            
            # Use `virtual_machine_scale_set_vms` to list the actual instances inside the pool
            for vm_instance in compute.virtual_machine_scale_set_vms.list(rg_name, vmss.name):
                # We format the name as {ScaleSetName}_{InstanceId} to easily identify them
                name = f"{vmss.name}_{vm_instance.instance_id}"
                
                results.append({
                    "vm_id": vm_instance.id,
                    "name": name,
                    "location": vm_instance.location,
                    "type": "microsoft.compute/virtualmachinescalesets/virtualmachines",
                    "size": vm_instance.hardware_profile.vm_size if vm_instance.hardware_profile else (vmss.sku.name if vmss.sku else "Unknown"),
                    "provisioning_state": vm_instance.provisioning_state,
                    "source_service": source_svc,
                    "_raw": vm_instance.as_dict() if hasattr(vm_instance, 'as_dict') else {"id": vm_instance.id, "name": vm_instance.name}
                })
        except Exception as e:
            # Shield against malformed IDs or permission issues on specific scale sets
            continue

    return results

# --------------------------------------------------
# VM Images (limited to publishers/offers/skus)
# --------------------------------------------------
async def get_images(account_id: str, region: str) -> List[Dict]:
    compute, _, _, _ = await _get_azure_clients(account_id)

    images = []
    publishers = list(compute.virtual_machine_images.list_publishers(region))
    for pub in publishers[:5]:  # limit for performance
        offers = list(compute.virtual_machine_images.list_offers(region, pub.name))
        for offer in offers[:3]:
            skus = list(compute.virtual_machine_images.list_skus(region, pub.name, offer.name))
            for sku in skus[:3]:
                images.append({
                    "publisher": pub.name,
                    "offer": offer.name,
                    "sku": sku.name,
                    "region": region,
                    "_raw": sku.as_dict() if hasattr(sku, 'as_dict') else {"name": sku.name}
                })
    return images

# --------------------------------------------------
# AKS Clusters
# --------------------------------------------------
async def get_clusters(account_id: str, region: str) -> List[Dict]:
    _, aks, _, _ = await _get_azure_clients(account_id)

    clusters = []
    for cluster in aks.managed_clusters.list():
        if cluster.location.lower() != region.lower():
            continue

        clusters.append({
            "name": cluster.name,
            "location": cluster.location,
            "kubernetes_version": cluster.kubernetes_version,
            "kube_version": cluster.kubernetes_version,
            "provisioning_state": cluster.provisioning_state,
            "fqdn": cluster.fqdn,
            "_raw": cluster.as_dict() if hasattr(cluster, 'as_dict') else {"id": cluster.id, "name": cluster.name}
        })
    return clusters

# --------------------------------------------------
# Subscriptions
# --------------------------------------------------
async def list_subscriptions_for_account(account_id: str, refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Fetch all subscriptions visible to this cloud account using the token from auth provider
    """
    auth = await cloud_auth_provider.get_credentials(account_id)
    token = auth["access_token"]

    credential = TokenCredentialAdapter(token)
    sub_client = SubscriptionClient(credential)

    subscriptions = []
    for sub in sub_client.subscriptions.list():
        subscriptions.append({
            "subscription_id": sub.subscription_id,
            "display_name": sub.display_name,
            "state": sub.state.value if hasattr(sub.state, "value") else sub.state
        })

    return subscriptions
