import api from './api';

export interface Category {
    id: string;
    category_key: string;
    display_name: string;
    icon?: string;
    display_order: number;
}

export interface CanonicalType {
    id: string;
    canonical_key: string;
    display_name: string;
    category_id: string;
    is_billable: boolean;
    description?: string;
    is_active: boolean;
    category?: Category;
}

export interface ProviderMapping {
    id: string;
    provider: string;
    provider_resource_type: string;
    canonical_type_id: string;
    provider_display_name?: string;
    is_active: boolean;
    canonical_type?: CanonicalType;
}

export interface UnmappedResource {
    provider: string;
    resource_type: string;
    resource_count: number;
}

const BASE = 'api/v1/resource-catalog';

export const resourceCatalogService = {
    // --- Categories ---
    getCategories: async (): Promise<Category[]> => {
        const res = await api.get(`${BASE}/categories`);
        return res.data;
    },

    createCategory: async (data: { category_key: string; display_name: string; icon?: string; display_order?: number }): Promise<Category> => {
        const res = await api.post(`${BASE}/categories`, data);
        return res.data;
    },

    updateCategory: async (id: string, data: { display_name?: string; icon?: string; display_order?: number }): Promise<Category> => {
        const res = await api.put(`${BASE}/categories/${id}`, data);
        return res.data;
    },

    // --- Canonical Types ---
    getCanonicalTypes: async (categoryId?: string): Promise<CanonicalType[]> => {
        const res = await api.get(`${BASE}/canonical-types`, { params: { category_id: categoryId } });
        return res.data;
    },

    createCanonicalType: async (data: { canonical_key: string; display_name: string; category_id: string; is_billable?: boolean; description?: string }): Promise<CanonicalType> => {
        const res = await api.post(`${BASE}/canonical-types`, data);
        return res.data;
    },

    updateCanonicalType: async (id: string, data: { display_name?: string; is_billable?: boolean; description?: string; is_active?: boolean }): Promise<CanonicalType> => {
        const res = await api.put(`${BASE}/canonical-types/${id}`, data);
        return res.data;
    },

    // --- Provider Mappings ---
    getMappings: async (provider?: string): Promise<ProviderMapping[]> => {
        const res = await api.get(`${BASE}/mappings`, { params: { provider } });
        return res.data;
    },

    createMapping: async (data: { provider: string; provider_resource_type: string; canonical_type_id: string; provider_display_name?: string }): Promise<ProviderMapping> => {
        const res = await api.post(`${BASE}/mappings`, data);
        return res.data;
    },

    deleteMapping: async (id: string): Promise<void> => {
        await api.delete(`${BASE}/mappings/${id}`);
    },

    // --- Unmapped Discovery ---
    getUnmapped: async (): Promise<UnmappedResource[]> => {
        const res = await api.get(`${BASE}/unmapped`);
        return res.data;
    },
};
