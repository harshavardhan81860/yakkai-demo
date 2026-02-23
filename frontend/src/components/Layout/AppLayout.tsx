import { useState, useMemo } from 'react';
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
import { useRole } from '../../contexts/RoleContext';

import UnauthorizedView from '../Error/UnauthorizedView';
import GlobalHeader from './GlobalHeader';

import SettingsDialog from '../Settings/SettingsDialog';
import { Settings as SettingsIcon } from '@mui/icons-material';

const DRAWER_WIDTH = 280;

interface MenuItemType {
    header?: string;
    text?: string;
    icon?: React.ReactNode;
    path?: string;
    divider?: boolean;
    disabled?: boolean;
}

/* ────────────────────────────────────────────
   Menu definitions per view mode & role
   ──────────────────────────────────────────── */

const getSystemMenuItems = (roleName: string | null): MenuItemType[] => {
    const isAdmin = roleName === 'system_admin';
    const isManager = roleName === 'system_manager';
    const isUser = roleName === 'system_user';
    const canManage = isAdmin || isManager;

    const items: MenuItemType[] = [
        // ── Infrastructure ──
        { header: 'Infrastructure' },
        { text: 'Tenants', icon: <Business />, path: '/tenants' },
    ];

    if (canManage) {
        items.push({ text: 'Runners', icon: <Terminal />, path: '/ci-credentials' });
    }

    items.push({ divider: true });

    // ── Provisioning (view-only for system roles — no resource creation) ──
    items.push({ header: 'Provisioning' });
    items.push({ text: 'All Requests', icon: <Inventory />, path: '/resource-request/list' });
    items.push({ divider: true });

    // ── Identity ── (admin + manager see full, user sees subset)
    items.push({ header: 'Identity' });
    items.push({ text: 'Users', icon: <People />, path: '/users' });
    if (canManage) {
        items.push({ text: 'Tenant Users', icon: <Business />, path: '/tenant-users' });
        items.push({ text: 'Groups', icon: <GroupWork />, path: '/groups' });
        items.push({ text: 'Roles', icon: <Security />, path: '/roles' });
    }
    items.push({ divider: true });

    // ── Approvals ──
    items.push({ header: 'Approvals' });
    items.push({ text: 'My Approval Requests', icon: <Assignment />, path: '/approvals/requests' });
    items.push({ text: 'Pending Approvals', icon: <CheckCircle />, path: '/approvals/pending' });
    items.push({ text: 'History', icon: <BarChart />, path: '/approvals/history' });
    if (canManage) {
        items.push({ text: 'Workflow Defined', icon: <Category />, path: '/approvals-management/templates' });
        items.push({ text: 'Workflow Mapping', icon: <Lan />, path: '/approvals-management/policy-mapping' });
    }
    items.push({ divider: true });

    // ── Governance ── (admin + manager only)
    if (canManage) {
        items.push({ header: 'Governance' });
        items.push({ text: 'Policy List', icon: <Policy />, path: '/permissions-management/policy_list' });
        items.push({ text: 'Policy Subjects', icon: <People />, path: '/permissions-management/policy_subjects' });
        items.push({ text: 'Resource Registry', icon: <Inventory />, path: '/registry' });
        items.push({ divider: true });
    }

    return items;
};

const getTenantMenuItems = (tenantId: string, roleName: string | null): MenuItemType[] => {
    const isAdmin = roleName === 'tenant_admin';
    const isManager = roleName === 'tenant_manager';
    const isUser = roleName === 'tenant_user';
    const canManage = isAdmin || isManager;

    const base = `/tenants/${tenantId}`;

    const items: MenuItemType[] = [
        // ── Workspace ──
        { header: 'Workspace' },
        { text: 'Cloud Accounts', icon: <Cloud />, path: `${base}/cloud-accounts` },
        { text: 'Cost Analytics', icon: <BarChart />, path: `${base}/finops` },
        { divider: true },
    ];

    // ── Tenant Identity ──
    items.push({ header: 'Identity' });
    items.push({ text: 'Tenant Users', icon: <People />, path: `${base}/users` });
    if (canManage) {
        items.push({ text: 'Groups', icon: <GroupWork />, path: '/groups' });
        items.push({ text: 'Roles', icon: <Security />, path: '/roles' });
    }
    items.push({ divider: true });

    // ── Provisioning ──
    items.push({ header: 'Provisioning' });
    items.push({ text: 'My Requests', icon: <Inventory />, path: '/resource-request/list' });
    items.push({ text: 'New Request', icon: <RocketLaunch />, path: '/resource-request/new' });
    items.push({ divider: true });

    // ── Approvals ──
    items.push({ header: 'Approvals' });
    items.push({ text: 'My Approval Requests', icon: <Assignment />, path: '/approvals/requests' });
    items.push({ text: 'Pending Approvals', icon: <CheckCircle />, path: '/approvals/pending' });
    items.push({ text: 'History', icon: <BarChart />, path: '/approvals/history' });
    if (isAdmin) {
        items.push({ text: 'Workflow Defined', icon: <Category />, path: '/approvals-management/templates' });
    }
    items.push({ divider: true });

    // ── Governance ── (admin only at tenant level)
    if (isAdmin) {
        items.push({ header: 'Governance' });
        items.push({ text: 'Policy List', icon: <Policy />, path: '/permissions-management/policy_list' });
        items.push({ text: 'Resource Registry', icon: <Inventory />, path: '/registry' });
        items.push({ divider: true });
    }

    // ── CICD ──
    items.push({ text: 'Runners', icon: <Terminal />, path: '/ci-credentials' });

    return items;
};

/* ────────────────────────────────────────────
   AppLayout Component
   ──────────────────────────────────────────── */

const AppLayout = () => {
    const { user, logout, isActive } = useAuth();
    const { viewMode, activeRoleName, activeTenant, loading: roleLoading, goToLanding } = useRole();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const width = !isActive ? 0 : (collapsed ? 72 : DRAWER_WIDTH);

    // Build menu items based on current view mode and role
    const menuItems = useMemo<MenuItemType[]>(() => {
        if (viewMode === 'system') {
            return getSystemMenuItems(activeRoleName);
        }
        if (viewMode === 'tenant' && activeTenant) {
            return getTenantMenuItems(activeTenant.tenant_id, activeRoleName);
        }
        // Landing mode — no sidebar items
        return [];
    }, [viewMode, activeRoleName, activeTenant]);

    // Prevent rendering if not authenticated
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
                <Box sx={{ p: collapsed ? 1.5 : 2, borderTop: '1px solid rgba(128,128,128,0.1)' }}>
                    <Box sx={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: 1, cursor: 'default' }}>
                        <Tooltip title={user?.email || user?.username || 'User Profile'} placement="right" arrow>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#6C63FF', fontSize: '0.8rem', mb: collapsed ? 1 : 0 }}>
                                {user?.username?.charAt(0)?.toUpperCase()}
                            </Avatar>
                        </Tooltip>

                        {!collapsed && (
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
                                    {user?.username || 'User'}
                                </Typography>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: collapsed ? 0.5 : 0.5, flexDirection: collapsed ? 'column' : 'row' }}>
                            <Tooltip title="Settings" arrow placement={collapsed ? "right" : "bottom"}>
                                <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ color: 'text.secondary' }}>
                                    <SettingsIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Logout" arrow placement={collapsed ? "right" : "bottom"}>
                                <IconButton size="small" onClick={logout} sx={{ color: '#ef4444' }}>
                                    <Logout fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
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
