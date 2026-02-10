import api from "./api";

/* ============================
   TYPES
============================ */
export interface UserGroupAssignment {
  id: number;
  user_id: number;
  group_id: number;
  tenant_id: number | string | null;
  cloud_account_id: number | string | null;
  assigned_by: number | null;
  created_at: string;
  updated_at: string;
}


/* ============================
   FETCH USER GROUPS
============================ */
export const fetchUserGroups = async (userId: number): Promise<UserGroupAssignment[]> => {
  const res = await api.get(`/api/v1/groups/user/${userId}`);
  return res.data?.data?.assignments ?? [];
};

/* ============================
   ASSIGN GROUP
============================ */
export const assignUserGroup = async (payload: {
  user_id: number;
  group_id: number;
  tenant_id?: number | string | null;
  cloud_account_id?: number | string | null;
  assigned_by?: number | null;
}) => {
  const res = await api.post("api/v1/groups/assign", payload);
  return res.data;
};

/* ============================
   REVOKE GROUP
============================ */
export const revokeUserGroup = async (assignmentId: number) => {
  const res = await api.post(`/api/v1/groups/revoke/${assignmentId}`);
  return res.data;
};
