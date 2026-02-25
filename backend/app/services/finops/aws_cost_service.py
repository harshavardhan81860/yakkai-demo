import logging
from typing import Dict, Any, List, Optional
from datetime import date, timedelta, datetime
import boto3
from sqlalchemy.ext.asyncio import AsyncSession
from models.cloud_account import CloudAccount
from core.cloud_auth.auth_provider import cloud_auth_provider

logger = logging.getLogger(__name__)

class AWSCostService:
    """Service to fetch amortized cost data from AWS Cost Explorer."""
    
    async def fetch_costs(
        self,
        account: CloudAccount,
        start_date: date,
        end_date: date,
    ) -> List[Dict[str, Any]]:
        """
        Fetch costs for the specified AWS account using the shared AuthProvider.
        Expects start_date (inclusive) and end_date (exclusive, AWS requirement).
        """
        # 1. Resolve Credentials using identical logic to Discovery/Provisioning
        creds = await cloud_auth_provider.get_credentials(str(account.id))
        
        # 2. Initialize Boto3 Cost Explorer Client
        ce_client = boto3.client(
            'ce',
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
            region_name="us-east-1" # CE endpoint is globally us-east-1
        )
        
        # Determine the target AWS Account ID (could be a standalone account or member)
        # Auth Provider resolves parent tenant creds but the target cost account is the specific child
        target_account_id = account.cred_metadata.get("account_id")
        if not target_account_id:
            logger.warning(f"No target AWS account_id found for DB Account {account.id}")
            return []
            
        logger.info(f"Fetching AWS Cost Explorer data for {target_account_id} from {start_date} to {end_date}")

        results = []
        try:
            # We group by SERVICE and TAGS (e.g. YakkAI standard tags, or all tags)
            # AWS CE supports grouping by TAG keys, but limits to 2 GroupBy elements total.
            # For maximum compatibility, we group by SERVICE and LINKED_ACCOUNT.
            # Extended Tag fetching requires iterating or knowing the exact Tag keys upfront.
            response = ce_client.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity='DAILY',
                Metrics=['AmortizedCost'],
                Filter={
                    "Dimensions": {
                        "Key": "LINKED_ACCOUNT",
                        "Values": [target_account_id]
                    }
                },
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'},
                    {'Type': 'DIMENSION', 'Key': 'REGION'}
                ]
            )

            results.extend(self._parse_ce_response(response, account, target_account_id))
            
            # Handle Pagination
            while 'NextPageToken' in response:
                response = ce_client.get_cost_and_usage(
                    TimePeriod={
                        'Start': start_date.strftime('%Y-%m-%d'),
                        'End': end_date.strftime('%Y-%m-%d')
                    },
                    Granularity='DAILY',
                    Metrics=['AmortizedCost'],
                    Filter={
                        "Dimensions": {
                            "Key": "LINKED_ACCOUNT",
                            "Values": [target_account_id]
                        }
                    },
                    GroupBy=[
                        {'Type': 'DIMENSION', 'Key': 'SERVICE'},
                        {'Type': 'DIMENSION', 'Key': 'REGION'}
                    ],
                    NextPageToken=response['NextPageToken']
                )
                results.extend(self._parse_ce_response(response, account, target_account_id))

        except Exception as e:
            logger.error(f"Error fetching AWS costs for {target_account_id}: {str(e)}")
            raise e

        return results

    def _parse_ce_response(self, response: dict, account: CloudAccount, aws_account_id: str) -> List[Dict[str, Any]]:
        """Helper to transform AWS Cost Explorer API output into FinOps DB schema Dicts."""
        parsed_records = []
        
        for result_by_time in response.get('ResultsByTime', []):
            usage_date_str = result_by_time['TimePeriod']['Start']
            usage_date_obj = datetime.strptime(usage_date_str, '%Y-%m-%d').date()
            
            for group in result_by_time.get('Groups', []):
                # Group keys usually map to the GroupBy array: [SERVICE, REGION]
                keys = group.get('Keys', [])
                service_name = keys[0] if len(keys) > 0 else "Unknown"
                region = keys[1] if len(keys) > 1 else "Unknown"
                
                metrics = group.get('Metrics', {})
                amortized = metrics.get('AmortizedCost', {})
                
                amount = amortized.get('Amount', '0')
                currency = amortized.get('Unit', 'USD')
                
                # Basic categorization map for Portal
                portal_cat = "Other" # Deferred until custom resource group assignment
                
                # Creation Origin placeholder without tags for MVP
                # Future: Can fetch resource tags to match
                origin = "cloud" 
                
                parsed_records.append({
                    "tenant_id": account.tenant_id,
                    "account_id": account.id,
                    "provider_account_id": aws_account_id,
                    "date": usage_date_obj,
                    "provider": "aws",
                    "service_name": service_name,
                    "portal_resource_type": portal_cat,
                    "resource_id": None, # Null until Athena/CUR phase
                    "creation_origin": origin,
                    "region": region,
                    "resource_group": None,
                    "tags": {},
                    "amortized_cost": float(amount) # CE natively returns USD usually
                })

        return parsed_records

aws_cost_service = AWSCostService()
