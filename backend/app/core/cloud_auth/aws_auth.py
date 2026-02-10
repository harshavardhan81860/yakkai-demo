import boto3
from typing import Dict
from datetime import datetime


def assume_aws_role_with_oidc(
    role_name: str,
    account_id: str,
    oidc_token: str,
    session_name: str = "cloud-selfservice-session"
) -> Dict:
    """
    Uses AWS STS AssumeRoleWithWebIdentity to get temporary credentials.

    Returns dict containing:
        AccessKeyId
        SecretAccessKey
        SessionToken
        Expiration (datetime)
    """

    role_arn = f"arn:aws:iam::{account_id}:role/{role_name}"

    sts = boto3.client("sts")

    response = sts.assume_role_with_web_identity(
        RoleArn=role_arn,
        RoleSessionName=session_name,
        WebIdentityToken=oidc_token,
        DurationSeconds=3600  # AWS max depends on role config
    )

    creds = response["Credentials"]

    return {
        "AccessKeyId": creds["AccessKeyId"],
        "SecretAccessKey": creds["SecretAccessKey"],
        "SessionToken": creds["SessionToken"],
        "Expiration": creds["Expiration"],  # datetime object
    }
