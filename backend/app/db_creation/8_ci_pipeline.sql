CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS data.ci_pipeline_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cloud_account_id UUID NOT NULL,
    ci_credentials_id UUID NOT NULL,

    provider TEXT NOT NULL,
    action TEXT NOT NULL,

    pipeline_id TEXT,
    ref TEXT,

    status TEXT NOT NULL,
    raw_response JSON,
    job_logs JSON,
    artifacts JSON,

    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
