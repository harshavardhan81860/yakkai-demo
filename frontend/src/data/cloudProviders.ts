import { ProviderType } from '../types';

export const CLOUD_PROVIDERS: Record<string, { name: string; color: string; gradient: string; icon: string; regions: string[]; categories: Record<string, string[]> }> = {
    aws: {
        name: 'Amazon Web Services',
        color: '#FF9900',
        gradient: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)',
        icon: '☁️',
        regions: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
        categories: {
            compute: ['EC2', 'Lambda', 'ECS', 'EKS', 'Lightsail'],
            network: ['VPC', 'ELB', 'ALB', 'NLB', 'Route53', 'CloudFront', 'VPN'],
            data: ['RDS', 'DynamoDB', 'Redshift', 'ElastiCache', 'DocumentDB'],
            storage: ['S3', 'EBS', 'EFS', 'FSx', 'Glacier'],
            security: ['IAM', 'KMS', 'Secrets Manager', 'WAF', 'Shield'],
            other: ['CloudWatch', 'SNS', 'SQS', 'EventBridge'],
        },
    },
    azure: {
        name: 'Microsoft Azure',
        color: '#0078D4',
        gradient: 'linear-gradient(135deg, #0078D4 0%, #50A0F0 100%)',
        icon: '🔷',
        regions: ['eastus', 'eastus2', 'westus', 'westus2', 'westeurope', 'northeurope', 'southeastasia', 'centralus'],
        categories: {
            compute: ['Virtual Machines', 'App Service', 'Functions', 'AKS', 'Container Instances'],
            network: ['Virtual Network', 'Load Balancer', 'Application Gateway', 'VPN Gateway', 'CDN'],
            data: ['SQL Database', 'Cosmos DB', 'MySQL', 'PostgreSQL', 'Redis Cache'],
            storage: ['Blob Storage', 'Disk Storage', 'File Storage', 'Data Lake'],
            security: ['Key Vault', 'Security Center', 'Firewall', 'DDoS Protection'],
            other: ['Monitor', 'Event Grid', 'Service Bus', 'Logic Apps'],
        },
    },
    gcp: {
        name: 'Google Cloud Platform',
        color: '#4285F4',
        gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC05 100%)',
        icon: '🔵',
        regions: ['us-central1', 'us-east1', 'us-west1', 'europe-west1', 'europe-west2', 'asia-east1', 'asia-southeast1'],
        categories: {
            compute: ['Compute Engine', 'Cloud Functions', 'App Engine', 'GKE', 'Cloud Run'],
            network: ['VPC', 'Cloud Load Balancing', 'Cloud CDN', 'Cloud VPN', 'Cloud DNS'],
            data: ['Cloud SQL', 'Firestore', 'Bigtable', 'Spanner', 'Memorystore'],
            storage: ['Cloud Storage', 'Persistent Disk', 'Filestore'],
            security: ['IAM', 'Secret Manager', 'Cloud KMS', 'Cloud Armor'],
            other: ['Cloud Monitoring', 'Pub/Sub', 'Cloud Scheduler'],
        },
    },
    oci: {
        name: 'Oracle Cloud Infrastructure',
        color: '#F80000',
        gradient: 'linear-gradient(135deg, #F80000 0%, #FF4444 100%)',
        icon: '🔴',
        regions: ['us-ashburn-1', 'us-phoenix-1', 'eu-frankfurt-1', 'eu-amsterdam-1', 'uk-london-1', 'ap-mumbai-1', 'ap-tokyo-1'],
        categories: {
            compute: ['Compute Instances', 'Container Engine', 'Functions', 'VM Instances'],
            network: ['VCN', 'Load Balancer', 'FastConnect', 'VPN', 'DNS'],
            data: ['Autonomous Database', 'MySQL', 'NoSQL', 'Database Cloud Service'],
            storage: ['Object Storage', 'Block Volume', 'File Storage', 'Archive Storage'],
            security: ['IAM', 'Vault', 'WAF', 'Cloud Guard'],
            other: ['Monitoring', 'Notifications', 'Events', 'Streaming'],
        },
    },
    vmware: {
        name: 'VMware (On-Premise)',
        color: '#717074',
        gradient: 'linear-gradient(135deg, #717074 0%, #9B9B9F 100%)',
        icon: '🖥️',
        regions: ['datacenter-1', 'datacenter-2', 'datacenter-3'],
        categories: {
            compute: ['Virtual Machine', 'vApp', 'Container'],
            network: ['vSwitch', 'Distributed Port Group', 'NSX Edge', 'Load Balancer'],
            data: ['vSAN Datastore', 'NFS Datastore'],
            storage: ['VMDK', 'NFS Mount', 'iSCSI LUN'],
            security: ['NSX Firewall', 'Distributed Firewall', 'VPN'],
            other: ['vRealize', 'vCenter Tags', 'Resource Pool'],
        },
    },
};

export const getProviderColor = (type: string): string => CLOUD_PROVIDERS[type]?.color || '#666';
export const getProviderName = (type: string): string => CLOUD_PROVIDERS[type]?.name || type;
export const getProviderIcon = (type: string): string => CLOUD_PROVIDERS[type]?.icon || '☁️';

export const RESOURCE_CATEGORIES = ['compute', 'network', 'data', 'storage', 'security', 'other'];
export const CATEGORY_ICONS: Record<string, string> = {
    compute: '🖥️', network: '🌐', data: '🗄️', storage: '💾', security: '🔒', other: '⚙️',
};

export const STATUS_COLORS: Record<string, string> = {
    draft: '#9E9E9E',
    pending_approval: '#FF9800',
    approved: '#2196F3',
    provisioning: '#9C27B0',
    active: '#4CAF50',
    rejected: '#F44336',
    failed: '#F44336',
    connected: '#4CAF50',
    disconnected: '#F44336',
    warning: '#FF9800',
    error: '#F44336',
    stopped: '#FF9800',
    terminated: '#9E9E9E',
    pending: '#FF9800',
};

export const getStatusLabel = (status: string): string =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
