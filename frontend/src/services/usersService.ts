// src/services/usersService.ts
import api from "./api";

export interface UserRow {
  id: number;
  keycloak_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  mobile: string;
  department: string;
  gender: string;
  is_active: boolean;
}

export const fetchAllUsers = async (): Promise<UserRow[]> => {
  const res = await api.get("api/v1/users/");
  return res.data?.data?.users ?? [];
};

export const activateUser = async (userId: number) =>
  api.patch(`/api/v1/users/${userId}/activate`);

export const deactivateUser = async (userId: number) =>
  api.patch(`/api/v1/users/${userId}/deactivate`);

export const createUser = async (payload: {
  email: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
  department?: string;
  gender?: string;
  password?: string;
}) => {
  const res = await api.post("api/v1/users/create", payload);
  return res.data;
};
