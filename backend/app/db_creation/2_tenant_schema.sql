CREATE SCHEMA IF NOT EXISTS data;

CREATE TABLE IF NOT EXISTS data.tenants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_active
ON data.tenants (is_active);
