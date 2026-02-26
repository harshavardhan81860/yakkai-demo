-- backend/app/db_creation/14_finops.sql

CREATE SCHEMA IF NOT EXISTS finops;

CREATE TABLE IF NOT EXISTS finops.daily_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    account_id UUID NOT NULL,
    provider_account_id VARCHAR NOT NULL,
    date DATE NOT NULL,
    provider VARCHAR NOT NULL,
    service_name VARCHAR NOT NULL,
    portal_resource_type VARCHAR NOT NULL DEFAULT 'Other',
    resource_id VARCHAR,
    creation_origin VARCHAR NOT NULL DEFAULT 'cloud',
    region VARCHAR,
    resource_group VARCHAR,
    tags JSONB,
    amortized_cost NUMERIC(18, 6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fc_tenant_id ON finops.daily_costs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fc_account_id ON finops.daily_costs(account_id);
CREATE INDEX IF NOT EXISTS idx_fc_provider_account_id ON finops.daily_costs(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_fc_date ON finops.daily_costs(date);
CREATE INDEX IF NOT EXISTS idx_fc_service_name ON finops.daily_costs(service_name);

CREATE TABLE IF NOT EXISTS finops.fetch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_log VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_fj_account_id ON finops.fetch_jobs(account_id);
CREATE INDEX IF NOT EXISTS idx_fj_start_date ON finops.fetch_jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_fj_end_date ON finops.fetch_jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_fj_status ON finops.fetch_jobs(status);
