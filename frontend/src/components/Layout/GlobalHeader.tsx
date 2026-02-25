import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, IconButton, Badge, Select, MenuItem, Button, Menu,
    ListItemIcon, ListItemText, Typography, Chip, Divider, Avatar, Tooltip
} from '@mui/material';
import {
    NotificationsNone, Brightness4, Brightness7, AttachMoney, CurrencyRupee,
    AdminPanelSettings, Business, ExpandMore, CheckCircle, Home, Person
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthProvider';
import { useSettings } from '../../contexts/SettingsContext';
import { useRole } from '../../contexts/RoleContext';
import { fetchUnreadNotificationCount } from '../../services/notificationsService';
import NotificationsDialog from '../Notifications/NotificationsDialog';
import ProfileDialog from '../Profile/ProfileDialog';

const GlobalHeader = () => {
    const { user } = useAuth();
    const { settings, updateSetting } = useSettings();
    const {
        viewMode, systemRole, tenantRoles, activeTenant,
        hasDualAccess, switchToSystem, switchToTenant, goToLanding,
    } = useRole();
    const navigate = useNavigate();

    // Notification State
    const [notifOpen, setNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [profileOpen, setProfileOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchUnreadNotificationCount(user.id).then(setUnreadCount).catch(console.error);
        }
    }, [user, notifOpen]);

    const handleSwitchToSystem = () => {
        switchToSystem();
        setAnchorEl(null);
        navigate('/');
    };

    const handleSwitchToTenant = (tenantId: string) => {
        switchToTenant(tenantId);
        setAnchorEl(null);
        navigate('/');
    };

    // View label helpers
    const currentLabel =
        viewMode === 'system' ? 'System View'
            : activeTenant ? activeTenant.tenant_name
                : 'Select View';

    const currentRoleName =
        viewMode === 'system'
            ? systemRole?.replace('system_', '').replace(/^\w/, c => c.toUpperCase())
            : activeTenant?.role?.replace('tenant_', '').replace(/^\w/, c => c.toUpperCase());

    const roleColor =
        currentRoleName === 'Admin' ? '#F43F5E'
            : currentRoleName === 'Manager' ? '#F59E0B'
                : '#10B981';

    const hasOptions = hasDualAccess || tenantRoles.length > 1;
    const showSwitcher = viewMode !== 'landing';

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
            {/* ── Left: Launch Pad + View Switcher ── */}
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Launch Pad — always visible when in system/tenant view */}
                {showSwitcher && (
                    <Tooltip title="Launch Pad — Switch View" arrow>
                        <IconButton
                            onClick={() => { goToLanding(); navigate('/'); }}
                            sx={{
                                bgcolor: 'rgba(108,99,255,0.08)',
                                border: '1px solid rgba(108,99,255,0.15)',
                                borderRadius: '12px',
                                width: 40, height: 40,
                                '&:hover': { bgcolor: 'rgba(108,99,255,0.18)' }
                            }}
                        >
                            <Home sx={{ color: '#6C63FF', fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                )}
                {showSwitcher && (
                    <Button
                        onClick={hasOptions ? (e) => setAnchorEl(e.currentTarget) : undefined}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            py: 1, px: 2, borderRadius: '12px',
                            bgcolor: 'rgba(108,99,255,0.06)',
                            border: '1px solid rgba(108,99,255,0.12)',
                            textTransform: 'none',
                            '&:hover': hasOptions ? { bgcolor: 'rgba(108,99,255,0.12)' } : {},
                            cursor: hasOptions ? 'pointer' : 'default',
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 28, height: 28,
                                bgcolor: viewMode === 'system' ? 'rgba(108,99,255,0.15)' : 'rgba(59,130,246,0.15)',
                                color: viewMode === 'system' ? '#6C63FF' : '#3B82F6',
                            }}
                        >
                            {viewMode === 'system'
                                ? <AdminPanelSettings sx={{ fontSize: 16 }} />
                                : <Business sx={{ fontSize: 16 }} />}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {currentLabel}
                        </Typography>
                        <Chip
                            label={currentRoleName}
                            size="small"
                            sx={{
                                height: 20, fontSize: '0.6rem', fontWeight: 800,
                                bgcolor: `${roleColor}15`, color: roleColor,
                                border: `1px solid ${roleColor}33`,
                            }}
                        />
                        {hasOptions && <ExpandMore sx={{ color: 'text.secondary', fontSize: 18 }} />}
                    </Button>
                )}

                {/* Dropdown */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    PaperProps={{
                        sx: {
                            mt: 1, minWidth: 260, borderRadius: '12px',
                            bgcolor: 'background.paper',
                            border: '1px solid rgba(128,128,128,0.1)',
                        }
                    }}
                    transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                >
                    {systemRole && (
                        <MenuItem
                            onClick={handleSwitchToSystem}
                            selected={viewMode === 'system'}
                            sx={{ borderRadius: '8px', mx: 1 }}
                        >
                            <ListItemIcon>
                                <AdminPanelSettings sx={{ color: viewMode === 'system' ? '#6C63FF' : 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary="System View"
                                secondary={systemRole.replace('system_', '').replace(/^\w/, c => c.toUpperCase())}
                                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                                secondaryTypographyProps={{ fontSize: '0.7rem' }}
                            />
                            {viewMode === 'system' && <CheckCircle sx={{ color: '#6C63FF', fontSize: 18, ml: 1 }} />}
                        </MenuItem>
                    )}

                    {systemRole && tenantRoles.length > 0 && (
                        <Divider sx={{ my: 1, mx: 2, borderColor: 'rgba(128,128,128,0.1)' }} />
                    )}

                    {tenantRoles.length > 0 && (
                        <Typography variant="overline" sx={{
                            px: 3, py: 0.5, display: 'block', color: 'text.secondary',
                            fontSize: '0.6rem', letterSpacing: 2, fontWeight: 700,
                        }}>
                            Tenants
                        </Typography>
                    )}

                    {tenantRoles.map(tr => {
                        const isSelected = viewMode === 'tenant' && activeTenant?.tenant_id === tr.tenant_id;
                        return (
                            <MenuItem
                                key={tr.tenant_id}
                                onClick={() => handleSwitchToTenant(tr.tenant_id)}
                                selected={isSelected}
                                sx={{ borderRadius: '8px', mx: 1 }}
                            >
                                <ListItemIcon>
                                    <Business sx={{ color: isSelected ? '#3B82F6' : 'text.secondary' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={tr.tenant_name}
                                    secondary={tr.role.replace('tenant_', '').replace(/^\w/, c => c.toUpperCase())}
                                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                                    secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                />
                                {isSelected && <CheckCircle sx={{ color: '#3B82F6', fontSize: 18, ml: 1 }} />}
                            </MenuItem>
                        );
                    })}
                </Menu>
            </Box>

            {/* ── Right: Controls ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Select
                    size="small"
                    value={settings?.currency || 'USD'}
                    onChange={(e) => updateSetting('currency', e.target.value)}
                    sx={{
                        minWidth: 100, bgcolor: 'background.paper', borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                >
                    <MenuItem value="USD"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AttachMoney fontSize="small" /> USD</Box></MenuItem>
                    <Tooltip title="Real-time currency conversion yet to be implemented" placement="left">
                        <span>
                            <MenuItem value="INR" disabled><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CurrencyRupee fontSize="small" /> INR</Box></MenuItem>
                        </span>
                    </Tooltip>
                </Select>

                <IconButton onClick={() => updateSetting('theme', settings?.theme === 'dark' ? 'light' : 'dark')} sx={{ color: 'text.secondary' }}>
                    {settings?.theme === 'dark' ? <Brightness7 /> : <Brightness4 />}
                </IconButton>

                <Tooltip title="My Profile">
                    <IconButton onClick={() => setProfileOpen(true)} sx={{ color: 'text.secondary' }}>
                        <Person />
                    </IconButton>
                </Tooltip>

                <IconButton onClick={() => setNotifOpen(true)} sx={{ color: 'text.secondary' }}>
                    <Badge badgeContent={unreadCount} color="error">
                        <NotificationsNone />
                    </Badge>
                </IconButton>

                <NotificationsDialog open={notifOpen} onClose={() => setNotifOpen(false)} />
                <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
            </Box>
        </Box>
    );
};

export default GlobalHeader;
