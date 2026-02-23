import api from "./api";

export interface TenantUserRow {
    id: string;
    tenant_id: string;
    user_id: string;
    created_at: string;
}

export const fetchTenantUsers = async (tenantId: string): Promise<TenantUserRow[]> => {
    const res = await api.get(`/api/v1/tenants/${tenantId}/users`);
    return res.data.data.items;
};

export const addTenantUser = async (tenantId: string, userId: string): Promise<TenantUserRow> => {
    const res = await api.post(`/api/v1/tenants/${tenantId}/users`, { user_id: userId });
    return res.data.data.item;
};

export const removeTenantUser = async (tenantId: string, userId: string): Promise<any> => {
    const res = await api.delete(`/api/v1/tenants/${tenantId}/users/${userId}`);
    return res.data.data;
};
