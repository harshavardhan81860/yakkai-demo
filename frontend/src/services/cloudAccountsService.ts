// src/services/cloudAccountsService.ts
import api from "./api";

/**
 * Cloud Account row (matches new backend)
 */

export interface CloudAccountRow {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  name: string;
  display_name?: string | null;
  cloud_provider: string;

  cred_metadata: Record<string, any>;

  ci_credentials_id: string;

  read_connection_status: string;
  write_connection_status: string;

  is_active: boolean;
  created_at: string;
  updated_at: string;
  read_last_validated_at?: string | null;
  write_last_validated_at?: string | null;

  mtd_cost?: number;
  last_month_cost?: number;
}


/**
 * CI credential dropdown (unchanged)
 */
export interface CiCredentialDropdown {
  id: string;
  provider: string;
  project_id?: string;
  is_active: boolean;
}

/* ================= FETCH CLOUD ACCOUNTS ================= */

export const fetchCloudAccounts = async (
  tenantId: string | number
): Promise<CloudAccountRow[]> => {
  tenantId = String(tenantId);
  const res = await api.get(
    `api/v1/cloud-accounts/?tenant_id=${tenantId}`
  );

  return res.data?.data?.accounts ?? [];
};

export const fetchCloudAccountById = async (
  tenantId: string | number,
  id: string
): Promise<CloudAccountRow> => {
  const res = await api.get(`api/v1/cloud-accounts/${id}`);
  return res.data?.data;
};

/* ================= CREATE CLOUD ACCOUNT ================= */

export const createCloudAccount = async (payload: {
  tenant_id: string;
  parent_id: string | null;

  account_id: string;
  name: string;
  display_name?: string | null;
  account_type?: string | null;
  cloud_provider: string;

  ci_credentials_id?: string | null;
  runner_tags?: string | null;
}) => {
  const res = await api.post(
    `api/v1/cloud-accounts/create`,
    payload
  );

  return res.data;
};

/* ================= ACTIVATE / DEACTIVATE ================= */

export const activateCloudAccount = async (id: string) =>
  api.patch(`api/v1/cloud-accounts/${id}/activate`);

export const deactivateCloudAccount = async (id: string) =>
  api.patch(`api/v1/cloud-accounts/${id}/deactivate`);

/* ================= FETCH ACTIVE CI CREDENTIALS ================= */

export const fetchActiveCiCredentials = async (): Promise<
  CiCredentialDropdown[]
> => {
  const res = await api.get(`api/v1/ci-credentials/`);

  return (
    res.data?.data?.credentials?.filter(
      (c: CiCredentialDropdown) => c.is_active
    ) ?? []
  );
};



/* ================= TEST CONNECTION ================= */

export const testCloudConnection = async (id: string, provider: string, type: 'read' | 'write') => {
  // Map provider to specific endpoint if needed, but routers seem to have /aws/test_connection/...
  const endpoint = `api/v1/${provider.toLowerCase()}/test_connection/${id}`;
  const res = await api.get(endpoint);
  return res.data;
};

/* ================= UPDATE ================= */

export const updateCloudAccount = async (
  id: string,
  payload: {
    name?: string;
    parent_id?: string | null;
    cred_metadata?: Record<string, any>;
    ci_credentials_id?: string;
  }
) => {
  const res = await api.patch(`api/v1/cloud-accounts/${id}`, payload);
  return res.data;
};
