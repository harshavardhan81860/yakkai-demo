import React, { useState } from 'react';
import {
    Button, Menu, MenuItem, ListItemIcon, ListItemText,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Box, Typography, Alert, Chip, Tabs, Tab,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, IconButton, Divider
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import { finopsApi, FinOpsJob } from '../../api/finops';
import {
    triggerResourceSync, fetchResourceSyncHistory,
    triggerTenantResourceSync, fetchTenantResourceSyncHistory
} from '../../services/cloudResourcesService';
import { ResourceSyncJob } from '../CloudAccounts/ResourceSyncHistoryDialog';

interface UnifiedSyncButtonProps {
    type: 'account' | 'tenant';
    entityId: string;
    entityName: string;
}

const statusChip = (status: string) => {
    switch (status) {
        case 'COMPLETED': return <Chip label="Completed" color="success" size="small" />;
        case 'PENDING': return <Chip label="Pending" color="warning" size="small" />;
        case 'IN_PROGRESS': return <Chip label="Running" color="info" size="small" />;
        case 'FAILED': return <Chip label="Failed" color="error" size="small" />;
        default: return <Chip label={status} size="small" />;
    }
};

const UnifiedSyncButton: React.FC<UnifiedSyncButtonProps> = ({ type, entityId, entityName }) => {
    // Menu
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    // FinOps Cost Sync
    const [costDialogOpen, setCostDialogOpen] = useState(false);
    const [costLoading, setCostLoading] = useState(false);
    const [finopsJobs, setFinopsJobs] = useState<FinOpsJob[]>([]);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ys = yesterday.toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(ys);
    const [endDate, setEndDate] = useState(ys);
    const [selectedChip, setSelectedChip] = useState('Yesterday (Delta)');

    // Resource Sync
    const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
    const [resourceLoading, setResourceLoading] = useState(false);
    const [resourceJobs, setResourceJobs] = useState<ResourceSyncJob[]>([]);

    // History
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyTab, setHistoryTab] = useState(0);

    // Success
    const [successOpen, setSuccessOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const isTenant = type === 'tenant';

    // --- Data Fetchers ---
    const fetchFinopsJobs = async () => {
        try {
            const data = isTenant
                ? await finopsApi.getTenantSyncJobs(entityId)
                : await finopsApi.getAccountSyncJobs(entityId);
            setFinopsJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load FinOps job history", err);
        }
    };

    const fetchResJobs = async () => {
        try {
            const data = isTenant
                ? await fetchTenantResourceSyncHistory(entityId)
                : await fetchResourceSyncHistory(entityId);
            setResourceJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load Resource sync history", err);
        }
    };

    const fetchAllJobs = async () => {
        await Promise.all([fetchFinopsJobs(), fetchResJobs()]);
    };

    const hasPendingFinops = finopsJobs.some(j => j.status === 'PENDING' || j.status === 'IN_PROGRESS');
    const hasPendingResource = resourceJobs.some(j => j.status === 'PENDING' || j.status === 'IN_PROGRESS');

    // --- Menu Handlers ---
    const handleOpenCostSync = async () => {
        setMenuAnchor(null);
        setCostLoading(true);
        await fetchFinopsJobs();
        setCostLoading(false);
        setCostDialogOpen(true);
    };

    const handleOpenResourceSync = async () => {
        setMenuAnchor(null);
        setResourceLoading(true);
        await fetchResJobs();
        setResourceLoading(false);
        setResourceDialogOpen(true);
    };

    // --- Trigger Handlers ---
    const handleTriggerCostSync = async () => {
        setCostLoading(true);
        try {
            if (isTenant) {
                await finopsApi.triggerTenantSync(entityId, startDate, endDate);
            } else {
                await finopsApi.triggerAccountSync(entityId, startDate, endDate);
            }
            setCostDialogOpen(false);
            setSuccessMessage('FinOps cost sync jobs have been queued successfully.');
            setSuccessOpen(true);
            await fetchFinopsJobs();
        } catch {
            alert("Failed to queue FinOps jobs. Limit ranges to 365 days.");
        } finally {
            setCostLoading(false);
        }
    };

    const handleTriggerResourceSync = async () => {
        setResourceLoading(true);
        try {
            const result = isTenant
                ? await triggerTenantResourceSync(entityId)
                : await triggerResourceSync(entityId);

            setResourceDialogOpen(false);
            if (isTenant && result?.data) {
                setSuccessMessage(`Scheduled ${result.data.scheduled_count} resource sync jobs. ${result.data.skipped_count} skipped.`);
            } else {
                setSuccessMessage('Resource sync job has been queued.');
            }
            setSuccessOpen(true);
            await fetchResJobs();
        } catch (err: any) {
            if (err?.response?.status === 409) {
                alert("A resource sync job is already running or queued.");
            } else {
                alert("Failed to schedule resource sync.");
            }
        } finally {
            setResourceLoading(false);
        }
    };

    return (
        <>
            {/* ---- Single Sync Button with Dropdown ---- */}
            <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<SyncIcon />}
                endIcon={<KeyboardArrowDownIcon />}
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{ fontWeight: 600 }}
            >
                Sync
            </Button>
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                PaperProps={{ sx: { minWidth: 220, bgcolor: 'background.paper', backgroundImage: 'none' } }}
            >
                <MenuItem onClick={handleOpenCostSync}>
                    <ListItemIcon><AttachMoneyIcon fontSize="small" color="success" /></ListItemIcon>
                    <ListItemText>Sync Cost Data</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleOpenResourceSync}>
                    <ListItemIcon><StorageIcon fontSize="small" color="primary" /></ListItemIcon>
                    <ListItemText>Sync Resources</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { setMenuAnchor(null); setHistoryOpen(true); fetchAllJobs(); }}>
                    <ListItemIcon><ManageHistoryIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>View Sync History</ListItemText>
                </MenuItem>
            </Menu>

            {/* ---- Cost Sync Dialog ---- */}
            <Dialog open={costDialogOpen} onClose={() => setCostDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none' } }}>
                <DialogTitle>Queue Cost Sync: {entityName}</DialogTitle>
                <DialogContent dividers>
                    {hasPendingFinops && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            A cost sync is already running or queued. Wait for completion.
                        </Alert>
                    )}
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Select a date range to fetch historical costs. Wide ranges queue multiple background jobs.
                    </Typography>
                    <Box display="flex" gap={1} mb={3} flexWrap="wrap">
                        {[
                            { label: 'Yesterday (Delta)', days: 1 },
                            { label: 'Last 7 Days', days: 7 },
                            { label: 'Last 30 Days', days: 30 },
                            { label: 'Last 1 Year', days: 365 },
                        ].map(({ label, days }) => (
                            <Chip key={label} size="small" label={label}
                                color={selectedChip === label ? 'primary' : 'default'}
                                onClick={() => {
                                    const end = new Date(); end.setDate(end.getDate() - 1);
                                    const start = new Date(); start.setDate(start.getDate() - days);
                                    setEndDate(end.toISOString().split('T')[0]);
                                    setStartDate(start.toISOString().split('T')[0]);
                                    setSelectedChip(label);
                                }}
                            />
                        ))}
                        <Chip size="small" label="Custom Range"
                            color={selectedChip === 'Custom' ? 'primary' : 'default'}
                            onClick={() => setSelectedChip('Custom')}
                        />
                    </Box>
                    {selectedChip === 'Custom' && (
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField label="Start Date" type="date" value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} fullWidth />
                            <TextField label="End Date" type="date" value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} fullWidth />
                        </Box>
                    )}
                    <Alert severity="info" sx={{ mt: 2 }}>Syncs execute silently in the background.</Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCostDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleTriggerCostSync} variant="contained" color="secondary"
                        disabled={costLoading || startDate > endDate || hasPendingFinops}>
                        {costLoading ? "Queueing..." : "Queue Sync Jobs"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ---- Resource Sync Dialog ---- */}
            <Dialog open={resourceDialogOpen} onClose={() => setResourceDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none' } }}>
                <DialogTitle>Sync Resources: {entityName}</DialogTitle>
                <DialogContent dividers>
                    {hasPendingResource && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Resource sync jobs are already running or queued.
                        </Alert>
                    )}
                    <Typography variant="body2" color="text.secondary" paragraph>
                        {isTenant
                            ? 'This will schedule sync jobs for ALL eligible cloud accounts in this tenant.'
                            : 'This will schedule a background job to fetch all cloud resources via Azure Resource Graph or AWS Resource Explorer.'}
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Jobs are queued as PENDING. The sync engine will pick them up automatically.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResourceDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleTriggerResourceSync} variant="contained" color="primary"
                        disabled={resourceLoading || hasPendingResource}>
                        {resourceLoading ? "Scheduling..." : isTenant ? "Schedule All" : "Schedule Sync"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ---- Unified History Dialog with Tabs ---- */}
            <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none' } }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {entityName} — Sync History
                    <IconButton size="small" onClick={fetchAllJobs} title="Refresh"><RefreshIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0, bgcolor: 'background.default' }}>
                    <Tabs value={historyTab} onChange={(_, v) => setHistoryTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Tab label={`Cost Sync (${finopsJobs.length})`} sx={{ fontWeight: 600 }} />
                        <Tab label={`Resource Sync (${resourceJobs.length})`} sx={{ fontWeight: 600 }} />
                    </Tabs>

                    <Box sx={{ p: 2 }}>
                        {historyTab === 0 && (
                            finopsJobs.length === 0 ? (
                                <Box textAlign="center" py={4}><Typography color="text.secondary">No FinOps sync history found.</Typography></Box>
                            ) : (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                {finopsJobs[0]?.account_name && <TableCell>Account</TableCell>}
                                                <TableCell>Status</TableCell>
                                                <TableCell>Target Range</TableCell>
                                                <TableCell>Completed At</TableCell>
                                                <TableCell>Details</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {finopsJobs.map((job) => (
                                                <TableRow key={job.id}>
                                                    {job.account_name && <TableCell><Typography variant="body2">{job.account_name}</Typography></TableCell>}
                                                    <TableCell>{statusChip(job.status)}</TableCell>
                                                    <TableCell>{job.start_date} → {job.end_date}</TableCell>
                                                    <TableCell>{job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color={job.status === 'FAILED' ? 'error' : 'text.secondary'} sx={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {job.error_log || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )
                        )}

                        {historyTab === 1 && (
                            resourceJobs.length === 0 ? (
                                <Box textAlign="center" py={4}><Typography color="text.secondary">No resource sync history found.</Typography></Box>
                            ) : (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Resources Found</TableCell>
                                                <TableCell>Started At</TableCell>
                                                <TableCell>Completed At</TableCell>
                                                <TableCell>Details</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {resourceJobs.map((job) => (
                                                <TableRow key={job.id}>
                                                    <TableCell>{statusChip(job.status)}</TableCell>
                                                    <TableCell>{job.resources_found}</TableCell>
                                                    <TableCell>{job.started_at ? new Date(job.started_at).toLocaleString() : '-'}</TableCell>
                                                    <TableCell>{job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color={job.status === 'FAILED' ? 'error' : 'text.secondary'} sx={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {job.error_log || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryOpen(false)} color="inherit">Close</Button>
                </DialogActions>
            </Dialog>

            {/* ---- Success Dialog ---- */}
            <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Sync Scheduled</DialogTitle>
                <DialogContent>
                    <Typography>{successMessage}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuccessOpen(false)} color="inherit">Close</Button>
                    <Button onClick={() => { setSuccessOpen(false); setHistoryOpen(true); fetchAllJobs(); }} variant="contained" autoFocus>
                        Track in History
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default UnifiedSyncButton;
