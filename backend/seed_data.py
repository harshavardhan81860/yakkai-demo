"""Seed database with demo data for all cloud providers."""
import random
from datetime import datetime, timedelta
from database import engine, SessionLocal, Base
from auth import get_password_hash
import models


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(models.Role).count() > 0:
        print("Database already seeded. Skipping.")
        db.close()
        return

    print("Seeding database...")

    # ─── Roles ──────────────────────────
    roles = [
        models.Role(id=1, name="admin", permissions_json=["*"]),
        models.Role(id=2, name="manager", permissions_json=["requests.*", "approvals.*", "statistics.*"]),
        models.Role(id=3, name="user", permissions_json=["requests.own", "statistics.own"]),
    ]
    db.add_all(roles)
    db.flush()

    # ─── Tenants ────────────────────────
    tenants = [
        models.Tenant(id=1, name="Acme Corporation", budget_limit=150000, current_spend=34200,
                       multi_cloud_strategy_json={"primary": "aws", "secondary": "azure", "compliance": ["GDPR", "SOC2"]}),
        models.Tenant(id=2, name="TechStart Inc", budget_limit=50000, current_spend=12800,
                       multi_cloud_strategy_json={"primary": "gcp", "secondary": "aws"}),
    ]
    db.add_all(tenants)
    db.flush()

    # ─── Users ──────────────────────────
    users = [
        models.User(id=1, email="admin@cloudplatform.io", name="Sarah Chen", hashed_password=get_password_hash("admin123"), role_id=1, tenant_id=1),
        models.User(id=2, email="manager@cloudplatform.io", name="James Wilson", hashed_password=get_password_hash("manager123"), role_id=2, tenant_id=1),
        models.User(id=3, email="user@cloudplatform.io", name="Emily Rodriguez", hashed_password=get_password_hash("user123"), role_id=3, tenant_id=1),
        models.User(id=4, email="dev@cloudplatform.io", name="Alex Kumar", hashed_password=get_password_hash("user123"), role_id=3, tenant_id=1),
        models.User(id=5, email="ops@cloudplatform.io", name="Michael Park", hashed_password=get_password_hash("user123"), role_id=3, tenant_id=2),
    ]
    db.add_all(users)
    db.flush()

    # ─── Cloud Providers ────────────────
    providers = [
        models.CloudProvider(id=1, name="Amazon Web Services", type="aws", icon="aws"),
        models.CloudProvider(id=2, name="Microsoft Azure", type="azure", icon="azure"),
        models.CloudProvider(id=3, name="Google Cloud Platform", type="gcp", icon="gcp"),
        models.CloudProvider(id=4, name="Oracle Cloud Infrastructure", type="oci", icon="oci"),
        models.CloudProvider(id=5, name="VMware (On-Premise)", type="vmware", icon="vmware"),
    ]
    db.add_all(providers)
    db.flush()

    # ─── Cloud Accounts ────────────────
    accounts = [
        models.CloudAccount(id=1, tenant_id=1, provider_id=1, account_name="AWS Production", account_identifier="123456789012", region="us-east-1", status="connected", monthly_cost=12500, resource_count=45, last_synced=datetime.utcnow()),
        models.CloudAccount(id=2, tenant_id=1, provider_id=1, account_name="AWS Development", account_identifier="234567890123", region="us-west-2", status="connected", monthly_cost=3200, resource_count=18, last_synced=datetime.utcnow()),
        models.CloudAccount(id=3, tenant_id=1, provider_id=2, account_name="Azure Enterprise", account_identifier="sub-abc-123-def-456", region="eastus", status="connected", monthly_cost=8400, resource_count=32, last_synced=datetime.utcnow()),
        models.CloudAccount(id=4, tenant_id=1, provider_id=3, account_name="GCP Analytics", account_identifier="project-analytics-prod", region="us-central1", status="connected", monthly_cost=5800, resource_count=22, last_synced=datetime.utcnow()),
        models.CloudAccount(id=5, tenant_id=1, provider_id=4, account_name="OCI Database", account_identifier="ocid1.tenancy.oc1..aaa", region="us-ashburn-1", status="connected", monthly_cost=3500, resource_count=8, last_synced=datetime.utcnow()),
        models.CloudAccount(id=6, tenant_id=1, provider_id=5, account_name="VMware DC-1", account_identifier="vcenter.dc1.local", region="datacenter-1", status="connected", monthly_cost=4500, resource_count=15, last_synced=datetime.utcnow()),
        models.CloudAccount(id=7, tenant_id=2, provider_id=3, account_name="GCP Startup", account_identifier="project-techstart", region="us-east1", status="connected", monthly_cost=6200, resource_count=25, last_synced=datetime.utcnow()),
        models.CloudAccount(id=8, tenant_id=2, provider_id=1, account_name="AWS Staging", account_identifier="345678901234", region="eu-west-1", status="warning", monthly_cost=2100, resource_count=10, last_synced=datetime.utcnow() - timedelta(hours=6)),
    ]
    db.add_all(accounts)
    db.flush()

    # ─── Resource Catalog ───────────────
    catalog_items = [
        # AWS
        models.ResourceCatalog(provider_id=1, resource_type="EC2", resource_category="compute", display_name="EC2 Instance", description="Scalable virtual servers in the cloud", request_count=128,
            config_schema_json={"fields": [
                {"name": "instanceType", "type": "select", "label": "Instance Type", "required": True, "options": ["t3.micro","t3.small","t3.medium","t3.large","m5.large","m5.xlarge","c5.large","r5.large"]},
                {"name": "ami", "type": "text", "label": "AMI ID", "required": True, "placeholder": "ami-0abcdef1234567890"},
                {"name": "volumeSize", "type": "number", "label": "Root Volume (GB)", "required": True, "min": 8, "max": 1000, "default": 20},
                {"name": "name", "type": "text", "label": "Instance Name", "required": True},
            ]}),
        models.ResourceCatalog(provider_id=1, resource_type="RDS", resource_category="data", display_name="RDS Database", description="Managed relational database service", request_count=45,
            config_schema_json={"fields": [
                {"name": "engine", "type": "select", "label": "Engine", "required": True, "options": ["postgresql","mysql","mariadb","oracle-ee","sqlserver-ee"]},
                {"name": "instanceClass", "type": "select", "label": "Instance Class", "required": True, "options": ["db.t3.micro","db.t3.small","db.t3.medium","db.r5.large","db.r5.xlarge"]},
                {"name": "storage", "type": "number", "label": "Storage (GB)", "required": True, "min": 20, "max": 16384, "default": 100},
                {"name": "name", "type": "text", "label": "DB Identifier", "required": True},
            ]}),
        models.ResourceCatalog(provider_id=1, resource_type="S3", resource_category="storage", display_name="S3 Bucket", description="Object storage with industry-leading scalability", request_count=89,
            config_schema_json={"fields": [
                {"name": "name", "type": "text", "label": "Bucket Name", "required": True},
                {"name": "versioning", "type": "select", "label": "Versioning", "options": ["Enabled","Disabled"], "default": "Disabled"},
                {"name": "accessLevel", "type": "select", "label": "Access", "options": ["Private","Public Read"], "default": "Private"},
            ]}),
        models.ResourceCatalog(provider_id=1, resource_type="VPC", resource_category="network", display_name="VPC Network", description="Isolated virtual network", request_count=34,
            config_schema_json={"fields": [
                {"name": "cidrBlock", "type": "text", "label": "CIDR Block", "required": True, "default": "10.0.0.0/16"},
                {"name": "name", "type": "text", "label": "VPC Name", "required": True},
            ]}),
        models.ResourceCatalog(provider_id=1, resource_type="Lambda", resource_category="compute", display_name="Lambda Function", description="Serverless compute service", request_count=67,
            config_schema_json={"fields": [
                {"name": "runtime", "type": "select", "label": "Runtime", "required": True, "options": ["python3.12","nodejs20.x","java21","go1.x","dotnet8"]},
                {"name": "memory", "type": "number", "label": "Memory (MB)", "min": 128, "max": 10240, "default": 256},
                {"name": "name", "type": "text", "label": "Function Name", "required": True},
            ]}),
        # Azure
        models.ResourceCatalog(provider_id=2, resource_type="Virtual Machine", resource_category="compute", display_name="Virtual Machine", description="Create Linux and Windows VMs in seconds", request_count=98,
            config_schema_json={"fields": [
                {"name": "vmSize", "type": "select", "label": "VM Size", "required": True, "options": ["Standard_B2s","Standard_B4ms","Standard_D2s_v3","Standard_D4s_v3","Standard_E2s_v3","Standard_F4s_v2"]},
                {"name": "osImage", "type": "select", "label": "OS Image", "required": True, "options": ["Ubuntu 22.04","Ubuntu 20.04","Windows Server 2022","Windows Server 2019","Red Hat 9","SUSE 15"]},
                {"name": "diskType", "type": "select", "label": "Disk Type", "options": ["Standard SSD","Premium SSD","Standard HDD"], "default": "Standard SSD"},
                {"name": "name", "type": "text", "label": "VM Name", "required": True},
            ]}),
        models.ResourceCatalog(provider_id=2, resource_type="SQL Database", resource_category="data", display_name="Azure SQL Database", description="Managed SQL database built for the cloud", request_count=42,
            config_schema_json={"fields": [
                {"name": "tier", "type": "select", "label": "Service Tier", "required": True, "options": ["Basic","Standard","Premium","General Purpose","Business Critical"]},
                {"name": "maxSizeGB", "type": "number", "label": "Max Size (GB)", "min": 1, "max": 4096, "default": 32},
                {"name": "name", "type": "text", "label": "Database Name", "required": True},
            ]}),
        models.ResourceCatalog(provider_id=2, resource_type="Blob Storage", resource_category="storage", display_name="Blob Storage", description="Massively scalable object storage", request_count=56,
            config_schema_json={"fields": [
                {"name": "accessTier", "type": "select", "label": "Access Tier", "options": ["Hot","Cool","Archive"], "default": "Hot"},
                {"name": "replication", "type": "select", "label": "Replication", "options": ["LRS","ZRS","GRS","RA-GRS"], "default": "LRS"},
                {"name": "name", "type": "text", "label": "Storage Account Name", "required": True},
            ]}),
        # GCP
        models.ResourceCatalog(provider_id=3, resource_type="Compute Engine", resource_category="compute", display_name="Compute Engine VM", description="Virtual machines running on Google's infrastructure", request_count=76,
            config_schema_json={"fields": [
                {"name": "machineType", "type": "select", "label": "Machine Type", "required": True, "options": ["e2-micro","e2-small","e2-medium","n1-standard-1","n1-standard-2","n1-standard-4","n2-standard-2"]},
                {"name": "image", "type": "select", "label": "Boot Image", "required": True, "options": ["debian-12","ubuntu-2204","ubuntu-2004","centos-stream-9","rocky-linux-9","windows-2022"]},
                {"name": "diskSizeGb", "type": "number", "label": "Boot Disk Size (GB)", "min": 10, "max": 2048, "default": 20},
                {"name": "name", "type": "text", "label": "Instance Name", "required": True},
            ]}),
        models.ResourceCatalog(provider_id=3, resource_type="Cloud SQL", resource_category="data", display_name="Cloud SQL", description="Fully managed relational database service", request_count=38,
            config_schema_json={"fields": [
                {"name": "databaseVersion", "type": "select", "label": "Database Version", "required": True, "options": ["POSTGRES_15","POSTGRES_14","MYSQL_8_0","MYSQL_5_7","SQLSERVER_2019_STANDARD"]},
                {"name": "tier", "type": "select", "label": "Machine Type", "options": ["db-f1-micro","db-g1-small","db-custom-2-7680","db-custom-4-15360"]},
                {"name": "name", "type": "text", "label": "Instance Name", "required": True},
            ]}),
        models.ResourceCatalog(provider_id=3, resource_type="Cloud Storage", resource_category="storage", display_name="Cloud Storage Bucket", description="Object storage for companies of all sizes", request_count=65,
            config_schema_json={"fields": [
                {"name": "storageClass", "type": "select", "label": "Storage Class", "options": ["STANDARD","NEARLINE","COLDLINE","ARCHIVE"], "default": "STANDARD"},
                {"name": "location", "type": "select", "label": "Location", "options": ["US","EU","ASIA","us-central1","europe-west1"]},
                {"name": "name", "type": "text", "label": "Bucket Name", "required": True},
            ]}),
        # OCI
        models.ResourceCatalog(provider_id=4, resource_type="Compute Instance", resource_category="compute", display_name="Compute Instance", description="Bare metal and VM instances", request_count=32,
            config_schema_json={"fields": [
                {"name": "shape", "type": "select", "label": "Shape", "required": True, "options": ["VM.Standard2.1","VM.Standard2.2","VM.Standard2.4","VM.Standard.E4.Flex","VM.Standard.A1.Flex"]},
                {"name": "image", "type": "select", "label": "Image", "required": True, "options": ["Oracle Linux 9","Oracle Linux 8","Ubuntu 22.04","CentOS Stream 9"]},
                {"name": "bootVolumeSizeGB", "type": "number", "label": "Boot Volume (GB)", "min": 47, "max": 32768, "default": 50},
                {"name": "name", "type": "text", "label": "Instance Name", "required": True},
            ]}),
        models.ResourceCatalog(provider_id=4, resource_type="Autonomous Database", resource_category="data", display_name="Autonomous Database", description="Self-driving, self-securing, self-repairing database", request_count=18,
            config_schema_json={"fields": [
                {"name": "dbWorkload", "type": "select", "label": "Workload Type", "required": True, "options": ["OLTP","DW","AJD","APEX"]},
                {"name": "cpuCoreCount", "type": "number", "label": "CPU Cores", "min": 1, "max": 128, "default": 1},
                {"name": "dataStorageSizeInTBs", "type": "number", "label": "Storage (TB)", "min": 1, "max": 128, "default": 1},
                {"name": "name", "type": "text", "label": "Database Name", "required": True},
            ]}),
        # VMware
        models.ResourceCatalog(provider_id=5, resource_type="Virtual Machine", resource_category="compute", display_name="VMware VM", description="Virtual machine on vSphere infrastructure", request_count=55,
            config_schema_json={"fields": [
                {"name": "cpu", "type": "number", "label": "vCPUs", "required": True, "min": 1, "max": 64, "default": 2},
                {"name": "memory", "type": "number", "label": "Memory (GB)", "required": True, "min": 1, "max": 256, "default": 4},
                {"name": "diskSize", "type": "number", "label": "Disk Size (GB)", "required": True, "min": 20, "max": 4096, "default": 50},
                {"name": "template", "type": "select", "label": "Template", "options": ["Ubuntu 22.04","CentOS 9","Windows 2022","RHEL 9","Custom"]},
                {"name": "name", "type": "text", "label": "VM Name", "required": True},
            ]}),
    ]
    db.add_all(catalog_items)
    db.flush()

    # ─── Resource Requests ──────────────
    request_data = [
        (3, 1, 1, "EC2", "compute", {"instanceType":"t3.large","ami":"ami-0abcdef1234567890","volumeSize":50,"name":"web-prod-01"}, "active", 89.50, "Production web server for Q1 launch"),
        (3, 1, 2, "EC2", "compute", {"instanceType":"t3.small","ami":"ami-0abcdef1234567890","volumeSize":20,"name":"dev-api-01"}, "active", 15.18, "Development API server"),
        (4, 2, 3, "Virtual Machine", "compute", {"vmSize":"Standard_D2s_v3","osImage":"Ubuntu 22.04","name":"analytics-vm"}, "active", 72.00, "Data analytics workstation"),
        (3, 3, 4, "Compute Engine", "compute", {"machineType":"n1-standard-2","image":"ubuntu-2204","name":"ml-training"}, "active", 65.50, "ML model training instance"),
        (5, 4, 5, "Compute Instance", "compute", {"shape":"VM.Standard2.2","image":"Oracle Linux 9","name":"db-backend"}, "active", 48.20, "Database backend server"),
        (3, 5, 6, "Virtual Machine", "compute", {"cpu":4,"memory":8,"diskSize":100,"template":"Ubuntu 22.04","name":"jenkins-ci"}, "active", 35.00, "CI/CD Jenkins server"),
        (3, 1, 1, "RDS", "data", {"engine":"postgresql","instanceClass":"db.r5.large","storage":200,"name":"prod-db"}, "active", 245.00, "Production PostgreSQL database"),
        (4, 2, 3, "SQL Database", "data", {"tier":"General Purpose","maxSizeGB":64,"name":"reporting-db"}, "active", 155.00, "Reporting data warehouse"),
        (3, 1, 1, "S3", "storage", {"name":"assets-bucket","versioning":"Enabled","accessLevel":"Private"}, "active", 12.50, "Static assets storage"),
        (3, 3, 7, "Cloud Storage", "storage", {"storageClass":"STANDARD","location":"US","name":"data-lake-raw"}, "active", 28.00, "Raw data lake storage"),
        # Pending requests
        (3, 1, 1, "EC2", "compute", {"instanceType":"m5.xlarge","ami":"ami-0fedcba987654321","volumeSize":100,"name":"batch-worker-01"}, "pending_approval", 196.00, "Batch processing worker for nightly jobs"),
        (4, 2, 3, "Virtual Machine", "compute", {"vmSize":"Standard_E2s_v3","osImage":"Windows Server 2022","name":"sql-reporting"}, "pending_approval", 130.00, "SQL Server reporting instance"),
        (5, 3, 4, "Compute Engine", "compute", {"machineType":"n1-standard-4","image":"debian-12","name":"etl-processor"}, "pending_approval", 142.00, "ETL data pipeline processor"),
        (3, 4, 5, "Autonomous Database", "data", {"dbWorkload":"DW","cpuCoreCount":4,"dataStorageSizeInTBs":2,"name":"analytics-dw"}, "pending_approval", 820.00, "Analytics data warehouse"),
        # Recently approved
        (3, 1, 2, "Lambda", "compute", {"runtime":"python3.12","memory":512,"name":"image-resizer"}, "approved", 5.00, "Image processing function"),
        # Rejected
        (4, 1, 1, "EC2", "compute", {"instanceType":"p3.2xlarge","ami":"ami-0gpu123","volumeSize":200,"name":"gpu-training"}, "rejected", 2450.00, "GPU instance for ML training"),
        # Provisioning
        (3, 5, 6, "Virtual Machine", "compute", {"cpu":8,"memory":16,"diskSize":200,"template":"CentOS 9","name":"kafka-broker"}, "provisioning", 65.00, "Kafka message broker"),
    ]

    for i, (uid, pid, aid, rtype, rcat, config, status, cost, justification) in enumerate(request_data, 1):
        rr = models.ResourceRequest(
            id=i, user_id=uid, tenant_id=1, provider_id=pid, cloud_account_id=aid,
            resource_type=rtype, resource_category=rcat, config_json=config,
            status=status, estimated_cost=cost, justification=justification,
            expected_duration="6 months",
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60)),
        )
        db.add(rr)
    db.flush()

    # ─── Approvals ──────────────────────
    # Pending approvals for pending requests
    for req_id in [11, 12, 13, 14]:
        db.add(models.Approval(request_id=req_id, approver_id=2, approval_level=1, status="pending"))
    # Approved
    for req_id in range(1, 11):
        db.add(models.Approval(request_id=req_id, approver_id=2, approval_level=1, status="approved", comments="Approved. Meets requirements.", approved_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))))
    db.add(models.Approval(request_id=15, approver_id=2, approval_level=1, status="approved", comments="Low-cost serverless function, auto-approved.", approved_at=datetime.utcnow() - timedelta(days=2)))
    # Rejected
    db.add(models.Approval(request_id=16, approver_id=2, approval_level=1, status="rejected", comments="GPU instance too expensive. Use shared cluster instead.", approved_at=datetime.utcnow() - timedelta(days=5)))
    db.flush()

    # ─── Provisioned Resources ──────────
    prov_resources = [
        (1, 1, "aws", "EC2", "compute", "web-prod-01", "i-0abc123def456789", 89.50, "us-east-1"),
        (2, 2, "aws", "EC2", "compute", "dev-api-01", "i-0def456ghi789012", 15.18, "us-west-2"),
        (3, 3, "azure", "Virtual Machine", "compute", "analytics-vm", "vm-analytics-eastus", 72.00, "eastus"),
        (4, 4, "gcp", "Compute Engine", "compute", "ml-training", "ml-training-us-c1", 65.50, "us-central1"),
        (5, 5, "oci", "Compute Instance", "compute", "db-backend", "ocid1.instance.oc1.iad.aaa", 48.20, "us-ashburn-1"),
        (6, 6, "vmware", "Virtual Machine", "compute", "jenkins-ci", "vm-jenkins-dc1-001", 35.00, "datacenter-1"),
        (7, 1, "aws", "RDS", "data", "prod-db", "prod-db.abc123.us-east-1.rds.amazonaws.com", 245.00, "us-east-1"),
        (8, 3, "azure", "SQL Database", "data", "reporting-db", "reporting-db-server.database.windows.net", 155.00, "eastus"),
        (9, 1, "aws", "S3", "storage", "assets-bucket", "assets-bucket", 12.50, "us-east-1"),
        (10, 7, "gcp", "Cloud Storage", "storage", "data-lake-raw", "data-lake-raw", 28.00, "us-central1"),
        # Some extra resources
        (None, 1, "aws", "VPC", "network", "prod-vpc", "vpc-0abc123", 0, "us-east-1"),
        (None, 3, "azure", "Virtual Network", "network", "corp-vnet", "vnet-corp-eastus", 0, "eastus"),
        (None, 4, "gcp", "VPC", "network", "analytics-vpc", "analytics-vpc", 0, "us-central1"),
        (None, 6, "vmware", "vSwitch", "network", "mgmt-switch", "vswitch-mgmt-001", 0, "datacenter-1"),
        (None, 1, "aws", "EBS", "storage", "data-volume", "vol-0abc123456", 8.50, "us-east-1"),
    ]

    for i, (req_id, acct_id, ptype, rtype, rcat, rname, rid, cost, region) in enumerate(prov_resources, 1):
        pr = models.ProvisionedResource(
            id=i, request_id=req_id, cloud_account_id=acct_id,
            provider_type=ptype, resource_type=rtype, resource_category=rcat,
            resource_name=rname, resource_identifier=rid,
            actual_cost=cost, status="active", region=region,
            provisioned_at=datetime.utcnow() - timedelta(days=random.randint(5, 90)),
        )
        db.add(pr)
    db.flush()

    # ─── Approval Workflows ────────────
    workflows = [
        models.ApprovalWorkflow(name="AWS Default Workflow", provider_id=1, resource_type="*",
            approval_chain_json=[{"level": 1, "role": "manager", "auto_approve_under": 100}, {"level": 2, "role": "admin", "required_above": 1000}],
            cost_thresholds_json={"auto_approve": 100, "manager_approve": 1000, "director_approve": 5000}),
        models.ApprovalWorkflow(name="Azure Compute Workflow", provider_id=2, resource_type="Virtual Machine",
            approval_chain_json=[{"level": 1, "role": "manager"}, {"level": 2, "role": "admin", "required_above": 500}],
            cost_thresholds_json={"manager_approve": 500, "director_approve": 2000}),
        models.ApprovalWorkflow(name="VMware Capacity Check", provider_id=5, resource_type="Virtual Machine",
            approval_chain_json=[{"level": 1, "role": "manager", "requires_capacity_check": True}],
            cost_thresholds_json={"always_review": True}),
    ]
    db.add_all(workflows)

    # ─── Cost Rates ─────────────────────
    rates = [
        models.CostRate(provider_type="aws", resource_type="ec2_t3.micro", region="us-east-1", rate_per_hour=0.0104),
        models.CostRate(provider_type="aws", resource_type="ec2_t3.small", region="us-east-1", rate_per_hour=0.0208),
        models.CostRate(provider_type="aws", resource_type="ec2_t3.medium", region="us-east-1", rate_per_hour=0.0416),
        models.CostRate(provider_type="aws", resource_type="ec2_t3.large", region="us-east-1", rate_per_hour=0.0832),
        models.CostRate(provider_type="aws", resource_type="ec2_m5.large", region="us-east-1", rate_per_hour=0.096),
        models.CostRate(provider_type="aws", resource_type="s3", region="us-east-1", rate_per_gb=0.023),
        models.CostRate(provider_type="azure", resource_type="vm_Standard_B2s", region="eastus", rate_per_hour=0.0416),
        models.CostRate(provider_type="azure", resource_type="vm_Standard_D2s_v3", region="eastus", rate_per_hour=0.096),
        models.CostRate(provider_type="gcp", resource_type="ce_e2-micro", region="us-central1", rate_per_hour=0.0084),
        models.CostRate(provider_type="gcp", resource_type="ce_e2-medium", region="us-central1", rate_per_hour=0.0335),
        models.CostRate(provider_type="oci", resource_type="vm_Standard2.1", region="us-ashburn-1", rate_per_hour=0.0638),
        models.CostRate(provider_type="vmware", resource_type="vm_per_cpu", region="datacenter-1", rate_per_hour=0.05),
    ]
    db.add_all(rates)

    db.commit()
    db.close()
    print("Database seeded successfully!")


if __name__ == "__main__":
    seed()
