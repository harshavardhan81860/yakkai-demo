CREATE TABLE IF NOT EXISTS data.group_role_assignments (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES data.groups(id),
    role_id UUID NOT NULL REFERENCES data.roles(id),
    tenant_id UUID REFERENCES data.tenants(id),
    cloud_account_id UUID,
    component_id UUID,
    assigned_by UUID,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE (group_id, role_id, tenant_id, cloud_account_id, component_id)
);
