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

const DRAWER_WIDTH = 280;

const AppLayout = () => {
    const { user, logout, isActive } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
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
            <Box sx={{ minHeight: '100vh', bgcolor: '#0A0E1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UnauthorizedView />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0A0E1A' }}>
            <Drawer
                variant="permanent"
                sx={{
                    width,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width,
                        transition: 'width 0.3s ease',
                        overflowX: 'hidden',
                        bgcolor: '#0D1117',
                        borderRight: '1px solid rgba(255,255,255,0.05)'
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
                                fontWeight: 900, fontSize: '1.2rem', color: '#fff', letterSpacing: -0.5, lineHeight: 1.2
                            }}>
                                YakkAI
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: '#6B7280', display: 'block', fontSize: '0.65rem', fontWeight: 600,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                                Multi-Cloud Infrastructure Platform
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                {/* Navigation Menu */}
                <List sx={{ px: 1.5, flex: 1, pt: 2, overflowY: 'auto' }}>
                    {menuItems.map((item, i) => {
                        if (item.divider) return <Divider key={`d-${i}`} sx={{ my: 1.5, mx: 1, borderColor: 'rgba(255,255,255,0.05)' }} />;
                        if (item.header) {
                            if (collapsed) return null;
                            return (
                                <Typography key={`h-${i}`} variant="overline" sx={{ pl: 2, py: 1, display: 'block', color: '#4B5563', fontSize: '0.65rem', letterSpacing: 2, fontWeight: 700 }}>
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
                                                '& .MuiListItemText-primary': { color: '#fff', fontWeight: 700 },
                                            },
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                            '&.Mui-disabled': { opacity: 0.3 }
                                        }}>
                                        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: selected ? '#6C63FF' : '#6B7280' }}>
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
                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Tooltip title={user?.email || user?.username || 'User Profile'} placement="right" arrow>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, cursor: 'default' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#6C63FF', fontSize: '0.8rem' }}>
                                {user?.username?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            {!collapsed && (
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#fff' }}>
                                        {user?.username || 'User'}
                                    </Typography>
                                </Box>
                            )}
                            {!collapsed && (
                                <IconButton size="small" onClick={logout} sx={{ color: '#6B7280' }}>
                                    <Logout fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    </Tooltip>
                </Box>

                {/* Sidebar Toggle */}
                <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: '#6B7280' }}>
                        <MenuIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{
                flexGrow: 1, p: 4,
                width: `calc(100vw - ${width}px)`,
                height: '100vh',
                overflow: 'hidden',
                transition: 'width 0.3s ease',
            }}>
                <Box sx={{ height: '100%', overflowY: 'auto' }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export default AppLayout;
