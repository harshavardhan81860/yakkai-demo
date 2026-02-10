CREATE TABLE IF NOT EXISTS data.roles (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES data.tenants(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant
ON data.roles (tenant_id);


CREATE TABLE IF NOT EXISTS data.role_assignments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES data.users(id),
    role_id UUID NOT NULL REFERENCES data.roles(id),
    tenant_id UUID REFERENCES data.tenants(id),
    cloud_account_id UUID REFERENCES data.cloud_accounts(id),
    component_id UUID,
    assigned_by UUID REFERENCES data.users(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_user
ON data.role_assignments (user_id);

CREATE INDEX IF NOT EXISTS idx_role_assignments_role
ON data.role_assignments (role_id);
