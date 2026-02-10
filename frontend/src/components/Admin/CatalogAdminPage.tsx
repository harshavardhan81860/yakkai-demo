import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, LinearProgress, Grid, Switch } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../../api/client';
import { getProviderColor, getProviderIcon, RESOURCE_CATEGORIES, CATEGORY_ICONS } from '../../data/cloudProviders';

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
        ]).finally(() => setLoading(false));
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
        await api.put(`/api/admin/catalog/${id}`, { is_active: !active });
        load();
    };

    if (loading) return <LinearProgress />;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Resource Catalog</Typography>
                    <Typography variant="body2" color="text.secondary">Manage available resource types for each cloud provider</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}
                    sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Add Resource Type</Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {RESOURCE_CATEGORIES.filter(c => catalog.some(item => item.resource_category === c)).map(cat => (
                    <Grid item xs={6} sm={4} md={2} key={cat}>
                        <Card sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ fontSize: '1.5rem', mb: 0.5 }}>{CATEGORY_ICONS[cat]}</Box>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>{catalog.filter(c => c.resource_category === cat).length}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{cat}</Typography>
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
                                <TableCell>Resource Type</TableCell>
                                <TableCell>Display Name</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Requests</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {catalog.map(c => (
                                <TableRow key={c.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ fontSize: '1rem' }}>{getProviderIcon(c.provider_type || '')}</Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: getProviderColor(c.provider_type || '') }}>{c.provider_type?.toUpperCase()}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.resource_type}</Typography></TableCell>
                                    <TableCell><Typography variant="body2">{c.display_name}</Typography></TableCell>
                                    <TableCell><Chip label={c.resource_category} size="small" icon={<Box sx={{ fontSize: '0.8rem', pl: 0.5 }}>{CATEGORY_ICONS[c.resource_category]}</Box>} sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#958FFF' }} /></TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{c.request_count}</Typography></TableCell>
                                    <TableCell>
                                        <Switch checked={c.is_active !== false} onChange={() => handleToggle(c.id, c.is_active !== false)} size="small" />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" sx={{ color: '#6C63FF' }}><Edit fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Add Resource Type</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth><InputLabel>Provider</InputLabel>
                                <Select value={form.provider_id} label="Provider" onChange={e => setForm({ ...form, provider_id: Number(e.target.value) })}>
                                    {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}><TextField fullWidth label="Resource Type" value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })} /></Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth><InputLabel>Category</InputLabel>
                                <Select value={form.resource_category} label="Category" onChange={e => setForm({ ...form, resource_category: e.target.value })}>
                                    {RESOURCE_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}><TextField fullWidth label="Display Name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} multiline rows={2} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Config Schema JSON" value={form.config_schema_json} onChange={e => setForm({ ...form, config_schema_json: e.target.value })} multiline rows={4} sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained" sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Add</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CatalogAdminPage;
