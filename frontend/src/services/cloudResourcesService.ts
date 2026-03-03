import api from "./api";

/* ================= AWS ================= */

export const testAwsConnection = async (cloudAccountId: string) => {
  const res = await api.get(`/api/v1/aws/test_connection/${cloudAccountId}`);
  return res.data;
};

export const fetchAwsRegions = async (
  cloudAccountId: string,
  refresh = false
) => {
  const res = await api.get(
    `/api/v1/aws/regions?cloud_account_id=${cloudAccountId}&refresh=${refresh}`
  );
  return res.data?.data?.regions ?? [];
};

export const fetchAwsInstances = async (
  cloudAccountId: string,
  region: string
) => {
  const res = await api.get(
    `/api/v1/aws/instances?cloud_account_id=${cloudAccountId}&region=${region}`
  );
  return res.data?.data ?? [];
};

export const fetchAwsImages = async (
  cloudAccountId: string,
  region: string
) => {
  const res = await api.get(
    `/api/v1/aws/images?cloud_account_id=${cloudAccountId}&region=${region}`
  );
  return res.data?.data ?? [];
};

export const fetchAwsClusters = async (
  cloudAccountId: string,
  region: string
) => {
  const res = await api.get(
    `/api/v1/aws/clusters?cloud_account_id=${cloudAccountId}&region=${region}`
  );
  return res.data?.data ?? [];
};

/* ================= AZURE ================= */

export const testAzureConnection = async (cloudAccountId: string) => {
  const res = await api.get(`/api/v1/azure/test_connection/${cloudAccountId}`);
  return res.data;
};

export const fetchAzureRegions = async (
  cloudAccountId: string,
  refresh = false
) => {
  const res = await api.get(
    `/api/v1/azure/regions?cloud_account_id=${cloudAccountId}&refresh=${refresh}`
  );
  return res.data?.data?.regions ?? [];
};

export const fetchAzureSubscriptions = async (cloudAccountId: string) => {
  const res = await api.get(
    `/api/v1/azure/subscriptions?cloud_account_id=${cloudAccountId}`
  );
  return res.data?.data ?? [];
};

export const fetchAzureInstances = async (
  cloudAccountId: string,
  region: string
) => {
  const res = await api.get(
    `/api/v1/azure/instances?cloud_account_id=${cloudAccountId}&region=${region}`
  );
  return res.data?.data ?? [];
};

export const fetchAzureImages = async (
  cloudAccountId: string,
  region: string
) => {
  const res = await api.get(
    `/api/v1/azure/images?cloud_account_id=${cloudAccountId}&region=${region}`
  );
  return res.data?.data ?? [];
};

export const fetchAzureClusters = async (
  cloudAccountId: string,
  region: string
) => {
  const res = await api.get(
    `/api/v1/azure/clusters?cloud_account_id=${cloudAccountId}&region=${region}`
  );
  return res.data?.data ?? [];
};

/* ================= INVENTORY ================= */

export const fetchCloudInventory = async (
  tenantId: string,
  cloudAccountId?: string
) => {
  const params = new URLSearchParams();
  params.append("tenant_id", tenantId);
  if (cloudAccountId) {
    params.append("cloud_account_id", cloudAccountId);
  }
  const res = await api.get(`/api/v1/resources/inventory?${params.toString()}`);
  return res.data;
};

/* ================= RESOURCE SYNC JOBS ================= */

export const triggerResourceSync = async (cloudAccountId: string) => {
  const res = await api.post(`/api/v1/cloud-accounts/${cloudAccountId}/sync-resources`);
  return res.data;
};

export const fetchResourceSyncHistory = async (cloudAccountId: string) => {
  const res = await api.get(`/api/v1/cloud-accounts/${cloudAccountId}/sync-history`);
  return res.data?.data?.history ?? [];
};

/* ================= TENANT-LEVEL RESOURCE SYNC ================= */

export const triggerTenantResourceSync = async (tenantId: string) => {
  const res = await api.post(`/api/v1/cloud-accounts/tenant/${tenantId}/sync-resources`);
  return res.data;
};

export const fetchTenantResourceSyncHistory = async (tenantId: string) => {
  const res = await api.get(`/api/v1/cloud-accounts/tenant/${tenantId}/sync-history`);
  return res.data?.data?.history ?? [];
};

