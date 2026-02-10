import api from "./api";

/* ===================== TYPES ===================== */

export interface CiCredentialRow {
  id: number;
  provider: string;
  base_url: string;
  project_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ===================== API ===================== */

export const fetchCiCredentials = async () => {
  const res = await api.get(`/api/v1/ci-credentials/`);
  return res.data.data.credentials as CiCredentialRow[];
};

export const createCiCredential = async (payload: {
  provider: string;
  base_url: string;
  project_id: string;
  token: string;
}) => {
  const res = await api.post(`/api/v1/ci-credentials/create`, payload);
  return res.data;
};

export const updateCiCredential = async (
  id: number,
  payload: {
    base_url: string;
    project_id: string;
    token: string;
  }
) => {
  const res = await api.patch(
    `/api/v1/ci-credentials/${id}/update`,
    payload
  );
  return res.data;
};

export const activateCiCredential = async (id: number) => {
  const res = await api.patch(
    `/api/v1/ci-credentials/${id}/activate`
  );
  return res.data;
};

export const deactivateCiCredential = async (id: number) => {
  const res = await api.patch(
    `/api/v1/ci-credentials/${id}/deactivate`
  );
  return res.data;
};
