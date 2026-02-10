-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create schema
CREATE SCHEMA IF NOT EXISTS data;

-- ------------------------------
-- Resource Registry
-- ------------------------------
CREATE TABLE IF NOT EXISTS data.resource_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------
-- Action Registry
-- ------------------------------
CREATE TABLE IF NOT EXISTS data.action_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ------------------------------
-- Scope Registry Table
-- ------------------------------
CREATE TABLE IF NOT EXISTS data.scope_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_name VARCHAR(50) NOT NULL UNIQUE,   -- user, group, tenant, etc
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);