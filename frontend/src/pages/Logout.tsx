import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";

const Logout = () => {
  const { logout, initialized } = useAuth();

  useEffect(() => {
    if (initialized) {
      logout();
    }
  }, [initialized]);

  return null;
};

export default Logout;
