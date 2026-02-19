-- Azure Hierarchy Seed Data
-- Structure:
-- Tenant (BigCorp Azure)
--   └── MG: BigCorp Root (mg-root)
--         ├── MG: Platform Engineering (mg-platform)
--         │     ├── Subscription: Shared Services (sub-shared)
--         │     └── Subscription: CI/CD Runners (sub-cicd)
--         └── MG: Landing Zones (mg-lz)
--               ├── MG: Corp (mg-corp)
--               │     └── Subscription: Corp Production (sub-corp-prod)
--               └── MG: Online (mg-online)
--                     └── Subscription: E-Commerce Prod (sub-ecom-prod)

BEGIN;

-- 1. Tenant
INSERT INTO cloud_accounts (id, tenant_id, name, cloud_provider, cred_metadata, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001', 
    '1', 
    'BigCorp Azure Tenant', 
    'azure', 
    '{
        "tenant_id": "72f988bf-86f1-41af-91ab-2d7cd011db47",
        "account_type": "tenant",
        "organization_context": {"total_subscriptions_discovered": 4}
    }', 
    true, NOW(), NOW()
);

-- 2. Root Management Group
INSERT INTO cloud_accounts (id, tenant_id, parent_id, name, cloud_provider, cred_metadata, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440002', 
    '1', 
    '550e8400-e29b-41d4-a716-446655440001', -- Parent: Tenant
    'BigCorp Root Group', 
    'azure', 
    '{
        "management_group_id": "bigcorp-root",
        "account_type": "management_group",
        "organization_context": {"parent_management_group_id": null}
    }', 
    true, NOW(), NOW()
);

-- 3. Level 2 MGs
-- Platform Engineering
INSERT INTO cloud_accounts (id, tenant_id, parent_id, name, cloud_provider, cred_metadata, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440003', '1', '550e8400-e29b-41d4-a716-446655440002', 
    'Platform Engineering', 'azure', 
    '{"management_group_id": "mg-platform", "account_type": "management_group"}', true, NOW(), NOW()
);

-- Landing Zones
INSERT INTO cloud_accounts (id, tenant_id, parent_id, name, cloud_provider, cred_metadata, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440004', '1', '550e8400-e29b-41d4-a716-446655440002', 
    'Landing Zones', 'azure', 
    '{"management_group_id": "mg-lz", "account_type": "management_group"}', true, NOW(), NOW()
);

-- 4. Level 3 MGs (under Landing Zones)
INSERT INTO cloud_accounts (id, tenant_id, parent_id, name, cloud_provider, cred_metadata, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440005', '1', '550e8400-e29b-41d4-a716-446655440004', 
    'Corp', 'azure', 
    '{"management_group_id": "mg-corp", "account_type": "management_group"}', true, NOW(), NOW()
);

INSERT INTO cloud_accounts (id, tenant_id, parent_id, name, cloud_provider, cred_metadata, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440006', '1', '550e8400-e29b-41d4-a716-446655440004', 
    'Online', 'azure', 
    '{"management_group_id": "mg-online", "account_type": "management_group"}', true, NOW(), NOW()
);

-- 5. Subscriptions
-- Shared Services (under Platform)
INSERT INTO cloud_accounts (id, tenant_id, parent_id, name, cloud_provider, cred_metadata, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440010', '1', '550e8400-e29b-41d4-a716-446655440003', 
    'Shared Services', 'azure', 
    '{"subscription_id": "sub-shared-111", "account_type": "subscription"}', true, NOW(), NOW()
);

-- Corp Prod (under Corp)
INSERT INTO cloud_accounts (id, tenant_id, parent_id, name, cloud_provider, cred_metadata, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440011', '1', '550e8400-e29b-41d4-a716-446655440005', 
    'Corp Production', 'azure', 
    '{"subscription_id": "sub-corp-prod-222", "account_type": "subscription"}', true, NOW(), NOW()
);

COMMIT;
