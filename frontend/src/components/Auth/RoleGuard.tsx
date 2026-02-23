import { ReactNode } from "react";
import { useRole } from "../../contexts/RoleContext";
import { Box, Typography, Button, Avatar } from "@mui/material";
import { Lock, Home } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

interface RoleGuardProps {
    /** Roles allowed to access this route */
    allowed: string[];
    children: ReactNode;
}

/**
 * Wraps a route/page to restrict access by role.
 * Checks the current active role (system or tenant) against the allowed list.
 */
const RoleGuard = ({ allowed, children }: RoleGuardProps) => {
    const { activeRoleName, loading } = useRole();
    const navigate = useNavigate();

    if (loading) return null;

    if (!activeRoleName || !allowed.includes(activeRoleName)) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                    gap: 3,
                    textAlign: "center",
                }}
            >
                <Avatar
                    sx={{
                        width: 80,
                        height: 80,
                        bgcolor: "rgba(244,63,94,0.1)",
                        color: "#F43F5E",
                    }}
                >
                    <Lock sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Access Restricted
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
                    You don't have permission to view this page. Please contact your
                    administrator if you believe this is an error.
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Home />}
                    onClick={() => navigate("/")}
                    sx={{
                        mt: 2,
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 700,
                        background: "linear-gradient(135deg, #6C63FF, #4A42D4)",
                    }}
                >
                    Go Home
                </Button>
            </Box>
        );
    }

    return <>{children}</>;
};

export default RoleGuard;
