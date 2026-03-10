-- Categories
INSERT INTO data.resource_categories (id, category_key, display_name, display_order)
VALUES 
    (gen_random_uuid(), 'COMPUTE', 'Compute', 1),
    (gen_random_uuid(), 'STORAGE', 'Storage', 2),
    (gen_random_uuid(), 'DATABASE', 'Database', 3),
    (gen_random_uuid(), 'NETWORK', 'Networking', 4),
    (gen_random_uuid(), 'SECURITY', 'Security & Identity', 5),
    (gen_random_uuid(), 'MONITORING', 'Monitoring & Analytics', 6),
    (gen_random_uuid(), 'OTHER', 'Other Services', 99)
ON CONFLICT (category_key) DO NOTHING;

-- Canonical Types (using DO NOTHING to avoid conflicts)
INSERT INTO data.canonical_resource_types (id, canonical_key, display_name, category_id, is_billable)
SELECT gen_random_uuid(), 'SERVER', 'Server', id, true FROM data.resource_categories WHERE category_key = 'COMPUTE'
ON CONFLICT (canonical_key) DO NOTHING;

INSERT INTO data.canonical_resource_types (id, canonical_key, display_name, category_id, is_billable)
SELECT gen_random_uuid(), 'MANAGED_DISK', 'Managed Disk', id, true FROM data.resource_categories WHERE category_key = 'STORAGE'
ON CONFLICT (canonical_key) DO NOTHING;

INSERT INTO data.canonical_resource_types (id, canonical_key, display_name, category_id, is_billable)
SELECT gen_random_uuid(), 'STORAGE_ACCOUNT', 'Storage Account', id, true FROM data.resource_categories WHERE category_key = 'STORAGE'
ON CONFLICT (canonical_key) DO NOTHING;

INSERT INTO data.canonical_resource_types (id, canonical_key, display_name, category_id, is_billable)
SELECT gen_random_uuid(), 'VPC', 'Virtual Network', id, false FROM data.resource_categories WHERE category_key = 'NETWORK'
ON CONFLICT (canonical_key) DO NOTHING;

INSERT INTO data.canonical_resource_types (id, canonical_key, display_name, category_id, is_billable)
SELECT gen_random_uuid(), 'SUBNET', 'Subnet', id, false FROM data.resource_categories WHERE category_key = 'NETWORK'
ON CONFLICT (canonical_key) DO NOTHING;

INSERT INTO data.canonical_resource_types (id, canonical_key, display_name, category_id, is_billable)
SELECT gen_random_uuid(), 'SECURITY_GROUP', 'Security Group', id, false FROM data.resource_categories WHERE category_key = 'NETWORK'
ON CONFLICT (canonical_key) DO NOTHING;

INSERT INTO data.canonical_resource_types (id, canonical_key, display_name, category_id, is_billable)
SELECT gen_random_uuid(), 'PUBLIC_IP', 'Public IP Address', id, true FROM data.resource_categories WHERE category_key = 'NETWORK'
ON CONFLICT (canonical_key) DO NOTHING;

INSERT INTO data.canonical_resource_types (id, canonical_key, display_name, category_id, is_billable)
SELECT gen_random_uuid(), 'NETWORK_INTERFACE', 'Network Interface', id, false FROM data.resource_categories WHERE category_key = 'NETWORK'
ON CONFLICT (canonical_key) DO NOTHING;

-- Provider Mappings
INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AZURE', 'microsoft.compute/disks', id, 'Managed Disk' FROM data.canonical_resource_types WHERE canonical_key = 'MANAGED_DISK'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AZURE', 'microsoft.compute/virtualmachines', id, 'Virtual Machine' FROM data.canonical_resource_types WHERE canonical_key = 'SERVER'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AZURE', 'microsoft.storage/storageaccounts', id, 'Storage Account' FROM data.canonical_resource_types WHERE canonical_key = 'STORAGE_ACCOUNT'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AZURE', 'microsoft.network/virtualnetworks', id, 'Virtual Network' FROM data.canonical_resource_types WHERE canonical_key = 'VPC'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AZURE', 'microsoft.network/networksecuritygroups', id, 'Network Security Group' FROM data.canonical_resource_types WHERE canonical_key = 'SECURITY_GROUP'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AZURE', 'microsoft.network/publicipaddresses', id, 'Public IP Address' FROM data.canonical_resource_types WHERE canonical_key = 'PUBLIC_IP'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AZURE', 'microsoft.network/networkinterfaces', id, 'Network Interface' FROM data.canonical_resource_types WHERE canonical_key = 'NETWORK_INTERFACE'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AWS', 'ec2:instance', id, 'EC2 Instance' FROM data.canonical_resource_types WHERE canonical_key = 'SERVER'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AWS', 'ec2:vpc', id, 'VPC' FROM data.canonical_resource_types WHERE canonical_key = 'VPC'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AWS', 'ec2:subnet', id, 'Subnet' FROM data.canonical_resource_types WHERE canonical_key = 'SUBNET'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;

INSERT INTO data.provider_resource_mappings (id, provider, provider_resource_type, canonical_type_id, provider_display_name)
SELECT gen_random_uuid(), 'AWS', 'ec2:security-group', id, 'Security Group' FROM data.canonical_resource_types WHERE canonical_key = 'SECURITY_GROUP'
ON CONFLICT (provider, provider_resource_type) DO NOTHING;
