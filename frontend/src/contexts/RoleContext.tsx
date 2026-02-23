import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../auth/AuthProvider";
import { fetchUserRoleContext, TenantRole, UserRoleContext } from "../services/roleContextService";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export type ViewMode = "system" | "tenant" | "landing";

export type SystemRoleName = "system_admin" | "system_manager" | "system_user";
export type TenantRoleName = "tenant_admin" | "tenant_manager" | "tenant_user";

export interface ActiveTenant {
    tenant_id: string;
    tenant_name: string;
    role: TenantRoleName;
}

export interface RoleContextType {
    /** Loading state */
    loading: boolean;

    /** Current view mode */
    viewMode: ViewMode;

    /** System-level role (null if user has no system role) */
    systemRole: SystemRoleName | null;

    /** All tenant roles the user has */
    tenantRoles: TenantRole[];

    /** Currently active tenant (when viewMode === "tenant") */
    activeTenant: ActiveTenant | null;

    /** Whether user has both system + tenant roles */
    hasDualAccess: boolean;

    /** Switch to system view */
    switchToSystem: () => void;

    /** Switch to tenant view for a specific tenant */
    switchToTenant: (tenantId: string) => void;

    /** Get the active role name for current view */
    activeRoleName: string | null;

    /** Permission helpers */
    isAdmin: boolean;
    isManager: boolean;
    isUser: boolean;

    /** Can the current role perform write (create/edit/delete) operations? */
    canWrite: boolean;

    /** Can the current role manage users/groups/roles? */
    canManage: boolean;

    /** Refresh the role context (e.g. after role changes) */
    refresh: () => Promise<void>;

    /** Go back to landing/chooser page */
    goToLanding: () => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

/* ────────────────────────────────────────────
   Provider
   ──────────────────────────────────────────── */

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isActive } = useAuth();

    const [loading, setLoading] = useState(true);
    const [systemRole, setSystemRole] = useState<SystemRoleName | null>(null);
    const [tenantRoles, setTenantRoles] = useState<TenantRole[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>("landing");
    const [activeTenant, setActiveTenant] = useState<ActiveTenant | null>(null);

    const loadContext = useCallback(async () => {
        if (!isActive || !user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const ctx = await fetchUserRoleContext();
            if (ctx) {
                setSystemRole((ctx.system_role as SystemRoleName) || null);
                setTenantRoles(ctx.tenant_roles || []);

                // Auto-determine initial view mode
                const hasSystem = !!ctx.system_role;
                const hasTenants = (ctx.tenant_roles || []).length > 0;

                if (hasSystem && hasTenants) {
                    // User has both — show landing page to choose
                    setViewMode("landing");
                } else if (hasSystem) {
                    // System-only user
                    setViewMode("system");
                } else if (hasTenants) {
                    if (ctx.tenant_roles.length === 1) {
                        // Single tenant — auto-select
                        const tr = ctx.tenant_roles[0];
                        setViewMode("tenant");
                        setActiveTenant({
                            tenant_id: tr.tenant_id,
                            tenant_name: tr.tenant_name,
                            role: tr.role as TenantRoleName,
                        });
                    } else {
                        // Multiple tenants — show landing to pick
                        setViewMode("landing");
                    }
                } else {
                    // No roles at all
                    setViewMode("landing");
                }
            }
        } catch (err) {
            console.error("Failed to load role context", err);
        } finally {
            setLoading(false);
        }
    }, [isActive, user]);

    useEffect(() => {
        loadContext();
    }, [loadContext]);

    const switchToSystem = useCallback(() => {
        if (systemRole) {
            setViewMode("system");
            setActiveTenant(null);
        }
    }, [systemRole]);

    const switchToTenant = useCallback(
        (tenantId: string) => {
            const tr = tenantRoles.find((t) => t.tenant_id === tenantId);
            if (tr) {
                setViewMode("tenant");
                setActiveTenant({
                    tenant_id: tr.tenant_id,
                    tenant_name: tr.tenant_name,
                    role: tr.role as TenantRoleName,
                });
            }
        },
        [tenantRoles]
    );

    const goToLanding = useCallback(() => {
        setViewMode("landing");
        setActiveTenant(null);
    }, []);

    const hasDualAccess = !!systemRole && tenantRoles.length > 0;

    // Derived permission helpers based on current view mode
    const activeRoleName = useMemo(() => {
        if (viewMode === "system") return systemRole;
        if (viewMode === "tenant" && activeTenant) return activeTenant.role;
        return null;
    }, [viewMode, systemRole, activeTenant]);

    const isAdmin = activeRoleName === "system_admin" || activeRoleName === "tenant_admin";
    const isManager = activeRoleName === "system_manager" || activeRoleName === "tenant_manager";
    const isUser = activeRoleName === "system_user" || activeRoleName === "tenant_user";

    // Admins can create/delete, managers can manage but not create resources, users are read-only
    const canWrite = isAdmin;
    const canManage = isAdmin || isManager;

    const value: RoleContextType = {
        loading,
        viewMode,
        systemRole,
        tenantRoles,
        activeTenant,
        hasDualAccess,
        switchToSystem,
        switchToTenant,
        activeRoleName,
        isAdmin,
        isManager,
        isUser,
        canWrite,
        canManage,
        refresh: loadContext,
        goToLanding,
    };

    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

/* ────────────────────────────────────────────
   Hook
   ──────────────────────────────────────────── */

export const useRole = (): RoleContextType => {
    const ctx = useContext(RoleContext);
    if (!ctx) {
        throw new Error("useRole must be used within a RoleProvider");
    }
    return ctx;
};
