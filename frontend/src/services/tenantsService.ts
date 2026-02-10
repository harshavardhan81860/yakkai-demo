// src/services/tenantsService.ts
import api from "./api";

/**
 * Tenant row used across:
 * - Tenants table
 * - Dashboard counts
 * - Tenant → Cloud Account navigation
 */
export interface TenantRow {
  id: number;
  name: string;
  display_name: string;
  is_active: boolean;
}

/**
 * Fetch all tenants
 * Backend expected shape:
 * {
 *   data: {
 *     tenants: TenantRow[],
 *     header?: { total, active, inactive }
 *   }
 * }
 */
export const fetchAllTenants = async (): Promise<TenantRow[]> => {
  const res = await api.get("api/v1/tenants/");
  return res.data?.data?.tenants ?? [];
};

/**
 * Create tenant
 * Payload:
 * {
 *   name: string;
 *   display_name: string;
 * }
 */
export const createTenant = async (payload: {
  name: string;
  display_name: string;
}) => {
  const res = await api.post("api/v1/tenants/create", payload);
  return res.data;
};

/**
 * (Future use)
 * Activate tenant
 */
export const activateTenant = async (tenantId: number) =>
  api.patch(`api/v1/tenants/${tenantId}/activate`);

/**
 * (Future use)
 * Deactivate tenant
 */
export const deactivateTenant = async (tenantId: number) =>
  api.patch(`api/v1/tenants/${tenantId}/deactivate`);

/**
 * Update tenant
 */
export const updateTenant = async (tenantId: number, payload: { display_name: string }) => {
  const res = await api.patch(`api/v1/tenants/${tenantId}`, payload);
  return res.data;
};
