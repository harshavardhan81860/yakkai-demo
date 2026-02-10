import React, { useEffect, useState } from 'react';
import {
    Box, Card, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
    IconButton, LinearProgress, Grid, Switch, Avatar, Stack, Paper, Tooltip
} from '@mui/material';
import { Add, Edit, Delete, Category, SettingsInputComponent } from '@mui/icons-material';
import api from '../../services/api';
import { getProviderColor, getProviderIcon, RESOURCE_CATEGORIES, CATEGORY_ICONS } from '../../cloudProviders';

const CatalogAdminPage = () => {
    const [catalog, setCatalog] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ provider_id: 1, resource_type: '', resource_category: 'compute', display_name: '', description: '', config_schema_json: '{"fields":[]}' });

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/api/admin/catalog').then(r => setCatalog(r.data)),
            api.get('/api/providers').then(r => setProviders(r.data)),
        ]).catch(err => console.error(err))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        try {
            const data = { ...form, config_schema_json: JSON.parse(form.config_schema_json) };
            await api.post('/api/admin/catalog', data);
            setDialog(false); load();
        } catch (err) { console.error(err); }
    };

    const handleToggle = async (id: number, active: boolean) => {
        try {
            await api.put(`/api/admin/catalog/${id}`, { is_active: !active });
            load();
        } catch (err) { console.error(err); }
    };

    if (loading) return <Box sx={{ p: 4 }}><LinearProgress sx={{ borderRadius: 2 }} /></Box>;

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Resource Catalog</Typography>
                    <Typography variant="body2" color="text.secondary">Orchestrate available cloud services for infrastructure provisioning</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}
                    sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
                    Add Definition
                </Button>
            </Box>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {RESOURCE_CATEGORIES.filter(c => catalog.some(item => item.resource_category === c)).map(cat => (
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={cat}>
                        <Card sx={{ p: 2, textAlign: 'center', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
                            <Box sx={{ fontSize: '1.8rem', mb: 1, opacity: 0.8 }}>{CATEGORY_ICONS[cat]}</Box>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{catalog.filter(c => c.resource_category === cat).length}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>{cat}</Typography>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <TableContainer component={Card} sx={{ borderRadius: 4 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Service Provider</TableCell>
                            <TableCell>Technical ID</TableCell>
                            <TableCell>Label</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Usage Stats</TableCell>
                            <TableCell>Availability</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {catalog.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center"><Typography variant="body2" sx={{ py: 8 }}>Catalog is currently empty.</Typography></TableCell></TableRow>
                        ) : catalog.map(c => (
                            <TableRow key={c.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'transparent', border: `1px solid ${getProviderColor(c.provider_type || '')}40` }}>
                                            {getProviderIcon(c.provider_type || '')}
                                        </Avatar>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: getProviderColor(c.provider_type || '') }}>{c.provider_type?.toUpperCase()}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.resource_type}</Typography></TableCell>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.display_name}</Typography></TableCell>
                                <TableCell>
                                    <Chip
                                        label={c.resource_category}
                                        size="small"
                                        icon={<Box sx={{ fontSize: '0.75rem', pl: 0.5 }}>{CATEGORY_ICONS[c.resource_category]}</Box>}
                                        sx={{ bgcolor: 'rgba(108,99,255,0.05)', color: '#958FFF', fontSize: '0.7rem', fontWeight: 700, '& .MuiChip-icon': { color: 'inherit' } }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{c.request_count}</Typography>
                                        <Typography variant="caption" color="text.secondary">requests</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={c.is_active !== false}
                                        onChange={() => handleToggle(c.id, c.is_active !== false)}
                                        size="small"
                                        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Configure Definition">
                                        <IconButton size="small" sx={{ color: '#6C63FF' }}><Edit fontSize="small" /></IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Creation Dialog */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Service Specification</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <Grid container spacing={3}>
                        <Grid size={12}>
                            <FormControl fullWidth>
                                <InputLabel>Upstream Provider</InputLabel>
                                <Select value={form.provider_id} label="Upstream Provider" onChange={e => setForm({ ...form, provider_id: Number(e.target.value) })}>
                                    {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={6}><TextField fullWidth label="Technical Resource Key" value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })} placeholder="e.g. aws_ec2_instance" /></Grid>
                        <Grid size={6}>
                            <FormControl fullWidth>
                                <InputLabel>Service Category</InputLabel>
                                <Select value={form.resource_category} label="Service Category" onChange={e => setForm({ ...form, resource_category: e.target.value })}>
                                    {RESOURCE_CATEGORIES.map(c => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}><TextField fullWidth label="Visual Display Name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></Grid>
                        <Grid size={12}><TextField fullWidth label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} multiline rows={2} /></Grid>
                        <Grid size={12}>
                            <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <SettingsInputComponent fontSize="small" sx={{ opacity: 0.5 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1 }}>SPECIFICATION SCHEMA (JSON)</Typography>
                                </Box>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={6}
                                    value={form.config_schema_json}
                                    onChange={e => setForm({ ...form, config_schema_json: e.target.value })}
                                    variant="standard"
                                    InputProps={{ disableUnderline: true, sx: { p: 2, fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.5 } }}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setDialog(false)}>Discard</Button>
                    <Button onClick={handleCreate} variant="contained" sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)', px: 4 }}>Register Service</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CatalogAdminPage;
