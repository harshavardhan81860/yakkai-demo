-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create schema
CREATE SCHEMA IF NOT EXISTS approval;

-- --------------------------------
-- approval_templates
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    default_sla_minutes INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (template_name, version)
);

-- --------------------------------
-- approval_template_levels
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_template_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL
        REFERENCES approval.approval_templates(id)
        ON DELETE CASCADE,
    level_order INTEGER NOT NULL,
    approval_mode VARCHAR(50) NOT NULL,
    approval_strategy VARCHAR(50) NOT NULL,
    required_approvals INTEGER NOT NULL,
    sla_minutes INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (template_id, level_order)
);

-- --------------------------------
-- approval_template_approvers
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_template_approvers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_level_id UUID NOT NULL
        REFERENCES approval.approval_template_levels(id)
        ON DELETE CASCADE,
    approver_type VARCHAR(50) NOT NULL,
    approver_value VARCHAR(100) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
