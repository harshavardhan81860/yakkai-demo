-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create schema
CREATE SCHEMA IF NOT EXISTS approval;

-- --------------------------------
-- approval_requests
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL,
    template_version INTEGER NOT NULL,

    requested_by VARCHAR(100) NOT NULL,
    request_payload JSON,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    current_level INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- --------------------------------
-- approval_request_explicit_approvers
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_request_explicit_approvers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    request_id UUID NOT NULL
        REFERENCES approval.approval_requests(id)
        ON DELETE CASCADE,

    level_order INTEGER NOT NULL,

    approver_type VARCHAR(20) NOT NULL,
    approver_value VARCHAR(100) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (request_id, level_order, approver_type, approver_value)
);

-- --------------------------------
-- approval_actions
-- --------------------------------
CREATE TABLE IF NOT EXISTS approval.approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    request_id UUID NOT NULL
        REFERENCES approval.approval_requests(id)
        ON DELETE CASCADE,

    level_order INTEGER NOT NULL,

    approver_username VARCHAR(100) NOT NULL,
    approver_source VARCHAR(20) NOT NULL,

    decision VARCHAR(20) NOT NULL,
    comment TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
