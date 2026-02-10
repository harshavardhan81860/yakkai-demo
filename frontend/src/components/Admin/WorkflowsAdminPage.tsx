import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, LinearProgress, Grid, Switch } from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import api from '../../api/client';
import { getProviderColor, getProviderIcon } from '../../data/cloudProviders';

const WorkflowsAdminPage = () => {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ name: '', provider_id: 1, resource_type: '*', tenant_id: 1, approval_chain_json: '[{"level":1,"role":"manager"}]', cost_thresholds_json: '{"auto_approve":100,"manager_approve":1000}' });

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/api/admin/workflows').then(r => setWorkflows(r.data)),
            api.get('/api/providers').then(r => setProviders(r.data)),
        ]).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        try {
            const data = { ...form, approval_chain_json: JSON.parse(form.approval_chain_json), cost_thresholds_json: JSON.parse(form.cost_thresholds_json) };
            await api.post('/api/admin/workflows', data);
            setDialog(false); load();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this workflow?')) return;
        await api.delete(`/api/admin/workflows/${id}`); load();
    };

    if (loading) return <LinearProgress />;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Approval Workflows</Typography>
                    <Typography variant="body2" color="text.secondary">Configure approval chains and cost thresholds</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}
                    sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Add Workflow</Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Workflow Name</TableCell>
                                <TableCell>Provider</TableCell>
                                <TableCell>Resource Type</TableCell>
                                <TableCell>Approval Chain</TableCell>
                                <TableCell>Thresholds</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {workflows.map(w => {
                                const provider = providers.find(p => p.id === w.provider_id);
                                return (
                                    <TableRow key={w.id} hover>
                                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{w.name}</Typography></TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ fontSize: '1rem' }}>{getProviderIcon(provider?.type || '')}</Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: getProviderColor(provider?.type || '') }}>{provider?.type?.toUpperCase()}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell><Chip label={w.resource_type || '*'} size="small" sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#958FFF' }} /></TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {(w.approval_chain_json || []).map((step: any, i: number) => (
                                                    <Chip key={i} label={`L${step.level}: ${step.role}`} size="small" sx={{ bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF', fontSize: '0.65rem', height: 22 }} />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {w.cost_thresholds_json && Object.entries(w.cost_thresholds_json).slice(0, 2).map(([k, v]: [string, any]) => (
                                                <Typography key={k} variant="caption" color="text.secondary" sx={{ display: 'block' }}>{k}: ${typeof v === 'number' ? v.toLocaleString() : String(v)}</Typography>
                                            ))}
                                        </TableCell>
                                        <TableCell><Chip label={w.is_active !== false ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: w.is_active !== false ? '#10B98120' : '#EF444420', color: w.is_active !== false ? '#10B981' : '#EF4444' }} /></TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" sx={{ color: '#6C63FF' }}><Edit fontSize="small" /></IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(w.id)} sx={{ color: '#EF4444' }}><Delete fontSize="small" /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Add Workflow</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}><TextField fullWidth label="Workflow Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth><InputLabel>Provider</InputLabel>
                                <Select value={form.provider_id} label="Provider" onChange={e => setForm({ ...form, provider_id: Number(e.target.value) })}>
                                    {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}><TextField fullWidth label="Resource Type" value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })} helperText="Use * for all types" /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Approval Chain JSON" value={form.approval_chain_json} onChange={e => setForm({ ...form, approval_chain_json: e.target.value })} multiline rows={3} sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Cost Thresholds JSON" value={form.cost_thresholds_json} onChange={e => setForm({ ...form, cost_thresholds_json: e.target.value })} multiline rows={2} sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained" sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Create</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default WorkflowsAdminPage;
