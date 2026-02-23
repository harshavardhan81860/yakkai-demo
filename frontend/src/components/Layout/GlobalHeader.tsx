import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, IconButton, Badge, Select, MenuItem
} from '@mui/material';
import {
    NotificationsNone, Brightness4, Brightness7, AttachMoney, CurrencyRupee
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthProvider';
import { useSettings } from '../../contexts/SettingsContext';
import { fetchUnreadNotificationCount } from '../../services/notificationsService';
import NotificationsDialog from '../Notifications/NotificationsDialog';

const GlobalHeader = () => {
    const { user } = useAuth();
    const { settings, updateSetting } = useSettings();

    // Notification State
    const [notifOpen, setNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            fetchUnreadNotificationCount(user.id).then(setUnreadCount).catch(console.error);
        }
    }, [user, notifOpen]);

    return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3, gap: 2 }}>
            <Select
                size="small"
                value={settings?.currency || 'USD'}
                onChange={(e) => updateSetting('currency', e.target.value)}
                sx={{
                    minWidth: 100,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
            >
                <MenuItem value="USD"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AttachMoney fontSize="small" /> USD</Box></MenuItem>
                <MenuItem value="INR"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CurrencyRupee fontSize="small" /> INR</Box></MenuItem>
            </Select>

            {/* Theme Toggle Icon */}
            <IconButton onClick={() => updateSetting('theme', settings?.theme === 'dark' ? 'light' : 'dark')} sx={{ color: 'text.secondary' }}>
                {settings?.theme === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>

            {/* Notifications Icon & Popover */}
            <IconButton onClick={() => setNotifOpen(true)} sx={{ color: 'text.secondary' }}>
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsNone />
                </Badge>
            </IconButton>

            <NotificationsDialog open={notifOpen} onClose={() => setNotifOpen(false)} />
        </Box >
    );
};

export default GlobalHeader;
