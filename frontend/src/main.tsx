import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import "./index.css";

console.log("VITE MODE:", import.meta.env.MODE);

const basePath = import.meta.env.VITE_APP_BASE_PATH;

ReactDOM.createRoot(document.getElementById("root")!).render(
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
            <BrowserRouter basename={basePath ? `/${basePath}` : "/"}>
                <App />
            </BrowserRouter>
        </AuthProvider>
    </ThemeProvider>
);
