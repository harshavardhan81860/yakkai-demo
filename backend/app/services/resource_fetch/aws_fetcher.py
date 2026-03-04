import logging
from typing import List, Dict, Any

import boto3

from services.cloud_services.aws import get_regions, get_instances, get_images, get_clusters
from core.cloud_auth.auth_provider import cloud_auth_provider

logger = logging.getLogger(__name__)

class AWSResourceFetcher:
    """
    Fetches resources from AWS using the AWS Resource Explorer 2 API across all regions.
    Provides a fast, unified search capability without needing to cycle
    through 30+ regional or modular endpoints per service explicitly.
    """
    def __init__(self):
        pass

    async def fetch_resources(self, account_id: str) -> List[Dict[str, Any]]:
        normalized_resources = []
        try:
            creds = await cloud_auth_provider.get_credentials(account_id)
            regions = await get_regions(account_id)
            logger.info(f"AWS: Found {len(regions)} active regions for account {account_id}")

            seen_arns = set()

            for region in regions:
                logger.info(f"AWS: Fetching resources via Resource Explorer for region: {region}")

                # Fetch native resource states directly for accurate status mapping.
                # If they are missing from Resource Explorer, append them forcibly at the end.
                native_resources: Dict[str, Dict[str, Any]] = {}
                try:
                    instances = await get_instances(account_id, region)
                    for inst in instances:
                        raw = inst.get('_raw', {})
                        tags = {t['Key']: t['Value'] for t in raw.get('Tags', [])}
                        res_id = inst['instance_id']
                        native_resources[f"ec2:instance:{res_id}"] = {
                            "provider": "aws",
                            "resource_type": "ec2:instance",
                            "provider_resource_id": res_id,
                            "name": tags.get('Name', res_id),
                            "region": region,
                            "resource_group": None,
                            "status": inst["state"].lower(),
                            "tags": tags,
                            "payload": raw
                        }

                    images = await get_images(account_id, region)
                    for img in images:
                        raw = img.get('_raw', {})
                        tags = {t['Key']: t['Value'] for t in raw.get('Tags', [])}
                        res_id = img['image_id']
                        native_resources[f"ec2:image:{res_id}"] = {
                            "provider": "aws",
                            "resource_type": "ec2:image",
                            "provider_resource_id": res_id,
                            "name": img.get('name') or tags.get('Name', res_id),
                            "region": region,
                            "resource_group": None,
                            "status": img.get("state", "available").lower(),
                            "tags": tags,
                            "payload": raw
                        }

                    clusters = await get_clusters(account_id, region)
                    for c in clusters:
                        raw = c.get('_raw', {})
                        tags = raw.get('tags', {})
                        res_id = c['name']
                        native_resources[f"eks:cluster:{res_id}"] = {
                            "provider": "aws",
                            "resource_type": "eks:cluster",
                            "provider_resource_id": res_id,
                            "name": res_id,
                            "region": region,
                            "resource_group": None,
                            "status": c.get("status", "running").lower(),
                            "tags": tags,
                            "payload": raw
                        }
                except Exception as e:
                    logger.debug(f"AWS: Failed to lookup native resource states in {region}: {e}")

                try:
                    # Initialize per-region Resource Explorer client
                    client = boto3.client(
                        'resource-explorer-2',
                        aws_access_key_id=creds["AccessKeyId"],
                        aws_secret_access_key=creds["SecretAccessKey"],
                        aws_session_token=creds["SessionToken"],
                        region_name=region
                    )

                    paginator = client.get_paginator('search')

                    # Iterate through the global Resource Explorer pagination
                    for page in paginator.paginate(QueryString="*"):
                        for res in page.get("Resources", []):
                            arn = res.get("Arn", "")
                            # Global resources might appear in multiple local indexes or the aggregator
                            if not arn or arn in seen_arns:
                                continue
                            seen_arns.add(arn)

                            # Standardize tags
                            tags_dict = {}
                            for prop in res.get("Properties", []):
                                if prop.get("Name") == "Tags":
                                    if isinstance(prop.get("Data"), dict):
                                        tags_dict = prop.get("Data")

                            extracted_id = self._extract_id(arn)
                            res_type = res.get("ResourceType", "unknown")

                            status = "running"
                            lookup_key = f"{res_type}:{extracted_id}"
                            if lookup_key in native_resources:
                                status = native_resources[lookup_key]["status"]
                                del native_resources[lookup_key]

                            normalized_resources.append({
                                "provider": "aws",
                                "resource_type": res_type,
                                "provider_resource_id": extracted_id,
                                "name": self._extract_name(res, tags_dict),
                                "region": res.get("Region", region),
                                "resource_group": None, # AWS doesn't strictly use RGs
                                "status": status,
                                "tags": tags_dict,
                                "payload": res
                            })
                except Exception as e:
                    # If index is missing or unauthorised in this specific region, we ignore it and continue.
                    logger.debug(f"AWS: Resource Explorer skip or fail for {region}: {e}")

                # Append any orphaned native resources that Resource Explorer missed in this region
                for orphaned_res in native_resources.values():
                    normalized_resources.append(orphaned_res)

        except Exception as e:
            logger.error(f"Error querying AWS regions: {e}")

        return normalized_resources

    def _extract_id(self, arn: str) -> str:
        """Parses AWS ARNs into shortened IDs (e.g. i-0abcd for instances)"""
        if "arn:" in arn:
            parts = arn.split(":")
            if len(parts) > 5:
                # E.g., arn:aws:ec2:us-east-1:123:instance/i-0abcd -> i-0abcd
                id_part = parts[-1]
                if "/" in id_part:
                    return id_part.split("/")[-1]
                return id_part
        return arn

    def _extract_name(self, resource_obj: Dict, tags: Dict) -> str:
        """Tries to extract a human-readable name, falling back to ID if necessary."""
        # Fallback names since ARNs are ugly
        if "Name" in tags:
            return tags["Name"]
        return self._extract_id(resource_obj.get("Arn", "Unknown AWS Resource"))
