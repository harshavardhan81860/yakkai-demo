-- 1. Create Tenant Users mapping table
CREATE TABLE IF NOT EXISTS data.tenant_users (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES data.tenants(id),
    user_id UUID NOT NULL REFERENCES data.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON data.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON data.tenant_users(user_id);

-- 2. Seed standard roles (if not exists)
-- System Roles (tenant_id is NULL, is_system_role = TRUE)
INSERT INTO data.roles (id, tenant_id, name, description, is_system_role, is_active, created_at, updated_at)
VALUES 
    (gen_random_uuid(), NULL, 'system_admin', 'Full access to all system resources and tenants', TRUE, TRUE, now(), now()),
    (gen_random_uuid(), NULL, 'system_manager', 'Read and manage access to system resources', TRUE, TRUE, now(), now()),
    (gen_random_uuid(), NULL, 'system_user', 'Basic system access', TRUE, TRUE, now(), now())
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Tenant Roles (tenant_id is NULL because they are templates, is_system_role = FALSE)
INSERT INTO data.roles (id, tenant_id, name, description, is_system_role, is_active, created_at, updated_at)
VALUES 
    (gen_random_uuid(), NULL, 'tenant_admin', 'Full access within the assigned tenant', FALSE, TRUE, now(), now()),
    (gen_random_uuid(), NULL, 'tenant_manager', 'Manage resources within the assigned tenant', FALSE, TRUE, now(), now()),
    (gen_random_uuid(), NULL, 'tenant_user', 'Read-only or basic access within the assigned tenant', FALSE, TRUE, now(), now())
ON CONFLICT (tenant_id, name) DO NOTHING;
