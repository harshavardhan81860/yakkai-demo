export interface User {
    id: number;
    email: string;
    name: string;
    role: { id: number; name: string } | null;
    tenant_id: number | null;
    tenant_name: string | null;
    is_active?: boolean;
    created_at?: string;
    last_login?: string;
}

export interface CloudProvider {
    id: number;
    name: string;
    type: string;
    icon: string;
    is_active: boolean;
}

export interface CloudAccount {
    id: number;
    tenant_id: number | null;
    provider_id: number;
    provider_name: string | null;
    provider_type: string | null;
    account_name: string;
    account_identifier: string;
    region: string;
    metadata_json: any;
    is_active: boolean;
    status: string;
    monthly_cost: number;
    resource_count: number;
    last_synced: string | null;
    created_at: string | null;
}

export interface ResourceRequest {
    id: number;
    user_id: number;
    user_name: string | null;
    tenant_id: number | null;
    provider_id: number;
    provider_name: string | null;
    provider_type: string | null;
    cloud_account_id: number;
    cloud_account_name: string | null;
    resource_type: string;
    resource_category: string;
    config_json: any;
    status: string;
    estimated_cost: number;
    justification: string;
    expected_duration: string;
    created_at: string | null;
    updated_at: string | null;
    approvals: Approval[];
}

export interface Approval {
    id: number;
    request_id: number;
    approver_id: number;
    approver_name: string | null;
    approval_level: number;
    status: string;
    comments: string;
    approved_at: string | null;
    created_at: string | null;
    request?: Partial<ResourceRequest>;
}

export interface CatalogItem {
    id: number;
    provider_id: number;
    provider_name?: string;
    provider_type?: string;
    resource_type: string;
    resource_category: string;
    display_name: string;
    description: string;
    config_schema_json: any;
    is_active: boolean;
    request_count: number;
}

export interface DashboardStats {
    total_users: number;
    total_requests: number;
    total_resources: number;
    total_accounts: number;
    pending_approvals: number;
    active_resources: number;
    total_monthly_cost: number;
    providers_breakdown: Record<string, any>;
    category_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    recent_requests: any[];
    cost_trend: any[];
}

export interface Workflow {
    id: number;
    tenant_id: number | null;
    provider_id: number | null;
    resource_type: string | null;
    name: string;
    approval_chain_json: any[];
    cost_thresholds_json: any;
    is_active: boolean;
}

export interface Tenant {
    id: number;
    name: string;
    budget_limit: number;
    current_spend: number;
    multi_cloud_strategy_json: any;
}

export type ProviderType = 'aws' | 'azure' | 'gcp' | 'oci' | 'vmware';
