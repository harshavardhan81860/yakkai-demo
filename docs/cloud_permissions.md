# Cloud Permissions Guide

This document outlines the permissions required for YakkAI to integrate with your AWS and Azure environments.

## AWS Permissions

To allow YakkAI to discover accounts and resources, you must create an IAM Role with a trust policy allowing the YakkAI instance or user to assume it.

**Required Actions (JSON Policy):**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sts:AssumeRole",
                "organizations:DescribeOrganization",
                "organizations:ListAccounts",
                "ec2:DescribeRegions",
                "ec2:DescribeInstances",
                "s3:ListAllMyBuckets",
                "ce:GetCostAndUsage"
            ],
            "Resource": "*"
        }
    ]
}
```

*   `sts:AssumeRole`: Required for cross-account access.
*   `organizations:*`: Required for discovering member accounts in an AWS Organization.
*   `ec2:*`, `s3:*`: Required for resource inventory (expand as needed for other services).
*   `ce:GetCostAndUsage`: Required for FinOps cost data retrieval.

## Azure Permissions

For Azure, YakkAI uses a Service Principal (App Registration).

**Required Roles:**

1.  **Reader**: Assign the `Reader` role to the Service Principal at the scope you wish to manage (Management Group, Subscription, or Resource Group). This allows discovery of resources.
2.  **Cost Management Reader** (or equivalent): Required for accessing cost data. Specifically, access to `Microsoft.CostManagement/query/action` is needed.

**Setup Steps:**

1.  Create an App Registration in Entra ID.
2.  Create a Client Secret.
3.  Go to the target Subscription or Management Group IAM.
4.  Add Role Assignment -> Select "Reader".
5.  Assign to the App Registration created in step 1.
