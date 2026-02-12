-- ------------------------------
-- Seed Resource Registry
-- ------------------------------
INSERT INTO data.resource_registry (resource_name, description) VALUES
('USER', 'System User management and identity'),
('TENANT', 'Enterprise Tenant and Logical Partitioning'),
('ROLE', 'Access Control Roles and Permissions'),
('GROUP', 'User Grouping and Role Assignment containers'),
('CLOUD_ACCOUNT', 'External Cloud Provider Accounts (AWS, Azure)'),
('CI_CREDENTIALS', 'CI/CD Platform Credentials and API Keys'),
('CI_PIPELINE', 'Automated Resource Provisioning Pipelines'),
('APPROVAL_TEMPLATE', 'Workflow Protocol Definitions'),
('APPROVAL_REQUEST', 'Active Governance Gate Instances'),
('APPROVAL_MAPPING', 'Semantic Logic connecting Actions to Protocols'),
('QUOTA', 'Resource Constraint and Consumption tracking'),
('GOVERNANCE', 'System-wide policy and compliance rules')
ON CONFLICT (resource_name) DO NOTHING;

-- ------------------------------
-- Seed Action Registry
-- ------------------------------
INSERT INTO data.action_registry (action_name, description) VALUES
('CREATE', 'Initialize new resource instance'),
('UPDATE', 'Modify existing resource attributes'),
('DELETE', 'Terminate or Remove resource instance'),
('READ', 'Query or Fetch resource data'),
('ACTIVATE', 'Enable suspended resource'),
('DEACTIVATE', 'Suspend or Disable resource'),
('ASSIGN', 'Bind resources together (e.g. Role to User)'),
('REVOKE', 'Remove binding between resources'),
('SUBMIT', 'Initiate a workflow approval request'),
('APPROVE', 'Validate and allow a gated operation'),
('REJECT', 'Deny and Block a gated operation'),
('CANCEL', 'Abort an active workflow request'),
('EVALUATE', 'Check consumption against limits'),
('RESERVE', 'Temporarily lock quota for pending request'),
('FINALIZE', 'Commit or Release quota after decision')
ON CONFLICT (action_name) DO NOTHING;

-- ------------------------------
-- Seed Scope Registry
-- ------------------------------
INSERT INTO data.scope_registry (scope_name, description) VALUES
('SYSTEM', 'Platform-wide Global Scope'),
('TENANT', 'Specific Organizational Tenant Scope'),
('USER', 'Individual User Personal Scope'),
('CLOUD_ACCOUNT', 'Target Cloud Environment Scope')
ON CONFLICT (scope_name) DO NOTHING;
