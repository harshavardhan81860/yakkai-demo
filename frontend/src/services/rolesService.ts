// src/services/rolesService.ts
import api from "./api";
import { fetchAllUsers } from "./usersService";
import { fetchAllGroups } from "./groupsService";

/* ----------------- INTERFACES ----------------- */
export interface RoleRow {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string;
  email?: string;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  tenant_id: string | null;
  created_at: string;
  username: string;
  email: string;
}



/* ----------------- CORE APIs ----------------- */

// Fetch all roles
export const fetchAllRoles = async (): Promise<RoleRow[]> => {
  const res = await api.get("api/v1/roles/");
  return res.data?.data?.roles ?? [];
};

// Activate a role
export const activateRole = async (roleId: string) =>
  api.patch(`/api/v1/roles/${roleId}/activate`);

// Deactivate a role
export const deactivateRole = async (roleId: string) =>
  api.patch(`/api/v1/roles/${roleId}/deactivate`);

// Create a new role
export const createRole = async (payload: {
  name: string;
  description: string;
  is_system_role: boolean;
  tenant_id?: string;
  email?: string;
}) => {
  const res = await api.post("api/v1/roles/create", payload);
  return res.data;
};

// Update an existing role
export const updateRole = async (
  roleId: string,
  payload: { description: string; email?: string }
) => {
  const res = await api.put(`/api/v1/roles/${roleId}`, payload);
  return res.data;
};

/* ----------------- VIEW PEOPLE LOGIC ----------------- */

/**
 * Users assigned to role
 */
export const getRoleUsers = async (
  roleId: string
): Promise<UserRoleAssignment[]> => {
  const roleRes = await api.get(`/api/v1/roles/${roleId}/users`);

  const assignments = roleRes.data?.data?.users ?? [];
  if (!assignments.length) return [];

  let allUsers: any[] = [];
  try {
    allUsers = await fetchAllUsers();
  } catch {
    console.warn("fetchAllUsers failed, using fallback usernames");
  }

  return assignments.map((a: any) => {
    const user = allUsers.find(
      (u) => String(u.id) === String(a.user_id)
    );

    return {
      id: a.id,
      user_id: a.user_id,
      role_id: a.role_id,
      tenant_id: a.tenant_id ?? null,
      created_at: a.created_at,
      username: user?.username || `User #${a.user_id}`,
      email: user?.email || "—",
    };
  });
};



/**
 * Get all groups mapped to a role
 */
/**
 * Groups mapped to a role (derived)
 */
/**
 * Get all groups mapped to a role
 */
export const getRoleGroups = async (roleId: string) => {
  const res = await api.get(
    `/api/v1/group-roles/role/${roleId}`
  );

  const assignments = res.data?.data?.assignments ?? [];
  if (!assignments.length) return [];

  const allGroups = await fetchAllGroups();

  return assignments
    .map((a: any) => {
      const group = allGroups.find(
        (g) => String(g.id) === String(a.group_id)
      );

      if (!group) return null;

      return {
        id: group.id,
        name: group.name,
        tenant_id: group.tenant_id,
        email: group.email ?? "-",
      };
    })
    .filter(Boolean);
};


