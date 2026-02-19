// src/services/cloudDiscoveryService.ts
// Service for on-boarding cloud accounts via the Discovery flow.
// ── MVP TEST MODE: test_mode flag generates dummy data server-side ──

import api from "./api";

/* ── Types ── */

export interface AWSCredentials {
    account_id: string;
    role_name: string;
    external_id?: string;
}

export interface AzureCredentials {
    tenant_id: string;
    client_id: string;
    client_secret: string;
    subscription_id?: string;
}

export interface DiscoveredAccount {
    account_id?: string;
    subscription_id?: string;
    management_group_id?: string;
    organizational_unit_id?: string;
    name: string;
    type?: string;
    account_type?: string;
    status?: string;
    email?: string;
    ou_path?: string;
    parent_id?: string;
    allows_resources?: boolean;
    already_imported: boolean;
}

export interface DiscoveryResult {
    status: string;
    message: string;
    cloud_provider: string;
    is_organization: boolean;
    organization_id?: string;
    management_account_id?: string;
    management_account_name?: string;
    account_type: string;
    discovered_accounts: DiscoveredAccount[];
    total_discovered: number;
    already_imported_count: number;
    new_accounts_count: number;
}

export interface ImportResult {
    status: string;
    message: string;
    accounts_created: number;
    accounts_skipped: number;
    accounts_failed: number;
    created_account_ids: string[];
}

/* ── API calls ── */

export const discoverCloudAccount = async (
    tenantId: string,
    provider: string,
    awsCreds?: AWSCredentials,
    azureCreds?: AzureCredentials,
    testMode: boolean = false
): Promise<DiscoveryResult> => {
    const res = await api.post(
        `api/v1/cloud-discovery/discover?tenant_id=${tenantId}`,
        {
            cloud_provider: provider,
            aws_credentials: provider === "aws" ? awsCreds : undefined,
            azure_credentials: provider === "azure" ? azureCreds : undefined,
            test_mode: testMode,
        }
    );
    return res.data?.data;
};

export const importDiscoveredAccounts = async (
    tenantId: string,
    provider: string,
    importMode: string,
    selectedAccountIds: string[],
    awsCreds?: AWSCredentials,
    azureCreds?: AzureCredentials,
    testMode: boolean = false
): Promise<ImportResult> => {
    const res = await api.post(`api/v1/cloud-discovery/import`, {
        tenant_id: tenantId,
        cloud_provider: provider,
        import_mode: importMode,
        selected_account_ids: selectedAccountIds,
        aws_credentials: provider === "aws" ? awsCreds : undefined,
        azure_credentials: provider === "azure" ? azureCreds : undefined,
        test_mode: testMode,
    });
    return res.data?.data;
};
export const discoverNewAccounts = async (
    accountId: string,
    testMode: boolean = false
): Promise<DiscoveryResult> => {
    const res = await api.post(`api/v1/cloud-discovery/${accountId}/discover-new`, {
        test_mode: testMode
    });
    return res.data?.data;
};

export const importIncrementalAccounts = async (
    accountId: string,
    selectedAccounts: DiscoveredAccount[],
    testMode: boolean = false
): Promise<ImportResult> => {
    const res = await api.post(`api/v1/cloud-discovery/${accountId}/import-new`, {
        selected_accounts: selectedAccounts,
        test_mode: testMode
    });
    return res.data?.data;
};

export const testConnection = async (
    accountId: string,
    provider: string,
    testMode: boolean = false,
    testType: string = "read"
): Promise<any> => {
    // Endpoints as requested by user:
    // AWS: GET /api/v1/aws/test_connection/{id}
    // Azure: GET /api/v1/azure/test_connection/{id}
    const slug = provider.toLowerCase();
    const res = await api.get(
        `api/v1/${slug}/test_connection/${accountId}?test_type=${testType}&test_mode=${testMode}`
    );
    return res.data;
};
