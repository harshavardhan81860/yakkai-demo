import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, IconButton, Divider, Switch, FormControlLabel, Select, MenuItem, Button } from '@mui/material';
import { Close as CloseIcon, Brightness4, Brightness7, AttachMoney, CurrencyRupee } from '@mui/icons-material';
import { useSettings } from '../../contexts/SettingsContext';

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
    const { settings, updateSetting } = useSettings();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper', backgroundImage: 'none' } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography variant="h6" fontWeight={800} color="text.primary">Settings</Typography>
                <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="body1" fontWeight={600} color="text.primary">Theme</Typography>
                    <IconButton onClick={() => updateSetting('theme', settings?.theme === 'dark' ? 'light' : 'dark')} sx={{ color: 'text.primary' }}>
                        {settings?.theme === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
                    </IconButton>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="body1" fontWeight={600} color="text.primary">Currency</Typography>
                    <Select size="small" value={settings?.currency || 'USD'} onChange={(e) => updateSetting('currency', e.target.value)} sx={{ minWidth: 120 }}>
                        <MenuItem value="USD"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AttachMoney fontSize="small" /> USD</Box></MenuItem>
                        <MenuItem value="INR"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CurrencyRupee fontSize="small" /> INR</Box></MenuItem>
                    </Select>
                </Box>

                <Divider sx={{ my: 3 }} />

                <FormControlLabel
                    control={<Switch checked={settings?.notifications_enabled ?? true} onChange={(e) => updateSetting('notifications_enabled', e.target.checked)} />}
                    label={<Typography variant="body1" color="text.primary">Enable Notifications</Typography>}
                    sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', width: '100%', ml: 0 }}
                    labelPlacement="start"
                />

                <FormControlLabel
                    control={<Switch checked={settings?.in_app_alerts_enabled ?? true} onChange={(e) => updateSetting('in_app_alerts_enabled', e.target.checked)} />}
                    label={<Typography variant="body1" color="text.primary">In-App Alerts</Typography>}
                    sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', ml: 0 }}
                    labelPlacement="start"
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} variant="contained" sx={{ borderRadius: 8 }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SettingsDialog;
