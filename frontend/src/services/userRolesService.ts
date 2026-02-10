import api from "./api";

/* ============================
   TYPES
============================ */

export interface UserRoleAssignment {
  id: number;
  user_id: number;
  role_id: number;
  role_name?: string;
  tenant_id: number | string | null;
  cloud_account_id: number | string | null;
  component_id: number | null;
  assigned_by: number | null;
  created_at: string;
  updated_at: string;
}

/* ============================
   FETCH USER ROLES
============================ */

export const fetchUserRoles = async (
  userId: number
): Promise<UserRoleAssignment[]> => {
  const res = await api.get(`/api/v1/roles/user/${userId}`);
  return res.data?.data?.assignments ?? [];
};
/* ============================
   ASSIGN ROLE
============================ */

export const assignUserRole = async (payload: {
  user_id: number;
  role_id: number;
  tenant_id?: number | string | null;
  cloud_account_id?: number | string | null;
}) => {
  const res = await api.post("api/v1/roles/assign", payload);
  return res.data;
};

/* ============================
   REVOKE ROLE
============================ */

export const revokeUserRole = async (assignmentId: number) => {
  const res = await api.post(`/api/v1/roles/revoke/${assignmentId}`);
  return res.data;
};