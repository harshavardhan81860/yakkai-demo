import React, { useState, useEffect } from 'react';
import {
    Button,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Box,
    Typography,
    Alert,
    Chip,
    IconButton
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import { finopsApi, FinOpsJob } from '../../api/finops';
import FinOpsHistoryDialog from './FinOpsHistoryDialog';

interface FinOpsSyncButtonProps {
    type: 'account' | 'tenant';
    entityId: string;
    entityName: string;
    iconOnly?: boolean;
}

const FinOpsSyncButton: React.FC<FinOpsSyncButtonProps> = ({ type, entityId, entityName, iconOnly }) => {
    const [jobs, setJobs] = useState<FinOpsJob[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [triggerOpen, setTriggerOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Default to Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ys = yesterday.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(ys);
    const [endDate, setEndDate] = useState(ys);
    const [selectedChip, setSelectedChip] = useState('Yesterday (Delta)');

    const fetchJobs = async () => {
        try {
            const data = type === 'account'
                ? await finopsApi.getAccountSyncJobs(entityId)
                : await finopsApi.getTenantSyncJobs(entityId);
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load generic job history", err);
        }
    };

    useEffect(() => {
        // Explicitly NOT fetching on mount or polling to prevent UI performance issues.
        // History is only fetched when the user explicitly opens the History dialog.
    }, [entityId, type]);

    const hasPendingJobs = Array.isArray(jobs) && jobs.some(j => j.status === 'PENDING' || j.status === 'IN_PROGRESS');

    const handleOpenTrigger = async () => {
        setLoading(true);
        await fetchJobs();
        setLoading(false);
        setTriggerOpen(true);
    };

    const handleTrigger = async () => {
        setLoading(true);
        try {
            if (type === 'account') {
                await finopsApi.triggerAccountSync(entityId, startDate, endDate);
            } else {
                await finopsApi.triggerTenantSync(entityId, startDate, endDate);
            }
            // Close dialog settings and open Success confirmation
            setTriggerOpen(false);
            setSuccessOpen(true);
            await fetchJobs();
        } catch (err) {
            console.error("Trigger Failed", err);
            alert("Failed to queue FinOps jobs. Limit ranges to 365 days.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box display="inline-flex" gap={1}>
            <Tooltip title={iconOnly ? "Trigger Sync" : "Trigger Cost Sync"}>
                <span>
                    {iconOnly ? (
                        <IconButton onClick={handleOpenTrigger} color="secondary" size="small">
                            <SyncIcon fontSize="small" />
                        </IconButton>
                    ) : (
                        <Button
                            variant="outlined"
                            color="secondary"
                            size="small"
                            startIcon={<SyncIcon />}
                            onClick={handleOpenTrigger}
                        >
                            Sync Costs
                        </Button>
                    )}
                </span>
            </Tooltip>

            <Tooltip title="View Sync History">
                {iconOnly ? (
                    <IconButton size="small" onClick={() => { setHistoryOpen(true); fetchJobs(); }}>
                        <ManageHistoryIcon fontSize="small" />
                    </IconButton>
                ) : (
                    <Button
                        variant="text"
                        color="inherit"
                        size="small"
                        startIcon={<ManageHistoryIcon />}
                        onClick={() => {
                            setHistoryOpen(true);
                            fetchJobs();
                        }}
                    >
                    </Button>
                )}
            </Tooltip>

            {/* View History Dialog */}
            <FinOpsHistoryDialog
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                title={entityName}
                jobs={jobs}
                onRefresh={fetchJobs}
            />

            {/* Trigger Sync Date Range Dialog */}
            <Dialog open={triggerOpen} onClose={() => setTriggerOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none' } }}>
                <DialogTitle>Queue FinOps Sync: {entityName}</DialogTitle>
                <DialogContent dividers>
                    {hasPendingJobs && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            There is already a sync job running or queued for this entity. Please wait for it to complete before scheduling another sync.
                        </Alert>
                    )}
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Select a date range to fetch historical costs. Providing a wide range (e.g., 365 days) will queue multiple background jobs.
                    </Typography>

                    <Box display="flex" gap={1} mb={3} flexWrap="wrap">
                        <Chip
                            size="small"
                            label="Yesterday (Delta)"
                            color={selectedChip === 'Yesterday (Delta)' ? 'primary' : 'default'}
                            onClick={() => {
                                const y = new Date(); y.setDate(y.getDate() - 1);
                                const ds = y.toISOString().split('T')[0];
                                setStartDate(ds); setEndDate(ds);
                                setSelectedChip('Yesterday (Delta)');
                            }}
                        />
                        <Chip
                            size="small"
                            label="Last 7 Days"
                            color={selectedChip === 'Last 7 Days' ? 'primary' : 'default'}
                            onClick={() => {
                                const end = new Date(); end.setDate(end.getDate() - 1);
                                const start = new Date(); start.setDate(start.getDate() - 7);
                                setEndDate(end.toISOString().split('T')[0]);
                                setStartDate(start.toISOString().split('T')[0]);
                                setSelectedChip('Last 7 Days');
                            }}
                        />
                        <Chip
                            size="small"
                            label="Last 30 Days"
                            color={selectedChip === 'Last 30 Days' ? 'primary' : 'default'}
                            onClick={() => {
                                const end = new Date(); end.setDate(end.getDate() - 1);
                                const start = new Date(); start.setDate(start.getDate() - 30);
                                setEndDate(end.toISOString().split('T')[0]);
                                setStartDate(start.toISOString().split('T')[0]);
                                setSelectedChip('Last 30 Days');
                            }}
                        />
                        <Chip
                            size="small"
                            label="Last 1 Year"
                            color={selectedChip === 'Last 1 Year' ? 'primary' : 'default'}
                            onClick={() => {
                                const end = new Date(); end.setDate(end.getDate() - 1);
                                const start = new Date(); start.setDate(start.getDate() - 365);
                                setEndDate(end.toISOString().split('T')[0]);
                                setStartDate(start.toISOString().split('T')[0]);
                                setSelectedChip('Last 1 Year');
                            }}
                        />
                        <Chip
                            size="small"
                            label="Custom Range"
                            color={selectedChip === 'Custom' ? 'primary' : 'default'}
                            onClick={() => setSelectedChip('Custom')}
                        />
                    </Box>

                    {selectedChip === 'Custom' && (
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField
                                label="Start Date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                label="End Date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Box>
                    )}
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Syncs execute silently in the background. The dashboard will instantly update once completed.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTriggerOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleTrigger}
                        variant="contained"
                        color="secondary"
                        disabled={loading || startDate > endDate || hasPendingJobs}
                    >
                        {loading ? "Queueing..." : "Queue Sync Jobs"}
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Success Confirmation Dialog */}
            <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Sync Scheduled</DialogTitle>
                <DialogContent>
                    <Typography>
                        The FinOps sync jobs have been successfully queued. You can track their progress in the History tab.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuccessOpen(false)} color="inherit">Close</Button>
                    <Button onClick={() => { setSuccessOpen(false); setHistoryOpen(true); }} variant="contained" autoFocus>
                        Track in History
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default FinOpsSyncButton;
