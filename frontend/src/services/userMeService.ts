import api from "./api";

export const fetchCurrentUser = async () => {
  const res = await api.get("api/v1/users/users/me");

  // backend sends array
  const users = res.data?.data ?? [];

  if (!Array.isArray(users) || users.length === 0) {
    return { status: "NOT_FOUND" };
  }

  const user = users[0];

  if (!user.is_active) {
    return { status: "INACTIVE", user };
  }

  return {
    status: "ACTIVE",
    user,
  };
};
