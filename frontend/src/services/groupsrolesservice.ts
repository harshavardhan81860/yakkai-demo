import api from "./api";

export interface GroupRoleAssignment {
  id: string;
  group_id: string;
  role_id: string;
  tenant_id: string | null;
  cloud_account_id: string | null;
  component_id: string | null;
  created_at: string;
}

export const getGroupRoles = async (groupId: string | Number) => {
  const res = await api.get(
    `/cloud-selfservice-backend-dev/api/v1/group-roles/group/${groupId}`
  );
  return res.data.data.assignments as GroupRoleAssignment[];
};
