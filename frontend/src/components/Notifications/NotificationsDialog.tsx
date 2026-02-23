import { useEffect, useState } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, Divider, Chip, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import { DoneAll, CheckCircleOutline, CircleNotifications, Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '../../auth/AuthProvider';
import { useSettings } from '../../contexts/SettingsContext';
import { fetchUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from '../../services/notificationsService';

interface NotificationsDialogProps {
    open: boolean;
    onClose: () => void;
}

const NotificationsDialog = ({ open, onClose }: NotificationsDialogProps) => {
    const { user } = useAuth();
    const { settings, updateSetting } = useSettings();
    const [notifs, setNotifs] = useState<Notification[]>([]);

    useEffect(() => {
        if (open && user) {
            fetchUserNotifications(user.id).then(setNotifs).catch(console.error);
        }
    }, [open, user]);

    const handleMarkAsRead = async (id: string) => {
        if (!user) return;
        try {
            await markNotificationAsRead(id, user.id);
            setNotifs(notifs.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) { }
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        try {
            await markAllNotificationsAsRead(user.id);
            setNotifs(notifs.map(n => ({ ...n, is_read: true })));
        } catch (err) { }
    };

    const unreadCount = notifs.filter(n => !n.is_read).length;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper', backgroundImage: 'none' } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box>
                    <Typography variant="h6" fontWeight={800}>Notifications</Typography>
                    <Typography variant="body2" color="text.secondary">Alerts from the past 30 days</Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, height: 400 }}>
                {notifs.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                        <CircleNotifications sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                        <Typography color="text.secondary">You're all caught up! No notifications to display.</Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {notifs.map((notif, index) => (
                            <Box key={notif.id}>
                                <ListItem sx={{ p: 2, bgcolor: notif.is_read ? 'transparent' : 'rgba(108,99,255,0.05)', display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                    <CircleNotifications sx={{ color: notif.is_read ? 'text.secondary' : 'primary.main', mt: 0.5 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="subtitle2" fontWeight={notif.is_read ? 500 : 700} color="text.primary">{notif.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{new Date(notif.created_at).toLocaleString()}</Typography>
                                        </Box>
                                        <Typography variant="body2" color={notif.is_read ? 'text.secondary' : 'text.primary'} sx={{ mb: 1 }}>{notif.message}</Typography>
                                        {!notif.is_read && (
                                            <Chip label="Mark Read" size="small" icon={<CheckCircleOutline fontSize="small" />} onClick={() => handleMarkAsRead(notif.id)} sx={{ cursor: 'pointer', bgcolor: 'rgba(128,128,128,0.1)' }} />
                                        )}
                                    </Box>
                                </ListItem>
                                {index < notifs.length - 1 && <Divider />}
                            </Box>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between', bgcolor: 'background.default' }}>
                <FormControlLabel
                    control={<Switch size="small" checked={settings?.notifications_enabled ?? true} onChange={(e) => updateSetting('notifications_enabled', e.target.checked)} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Receive Alerts</Typography>}
                    sx={{ ml: 1 }}
                />
                <Box>
                    {unreadCount > 0 && (
                        <Button startIcon={<DoneAll />} variant="outlined" size="small" onClick={handleMarkAllAsRead} sx={{ borderRadius: 8, mr: 1, borderColor: 'rgba(128,128,128,0.2)' }}>Mark All Read</Button>
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default NotificationsDialog;
