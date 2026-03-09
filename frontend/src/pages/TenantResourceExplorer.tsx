import React from 'react';
import { Box, Typography, Button, Stack, Paper, Chip } from '@mui/material';
import Breadcrumbs from '../components/Common/Breadcrumbs';
import { Refresh, ArrowBack, BarChart } from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import CachedInventory from './CachedInventory';
import UnifiedSyncButton from '../components/common/UnifiedSyncButton';

const TenantResourceExplorer = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { activeTenant } = useRole();
    const tenantName = activeTenant?.tenant_name || (location.state as any)?.tenantName || "Tenant";

    return (
        <Box sx={{ p: 3, pb: 6, maxWidth: 1600, margin: '0 auto' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Box sx={{ mb: 1 }}>
                        <Breadcrumbs
                            items={[
                                { label: "Tenants", path: "/tenants" },
                                { label: "Resource Explorer", path: `/tenants/${tenantId}/resources` }
                            ]}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>Resource Explorer</Typography>
                        <Chip
                            label="Tenant View"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24 }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Global unified inventory across all cloud accounts in this tenant
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Paper variant='outlined'
                        sx={{
                            p: 2,
                            mb: 4,
                            borderRadius: 3,
                            bgcolor: "action.hover",
                            border: "1px solid",
                            borderColor: "divider"
                        }}
                    >                        <Box>
                            <Typography variant="caption" display="block" color="text.secondary">Tenant Name</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F59E0B' }}>{tenantName}</Typography>
                        </Box>
                    </Paper>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(`/tenants/${tenantId}/dashboard`, { state: { tenantName } })}>Workspace</Button>
                        <Button variant="outlined" startIcon={<BarChart />} color="success" onClick={() => navigate(`/tenants/${tenantId}/finops`, { state: { tenantName } })}>Cost Analytics</Button>
                        <UnifiedSyncButton type="tenant" entityId={tenantId as string} entityName={tenantName} />
                        <Button variant="contained" startIcon={<Refresh />} onClick={() => window.location.reload()}>Refresh</Button>
                    </Stack>
                </Stack>
            </Box>

            <CachedInventory isTenantView={true} tenantId={tenantId} />
        </Box>
    );
};

export default TenantResourceExplorer;
