CREATE TABLE IF NOT EXISTS data.resource_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    icon VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data.canonical_resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_key VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL REFERENCES data.resource_categories(id) ON DELETE CASCADE,
    is_billable BOOLEAN DEFAULT FALSE,
    description TEXT,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data.provider_resource_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL,
    provider_resource_type VARCHAR(255) NOT NULL,
    canonical_type_id UUID NOT NULL REFERENCES data.canonical_resource_types(id) ON DELETE CASCADE,
    provider_display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_resource_type)
);

CREATE TABLE IF NOT EXISTS data.resource_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_type_id UUID NOT NULL REFERENCES data.canonical_resource_types(id) ON DELETE CASCADE,
    provider_resource_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value NUMERIC NOT NULL,
    UNIQUE (canonical_type_id, provider_resource_name, metric_name)
);
