import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { fetchUserSettings, updateUserSettings, UserSettings } from '../services/settingsService';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getAppTheme } from '../theme';

interface SettingsContextType {
    settings: UserSettings | null;
    updateSetting: (key: keyof UserSettings, value: any) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isActive } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (user && isActive) {
            setLoading(true);
            fetchUserSettings(user.id)
                .then(data => setSettings(data))
                .catch(err => console.error("Error fetching settings:", err))
                .finally(() => setLoading(false));
        } else {
            setSettings(null);
            setLoading(false);
        }
    }, [user, isActive]);

    const updateSetting = async (key: keyof UserSettings, value: any) => {
        if (!user || !settings) return;

        // Optimistic update
        const previousSettings = { ...settings };
        setSettings({ ...settings, [key]: value });

        try {
            const updated = await updateUserSettings(user.id, { [key]: value });
            setSettings(updated);
        } catch (error) {
            console.error("Failed to update setting", error);
            setSettings(previousSettings); // Revert on failure
        }
    };

    // Default to dark mode if not yet loaded
    const currentThemeMode = settings?.theme || 'dark';
    const activeTheme = getAppTheme(currentThemeMode as 'light' | 'dark');

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, loading }}>
            <ThemeProvider theme={activeTheme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
