-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create data schema if not exists
CREATE SCHEMA IF NOT EXISTS data;

-- ------------------------------
-- Quota Limits Table
-- ------------------------------
CREATE TABLE IF NOT EXISTS data.quota_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type VARCHAR(50) NOT NULL,        -- USER, ROLE, GROUP, TENANT, CLOUD_ACCOUNT, COMPONENT
    scope_id VARCHAR(100) NOT NULL,         -- UUID or string representing the entity
    resource_type VARCHAR(50) NOT NULL,     -- e.g., VM, STORAGE, TENANT
    limit_count INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------
-- Quota Usage Table
-- ------------------------------
CREATE TABLE IF NOT EXISTS data.quota_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quota_id UUID NOT NULL REFERENCES data.quota_limits(id) ON DELETE CASCADE,
    current_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------
-- Quota Reservation Table
-- ------------------------------
CREATE TABLE IF NOT EXISTS data.quota_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quota_id UUID NOT NULL REFERENCES data.quota_limits(id) ON DELETE CASCADE,
    reserved_count INTEGER NOT NULL,
    reserved_for VARCHAR(100) NOT NULL,      -- User / Tenant / Component
    status VARCHAR(50) DEFAULT 'PENDING',    -- PENDING / CONFIRMED / RELEASED
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------
-- Quota Override Requests Table
-- ------------------------------
CREATE TABLE IF NOT EXISTS data.quota_override_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quota_id UUID NOT NULL REFERENCES data.quota_limits(id) ON DELETE CASCADE,
    requested_by VARCHAR(100) NOT NULL,
    requested_count INTEGER NOT NULL,
    is_emergency BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'PENDING',   -- PENDING / APPROVED / REJECTED
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
