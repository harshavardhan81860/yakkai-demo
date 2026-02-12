import api from "./api";

export const fetchCurrentUser = async () => {
  try {
    const res = await api.get("api/v1/users/users/me");
    const data = res.data?.data;

    // Case 1: No data at all or explicitly null
    if (!data) {
      return { status: "NOT_FOUND" };
    }

    // Case 2: Object response (some versions send object if user not found)
    if (!Array.isArray(data)) {
      if (data.id === null || !data.id) {
        return { status: "NOT_FOUND", user: data };
      }
      // If it is an object but has ID, treat it as a single user
      if (!data.is_active) return { status: "INACTIVE", user: data };
      return { status: "ACTIVE", user: data };
    }

    // Case 3: Array response
    if (data.length === 0) {
      return { status: "NOT_FOUND" };
    }

    const user = data[0];
    if (!user.is_active) {
      return { status: "INACTIVE", user };
    }

    return {
      status: "ACTIVE",
      user,
    };
  } catch (error) {
    console.error("fetchCurrentUser failed", error);
    return { status: "ERROR" };
  }
};
