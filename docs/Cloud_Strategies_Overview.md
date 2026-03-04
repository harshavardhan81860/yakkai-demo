# YakkAI Cloud Strategies Overview

This document outlines the core architectural and implementation strategies utilized across the YakkAI platform to manage, ingest, and monetize multi-cloud assets.

---

## 1. Cloud Accounts Storing Strategy
The system uses a strictly centralized, inherited hierarchy mapping defined by standard Enterprise Multi-Cloud architecture constraints.

* **Tenant (Root)**: Represents the absolute top-level customer boundary (e.g., A globally authenticated root tenant). All downstream cloud accounts strictly inherit the `tenant_id` from their parent.
* **Cloud Accounts (Children)**: Represent billing and logical isolation boundaries (AWS Master/Child Accounts, Azure Subscriptions).
* **Inherited Association**: By enforcing all resources and FinOps costs to carry both `cloud_account_id` and an immutable `tenant_id`, the system allows for trivial global lookups. (e.g., Querying "Show me all EC2 instances and costs across every AWS and Azure sub-account belonging to Tenant X" requires zero deep JOIN operations).

## 2. Resource Fetching Strategy
Due to the constraints of massive scale and API throttling, the system utilizes a **Hybrid (Global Index + Native Fallback)** approach for extracting resources.

### The "Global First" Approach
Instead of hard-coding 140+ individual Boto3 resource fetchers, the system leverages Global Organizational APIs (e.g., *AWS Resource Explorer 2* and *Azure Resource Graph*).
These robust global queries return a shallow but massive list of almost every resource, tag, and ARN dynamically without hitting specialized rate limits.

### The "Native Fallback" Injection
Global indexes are "Eventually Consistent" and generally do not hold accurate `status` properties for volatile resources. Therefore, before the Global search completes, we execute specific "Native" queries (e.g. AWS `boto3.client('ec2')`) targeting top-tier monetized resources—like EC2 Instances, AMIs, and EKS Clusters.
When the Global search finishes mapping the environment, if any volatile Native resources were missed by the Global Index due to lag, they are forcefully appended to the database to guarantee zero data loss.

## 3. FinOps Fetching Strategy 
Cost ingestion is handled entirely asynchronously out-of-band to guarantee frontend interface speed and stability.

* **Decoupled Cron Ingestion**: Cost fetching (via AWS Cost Explorer or Azure Cost Management) is triggered asynchronously. Costs are retrieved utilizing the exact native Amortized models to ensure upfront reserves and savings plans are distributed smoothly.
* **Storage via Daily Aggregation**: Costs are stored in the database cleanly under the `DailyCost` entity. Each row uniquely represents exactly 1 Day of costs tied directly to a `provider_resource_id`.
* **Zero-Latency Left-Join Presentation**: During presentation, the `CloudResourceService` triggers an incredibly fast SQL `LEFT OUTER JOIN`. It dynamically maps the underlying temporal `DailyCost` rows onto the static `CloudResource` inventory—summing dynamic Month-to-Date (MTD) columns in real-time before releasing the JSON to the frontend.
