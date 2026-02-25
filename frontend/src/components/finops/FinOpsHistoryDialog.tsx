import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Typography,
    Box,
    IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { FinOpsJob } from '../../api/finops';

export interface FinOpsHistoryDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    jobs: FinOpsJob[];
    onRefresh?: () => void;
}

const JobDetailDialog = ({ job, onClose }: { job: FinOpsJob | null, onClose: () => void }) => {
    if (!job) return null;
    return (
        <Dialog open={!!job} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Job Details</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, mb: 2 }}>
                    <Typography fontWeight={600}>Status:</Typography>
                    <Typography>{job.status}</Typography>

                    <Typography fontWeight={600}>Created At:</Typography>
                    <Typography>{job.created_at ? new Date(job.created_at).toLocaleString() : '-'}</Typography>

                    <Typography fontWeight={600}>Started At:</Typography>
                    <Typography>{job.started_at ? new Date(job.started_at).toLocaleString() : '-'}</Typography>

                    <Typography fontWeight={600}>Completed At:</Typography>
                    <Typography>{job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}</Typography>

                    <Typography fontWeight={600}>Target Range:</Typography>
                    <Typography>{job.start_date} to {job.end_date}</Typography>
                </Box>
                {job.error_log && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#fff0f0', color: '#d32f2f', borderRadius: 1, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {job.error_log}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

const FinOpsHistoryDialog: React.FC<FinOpsHistoryDialogProps> = ({
    open,
    onClose,
    title,
    jobs,
    onRefresh
}) => {
    const [selectedJob, setSelectedJob] = React.useState<FinOpsJob | null>(null);

    const renderStatus = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <Chip label="Completed" color="success" size="small" />;
            case 'PENDING': return <Chip label="Pending" color="warning" size="small" />;
            case 'IN_PROGRESS': return <Chip label="Running" color="info" size="small" />;
            case 'FAILED': return <Chip label="Failed" color="error" size="small" />;
            default: return <Chip label={status} size="small" />;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none' } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {title} Sync History
                {onRefresh && (
                    <IconButton size="small" onClick={onRefresh} title="Refresh Data">
                        <RefreshIcon />
                    </IconButton>
                )}
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2, bgcolor: 'background.default' }}>
                {jobs.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography color="text.secondary">No FinOps sync history found for this entity.</Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    {jobs[0].account_name && <TableCell>Account</TableCell>}
                                    <TableCell>Status</TableCell>
                                    <TableCell>Target Range</TableCell>
                                    <TableCell>Completed At</TableCell>
                                    <TableCell>Details / Errors</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        {job.account_name && (
                                            <TableCell><Typography variant="body2" fontWeight="medium">{job.account_name}</Typography></TableCell>
                                        )}
                                        <TableCell>{renderStatus(job.status)}</TableCell>
                                        <TableCell>{job.start_date} to {job.end_date}</TableCell>
                                        <TableCell>{job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => setSelectedJob(job)}
                                                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                                                color={job.status === 'FAILED' ? 'error' : 'primary'}
                                            >
                                                {job.status === 'FAILED' ? 'View Error' : 'View Details'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Close</Button>
            </DialogActions>

            <JobDetailDialog job={selectedJob} onClose={() => setSelectedJob(null)} />
        </Dialog>
    );
};

export default FinOpsHistoryDialog;
