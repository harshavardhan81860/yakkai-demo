import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, Link as MuiLink, Paper, Divider } from '@mui/material';
import api from '../services/api';
import Breadcrumbs from '../components/Common/Breadcrumbs';
import { Refresh, ArrowBack, BarChart, Warning } from '@mui/icons-material';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import CachedInventory from './CachedInventory';

const TenantResourceExplorer = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { activeTenant } = useRole();
    const tenantName = activeTenant?.tenant_name || (location.state as any)?.tenantName || "Tenant";

    return (
        <Box sx={{ p: 3, pb: 6, maxWidth: 1600, margin: '0 auto' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Box sx={{ mb: 2 }}>
                        <Breadcrumbs
                            items={[
                                { label: "Tenants", path: "/tenants" },
                                { label: "Resource Explorer", path: `/tenants/${tenantId}/resources` }
                            ]}
                        />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Resource Explorer</Typography>
                    <Typography variant="body2" color="text.secondary">Global unified inventory across all cloud accounts in this tenant</Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Paper variant="outlined" sx={{ p: 1.5, px: 2, display: 'flex', gap: 3, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <Box>
                            <Typography variant="caption" display="block" color="text.secondary">Tenant Name</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F59E0B' }}>{tenantName}</Typography>
                        </Box>
                    </Paper>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(`/tenants/${tenantId}/dashboard`, { state: { tenantName } })}>Workspace</Button>
                        <Button variant="outlined" startIcon={<BarChart />} color="success" onClick={() => navigate(`/tenants/${tenantId}/finops`, { state: { tenantName } })}>Cost Analytics</Button>
                        <Button variant="contained" startIcon={<Refresh />}>Refresh</Button>
                    </Stack>
                </Stack>
            </Box>

            <Paper sx={{ mb: 4, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Warning sx={{ color: '#F59E0B', fontSize: 32 }} />
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F59E0B' }}>Simulated Data</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>This display is currently showing simulated data. Real data will be available in an upcoming release.</Typography>
                    </Box>
                </Box>
            </Paper>

            <CachedInventory isTenantView={true} />
        </Box>
    );
};

export default TenantResourceExplorer;
