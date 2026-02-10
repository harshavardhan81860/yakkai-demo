import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, MenuItem, Select, FormControl, InputLabel, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress } from '@mui/material';
import { Visibility, Delete, FilterList, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ResourceRequest } from '../../index';
import { getProviderColor, getProviderIcon, getStatusLabel, STATUS_COLORS } from '../../cloudProviders';

const RequestsListPage = () => {
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [detail, setDetail] = useState<ResourceRequest | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/api/requests', { params: statusFilter ? { status: statusFilter } : {} }).then((r) => {
            setRequests(r.data); setLoading(false);
        });
    }, [statusFilter]);

    if (loading) return <LinearProgress />;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Resource Requests</Typography>
                    <Typography variant="body2" color="text.secondary">Manage your cloud infrastructure requests</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Status Filter</InputLabel>
                        <Select value={statusFilter} label="Status Filter" onChange={(e) => setStatusFilter(e.target.value)}>
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="pending_approval">Pending</MenuItem>
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="rejected">Rejected</MenuItem>
                            <MenuItem value="provisioning">Provisioning</MenuItem>
                        </Select>
                    </FormControl>
                    <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/requests/new')}
                        sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>New Request</Button>
                </Box>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Provider</TableCell>
                                <TableCell>Resource</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Account</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Est. Cost</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {requests.map((r) => (
                                <TableRow key={r.id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(108,99,255,0.04)' } }}>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>#{r.id}</Typography></TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ fontSize: '1.1rem' }}>{getProviderIcon(r.provider_type || '')}</Box>
                                            <Typography variant="body2" sx={{ color: getProviderColor(r.provider_type || ''), fontWeight: 600 }}>{r.provider_type?.toUpperCase()}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.resource_type}</Typography></TableCell>
                                    <TableCell><Chip label={r.resource_category} size="small" sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#958FFF', fontSize: '0.7rem' }} /></TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{r.cloud_account_name}</Typography></TableCell>
                                    <TableCell><Chip label={getStatusLabel(r.status)} size="small" sx={{ bgcolor: (STATUS_COLORS[r.status] || '#666') + '20', color: STATUS_COLORS[r.status], fontWeight: 700, fontSize: '0.7rem' }} /></TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>${r.estimated_cost?.toFixed(2)}</Typography></TableCell>
                                    <TableCell><Typography variant="caption" color="text.secondary">{r.created_at?.split('T')[0]?.split(' ')[0]}</Typography></TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => setDetail(r)} sx={{ color: '#6C63FF' }}><Visibility fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {requests.length === 0 && (
                                <TableRow><TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                                    <Typography color="text.secondary">No requests found</Typography>
                                </TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
                {detail && (
                    <>
                        <DialogTitle sx={{ fontWeight: 700 }}>Request #{detail.id} — {detail.resource_type}
                            <Chip label={getStatusLabel(detail.status)} size="small" sx={{ ml: 2, bgcolor: (STATUS_COLORS[detail.status] || '#666') + '20', color: STATUS_COLORS[detail.status] }} />
                        </DialogTitle>
                        <DialogContent dividers>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                                <Box><Typography variant="caption" color="text.secondary">Provider</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{detail.provider_name}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary">Account</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{detail.cloud_account_name}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary">Category</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{detail.resource_category}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary">Est. Monthly Cost</Typography><Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>${detail.estimated_cost?.toFixed(2)}</Typography></Box>
                            </Box>
                            <Typography variant="caption" color="text.secondary">Justification</Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>{detail.justification || 'No justification provided'}</Typography>
                            <Typography variant="caption" color="text.secondary">Configuration</Typography>
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.3)', mt: 0.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#9CA3AF' }}>{JSON.stringify(detail.config_json, null, 2)}</pre>
                            </Box>
                            {detail.approvals && detail.approvals.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary">Approvals</Typography>
                                    {detail.approvals.map((a: any, i: number) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                            <Chip label={a.status} size="small" sx={{ bgcolor: (STATUS_COLORS[a.status] || '#666') + '20', color: STATUS_COLORS[a.status] }} />
                                            <Typography variant="body2">{a.approver_name} {a.comments ? `— "${a.comments}"` : ''}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions><Button onClick={() => setDetail(null)}>Close</Button></DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default RequestsListPage;
