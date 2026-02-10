-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create schema
CREATE SCHEMA IF NOT EXISTS approval;

-- --------------------------------
-- approval_policy
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    resource_name VARCHAR(100) NOT NULL,
    action_name VARCHAR(50) NOT NULL,

    scope_type VARCHAR(50) NOT NULL,
    scope_id VARCHAR(100) NOT NULL,

    template_id UUID NOT NULL,

    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------
-- approval_condition_group
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_condition_group (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    policy_id UUID NOT NULL
        REFERENCES approval.approval_policy(id)
        ON DELETE CASCADE,

    operator VARCHAR(10) NOT NULL, -- AND / OR

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------
-- approval_condition
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_condition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL
        REFERENCES approval.approval_condition_group(id)
        ON DELETE CASCADE,

    attribute VARCHAR(100) NOT NULL,
    operator VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
