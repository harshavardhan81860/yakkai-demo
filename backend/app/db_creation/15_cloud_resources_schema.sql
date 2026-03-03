CREATE TABLE IF NOT EXISTS data.cloud_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES data.tenants(id) ON DELETE CASCADE,
    cloud_account_id UUID NOT NULL REFERENCES data.cloud_accounts(id) ON DELETE CASCADE,
    
    provider VARCHAR NOT NULL,
    resource_type VARCHAR NOT NULL,
    provider_resource_id VARCHAR NOT NULL UNIQUE,
    
    name VARCHAR NOT NULL,
    region VARCHAR,
    resource_group VARCHAR,
    status VARCHAR NOT NULL,
    
    tags JSONB,
    creation_request_id UUID,
    
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_cloud_resources_tenant_id ON data.cloud_resources(tenant_id);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_cloud_account_id ON data.cloud_resources(cloud_account_id);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_provider ON data.cloud_resources(provider);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_resource_type ON data.cloud_resources(resource_type);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_provider_resource_id ON data.cloud_resources(provider_resource_id);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_region ON data.cloud_resources(region);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_resource_group ON data.cloud_resources(resource_group);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_status ON data.cloud_resources(status);
CREATE INDEX IF NOT EXISTS ix_cloud_resources_creation_request_id ON data.cloud_resources(creation_request_id);


CREATE TABLE IF NOT EXISTS data.cloud_resource_payloads (
    resource_id UUID PRIMARY KEY REFERENCES data.cloud_resources(id) ON DELETE CASCADE,
    raw_payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS data.resource_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cloud_account_id UUID NOT NULL REFERENCES data.cloud_accounts(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    resources_found INTEGER DEFAULT 0,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_resource_sync_jobs_cloud_account_id ON data.resource_sync_jobs(cloud_account_id);
CREATE INDEX IF NOT EXISTS ix_resource_sync_jobs_status ON data.resource_sync_jobs(status);
CREATE INDEX IF NOT EXISTS ix_resource_sync_jobs_started_at ON data.resource_sync_jobs(started_at);
