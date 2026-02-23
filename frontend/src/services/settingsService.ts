import api from './api';

export interface UserSettings {
    id: string;
    user_id: string;
    notifications_enabled: boolean;
    in_app_alerts_enabled: boolean;
    theme: 'light' | 'dark';
    currency: 'USD' | 'INR';
}

export const fetchUserSettings = async (userId: string): Promise<UserSettings> => {
    const response = await api.get(`api/v1/settings/${userId}`);
    return response.data.data.settings;
};

export const updateUserSettings = async (userId: string, data: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await api.put(`api/v1/settings/${userId}`, data);
    return response.data.data.settings;
};
