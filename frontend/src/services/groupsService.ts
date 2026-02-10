import api from "./api";
import { fetchAllUsers } from "./usersService";


export interface GroupRow {
  id: number;
  tenant_id?: number | null;
  name: string;
  description: string;
  email?: string;
  is_system_group: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

// Groups
export const fetchAllGroups = async (): Promise<GroupRow[]> => {
  const res = await api.get("api/v1/groups/");
  return res.data?.data?.groups ?? [];
};

export const activateGroup = async (groupId: number) =>
  api.patch(`/api/v1/groups/${groupId}/activate`);

export const deactivateGroup = async (groupId: number) =>
  api.patch(`/api/v1/groups/${groupId}/deactivate`);

export const createGroup = async (payload: {
  name: string;
  description: string;
  is_system_group: boolean;
  tenant_id?: number;
  email?: string;
}) => {
  const res = await api.post("api/v1/groups/create", payload);
  return res.data;
};

export const updateGroup = async (
  groupId: number,
  payload: { description: string; email?: string }
) => {
  const res = await api.put(`/api/v1/groups/${groupId}`, payload);
  return res.data;
};

// Group users
export const getGroupUsers = async (groupId: number): Promise<GroupUser[]> => {
  // 1. Get group assignments
  const res = await api.get(`/api/v1/groups/${groupId}/users`);
  const assignments = res.data?.data?.assignments ?? [];

  if (assignments.length === 0) return [];

  // 2. Get all users
  const users = await fetchAllUsers();

  // 3. Map assignment.user_id → user object
  return assignments
    .map((a: any) => users.find((u) => u.id === a.user_id))
    .filter(Boolean)
    .map((u: any) => ({
      id: u.id,
      email: u.email,
      username: u.username,
    }));
};


// Tenants service (reuse)
export interface TenantRow {
  id: number;
  display_name: string;
  is_active: boolean;
}

export const fetchAllTenants = async (): Promise<TenantRow[]> => {
  const res = await api.get("api/v1/tenants/");
  return res.data?.data?.tenants ?? [];
};
