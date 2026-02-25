import api from '../services/api';

export interface FinOpsJob {
    id: string;
    account_name?: string; // Present on tenant-level queries
    start_date: string;
    end_date: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    created_at?: string;
    started_at?: string;
    completed_at?: string;
    error_log?: string;
}

export const finopsApi = {
    // History Read Endpoints
    getAccountSyncJobs: async (accountId: string, limit: number = 20): Promise<FinOpsJob[]> => {
        const response = await api.get(`/api/v1/finops/jobs/account/${accountId}?limit=${limit}`);
        return response.data.data;
    },

    getTenantSyncJobs: async (tenantId: string, limit: number = 30): Promise<FinOpsJob[]> => {
        const response = await api.get(`/api/v1/finops/jobs/tenant/${tenantId}?limit=${limit}`);
        return response.data.data;
    },

    // Trigger Execution Endpoints
    triggerAccountSync: async (accountId: string, startDate: string, endDate: string) => {
        const response = await api.post(`/api/v1/finops/trigger-sync/account/${accountId}?start_date=${startDate}&end_date=${endDate}`);
        return response.data;
    },

    triggerTenantSync: async (tenantId: string, startDate: string, endDate: string) => {
        const response = await api.post(`/api/v1/finops/trigger-sync/tenant/${tenantId}?start_date=${startDate}&end_date=${endDate}`);
        return response.data;
    },

    // Dashboard Read
    getDashboardSummary: async (startDate: string, endDate: string, tenantId?: string, accountId?: string) => {
        let url = `/api/v1/finops/dashboard/summary?start_date=${startDate}&end_date=${endDate}`;
        if (tenantId) url += `&tenant_id=${tenantId}`;
        if (accountId) url += `&account_id=${accountId}`;
        const response = await api.get(url);
        return response.data.data;
    },

    getDashboardTrend: async (startDate: string, endDate: string, tenantId?: string, accountId?: string) => {
        let url = `/api/v1/finops/dashboard/trend?start_date=${startDate}&end_date=${endDate}`;
        if (tenantId) url += `&tenant_id=${tenantId}`;
        if (accountId) url += `&account_id=${accountId}`;
        const response = await api.get(url);
        return response.data.data.trend;
    },

    getDashboardServices: async (startDate: string, endDate: string, tenantId?: string, accountId?: string) => {
        let url = `/api/v1/finops/dashboard/services?start_date=${startDate}&end_date=${endDate}`;
        if (tenantId) url += `&tenant_id=${tenantId}`;
        if (accountId) url += `&account_id=${accountId}`;
        const res = await api.get(url);
        return res.data?.data?.services ?? [];
    },

    getDashboardServicesTable: async (startDate: string, endDate: string, tenantId?: string, accountId?: string) => {
        let url = `api/v1/finops/dashboard/services_table?start_date=${startDate}&end_date=${endDate}`;
        if (tenantId) url += `&tenant_id=${tenantId}`;
        if (accountId) url += `&account_id=${accountId}`;
        const res = await api.get(url);
        return res.data?.data?.services ?? [];
    }
};
