import React, { useState } from 'react';
import {
    Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Paper, Stack, Grid, TextField, Select, MenuItem, Checkbox, ListItemText, FormControl, InputLabel, OutlinedInput, IconButton, Tooltip, Collapse, Button
} from '@mui/material';
import { Sync, CloudDone, MonetizationOn, Storage, CheckCircleOutline, Refresh, FilterList, Clear } from '@mui/icons-material';
import { getProviderColor } from '../cloudProviders';

// Mock Data Structure
const MOCK_RESOURCES = [
    {
        id: 'res-001', name: 'prod-web-server', type: 'EC2 Instance', provider: 'aws',
        account: 'AWS-Prod-01', region: 'us-east-1', status: 'running',
        costMtd: 145.20, source: 'yakkai_portal', age: '45 days',
        request_id: 'REQ-6829A', portal_state: 'Active'
    },
    {
        id: 'res-002', name: 'dev-database', type: 'RDS PostgreSQL', provider: 'aws',
        account: 'AWS-Dev-01', region: 'us-west-2', status: 'stopped',
        costMtd: 42.10, source: 'cloud_native', age: '120 days'
    },
    {
        id: 'res-003', name: 'analytics-cluster', type: 'EKS Cluster', provider: 'aws',
        account: 'AWS-Prod-01', region: 'us-east-1', status: 'running',
        costMtd: 890.50, source: 'yakkai_portal', age: '15 days',
        request_id: 'REQ-9102B', portal_state: 'Active'
    },
    {
        id: 'res-004', name: 'frontend-cdn', type: 'CloudFront', provider: 'aws',
        account: 'AWS-Prod-01', region: 'global', status: 'active',
        costMtd: 12.00, source: 'cloud_native', age: '200 days'
    },
    {
        id: 'res-005', name: 'core-api-vm', type: 'Virtual Machine', provider: 'azure',
        account: 'Azure-Core', region: 'eastus', status: 'running',
        costMtd: null, source: 'yakkai_portal', age: '10 days',
        request_id: 'REQ-1094C', portal_state: 'Active'
    },
    {
        id: 'res-006', name: 'legacy-backup', type: 'S3 Bucket', provider: 'aws',
        account: 'AWS-Dev-01', region: 'us-west-2', status: 'active',
        costMtd: undefined, source: 'cloud_native', age: '365 days'
    },
    {
        id: 'res-007', name: 'old-test-vm', type: 'Virtual Machine', provider: 'azure',
        account: 'Azure-Core', region: 'eastus', status: 'terminated',
        costMtd: 0.00, source: 'yakkai_portal', age: '90 days',
        request_id: 'REQ-0192D', portal_state: 'Deleted'
    }
];

const CachedInventory = ({ accountName, isTenantView }: { accountName?: string, isTenantView?: boolean }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [nameFilter, setNameFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [portalFilter, setPortalFilter] = useState<string[]>([]);
    const [providerFilter, setProviderFilter] = useState<string[]>([]);
    const [accountFilter, setAccountFilter] = useState<string[]>([]);

    const uniqueTypes = Array.from(new Set(MOCK_RESOURCES.map(r => r.type)));
    const uniqueStatuses = Array.from(new Set(MOCK_RESOURCES.map(r => r.status)));
    const uniqueProviders = Array.from(new Set(MOCK_RESOURCES.map(r => r.provider.toUpperCase())));
    const uniqueAccounts = Array.from(new Set(MOCK_RESOURCES.map(r => r.account)));
    const uniquePortalStates = ['Cloud Native', 'Active', 'Deleted'];

    // Filter to simulated account context 
    let filteredResources = MOCK_RESOURCES;

    if (!isTenantView && accountName) {
        filteredResources = filteredResources.filter(r => r.account.includes(accountName));
    }

    // Apply user filters
    if (nameFilter) {
        filteredResources = filteredResources.filter(r => r.name.toLowerCase().includes(nameFilter.toLowerCase()));
    }
    if (typeFilter.length > 0) {
        filteredResources = filteredResources.filter(r => typeFilter.includes(r.type));
    }
    if (statusFilter.length > 0) {
        filteredResources = filteredResources.filter(r => statusFilter.includes(r.status));
    }
    if (providerFilter.length > 0) {
        filteredResources = filteredResources.filter(r => providerFilter.includes(r.provider.toUpperCase()));
    }
    if (accountFilter.length > 0) {
        filteredResources = filteredResources.filter(r => accountFilter.includes(r.account));
    }
    if (portalFilter.length > 0) {
        filteredResources = filteredResources.filter(r => {
            const stateStr = r.source === 'cloud_native' ? 'Cloud Native' : (r.portal_state || 'YakkAI Portal');
            return portalFilter.includes(stateStr);
        });
    }

    // Simulated sync time (e.g. 12 minutes ago)
    const mockSyncDate = new Date(Date.now() - 12 * 60000);
    const syncTimeStr = mockSyncDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Dynamic Top Metrics
    const totalCount = filteredResources.length;
    const activeCount = filteredResources.filter(r => r.status === 'running' || r.status === 'active').length;
    const totalCost = filteredResources.reduce((acc, curr) => acc + (typeof curr.costMtd === 'number' ? curr.costMtd : 0), 0);

    const fmtCost = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

    return (
        <Box>
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(108, 99, 255, 0.1)', color: '#6C63FF' }}><Storage /></Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Total Resources</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{totalCount}</Typography>
                        </Box>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}><CheckCircleOutline /></Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Active Resources</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{activeCount}</Typography>
                        </Box>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}><MonetizationOn /></Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Total MTD Cost</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{fmtCost(totalCost)}</Typography>
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(108, 99, 255, 0.03)', borderColor: 'rgba(108, 99, 255, 0.15)' }}>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6C63FF', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudDone fontSize="small" /> Global Inventory Cache
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {isTenantView
                            ? "Displaying locally replicated resource state for all cloud accounts mapped to this tenant."
                            : `Displaying locally replicated resource state for `}
                        {!isTenantView && <strong>{accountName}</strong>}
                        {(!isTenantView && accountName) && ". "}
                        This data is synced periodically from the cloud provider.
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                        Last Synced
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                        <Sync sx={{ fontSize: 14, color: 'success.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            12 mins ago <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>({syncTimeStr})</Typography>
                        </Typography>
                        <Tooltip title="Force Refresh Cache">
                            <IconButton size="small" onClick={() => console.log('Refresh clicked')} sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                <Refresh fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>
            </Paper>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    startIcon={<FilterList />}
                    variant={showFilters ? "contained" : "outlined"}
                    color="primary"
                    size="small"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                    {(nameFilter || typeFilter.length > 0 || statusFilter.length > 0 || portalFilter.length > 0 || providerFilter.length > 0 || accountFilter.length > 0) && ' (Active)'}
                </Button>
            </Box>

            <Collapse in={showFilters}>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Resource Name"
                                value={nameFilter}
                                onChange={(e) => setNameFilter(e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Resource Type</InputLabel>
                                <Select
                                    multiple
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                    input={<OutlinedInput label="Resource Type" />}
                                    renderValue={(selected) => selected.join(', ')}
                                >
                                    {uniqueTypes.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            <Checkbox checked={typeFilter.indexOf(type) > -1} size="small" />
                                            <ListItemText primary={type} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Cloud Status</InputLabel>
                                <Select
                                    multiple
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                    input={<OutlinedInput label="Cloud Status" />}
                                    renderValue={(selected) => selected.join(', ')}
                                >
                                    {uniqueStatuses.map((status) => (
                                        <MenuItem key={status} value={status}>
                                            <Checkbox checked={statusFilter.indexOf(status) > -1} size="small" />
                                            <ListItemText primary={status} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Portal Status</InputLabel>
                                <Select
                                    multiple
                                    value={portalFilter}
                                    onChange={(e) => setPortalFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                    input={<OutlinedInput label="Portal Status" />}
                                    renderValue={(selected) => selected.join(', ')}
                                >
                                    {uniquePortalStates.map((state) => (
                                        <MenuItem key={state} value={state}>
                                            <Checkbox checked={portalFilter.indexOf(state) > -1} size="small" />
                                            <ListItemText primary={state} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {isTenantView && (
                            <>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Cloud Provider</InputLabel>
                                        <Select
                                            multiple
                                            value={providerFilter}
                                            onChange={(e) => setProviderFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                            input={<OutlinedInput label="Cloud Provider" />}
                                            renderValue={(selected) => selected.join(', ')}
                                        >
                                            {uniqueProviders.map((prov) => (
                                                <MenuItem key={prov} value={prov}>
                                                    <Checkbox checked={providerFilter.indexOf(prov) > -1} size="small" />
                                                    <ListItemText primary={prov} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Cloud Account</InputLabel>
                                        <Select
                                            multiple
                                            value={accountFilter}
                                            onChange={(e) => setAccountFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                            input={<OutlinedInput label="Cloud Account" />}
                                            renderValue={(selected) => selected.join(', ')}
                                        >
                                            {uniqueAccounts.map((acc) => (
                                                <MenuItem key={acc} value={acc}>
                                                    <Checkbox checked={accountFilter.indexOf(acc) > -1} size="small" />
                                                    <ListItemText primary={acc} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </>
                        )}
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            startIcon={<Clear />}
                            size="small"
                            color="inherit"
                            onClick={() => {
                                setNameFilter('');
                                setTypeFilter([]);
                                setStatusFilter([]);
                                setPortalFilter([]);
                                setProviderFilter([]);
                                setAccountFilter([]);
                            }}
                        >
                            Clear Filters
                        </Button>
                    </Box>
                </Paper>
            </Collapse>

            <Card sx={{ p: 0 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Resource Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Provider</TableCell>
                                <TableCell>Cloud Status</TableCell>
                                <TableCell>Provisioned</TableCell>
                                <TableCell>Portal Tracking</TableCell>
                                <TableCell>MTD Cost</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredResources.map((row) => (
                                <TableRow key={row.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                    <TableCell>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{row.id}</Typography>
                                    </TableCell>
                                    <TableCell>{row.type}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.provider.toUpperCase()}
                                            size="small"
                                            color={getProviderColor(row.provider) as any}
                                            variant="outlined"
                                            sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.status}
                                            size="small"
                                            color={(row.status === 'running' || row.status === 'active') ? 'success' as const : 'warning' as const}
                                            sx={{ borderRadius: 1.5, fontSize: '0.7rem' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.source === 'yakkai_portal' ? 'YakkAI Portal' : 'Cloud Native'}
                                            size="small"
                                            color={(row.source === 'yakkai_portal' ? 'primary' : 'default') as "primary" | "default"}
                                            variant={row.source === 'yakkai_portal' ? 'filled' : 'outlined'}
                                            sx={{ borderRadius: 1 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {row.source === 'yakkai_portal' && row.request_id ? (
                                            <Box>
                                                <Typography variant="body2" color={row.portal_state === 'Active' ? 'success.main' : 'text.secondary'} sx={{ fontWeight: 600, mb: 0.5 }}>
                                                    {row.portal_state}
                                                </Typography>
                                                <Chip label={row.request_id} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', height: 18 }} />
                                            </Box>
                                        ) : <Typography variant="caption" color="text.secondary">-</Typography>}
                                    </TableCell>
                                    <TableCell>
                                        {row.costMtd === null ? (
                                            <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>Yet to calculate</Typography>
                                        ) : row.costMtd === undefined ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Yet to sync from FinOps</Typography>
                                        ) : (
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{fmtCost(row.costMtd)}</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default CachedInventory;
