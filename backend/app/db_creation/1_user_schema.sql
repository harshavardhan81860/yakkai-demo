CREATE SCHEMA IF NOT EXISTS data;

CREATE TABLE IF NOT EXISTS data.users (
    id UUID PRIMARY KEY,
    keycloak_id VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    username VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    mobile VARCHAR,
    department VARCHAR,
    gender VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON data.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON data.users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON data.users(is_active);

-- Default test user
INSERT INTO data.users (
    id,
    keycloak_id,
    email,
    username,
    first_name,
    is_active
)
VALUES (
    gen_random_uuid(),
    '12343221',
    'test@test.com',
    'test',
    'testing user',
    true
)
ON CONFLICT DO NOTHING;
