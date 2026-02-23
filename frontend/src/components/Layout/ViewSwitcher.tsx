import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "../../contexts/RoleContext";
import {
    Box,
    Typography,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Divider,
    Avatar,
} from "@mui/material";
import {
    SwapHoriz,
    Business,
    AdminPanelSettings,
    ExpandMore,
    CheckCircle,
} from "@mui/icons-material";

/**
 * A persistent switcher component that sits in the sidebar header area.
 * Allows switching between system and tenant views, and selecting tenants.
 */
const ViewSwitcher = () => {
    const {
        viewMode,
        systemRole,
        tenantRoles,
        activeTenant,
        hasDualAccess,
        switchToSystem,
        switchToTenant,
    } = useRole();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Don't render if user is on the landing page or has no roles
    if (viewMode === "landing") return null;

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSwitchToSystem = () => {
        switchToSystem();
        handleClose();
        navigate("/");
    };

    const handleSwitchToTenant = (tenantId: string) => {
        switchToTenant(tenantId);
        handleClose();
        navigate(`/tenants/${tenantId}`);
    };

    const currentLabel =
        viewMode === "system"
            ? "System View"
            : activeTenant
                ? activeTenant.tenant_name
                : "Tenant View";

    const currentRoleLabel =
        viewMode === "system"
            ? systemRole?.replace("system_", "").replace(/^\w/, (c) => c.toUpperCase())
            : activeTenant?.role
                ?.replace("tenant_", "")
                .replace(/^\w/, (c) => c.toUpperCase());

    const roleColor =
        currentRoleLabel === "Admin"
            ? "#F43F5E"
            : currentRoleLabel === "Manager"
                ? "#F59E0B"
                : "#10B981";

    // Only show switcher if user has options to switch
    const hasOptions = hasDualAccess || tenantRoles.length > 1;

    return (
        <Box sx={{ px: 1.5, py: 1 }}>
            {/* Current View Indicator */}
            <Button
                fullWidth
                onClick={hasOptions ? handleOpen : undefined}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1.5,
                    px: 2,
                    borderRadius: "12px",
                    bgcolor: "rgba(108,99,255,0.06)",
                    border: "1px solid rgba(108,99,255,0.12)",
                    textTransform: "none",
                    "&:hover": hasOptions
                        ? { bgcolor: "rgba(108,99,255,0.12)" }
                        : {},
                    cursor: hasOptions ? "pointer" : "default",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <Avatar
                        sx={{
                            width: 32,
                            height: 32,
                            bgcolor: viewMode === "system" ? "rgba(108,99,255,0.15)" : "rgba(59,130,246,0.15)",
                            color: viewMode === "system" ? "#6C63FF" : "#3B82F6",
                        }}
                    >
                        {viewMode === "system" ? (
                            <AdminPanelSettings sx={{ fontSize: 18 }} />
                        ) : (
                            <Business sx={{ fontSize: 18 }} />
                        )}
                    </Avatar>
                    <Box sx={{ textAlign: "left", minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}
                        >
                            {currentLabel}
                        </Typography>
                        <Chip
                            label={currentRoleLabel}
                            size="small"
                            sx={{
                                mt: 0.5,
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                bgcolor: `${roleColor}15`,
                                color: roleColor,
                                border: `1px solid ${roleColor}33`,
                            }}
                        />
                    </Box>
                </Box>
                {hasOptions && (
                    <ExpandMore sx={{ color: "text.secondary", fontSize: 20 }} />
                )}
            </Button>

            {/* Dropdown Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        mt: 1,
                        minWidth: 240,
                        borderRadius: "12px",
                        bgcolor: "background.paper",
                        border: "1px solid rgba(128,128,128,0.1)",
                    },
                }}
                transformOrigin={{ horizontal: "left", vertical: "top" }}
                anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
            >
                {/* System option */}
                {systemRole && (
                    <MenuItem
                        onClick={handleSwitchToSystem}
                        selected={viewMode === "system"}
                        sx={{ borderRadius: "8px", mx: 1 }}
                    >
                        <ListItemIcon>
                            <AdminPanelSettings
                                sx={{ color: viewMode === "system" ? "#6C63FF" : "text.secondary" }}
                            />
                        </ListItemIcon>
                        <ListItemText
                            primary="System View"
                            secondary={systemRole.replace("system_", "").replace(/^\w/, (c) => c.toUpperCase())}
                            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.875rem" }}
                            secondaryTypographyProps={{ fontSize: "0.7rem" }}
                        />
                        {viewMode === "system" && (
                            <CheckCircle sx={{ color: "#6C63FF", fontSize: 18, ml: 1 }} />
                        )}
                    </MenuItem>
                )}

                {systemRole && tenantRoles.length > 0 && (
                    <Divider sx={{ my: 1, mx: 2, borderColor: "rgba(128,128,128,0.1)" }} />
                )}

                {/* Tenant options */}
                {tenantRoles.length > 0 && (
                    <Typography
                        variant="overline"
                        sx={{
                            px: 3,
                            py: 0.5,
                            display: "block",
                            color: "text.secondary",
                            fontSize: "0.6rem",
                            letterSpacing: 2,
                            fontWeight: 700,
                        }}
                    >
                        Tenants
                    </Typography>
                )}

                {tenantRoles.map((tr) => {
                    const isSelected =
                        viewMode === "tenant" && activeTenant?.tenant_id === tr.tenant_id;
                    return (
                        <MenuItem
                            key={tr.tenant_id}
                            onClick={() => handleSwitchToTenant(tr.tenant_id)}
                            selected={isSelected}
                            sx={{ borderRadius: "8px", mx: 1 }}
                        >
                            <ListItemIcon>
                                <Business
                                    sx={{ color: isSelected ? "#3B82F6" : "text.secondary" }}
                                />
                            </ListItemIcon>
                            <ListItemText
                                primary={tr.tenant_name}
                                secondary={tr.role.replace("tenant_", "").replace(/^\w/, (c) => c.toUpperCase())}
                                primaryTypographyProps={{ fontWeight: 600, fontSize: "0.875rem" }}
                                secondaryTypographyProps={{ fontSize: "0.7rem" }}
                            />
                            {isSelected && (
                                <CheckCircle sx={{ color: "#3B82F6", fontSize: 18, ml: 1 }} />
                            )}
                        </MenuItem>
                    );
                })}
            </Menu>
        </Box>
    );
};

export default ViewSwitcher;
