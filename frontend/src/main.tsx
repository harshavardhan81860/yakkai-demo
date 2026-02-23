import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { BrowserRouter } from "react-router-dom";
import { SettingsProvider } from "./contexts/SettingsContext";
import { RoleProvider } from "./contexts/RoleContext";
import "./index.css";

console.log("VITE MODE:", import.meta.env.MODE);

const basePath = import.meta.env.VITE_APP_BASE_PATH;

ReactDOM.createRoot(document.getElementById("root")!).render(
    <AuthProvider>
        <SettingsProvider>
            <BrowserRouter basename={basePath ? `/${basePath}` : "/"}>
                <RoleProvider>
                    <App />
                </RoleProvider>
            </BrowserRouter>
        </SettingsProvider>
    </AuthProvider>
);
