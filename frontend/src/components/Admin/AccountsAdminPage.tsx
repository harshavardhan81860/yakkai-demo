import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, LinearProgress, Grid } from '@mui/material';
import { Add, Edit, Delete, Sync, CloudQueue } from '@mui/icons-material';
import api from '../../services/api';
import { getProviderColor, getProviderIcon, STATUS_COLORS } from '../../cloudProviders';

const AccountsAdminPage = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ account_name: '', account_identifier: '', provider_id: 1, region: '', tenant_id: 1 });

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/api/cloud-accounts').then(r => setAccounts(r.data)),
            api.get('/api/providers').then(r => setProviders(r.data)),
        ]).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        await api.post('/api/cloud-accounts', form);
        setDialog(false); load();
    };

    const handleSync = async (id: number) => {
        await api.post(`/api/cloud-accounts/${id}/sync`);
        load();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this account?')) return;
        await api.delete(`/api/cloud-accounts/${id}`); load();
    };

    if (loading) return <LinearProgress />;

    const totalCost = accounts.reduce((s, a) => s + (a.monthly_cost || 0), 0);
    const totalResources = accounts.reduce((s, a) => s + (a.resource_count || 0), 0);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Cloud Accounts</Typography>
                    <Typography variant="body2" color="text.secondary">Manage multi-cloud provider accounts</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}
                    sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Add Account</Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Accounts', value: accounts.length, color: '#6C63FF' },
                    { label: 'Connected', value: accounts.filter(a => a.status === 'connected').length, color: '#10B981' },
                    { label: 'Total Resources', value: totalResources, color: '#00D9FF' },
                    { label: 'Monthly Spend', value: `$${totalCost.toLocaleString()}`, color: '#F59E0B' },
                ].map((s, i) => (
                    <Grid size={{ xs: 6, md: 3 }} key={i}>
                        <Card sx={{ p: 2, textAlign: 'center', background: `linear-gradient(135deg,${s.color}15,transparent)` }}>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: s.color }}>{s.value}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Provider</TableCell>
                                <TableCell>Account</TableCell>
                                <TableCell>Identifier</TableCell>
                                <TableCell>Region</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Resources</TableCell>
                                <TableCell>Monthly Cost</TableCell>
                                <TableCell>Last Synced</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {accounts.map(a => (
                                <TableRow key={a.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ fontSize: '1.1rem' }}>{getProviderIcon(a.provider_type || '')}</Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: getProviderColor(a.provider_type || '') }}>{a.provider_type?.toUpperCase()}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{a.account_name}</Typography></TableCell>
                                    <TableCell><Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{a.account_identifier}</Typography></TableCell>
                                    <TableCell><Typography variant="body2">{a.region}</Typography></TableCell>
                                    <TableCell><Chip label={a.status} size="small" sx={{ bgcolor: (STATUS_COLORS[a.status] || '#666') + '20', color: STATUS_COLORS[a.status], fontWeight: 600 }} /></TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{a.resource_count}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>${a.monthly_cost?.toLocaleString()}</Typography></TableCell>
                                    <TableCell><Typography variant="caption" color="text.secondary">{a.last_synced?.split('T')[0] || 'Never'}</Typography></TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handleSync(a.id)} sx={{ color: '#00D9FF' }}><Sync fontSize="small" /></IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(a.id)} sx={{ color: '#EF4444' }}><Delete fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Add Cloud Account</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Account Name" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Provider</InputLabel>
                                <Select value={form.provider_id} label="Provider" onChange={e => setForm({ ...form, provider_id: Number(e.target.value) })}>
                                    {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Account Identifier" value={form.account_identifier} onChange={e => setForm({ ...form, account_identifier: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Region" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained" sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Add Account</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AccountsAdminPage;
