import api from "./api";

export interface AccessMappingUser {
  id: string;
  name: string;
  email: string;
}

/** tenant is an object (currently empty) */
export interface Tenant {
  // keep flexible for future fields
  [key: string]: any;
}

export interface AccessMappingGroup {
  id: string;
  name: string;
  type: string;
  tenant: Tenant;
}

export interface InheritedGroup {
  id: string;
  name: string;
}

export interface AccessMappingRole {
  id: string;
  name: string;
  type: string;
  tenant: Tenant;
  assignment_type: "DIRECT" | "INHERITED";
  inherited_from_groups: InheritedGroup[];
}

export interface UserAccessMappings {
  user: AccessMappingUser;
  groups: AccessMappingGroup[];
  roles: AccessMappingRole[];
}

export const fetchUserAccessMappings = async (
  userId: string | number
): Promise<UserAccessMappings | null> => {
  const res = await api.get(`api/v1/users/${userId}/access-mappings`);
  return res.data?.data ?? null;
};
