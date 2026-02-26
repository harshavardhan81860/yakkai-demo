import React from 'react';
import { Box, Typography, Card, Avatar, Stack, Chip, Paper, Divider } from '@mui/material';
import Breadcrumbs from '../components/Common/Breadcrumbs';
import { Cloud, BarChart, Storage } from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';

const TenantDashboard = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { activeTenant } = useRole();
    const tenantName = activeTenant?.tenant_name || (location.state as any)?.tenantName || "Tenant";


    const tiles = [
        {
            title: 'Cloud Accounts',
            description: 'Manage AWS and Azure account connections',
            icon: <Cloud sx={{ fontSize: 40 }} />,
            path: `/tenants/${tenantId}/cloud-accounts`,
            color: '#3B82F6',
            bg: 'rgba(59, 130, 246, 0.1)'
        },
        {
            title: 'Cost Analytics',
            description: 'Unified financial visibility and FinOps tracking',
            icon: <BarChart sx={{ fontSize: 40 }} />,
            path: `/tenants/${tenantId}/finops`,
            color: '#10B981',
            bg: 'rgba(16, 185, 129, 0.1)'
        },
        {
            title: 'Resource Explorer',
            description: 'Global unified inventory across all accounts',
            icon: <Storage sx={{ fontSize: 40 }} />,
            path: `/tenants/${tenantId}/resources`,
            color: '#6C63FF',
            bg: 'rgba(108, 99, 255, 0.1)'
        }
    ];

    return (
        <Box sx={{ p: 3, pb: 6, maxWidth: 1200, margin: '0 auto' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Box sx={{ mb: 2 }}>
                        <Breadcrumbs
                            items={[
                                { label: "Infrastructure", path: "/tenants" },
                                { label: "Workspace" }
                            ]}
                        />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Workspace
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Select an area to manage for this tenant</Typography>
                </Box>

                {/* Tenant Context Box */}
                <Paper variant="outlined" sx={{ p: 1.5, px: 2, display: 'flex', gap: 3, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Box>
                        <Typography variant="caption" display="block" color="text.secondary">Tenant Name</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F59E0B' }}>{tenantName}</Typography>
                    </Box>
                </Paper>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {tiles.map((tile, idx) => (
                    <Box key={idx} sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: 280 }}>
                        <Card
                            onClick={() => navigate(tile.path, { state: { tenantName } })}
                            sx={{
                                p: 4,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                border: '1px solid rgba(255,255,255,0.05)',
                                bgcolor: 'rgba(255,255,255,0.02)',
                                '&:hover': {
                                    borderColor: tile.color,
                                    transform: 'translateY(-4px)',
                                    bgcolor: 'rgba(255,255,255,0.04)',
                                    boxShadow: `0 8px 24px ${tile.bg}`
                                }
                            }}
                        >
                            <Avatar sx={{ width: 80, height: 80, mb: 3, bgcolor: tile.bg, color: tile.color }}>
                                {tile.icon}
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{tile.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{tile.description}</Typography>
                        </Card>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default TenantDashboard;
