import api from "./api";

/* ============================
   TYPES
============================ */

export interface GroupRoleAssignment {
  id: number;
  group_id: number;
  role_id: number;
  tenant_id: number | null;
  cloud_account_id: number | null;
  component_id: number | null;
  assigned_by: number | null;
  created_at: string;
  updated_at: string;
}

/* ============================
   FETCH GROUP ROLES
============================ */

export const fetchGroupRoles = async (
  groupId: number
): Promise<GroupRoleAssignment[]> => {
  const res = await api.get(`/api/v1/group-roles/group/${groupId}`);
  return res.data?.data?.assignments ?? [];
};

/* ============================
   ASSIGN ROLE
============================ */

export const assignGroupRole = async (payload: {
  group_id: number;
  role_id: number;
  tenant_id?: number | null;
  cloud_account_id?: number | null;
}) => {
  const res = await api.post("api/v1/group-roles/assign", payload);
  return res.data;
};

/* ============================
   REVOKE ROLE
============================ */

export const revokeGroupRole = async (assignmentId: number) => {
  const res = await api.post(
    `/api/v1/group-roles/revoke/${assignmentId}`
  );
  return res.data;
};
