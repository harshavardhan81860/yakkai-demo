import api from "./api";

export interface TenantRole {
    tenant_id: string;
    tenant_name: string;
    role: string; // "tenant_admin" | "tenant_manager" | "tenant_user"
}

export interface UserRoleContext {
    user: {
        id: string;
        username: string;
        email: string;
        first_name?: string;
        last_name?: string;
        is_active: boolean;
    };
    system_role: string | null; // "system_admin" | "system_manager" | "system_user" | null
    tenant_roles: TenantRole[];
}

export const fetchUserRoleContext = async (): Promise<UserRoleContext | null> => {
    try {
        const res = await api.get("api/v1/users/users/me/context");
        const data = res.data?.data;
        if (!data) return null;
        return data as UserRoleContext;
    } catch (error) {
        console.error("fetchUserRoleContext failed", error);
        return null;
    }
};
