import logging
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import os
from models.cloud_account import CloudAccount
from core.cloud_auth.auth_provider import cloud_auth_provider
from core.config import load_config

logger = logging.getLogger(__name__)
cfg = load_config(os.getenv("APP_CONFIG"))

class AzureCostService:
    """Service to fetch amortized cost data from Azure Cost Management API."""
    
    async def fetch_costs(
        self,
        account: CloudAccount,
        start_date: date,
        end_date: date,
    ) -> List[Dict[str, Any]]:
        """
        Fetch costs for the specified Azure subscription using the shared AuthProvider.
        Expects start_date (inclusive) and end_date (inclusive for Azure).
        """
        # 1. Resolve Credentials using identical logic to Discovery
        creds = await cloud_auth_provider.get_credentials(str(account.id))
        access_token = creds.get("access_token")
        
        target_sub_id = creds.get("subscription_id")
        if not target_sub_id or not access_token:
            logger.warning(f"Missing Sub ID or Token for Azure account {account.id}")
            return []
            
        logger.info(f"Fetching Azure Cost Mgmt data for {target_sub_id} from {start_date} to {end_date}")

        # Azure REST API URL for Querying Costs
        api_version = cfg.AZURE_COST_API_VERSION
        url = f"https://management.azure.com/subscriptions/{target_sub_id}/providers/Microsoft.CostManagement/query?api-version={api_version}"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Azure Cost Management Query Body
        # We group by ServiceName, ResourceLocation (Region), and ResourceId 
        # (Since Azure natively supports exporting resource-level costs without CURs)
        payload = {
            "type": "AmortizedCost",
            "timeframe": "Custom",
            "timePeriod": {
                "from": start_date.strftime('%Y-%m-%dT00:00:00Z'),
                "to": end_date.strftime('%Y-%m-%dT23:59:59Z')
            },
            "dataset": {
                "granularity": "Daily",
                "aggregation": {
                    "totalCost": {
                        "name": "Cost",
                        "function": "Sum"
                    },
                    "totalCostUSD": {
                        "name": "CostUSD",
                        "function": "Sum"
                    }
                },
                "grouping": [
                    {"type": "Dimension", "name": "ServiceName"},
                    {"type": "Dimension", "name": "ResourceLocation"},
                    {"type": "Dimension", "name": "ResourceId"}
                ]
            }
        }

        results = []
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=60.0)
                if response.status_code == 200:
                    data = response.json()
                    results.extend(self._parse_az_response(data, account, target_sub_id))
                else:
                    logger.error(f"Failed to fetch Azure costs: {response.status_code} - {response.text}")
                    raise Exception(f"Azure Cost API Error: {response.text}")
                    
        except Exception as e:
            logger.error(f"Error executing Azure Cost query: {str(e)}")
            raise e

        return results

    def _parse_az_response(self, data: dict, account: CloudAccount, target_sub_id: str) -> List[Dict[str, Any]]:
        """Transforms Azure Cost Management Dataset into FinOps DB schema Dicts."""
        parsed_records = []
        
        properties = data.get("properties", {})
        columns = properties.get("columns", [])
        rows = properties.get("rows", [])
        
        logger.info(f"Azure Cost API returned {len(rows)} raw rows of data (including 0$ costs).")
        
        # Map Azure generic column indexes
        col_map = {col["name"]: idx for idx, col in enumerate(columns)}
        
        for row in rows:
            # Safely extract metrics based on dynamic column indexes
            cost_usd = row[col_map.get("CostUSD", 1)]
            usage_date = row[col_map.get("UsageDate", 2)]
            
            service_name = row[col_map.get("ServiceName", 3)]
            region = row[col_map.get("ResourceLocation", 4)]
            resource_id = row[col_map.get("ResourceId", 5)]
            
            # Formatting Date from YYYYMMDD to YYYY-MM-DD
            formatted_date_str = f"{str(usage_date)[:4]}-{str(usage_date)[4:6]}-{str(usage_date)[6:8]}"
            date_obj = datetime.strptime(formatted_date_str, '%Y-%m-%d').date()
            
            # Resource Group extraction from Azure ResourceId string
            rg = None
            if resource_id and "resourcegroups/" in resource_id.lower():
                parts = resource_id.lower().split("resourcegroups/")
                if len(parts) > 1:
                    rg = parts[1].split("/")[0]

            portal_cat = "Other" # Deferred until custom resource group assignment
            origin = "cloud" # MVP default
            
            parsed_records.append({
                "tenant_id": account.tenant_id,
                "account_id": account.id,
                "provider_account_id": target_sub_id,
                "date": date_obj,
                "provider": "azure",
                "service_name": service_name,
                "portal_resource_type": portal_cat,
                "resource_id": resource_id,
                "creation_origin": origin,
                "region": region,
                "resource_group": rg,
                "tags": {}, # Complex dimension in payload, deferring tag parsing for MVP to keep query fast
                "amortized_cost": float(cost_usd)
            })

        return parsed_records

azure_cost_service = AzureCostService()
