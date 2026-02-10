-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create schema
CREATE SCHEMA IF NOT EXISTS data;

-- --------------------------------
-- governance_policy
-- --------------------------------
CREATE TABLE IF NOT EXISTS data.governance_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    resource_type VARCHAR(100) NOT NULL,
    action_name VARCHAR(50) NOT NULL,
    effect VARCHAR(10) NOT NULL,          -- ALLOW / DENY
    scope_type VARCHAR(50) NOT NULL,
    scope_id VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------
-- governance_policy_subject
-- --------------------------------
CREATE TABLE IF NOT EXISTS data.governance_policy_subject (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    policy_id UUID NOT NULL
        REFERENCES data.governance_policy(id)
        ON DELETE CASCADE,

    subject_type VARCHAR(20) NOT NULL,    -- USER / ROLE / GROUP
    subject_id VARCHAR(100) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------
-- governance_resource_access
-- --------------------------------
CREATE TABLE IF NOT EXISTS data.governance_resource_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    action_name VARCHAR(50) NOT NULL,

    subject_type VARCHAR(20) NOT NULL,
    subject_id VARCHAR(100) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
