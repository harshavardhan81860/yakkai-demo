import React, { useState } from 'react';
import {
    Button,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Alert,
    IconButton
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import {
    triggerResourceSync,
    fetchResourceSyncHistory,
    triggerTenantResourceSync,
    fetchTenantResourceSyncHistory
} from '../../services/cloudResourcesService';
import ResourceSyncHistoryDialog, { ResourceSyncJob } from './ResourceSyncHistoryDialog';

interface ResourceSyncButtonProps {
    entityId: string;       // cloud_account_id OR tenant_id
    entityName: string;
    type: 'account' | 'tenant';  // determines which API to call
    iconOnly?: boolean;
}

const ResourceSyncButton: React.FC<ResourceSyncButtonProps> = ({ entityId, entityName, type, iconOnly }) => {
    const [jobs, setJobs] = useState<ResourceSyncJob[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [triggerOpen, setTriggerOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const isTenant = type === 'tenant';

    const fetchJobs = async () => {
        try {
            const data = isTenant
                ? await fetchTenantResourceSyncHistory(entityId)
                : await fetchResourceSyncHistory(entityId);
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load resource sync job history", err);
        }
    };

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
            const result = isTenant
                ? await triggerTenantResourceSync(entityId)
                : await triggerResourceSync(entityId);

            setTriggerOpen(false);

            if (isTenant && result?.data) {
                setSuccessMessage(
                    `Scheduled ${result.data.scheduled_count} sync jobs. ${result.data.skipped_count} skipped (already active).`
                );
            } else {
                setSuccessMessage('Resource sync job has been queued successfully.');
            }
            setSuccessOpen(true);
            await fetchJobs();
        } catch (err: any) {
            console.error("Trigger Failed", err);
            if (err?.response?.status === 409) {
                alert("A resource sync job is already running or queued for this entity.");
            } else {
                alert("Failed to schedule resource sync job.");
            }
        } finally {
            setLoading(false);
        }
    };

    const label = isTenant ? 'Sync All Resources' : 'Sync Resources';
    const dialogTitle = isTenant
        ? `Sync All Resources: ${entityName}`
        : `Sync Resources: ${entityName}`;
    const description = isTenant
        ? 'This will schedule background sync jobs for ALL eligible cloud accounts in this tenant. Container-type accounts (management, tenant, org units) will be skipped.'
        : 'This will schedule a background worker to fetch all cloud resources directly from Azure Resource Graph or AWS Resource Explorer 2.';

    return (
        <Box display="inline-flex" gap={1}>
            <Tooltip title={label}>
                <span>
                    {iconOnly ? (
                        <IconButton onClick={handleOpenTrigger} color="primary" size="small">
                            <SyncIcon fontSize="small" />
                        </IconButton>
                    ) : (
                        <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<SyncIcon />}
                            onClick={handleOpenTrigger}
                        >
                            {label}
                        </Button>
                    )}
                </span>
            </Tooltip>

            <Tooltip title="View Resource Sync History">
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
                        History
                    </Button>
                )}
            </Tooltip>

            {/* View History Dialog */}
            <ResourceSyncHistoryDialog
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                title={entityName}
                jobs={jobs}
                onRefresh={fetchJobs}
            />

            {/* Trigger Sync Confirmation Dialog */}
            <Dialog open={triggerOpen} onClose={() => setTriggerOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none' } }}>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogContent dividers>
                    {hasPendingJobs && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            There are already sync jobs running or queued. Please wait for them to complete before scheduling new ones.
                        </Alert>
                    )}
                    <Typography variant="body2" color="text.secondary" paragraph>
                        {description}
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Jobs are queued with PENDING status. The sync engine will pick them up and execute them. Check the History panel to track progress.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTriggerOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleTrigger}
                        variant="contained"
                        color="primary"
                        disabled={loading || hasPendingJobs}
                    >
                        {loading ? "Scheduling..." : isTenant ? "Schedule All" : "Schedule Sync"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success Confirmation Dialog */}
            <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Sync Scheduled</DialogTitle>
                <DialogContent>
                    <Typography>{successMessage}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuccessOpen(false)} color="inherit">Close</Button>
                    <Button onClick={() => { setSuccessOpen(false); setHistoryOpen(true); }} variant="contained" autoFocus>
                        Track in History
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ResourceSyncButton;
