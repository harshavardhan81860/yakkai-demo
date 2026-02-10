import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Typography, Avatar, IconButton, Tooltip, Divider, Chip } from '@mui/material';
import { Dashboard, CloudQueue, Assignment, CheckCircle, People, Storage, BarChart, Settings, Logout, Cloud, Menu as MenuIcon, Speed, Category, AccountTree } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const DRAWER_WIDTH = 260;

const AppLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const role = user?.role?.name || 'user';
    const width = collapsed ? 72 : DRAWER_WIDTH;

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, path: '/', roles: ['admin', 'manager', 'user'] },
        { text: 'New Request', icon: <CloudQueue />, path: '/requests/new', roles: ['admin', 'manager', 'user'] },
        { text: 'My Requests', icon: <Assignment />, path: '/requests', roles: ['admin', 'manager', 'user'] },
        { text: 'Approvals', icon: <CheckCircle />, path: '/approvals', roles: ['admin', 'manager'] },
        { divider: true },
        { text: 'Statistics', icon: <BarChart />, path: '/statistics', roles: ['admin', 'manager', 'user'] },
        { text: 'Cost Analytics', icon: <Speed />, path: '/costs', roles: ['admin', 'manager'] },
        { divider: true },
        { text: 'Users', icon: <People />, path: '/admin/users', roles: ['admin'] },
        { text: 'Cloud Accounts', icon: <Storage />, path: '/admin/accounts', roles: ['admin'] },
        { text: 'Resource Catalog', icon: <Category />, path: '/admin/catalog', roles: ['admin'] },
        { text: 'Workflows', icon: <AccountTree />, path: '/admin/workflows', roles: ['admin'] },
    ];

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0A0E1A' }}>
            <Drawer variant="permanent" sx={{
                width, flexShrink: 0, '& .MuiDrawer-paper': { width, transition: 'width 0.3s ease', overflowX: 'hidden' },
            }}>
                {/* Logo */}
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 }}>
                    <Box sx={{ display: 'flex', p: 1, borderRadius: '10px', background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,217,255,0.2))' }}>
                        <Cloud sx={{ color: '#6C63FF' }} />
                    </Box>
                    {!collapsed && <Typography variant="h6" sx={{ background: 'linear-gradient(135deg,#6C63FF,#00D9FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, fontSize: '1.1rem' }}>YakkAI</Typography>}
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                {/* Menu */}
                <List sx={{ px: 1, flex: 1, pt: 1 }}>
                    {menuItems.map((item, i) => {
                        if ('divider' in item) return <Divider key={i} sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />;
                        if (!item.roles?.includes(role)) return null;
                        const selected = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path!));
                        return (
                            <Tooltip title={collapsed ? item.text : ''} placement="right" key={item.text}>
                                <ListItem disablePadding sx={{ mb: 0.3 }}>
                                    <ListItemButton onClick={() => navigate(item.path!)} selected={selected}
                                        sx={{
                                            borderRadius: 2, minHeight: 44, px: collapsed ? 2.5 : 2,
                                            '&.Mui-selected': { bgcolor: 'rgba(108,99,255,0.15)', '& .MuiListItemIcon-root': { color: '#6C63FF' }, '& .MuiListItemText-primary': { color: '#fff', fontWeight: 600 } },
                                            '&:hover': { bgcolor: 'rgba(108,99,255,0.08)' },
                                        }}>
                                        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, color: '#6B7280' }}>{item.icon}</ListItemIcon>
                                        {!collapsed && <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />}
                                    </ListItemButton>
                                </ListItem>
                            </Tooltip>
                        );
                    })}
                </List>

                {/* User */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: '#6C63FF', fontSize: '0.9rem' }}>{user?.name?.charAt(0)}</Avatar>
                        {!collapsed && (
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#F3F4F6' }}>{user?.name}</Typography>
                                <Chip label={role} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: role === 'admin' ? 'rgba(108,99,255,0.2)' : role === 'manager' ? 'rgba(0,217,255,0.2)' : 'rgba(16,185,129,0.2)', color: role === 'admin' ? '#6C63FF' : role === 'manager' ? '#00D9FF' : '#10B981' }} />
                            </Box>
                        )}
                        {!collapsed && <IconButton size="small" onClick={logout} sx={{ color: '#6B7280' }}><Logout fontSize="small" /></IconButton>}
                    </Box>
                </Box>

                {/* Collapse toggle */}
                <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: '#6B7280' }}>
                        <MenuIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 3, maxWidth: `calc(100vw - ${width}px)`, transition: 'max-width 0.3s ease' }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default AppLayout;
