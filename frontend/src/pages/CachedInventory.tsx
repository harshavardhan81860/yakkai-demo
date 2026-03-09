import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Paper, Stack, Grid, TextField, Select, MenuItem, Checkbox, ListItemText, FormControl, InputLabel, OutlinedInput, IconButton, Tooltip, Button, CircularProgress, Divider, TablePagination,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Sync, CloudDone, Storage, CheckCircleOutline, Refresh, Clear, FilterList, Code } from '@mui/icons-material';
import { getProviderColor } from '../cloudProviders';
import { fetchCloudInventory, fetchCloudResourcePayload } from '../services/cloudResourcesService';

const CachedInventory = ({ accountName, isTenantView, tenantId, cloudAccountId }: { accountName?: string, isTenantView?: boolean, tenantId?: string, cloudAccountId?: string }) => {
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters — always visible
    const [nameFilter, setNameFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [portalFilter, setPortalFilter] = useState<string[]>([]);
    const [providerFilter, setProviderFilter] = useState<string[]>([]);
    const [accountFilter, setAccountFilter] = useState<string[]>([]);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const [rawJsonOpen, setRawJsonOpen] = useState(false);
    const [rawJsonData, setRawJsonData] = useState<any>(null);
    const [rawJsonLoading, setRawJsonLoading] = useState(false);

    const handleViewRawJson = async (resourceId: string) => {
        setRawJsonOpen(true);
        setRawJsonLoading(true);
        try {
            const data = await fetchCloudResourcePayload(resourceId);
            setRawJsonData(data.raw_payload);
        } catch (error) {
            console.error("Failed to fetch raw JSON:", error);
            setRawJsonData({ error: 'Failed to fetch raw JSON or no payload available.' });
        } finally {
            setRawJsonLoading(false);
        }
    };

    const loadInventory = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const data = await fetchCloudInventory(tenantId, isTenantView ? undefined : cloudAccountId);
            setResources(data);
        } catch (error) {
            console.error("Failed to fetch cloud inventory:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();
    }, [tenantId, cloudAccountId, isTenantView]);

    const uniqueTypes = Array.from(new Set(resources.map(r => r.resource_type).filter(Boolean)));
    const uniqueStatuses = Array.from(new Set(resources.map(r => r.status).filter(Boolean)));
    const uniqueProviders = Array.from(new Set(resources.map(r => (r.provider || '').toUpperCase()).filter(Boolean)));
    const uniqueAccounts = Array.from(new Set(resources.map(r => r.cloud_account_id).filter(Boolean)));
    const uniquePortalStates = ['Cloud Native', 'YakkAI Portal'];

    // Filter logic
    let filteredResources = resources;
    if (!isTenantView && cloudAccountId) {
        filteredResources = filteredResources.filter(r => r.cloud_account_id === cloudAccountId);
    }
    if (nameFilter) {
        filteredResources = filteredResources.filter(r => (r.name || '').toLowerCase().includes(nameFilter.toLowerCase()));
    }
    if (typeFilter.length > 0) {
        filteredResources = filteredResources.filter(r => typeFilter.includes(r.resource_type));
    }
    if (statusFilter.length > 0) {
        filteredResources = filteredResources.filter(r => statusFilter.includes(r.status));
    }
    if (providerFilter.length > 0) {
        filteredResources = filteredResources.filter(r => providerFilter.includes((r.provider || '').toUpperCase()));
    }
    if (accountFilter.length > 0) {
        filteredResources = filteredResources.filter(r => accountFilter.includes(r.cloud_account_id));
    }
    if (portalFilter.length > 0) {
        filteredResources = filteredResources.filter(r => {
            const stateStr = !r.creation_request_id ? 'Cloud Native' : 'YakkAI Portal';
            return portalFilter.includes(stateStr);
        });
    }

    const syncDate = resources.length > 0 && resources[0].last_synced_at ? new Date(resources[0].last_synced_at) : null;
    const syncTimeStr = syncDate ? syncDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

    // Metrics
    const totalCount = filteredResources.length;
    const activeCount = filteredResources.filter(r => r.status === 'running' || r.status === 'active' || r.status === 'Succeeded').length;
    const totalCost = filteredResources.reduce((acc, curr) => acc + (typeof curr.mtd_cost === 'number' ? curr.mtd_cost : 0), 0);
    const lastMonthCost = filteredResources.reduce((acc, curr) => acc + (typeof curr.last_month_cost === 'number' ? curr.last_month_cost : 0), 0);
    const fmtCost = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

    const hasActiveFilters = nameFilter || typeFilter.length > 0 || statusFilter.length > 0 || portalFilter.length > 0 || providerFilter.length > 0 || accountFilter.length > 0;

    const clearFilters = () => {
        setNameFilter('');
        setTypeFilter([]);
        setStatusFilter([]);
        setPortalFilter([]);
        setProviderFilter([]);
        setAccountFilter([]);
    };

    return (
        <Box>
            {/* ─── Compact KPI Strip + Sync Status ─── */}
            <Paper
                variant="outlined"
                sx={{
                    mb: 2,
                    p: 1.5,
                    px: 2.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    bgcolor: "action.hover",
                    borderColor: "divider"
                }}
            >
                <Stack direction="row" spacing={4} alignItems="center" divider={<Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Storage sx={{ fontSize: 18, color: '#6C63FF' }} />
                        <Typography variant="body2" color="text.secondary">Total</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, ml: 0.5 }}>{totalCount}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CheckCircleOutline sx={{ fontSize: 18, color: '#10B981' }} />
                        <Typography variant="body2" color="text.secondary">Active</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#10B981', ml: 0.5 }}>{activeCount}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">Last Month Billed</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F59E0B', ml: 0.5 }}>{fmtCost(lastMonthCost)}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">MTD Cost</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F59E0B', ml: 0.5 }}>{fmtCost(totalCost)}</Typography>
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Sync sx={{ fontSize: 14, color: syncDate ? 'success.main' : 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">
                        Last synced: <strong>{syncTimeStr}</strong>
                    </Typography>
                    <Tooltip title="Reload Inventory">
                        <IconButton size="small" onClick={loadInventory} disabled={loading} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }}>
                            <Refresh fontSize="small" sx={{ ...(loading && { animation: 'spin 1s linear infinite' }) }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Paper>

            {/* ─── Always-Visible Filters ─── */}
            <Paper
                variant="outlined"
                sx={{
                    mb: 2,
                    p: 1.5,
                    px: 2.5,
                    bgcolor: "action.hover",
                    borderColor: "divider"
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FilterList sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>Filters</Typography>
                        {hasActiveFilters && (
                            <Chip label="Active" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                    </Stack>
                    {hasActiveFilters && (
                        <Button startIcon={<Clear />} size="small" color="inherit" onClick={clearFilters} sx={{ fontSize: '0.75rem' }}>
                            Clear All
                        </Button>
                    )}
                </Box>
                <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6, md: isTenantView ? 2 : 3 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Resource Name"
                            placeholder="Search..."
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            sx={(theme) => ({
                                "& .MuiOutlinedInput-root": {
                                    "& fieldset": {
                                        borderColor: theme.palette.divider
                                    },
                                    "&:hover fieldset": {
                                        borderColor: theme.palette.text.primary
                                    },
                                    "&.Mui-focused fieldset": {
                                        borderColor: theme.palette.primary.main
                                    }
                                }
                            })}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: isTenantView ? 2 : 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Resource Type</InputLabel>
                            <Select
                                multiple value={typeFilter}
                                onChange={(e) => setTypeFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                input={<OutlinedInput label="Resource Type" />}
                                renderValue={(selected) => selected.length === 1 ? selected[0] : `${selected.length} selected`}
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
                    <Grid size={{ xs: 12, sm: 6, md: isTenantView ? 2 : 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                multiple value={statusFilter}
                                onChange={(e) => setStatusFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                input={<OutlinedInput label="Status" />}
                                renderValue={(selected) => selected.length === 1 ? selected[0] : `${selected.length} selected`}
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
                    <Grid size={{ xs: 12, sm: 6, md: isTenantView ? 2 : 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Origin</InputLabel>
                            <Select
                                multiple value={portalFilter}
                                onChange={(e) => setPortalFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                input={<OutlinedInput label="Origin" />}
                                renderValue={(selected) => selected.length === 1 ? selected[0] : `${selected.length} selected`}
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
                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Provider</InputLabel>
                                    <Select
                                        multiple value={providerFilter}
                                        onChange={(e) => setProviderFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                        input={<OutlinedInput label="Provider" />}
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
                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Account</InputLabel>
                                    <Select
                                        multiple value={accountFilter}
                                        onChange={(e) => setAccountFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                        input={<OutlinedInput label="Account" />}
                                        renderValue={(selected) => selected.length === 1 ? selected[0].substring(0, 8) + '...' : `${selected.length} selected`}
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
            </Paper>

            {/* ─── Data Table ─── */}
            <Card sx={{ p: 0 }}>
                {loading ? (
                    <Box sx={{ p: 5, textAlign: 'center' }}>
                        <CircularProgress size={30} sx={{ mb: 2 }} />
                        <Typography color="text.secondary">Fetching latest inventory data...</Typography>
                    </Box>
                ) : (
                    <>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' } }}>
                                        <TableCell>Resource Name</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Provider</TableCell>
                                        <TableCell>Region</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Origin</TableCell>
                                        <TableCell align="right">MTD Cost</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredResources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                                        <TableRow key={row.id} hover sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 1 } }}>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.provider_resource_id}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.resource_type}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                {row.provider && (
                                                    <Chip
                                                        label={row.provider.toUpperCase()} size="small" variant="outlined"
                                                        sx={{ borderColor: getProviderColor(row.provider), color: getProviderColor(row.provider), fontWeight: 700, fontSize: '0.65rem' }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{row.region || row.location || '-'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.status || 'running'} size="small"
                                                    color={(row.status === 'running' || row.status === 'active' || row.status === 'Succeeded') ? 'success' : (row.status === 'terminated' ? 'error' : 'warning')}
                                                    sx={{ borderRadius: 1.5, fontSize: '0.7rem' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={!row.creation_request_id ? "Cloud Native" : "Portal"} size="small"
                                                    sx={{
                                                        bgcolor: !row.creation_request_id ? 'rgba(255,255,255,0.05)' : 'rgba(108, 99, 255, 0.1)',
                                                        color: !row.creation_request_id ? 'text.secondary' : '#6C63FF',
                                                        fontSize: '0.7rem', fontWeight: 600
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmtCost(row.mtd_cost || 0)}</Typography>
                                                    {row.is_cost_aggregate && (
                                                        <Tooltip title="Service-level aggregate cost (not exact resource-level)">
                                                            <Box sx={{ display: 'inline-block', bgcolor: 'warning.main', color: '#000', borderRadius: '50%', width: 14, height: 14, lineHeight: '14px', textAlign: 'center', fontSize: '10px', fontWeight: 800 }}>A</Box>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="View Raw JSON">
                                                    <IconButton size="small" onClick={() => handleViewRawJson(row.id)}>
                                                        <Code fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredResources.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5 }}>
                                                <Typography color="text.secondary">No resources found matching criteria.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={filteredResources.length}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            sx={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                        />
                    </>
                )}

                <Dialog open={rawJsonOpen} onClose={() => setRawJsonOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>
                        Raw Resource Payload
                        <IconButton
                            aria-label="close"
                            onClick={() => setRawJsonOpen(false)}
                            sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
                        >
                            <Clear />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: '#121212', position: 'relative', minHeight: '300px' }}>
                        {rawJsonLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <pre style={{ margin: 0, padding: '1rem', color: '#a6accd', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto' }}>
                                {JSON.stringify(rawJsonData, null, 2)}
                            </pre>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRawJsonOpen(false)} color="inherit">Close</Button>
                    </DialogActions>
                </Dialog>
            </Card>
        </Box>
    );
};

export default CachedInventory;
