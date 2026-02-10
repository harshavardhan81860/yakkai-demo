import time
from typing import List, Dict, Any

import boto3
from botocore.exceptions import ClientError

from core.cloud_auth.auth_provider import cloud_auth_provider

# --------------------------------------------------
# Simple in-memory region cache (per account)
# --------------------------------------------------

_REGION_CACHE: Dict[str, Dict[str, Any]] = {}

REGION_TTL_SECONDS = 12 * 60 * 60   # 12 hours


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
# Helpers
# --------------------------------------------------

async def _get_ec2_client(account_id: str, region: str):
    creds = await cloud_auth_provider.get_credentials(account_id)

    return boto3.client(
        "ec2",
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
        region_name=region,
    )


async def _get_eks_client(account_id: str, region: str):
    creds = await cloud_auth_provider.get_credentials(account_id)

    return boto3.client(
        "eks",
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
        region_name=region,
    )



async def test_connection(cloud_account_id: str) -> dict:
    """
    Test AWS connection using given cloud account.
    Returns success/failure message.
    """
    try:
        creds = await cloud_auth_provider.get_credentials(cloud_account_id)

        ec2 = boto3.client(
            "ec2",
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
            region_name="us-east-1"
        )

        ec2.describe_regions()  # lightweight read-only call
        return {"status": "success", "message": "AWS connection successful"}

    except ClientError as e:
        return {"status": "failure", "message": f"AWS ClientError: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failure", "message": f"AWS connection failed: {str(e)}"}

# --------------------------------------------------
# Regions (cached)
# --------------------------------------------------

async def get_regions(account_id: str, refresh: bool = False) -> List[str]:

    if not refresh:
        cached = _get_cached_regions(account_id)
        if cached:
            return cached

    creds = await cloud_auth_provider.get_credentials(account_id)

    ec2 = boto3.client(
        "ec2",
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
        region_name="us-east-1",   # global call
    )

    response = ec2.describe_regions(AllRegions=True)

    regions = [
        r["RegionName"]
        for r in response["Regions"]
        if r.get("OptInStatus") in ("opt-in-not-required", "opted-in")
    ]

    regions.sort()

    _set_cached_regions(account_id, regions)

    return regions


# --------------------------------------------------
# EC2 Instances
# --------------------------------------------------

async def get_instances(account_id: str, region: str) -> List[Dict]:

    ec2 = await _get_ec2_client(account_id, region)

    paginator = ec2.get_paginator("describe_instances")

    results = []

    try:
        for page in paginator.paginate():
            for reservation in page.get("Reservations", []):
                for inst in reservation.get("Instances", []):

                    results.append({
                        "instance_id": inst["InstanceId"],
                        "state": inst["State"]["Name"],
                        "type": inst["InstanceType"],
                        "availability_zone": inst["Placement"]["AvailabilityZone"],
                        "private_ip": inst.get("PrivateIpAddress"),
                        "public_ip": inst.get("PublicIpAddress"),
                        "launch_time": inst["LaunchTime"].isoformat(),
                        "image_id": inst["ImageId"],
                    })

    except ClientError as e:
        raise RuntimeError(f"AWS EC2 error: {e.response['Error']['Message']}")

    return results


# --------------------------------------------------
# AMI Images
# --------------------------------------------------

async def get_images(account_id: str, region: str) -> List[Dict]:
    ec2 = await _get_ec2_client(account_id, region)

    try:
        # Only images owned by self or shared with me
        response = ec2.describe_images(
            Owners=["self"],
            ExecutableUsers=["self"]  # include images shared with this account
        )

        images = []

        for img in response.get("Images", []):
            images.append({
                "image_id": img["ImageId"],
                "name": img.get("Name"),
                "state": img.get("State"),
                "creation_date": img.get("CreationDate"),
                "architecture": img.get("Architecture"),
                "platform": img.get("PlatformDetails"),
            })

        # Sort by creation date (newest first) optionally
        images.sort(key=lambda x: x["creation_date"], reverse=True)

        return images

    except ClientError as e:
        raise RuntimeError(f"AWS AMI error: {e.response['Error']['Message']}")



# --------------------------------------------------
# EKS Clusters
# --------------------------------------------------

async def get_clusters(account_id: str, region: str) -> List[Dict]:

    eks = await _get_eks_client(account_id, region)

    clusters = []

    try:
        names = eks.list_clusters().get("clusters", [])

        for name in names:
            detail = eks.describe_cluster(name=name)["cluster"]

            clusters.append({
                "name": detail["name"],
                "status": detail["status"],
                "version": detail["version"],
                "endpoint": detail["endpoint"],
                "created_at": detail["createdAt"].isoformat(),
            })

        return clusters

    except ClientError as e:
        raise RuntimeError(f"AWS EKS error: {e.response['Error']['Message']}")


