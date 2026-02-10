CREATE TABLE IF NOT EXISTS data.cloud_accounts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES data.tenants(id),
    parent_id UUID REFERENCES data.cloud_accounts(id),

    -- normalized display name (trimmed in app layer)
    name VARCHAR NOT NULL,

    -- cloud type
    cloud_provider VARCHAR NOT NULL,

    -- READ layer auth (provider specific)
    cred_metadata JSONB NOT NULL,

    -- WRITE layer auth (OIDC / CI identity)
    ci_credentials_id UUID,

    -- READ layer connection tracking
    read_connection_status VARCHAR NOT NULL DEFAULT 'not_tested',
    read_last_validated_at TIMESTAMP,

    -- WRITE layer connection tracking
    write_connection_status VARCHAR NOT NULL DEFAULT 'not_tested',
    write_last_validated_at TIMESTAMP,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    -- enforce unique name per tenant (case/space handled in app)
    CONSTRAINT uq_cloud_account_name_per_tenant 
        UNIQUE (tenant_id, name)
);
