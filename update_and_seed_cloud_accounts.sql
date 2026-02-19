-- ====================================================================================
-- 1. UPDATE EXISTING ACCOUNTS
--    Normalize cred_metadata with 'allows_resources' and ensure 'account_type' is set.
-- ====================================================================================

-- AWS Standalone (f7f04737-8036-4e64-8747-957352bc47d0)
UPDATE data.cloud_accounts 
SET cred_metadata = jsonb_set(
    jsonb_set(cred_metadata, '{account_type}', '"standalone"'),
    '{allows_resources}', 'true'
)
WHERE id = 'f7f04737-8036-4e64-8747-957352bc47d0';

-- Azure Subscription (93e4e6d1-e68d-408c-948b-2f546919eb5b)
UPDATE data.cloud_accounts 
SET cred_metadata = jsonb_set(
    jsonb_set(cred_metadata, '{account_type}', '"subscription"'),
    '{allows_resources}', 'true'
)
WHERE id = '93e4e6d1-e68d-408c-948b-2f546919eb5b';

-- Azure Subscription (bb781417-8847-46cd-bf9d-eaf7d095d3e5)
UPDATE data.cloud_accounts 
SET cred_metadata = jsonb_set(
    jsonb_set(cred_metadata, '{account_type}', '"subscription"'),
    '{allows_resources}', 'true'
)
WHERE id = 'bb781417-8847-46cd-bf9d-eaf7d095d3e5';

-- AWS Standalone (2357cf1c-81fb-4e83-940e-8a25993922ef)
UPDATE data.cloud_accounts 
SET cred_metadata = jsonb_set(
    jsonb_set(cred_metadata, '{account_type}', '"standalone"'),
    '{allows_resources}', 'true'
)
WHERE id = '2357cf1c-81fb-4e83-940e-8a25993922ef';

-- AWS Management Account (2026ab3b-0633-447c-9ea9-b3a05ae92611)
-- Note: AWS Management accounts CAN hold resources.
UPDATE data.cloud_accounts 
SET cred_metadata = jsonb_set(
    jsonb_set(cred_metadata, '{account_type}', '"management"'),
    '{allows_resources}', 'true'
)
WHERE id = '2026ab3b-0633-447c-9ea9-b3a05ae92611';

-- AWS Standalone (494a0c45-0fdc-424f-a60d-aeb0eae5233e)
UPDATE data.cloud_accounts 
SET cred_metadata = jsonb_set(
    jsonb_set(cred_metadata, '{account_type}', '"standalone"'),
    '{allows_resources}', 'true'
)
WHERE id = '494a0c45-0fdc-424f-a60d-aeb0eae5233e';

-- AWS Members (Linked to Parent 2026ab3b...)
-- Update parent_id link in DB column just in case, and metadata
UPDATE data.cloud_accounts 
SET parent_id = '2026ab3b-0633-447c-9ea9-b3a05ae92611',
    cred_metadata = jsonb_set(
        jsonb_set(cred_metadata, '{account_type}', '"member"'),
        '{allows_resources}', 'true'
    )
WHERE id IN (
    'ff97bff4-2a8e-44d5-bb73-d9d48136a711',
    '47f979d0-cff2-45ae-a30b-1269ebf1c302',
    '2764a0cb-7b8a-48d8-9afc-5eeb6f5a4f43',
    '580a3954-9520-40af-ad62-78ae47a1a178'
);


-- ====================================================================================
-- 2. INSERT DUMMY DATA (Tenant: a0c327e8-79e5-424e-bbb1-def0d42b056b)
--    Covering all scenarios: 
--      AWS: Org -> OU -> Member
--      Azure: Tenant -> MG -> Subscription
-- ====================================================================================

-- ─── AWS HIERARCHY ───

-- 1. AWS Org Root (Management Account)
-- ID: 11111111-1111-1111-1111-111111110001
INSERT INTO data.cloud_accounts (
    id, tenant_id, parent_id, name, cloud_provider, ci_credentials_id, is_active, created_at, updated_at, 
    read_connection_status, write_connection_status, cred_metadata
) VALUES (
    '11111111-1111-1111-1111-111111110001', 
    'a0c327e8-79e5-424e-bbb1-def0d42b056b', 
    NULL, 
    'AWS Demo Org Root', 
    'aws', 
    '08333ff5-0ad0-4b42-a5b0-797ed77fc5c1', 
    true, NOW(), NOW(), 'success', 'success',
    '{
        "account_id": "111111111111",
        "role_name": "ManagementRole",
        "account_type": "management",
        "allows_resources": true,
        "credential_source": "own",
        "auth": {"role_arn": "arn:aws:iam::111111111111:role/ManagementRole"},
        "organization_context": {
            "is_part_of_organization": true,
            "organization_id": "o-example123"
        }
    }'
);

-- 2. AWS Organizational Unit (Child of Root)
-- ID: 11111111-1111-1111-1111-111111110002
INSERT INTO data.cloud_accounts (
    id, tenant_id, parent_id, name, cloud_provider, ci_credentials_id, is_active, created_at, updated_at, 
    read_connection_status, write_connection_status, cred_metadata
) VALUES (
    '11111111-1111-1111-1111-111111110002', 
    'a0c327e8-79e5-424e-bbb1-def0d42b056b', 
    '11111111-1111-1111-1111-111111110001', 
    'Engineering OU', 
    'aws', 
    '08333ff5-0ad0-4b42-a5b0-797ed77fc5c1', 
    true, NOW(), NOW(), 'not_tested', 'not_tested',
    '{
        "account_id": "ou-1234-abcd",
        "account_type": "organizational_unit",
        "allows_resources": false,
        "credential_source": "inherited",
        "auth": {"inherits_from_parent": true},
        "organization_context": {
            "organizational_unit_id": "ou-1234-abcd",
            "organizational_unit_name": "Engineering"
        }
    }'
);

-- 3. AWS Member Account (Child of OU)
-- ID: 11111111-1111-1111-1111-111111110003
INSERT INTO data.cloud_accounts (
    id, tenant_id, parent_id, name, cloud_provider, ci_credentials_id, is_active, created_at, updated_at, 
    read_connection_status, write_connection_status, cred_metadata
) VALUES (
    '11111111-1111-1111-1111-111111110003', 
    'a0c327e8-79e5-424e-bbb1-def0d42b056b', 
    '11111111-1111-1111-1111-111111110002', 
    'Prod Application', 
    'aws', 
    '08333ff5-0ad0-4b42-a5b0-797ed77fc5c1', 
    true, NOW(), NOW(), 'success', 'success',
    '{
        "account_id": "222222222222",
        "account_type": "member",
        "allows_resources": true,
        "credential_source": "inherited",
        "auth": {"inherits_from_parent": true, "role_name": "OrganizationAccountAccessRole"},
        "organization_context": {
            "organization_id": "o-example123",
            "organizational_unit_id": "ou-1234-abcd"
        }
    }'
);

-- 4. AWS Standalone Account
-- ID: 11111111-1111-1111-1111-111111110004
INSERT INTO data.cloud_accounts (
    id, tenant_id, parent_id, name, cloud_provider, ci_credentials_id, is_active, created_at, updated_at, 
    read_connection_status, write_connection_status, cred_metadata
) VALUES (
    '11111111-1111-1111-1111-111111110004', 
    'a0c327e8-79e5-424e-bbb1-def0d42b056b', 
    NULL, 
    'AWS Sandbox Standalone', 
    'aws', 
    '08333ff5-0ad0-4b42-a5b0-797ed77fc5c1', 
    true, NOW(), NOW(), 'success', 'success',
    '{
        "account_id": "333333333333",
        "role_name": "DevRole",
        "account_type": "standalone",
        "allows_resources": true,
        "credential_source": "own",
        "auth": {"role_arn": "arn:aws:iam::333333333333:role/DevRole"}
    }'
);


-- ─── AZURE HIERARCHY ───

-- 5. Azure Tenant Root
-- ID: 22222222-2222-2222-2222-222222220001
INSERT INTO data.cloud_accounts (
    id, tenant_id, parent_id, name, cloud_provider, ci_credentials_id, is_active, created_at, updated_at, 
    read_connection_status, write_connection_status, cred_metadata
) VALUES (
    '22222222-2222-2222-2222-222222220001', 
    'a0c327e8-79e5-424e-bbb1-def0d42b056b', 
    NULL, 
    'Azure BigCorp Tenant', 
    'azure', 
    '08333ff5-0ad0-4b42-a5b0-797ed77fc5c1', 
    true, NOW(), NOW(), 'success', 'success',
    '{
        "tenant_id": "00000000-0000-0000-0000-000000000000",
        "client_id": "client-id-mx",
        "client_secret": "secret",
        "account_type": "tenant",
        "allows_resources": false,
        "credential_source": "own",
        "organization_context": {"has_management_groups": true}
    }'
);

-- 6. Azure Management Group (Child of Tenant)
-- ID: 22222222-2222-2222-2222-222222220002
INSERT INTO data.cloud_accounts (
    id, tenant_id, parent_id, name, cloud_provider, ci_credentials_id, is_active, created_at, updated_at, 
    read_connection_status, write_connection_status, cred_metadata
) VALUES (
    '22222222-2222-2222-2222-222222220002', 
    'a0c327e8-79e5-424e-bbb1-def0d42b056b', 
    '22222222-2222-2222-2222-222222220001', 
    'Platform Team MG', 
    'azure', 
    '08333ff5-0ad0-4b42-a5b0-797ed77fc5c1', 
    true, NOW(), NOW(), 'not_tested', 'not_tested',
    '{
        "tenant_id": "00000000-0000-0000-0000-000000000000",
        "management_group_id": "mg-platform",
        "account_type": "management_group",
        "allows_resources": false,
        "credential_source": "inherited",
        "auth": {"inherits_from_parent": true},
        "provider_metadata": {"management_group_name": "Platform Team"}
    }'
);

-- 7. Azure Subscription (Child of MG)
-- ID: 22222222-2222-2222-2222-222222220003
INSERT INTO data.cloud_accounts (
    id, tenant_id, parent_id, name, cloud_provider, ci_credentials_id, is_active, created_at, updated_at, 
    read_connection_status, write_connection_status, cred_metadata
) VALUES (
    '22222222-2222-2222-2222-222222220003', 
    'a0c327e8-79e5-424e-bbb1-def0d42b056b', 
    '22222222-2222-2222-2222-222222220002', 
    'Production Subscription', 
    'azure', 
    '08333ff5-0ad0-4b42-a5b0-797ed77fc5c1', 
    true, NOW(), NOW(), 'success', 'success',
    '{
        "tenant_id": "00000000-0000-0000-0000-000000000000",
        "subscription_id": "11111111-1111-1111-1111-111111111111",
        "account_type": "subscription",
        "allows_resources": true,
        "credential_source": "inherited",
        "auth": {"inherits_from_parent": true},
        "organization_context": {"management_group_id": "mg-platform"}
    }'
);
