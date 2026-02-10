// src/services/dashboardService.ts
import api from "./api";

export const fetchUserHeader = async () => {
  const res = await api.get("api/v1/users/");
  return res.data?.data?.header ?? null;
};

export const fetchTenantHeader = async () => {
  const res = await api.get("api/v1/tenants/");
  return res.data?.data?.header ?? null;
};
