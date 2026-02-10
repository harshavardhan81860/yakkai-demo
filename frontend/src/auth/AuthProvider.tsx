import { createContext, useContext, useEffect, useState } from "react";
import keycloak from "./keycloak";
import { fetchCurrentUser } from "../services/userMeService";

const AuthContext = createContext<any>(null);

const basePath = import.meta.env.VITE_APP_BASE_PATH || "";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [authState, setAuthState] = useState<
    "ACTIVE" | "INACTIVE" | "NOT_FOUND"
  >("ACTIVE");

  const [user, setUser] = useState<any>(null);

  useEffect(() => {

    const isSecureContext = window.location.protocol === 'https:' || 
                         window.location.hostname === 'localhost';

    keycloak
      .init({
        onLoad: "login-required",
        // pkceMethod: "S256",
        pkceMethod: isSecureContext ? "S256" : false,
        checkLoginIframe: false,
      })
      .then(async (authenticated) => {
        if (!authenticated) {
          keycloak.login();
          return;
        }

        const result = await fetchCurrentUser();

        if (result.status === "ACTIVE") {
          setUser({
            username: result.user.username,
            email: result.user.email,
            first_name: result.user.first_name,
            mobile: result.user.mobile,
            department: result.user.department,
            gender: result.user.gender,
            is_active: true,
          });
          setAuthState("ACTIVE");
        } else {
          setAuthState(result.status as "ACTIVE" | "INACTIVE" | "NOT_FOUND");
        }

        setReady(true);
      })
      .catch((err) => {
        console.error("Auth init failed", err);
        setAuthState("NOT_FOUND");
        setReady(true);
      });
  }, []);

  if (!ready) {
    return <div>Authenticating…</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        authState,
        user,
        isActive: authState === "ACTIVE",
        logout: () =>
          // keycloak.logout({ redirectUri: window.location.origin }),
          keycloak.logout({redirectUri: `${window.location.origin}/${basePath}/`}),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


