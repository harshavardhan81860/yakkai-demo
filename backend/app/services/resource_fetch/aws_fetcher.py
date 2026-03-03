import boto3
from typing import List, Dict, Any

class AWSResourceFetcher:
    """
    Fetches resources from AWS using the AWS Resource Explorer 2 API.
    Provides a fast, unified search capability without needing to cycle 
    through 30+ regional or modular endpoints per service explicitly.
    Note: Requires an active Resource Explorer Index in the target account.
    """
    def __init__(self, region: str = "us-east-1"):
        # We initialize in the default region, 
        # but Resource Explorer inherently returns multi-region indexes if configured globally.
        self.client = boto3.client('resource-explorer-2', region_name=region)

    def fetch_resources(self) -> List[Dict[str, Any]]:
        """Executes a wildcard search across the indexed AWS Account."""
        normalized_resources = []
        paginator = self.client.get_paginator('search')
        
        # Searching purely by wildcard fetches everything indexed
        for page in paginator.paginate(QueryString="*"):
            for res in page.get("Resources", []):
                # Standardize tags
                tags_dict = {}
                # Resource Explorer doesn't always return full tag lists out of the box natively,
                # but usually provides them as Properties
                for prop in res.get("Properties", []):
                    if prop.get("Name") == "Tags":
                        # If tags exist as mapped properties
                        if isinstance(prop.get("Data"), dict):
                            tags_dict = prop.get("Data")

                normalized_resources.append({
                    "provider": "aws",
                    "resource_type": res.get("ResourceType", "unknown"),
                    "provider_resource_id": res.get("Arn", ""),
                    "name": self._extract_name(res, tags_dict),
                    "region": res.get("Region", ""),
                    "resource_group": None, # AWS doesn't strictly use RGs
                    "status": "running",
                    "tags": tags_dict,
                    "payload": res
                })

        return normalized_resources
        
    def _extract_name(self, resource_obj: Dict, tags: Dict) -> str:
        # Fallback names since ARNs are ugly
        if "Name" in tags:
            return tags["Name"]
        elif "arn:" in resource_obj.get("Arn", ""):
            parts = resource_obj["Arn"].split(":")
            if len(parts) > 5:
                # E.g., arn:aws:ec2:us-east-1:123:instance/i-0abcd -> i-0abcd
                id_part = parts[-1]
                if "/" in id_part:
                    return id_part.split("/")[-1]
                return id_part
        return resource_obj.get("Arn", "Unknown AWS Resource")
