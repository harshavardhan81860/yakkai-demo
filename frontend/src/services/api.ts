import axios from "axios";
import keycloak from "../auth/keycloak";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

/**
 * Automatically:
 * - refreshes token
 * - injects Authorization header
 * - works for ALL APIs
 */
api.interceptors.request.use(
  async (config) => {
    if (keycloak.token) {
      try {
        // refresh token if it expires in next 30s
        await keycloak.updateToken(30);
        config.headers.Authorization = `Bearer ${keycloak.token}`;
      } catch (err) {
        console.error("Token refresh failed", err);
        keycloak.logout();
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
