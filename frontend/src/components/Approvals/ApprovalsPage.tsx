import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress, Tabs, Tab, Grid, Avatar } from '@mui/material';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import api from '../../api/client';
import { Approval } from '../../types';
import { getProviderColor, getProviderIcon, getStatusLabel, STATUS_COLORS } from '../../data/cloudProviders';

const ApprovalsPage = () => {
    const [tab, setTab] = useState(0);
    const [pending, setPending] = useState<Approval[]>([]);
    const [history, setHistory] = useState<Approval[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionDialog, setActionDialog] = useState<{ approval: Approval; action: 'approve' | 'reject' } | null>(null);
    const [comments, setComments] = useState('');
    const [detailDialog, setDetailDialog] = useState<Approval | null>(null);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/api/approvals/pending').then(r => setPending(r.data)),
            api.get('/api/approvals/history').then(r => setHistory(r.data)),
        ]).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleAction = async () => {
        if (!actionDialog) return;
        try {
            await api.post(`/api/approvals/${actionDialog.approval.id}/${actionDialog.action}`, null, { params: { comments } });
            setActionDialog(null); setComments(''); load();
        } catch (err) { console.error(err); }
    };

    if (loading) return <LinearProgress />;

    const renderTable = (items: Approval[], showActions: boolean) => (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Request</TableCell>
                        <TableCell>Provider</TableCell>
                        <TableCell>Resource</TableCell>
                        <TableCell>Requester</TableCell>
                        <TableCell>Est. Cost</TableCell>
                        <TableCell>Status</TableCell>
                        {showActions && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map(a => (
                        <TableRow key={a.id} hover>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>#{a.request_id}</Typography></TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ fontSize: '1.1rem' }}>{getProviderIcon(a.request?.provider_type || '')}</Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: getProviderColor(a.request?.provider_type || '') }}>{a.request?.provider_type?.toUpperCase()}</Typography>
                                </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{a.request?.resource_type}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{a.request?.user_name || 'Unknown'}</Typography></TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>${(a.request?.estimated_cost || 0).toFixed(2)}</Typography></TableCell>
                            <TableCell><Chip label={getStatusLabel(a.status)} size="small" sx={{ bgcolor: (STATUS_COLORS[a.status] || '#666') + '20', color: STATUS_COLORS[a.status], fontWeight: 700 }} /></TableCell>
                            {showActions && (
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        <Button size="small" variant="contained" onClick={() => setActionDialog({ approval: a, action: 'approve' })}
                                            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, minWidth: 0, px: 1.5 }}>
                                            <CheckCircle fontSize="small" />
                                        </Button>
                                        <Button size="small" variant="contained" onClick={() => setActionDialog({ approval: a, action: 'reject' })}
                                            sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, minWidth: 0, px: 1.5 }}>
                                            <Cancel fontSize="small" />
                                        </Button>
                                        <Button size="small" variant="outlined" onClick={() => setDetailDialog(a)} sx={{ minWidth: 0, px: 1.5 }}>
                                            <Visibility fontSize="small" />
                                        </Button>
                                    </Box>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                    {items.length === 0 && <TableRow><TableCell colSpan={showActions ? 7 : 6} sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No items found</Typography></TableCell></TableRow>}
                </TableBody>
            </Table>
        </TableContainer>
    );

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>Approvals</Typography>
                <Typography variant="body2" color="text.secondary">Review and manage resource approval requests</Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg,rgba(255,152,0,0.1),rgba(255,152,0,0.03))' }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#FF9800' }}>{pending.length}</Typography>
                        <Typography variant="caption" color="text.secondary">Pending</Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.03))' }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981' }}>{history.filter(h => h.status === 'approved').length}</Typography>
                        <Typography variant="caption" color="text.secondary">Approved</Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(239,68,68,0.03))' }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#EF4444' }}>{history.filter(h => h.status === 'rejected').length}</Typography>
                        <Typography variant="caption" color="text.secondary">Rejected</Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg,rgba(108,99,255,0.1),rgba(108,99,255,0.03))' }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#6C63FF' }}>{pending.length + history.length}</Typography>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                    </Card>
                </Grid>
            </Grid>

            <Card>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Pending <Chip label={pending.length} size="small" sx={{ bgcolor: '#FF980020', color: '#FF9800', height: 20 }} /></Box>} />
                    <Tab label="History" />
                </Tabs>
                {tab === 0 && renderTable(pending, true)}
                {tab === 1 && renderTable(history, false)}
            </Card>

            {/* Approve/Reject Dialog */}
            <Dialog open={!!actionDialog} onClose={() => setActionDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: actionDialog?.action === 'approve' ? '#10B981' : '#EF4444' }}>
                    {actionDialog?.action === 'approve' ? '✅ Approve' : '❌ Reject'} Request #{actionDialog?.approval.request_id}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>Resource: <strong>{actionDialog?.approval.request?.resource_type}</strong> on <strong>{actionDialog?.approval.request?.provider_type?.toUpperCase()}</strong></Typography>
                    <TextField fullWidth multiline rows={3} label="Comments" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add your review comments..." />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionDialog(null)}>Cancel</Button>
                    <Button onClick={handleAction} variant="contained"
                        sx={{ bgcolor: actionDialog?.action === 'approve' ? '#10B981' : '#EF4444' }}>
                        {actionDialog?.action === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="sm" fullWidth>
                {detailDialog && (
                    <>
                        <DialogTitle sx={{ fontWeight: 700 }}>Request #{detailDialog.request_id} Details</DialogTitle>
                        <DialogContent dividers>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <Box><Typography variant="caption" color="text.secondary">Resource</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{detailDialog.request?.resource_type}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary">Provider</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{detailDialog.request?.provider_type?.toUpperCase()}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary">Requester</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{detailDialog.request?.user_name}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary">Est. Cost</Typography><Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>${detailDialog.request?.estimated_cost?.toFixed(2)}</Typography></Box>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary">Justification</Typography>
                                <Typography variant="body2">{detailDialog.request?.justification || 'N/A'}</Typography>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary">Configuration</Typography>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.3)', mt: 0.5, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#9CA3AF' }}>{JSON.stringify(detailDialog.request?.config_json, null, 2)}</pre>
                                </Box>
                            </Box>
                        </DialogContent>
                        <DialogActions><Button onClick={() => setDetailDialog(null)}>Close</Button></DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default ApprovalsPage;
