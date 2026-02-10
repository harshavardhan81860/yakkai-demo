CREATE TABLE IF NOT EXISTS data.groups (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES data.tenants(id),
    name VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100),
    description TEXT,
    is_system_group BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);


CREATE TABLE IF NOT EXISTS data.group_assignments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    group_id UUID NOT NULL REFERENCES data.groups(id),
    tenant_id UUID,
    cloud_account_id UUID,
    component_id UUID,
    assigned_by UUID,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
