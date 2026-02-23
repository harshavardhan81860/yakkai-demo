import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton,
    Typography, Avatar, IconButton, Tooltip, Divider,
} from '@mui/material';
import {
    Assignment, CheckCircle, People, BarChart, Logout, Cloud,
    Menu as MenuIcon, Category, Policy, Inventory,
    Business, GroupWork, Security, Lan, Terminal, RocketLaunch
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthProvider';

import UnauthorizedView from '../Error/UnauthorizedView';
import GlobalHeader from './GlobalHeader';
import SettingsDialog from '../Settings/SettingsDialog';
import { Settings as SettingsIcon } from '@mui/icons-material';

const DRAWER_WIDTH = 280;

const AppLayout = () => {
    const { user, logout, isActive } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const width = !isActive ? 0 : (collapsed ? 72 : DRAWER_WIDTH);

    interface MenuItemType {
        header?: string;
        text?: string;
        icon?: React.ReactNode;
        path?: string;
        divider?: boolean;
        disabled?: boolean;
    }

    const menuItems: MenuItemType[] = [
        // ── Main ──
        { header: 'Infrastructure' },
        { text: 'Tenants', icon: <Business />, path: '/tenants' },
        { text: 'Runners', icon: <Terminal />, path: '/ci-credentials' },
        { divider: true },

        // ── Provisioning ──
        { header: 'Provisioning' },
        { text: 'My Requests', icon: <Inventory />, path: '/resource-request/list' },
        { text: 'New Request', icon: <RocketLaunch />, path: '/resource-request/new' },
        { divider: true },

        // ── Identity ──
        { header: 'Identity' },
        { text: 'Users', icon: <People />, path: '/users' },
        { text: 'Tenant Users', icon: <Business />, path: '/tenant-users' },
        { text: 'Groups', icon: <GroupWork />, path: '/groups' },
        { text: 'Roles', icon: <Security />, path: '/roles' },
        { divider: true },

        // ── Approvals ──
        { header: 'Approvals' },
        { text: 'My Approval Requests', icon: <Assignment />, path: '/approvals/requests' },
        { text: 'Pending Approvals', icon: <CheckCircle />, path: '/approvals/pending' },
        { text: 'History', icon: <BarChart />, path: '/approvals/history' },
        { text: 'Workflow Defined', icon: <Category />, path: '/approvals-management/templates' },
        { text: 'Workflow Mapping', icon: <Lan />, path: '/approvals-management/policy-mapping' },
        { text: 'Dummy Request', icon: <RocketLaunch />, path: '/approvals/approvalrequestcreate' },

        { divider: true },

        // ── Governance ──
        { header: 'Governance' },
        { text: 'Policy List', icon: <Policy />, path: '/permissions-management/policy_list' },
        { text: 'Policy Subjects', icon: <People />, path: '/permissions-management/policy_subjects' },
        { text: 'Resource Registry', icon: <Inventory />, path: '/registry' },
        { divider: true },
    ];

    // Prevent rendering if not authenticated (extra safety layer)
    /* If the user is authenticated but not active (e.g. INACTIVE or NOT_FOUND), show the Unauthorized view */
    if (!isActive || !user) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UnauthorizedView />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Drawer
                variant="permanent"
                sx={{
                    width,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width,
                        transition: 'width 0.3s ease',
                        overflowX: 'hidden',
                        bgcolor: 'background.paper',
                        borderRight: '1px solid rgba(128,128,128,0.1)'
                    },
                }}
            >
                {/* Brand Logo & Platform Description */}
                <Box
                    onClick={() => navigate('/')}
                    sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, minHeight: 90, cursor: 'pointer' }}
                >
                    {/* SWAPPABLE LOGO CONTAINER */}
                    <Box id="platform-logo" sx={{
                        display: 'flex', p: 1, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 100%)',
                        boxShadow: '0 4px 12px rgba(108,99,255,0.3)',
                        flexShrink: 0
                    }}>
                        <Cloud sx={{ color: '#fff' }} />
                    </Box>
                    {!collapsed && (
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" sx={{
                                fontWeight: 900, fontSize: '1.2rem', color: 'text.primary', letterSpacing: -0.5, lineHeight: 1.2
                            }}>
                                YakkAI
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: 'text.secondary', display: 'block', fontSize: '0.65rem', fontWeight: 600,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                                Multi-Cloud Infrastructure Platform
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ borderColor: 'rgba(128,128,128,0.1)' }} />

                {/* Navigation Menu */}
                <List sx={{ px: 1.5, flex: 1, pt: 2, overflowY: 'auto' }}>
                    {menuItems.map((item, i) => {
                        if (item.divider) return <Divider key={`d-${i}`} sx={{ my: 1.5, mx: 1, borderColor: 'rgba(128,128,128,0.1)' }} />;
                        if (item.header) {
                            if (collapsed) return null;
                            return (
                                <Typography key={`h-${i}`} variant="overline" sx={{ pl: 2, py: 1, display: 'block', color: 'text.secondary', fontSize: '0.65rem', letterSpacing: 2, fontWeight: 700 }}>
                                    {item.header}
                                </Typography>
                            );
                        }
                        const selected = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path!));
                        return (
                            <Tooltip title={collapsed ? item.text : ''} placement="right" key={item.text} arrow>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        disabled={item.disabled}
                                        onClick={() => !item.disabled && navigate(item.path!)}
                                        selected={selected}
                                        sx={{
                                            borderRadius: '12px', minHeight: 48, px: collapsed ? 2.5 : 2,
                                            '&.Mui-selected': {
                                                bgcolor: 'rgba(108,99,255,0.12)',
                                                '& .MuiListItemIcon-root': { color: '#6C63FF' },
                                                '& .MuiListItemText-primary': { color: 'text.primary', fontWeight: 700 },
                                            },
                                            '&:hover': { bgcolor: 'rgba(128,128,128,0.05)' },
                                            '&.Mui-disabled': { opacity: 0.3 }
                                        }}>
                                        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: selected ? '#6C63FF' : 'text.secondary' }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        {!collapsed && (
                                            <ListItemText
                                                primary={item.text}
                                                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                                            />
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            </Tooltip>
                        );
                    })}
                </List>

                {/* User Profile */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(128,128,128,0.1)' }}>
                    <Tooltip title={user?.email || user?.username || 'User Profile'} placement="right" arrow>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, cursor: 'default', mb: collapsed ? 0 : 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#6C63FF', fontSize: '0.8rem' }}>
                                {user?.username?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            {!collapsed && (
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {user?.username || 'User'}
                                    </Typography>
                                </Box>
                            )}
                            {!collapsed && (
                                <IconButton size="small" onClick={logout} sx={{ color: 'text.secondary' }}>
                                    <Logout fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    </Tooltip>

                    {!collapsed && (
                        <ListItemButton onClick={() => setSettingsOpen(true)} sx={{ borderRadius: '12px', minHeight: 40, px: 2, color: 'text.secondary', '&:hover': { bgcolor: 'rgba(128,128,128,0.05)' } }}>
                            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><SettingsIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }} />
                        </ListItemButton>
                    )}
                    {collapsed && (
                        <Box sx={{ mt: 1, textAlign: 'center' }}>
                            <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ color: 'text.secondary' }}>
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    )}
                </Box>

                {/* Sidebar Toggle */}
                <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid rgba(128,128,128,0.1)' }}>
                    <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: 'text.secondary' }}>
                        <MenuIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{
                flexGrow: 1, p: 4, pt: 2,
                width: `calc(100vw - ${width}px)`,
                height: '100vh',
                overflow: 'hidden',
                transition: 'width 0.3s ease',
            }}>
                <Box sx={{ height: '100%', overflowY: 'auto' }}>
                    <GlobalHeader />
                    <Outlet />
                </Box>
                <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
            </Box>
        </Box>
    );
};

export default AppLayout;
