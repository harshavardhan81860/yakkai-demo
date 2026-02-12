
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Avatar,
    Card,
    CardContent,
    Grid,
    styled,
    alpha
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    Add as AddIcon,
    Cloud as CloudIcon,
    Schedule as ScheduleIcon,
    ErrorOutline as ErrorIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Edit as EditIcon,
    MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// --- MOCK DATA FOR PROTOTYPE ---

const STATS = {
    total: 24,
    pending: 5,
    approved: 12,
    rejected: 3
};

const REQUESTS = [
    {
        id: 'REQ-1024',
        service: 'AWS EC2 Instance',
        type: 'COMPUTE',
        tenant: 'Engineering',
        cloud: 'aws-prod-01',
        requester: 'Alice Engineer',
        submittedAt: '2023-10-25 09:30 AM',
        cost: '$45.00',
        status: 'PENDING_APPROVAL',
        stage: 'Manager Approval',
        avatar: 'A'
    },
    {
        id: 'REQ-1023',
        service: 'Azure SQL Database',
        type: 'DATABASE',
        tenant: 'Marketing',
        cloud: 'az-mrkt-db',
        requester: 'Bob Analyst',
        submittedAt: '2023-10-24 02:15 PM',
        cost: '$120.00',
        status: 'APPROVED',
        stage: 'Provisioning',
        avatar: 'B'
    },
    {
        id: 'REQ-1022',
        service: 'AWS S3 Bucket',
        type: 'STORAGE',
        tenant: 'Data Science',
        cloud: 'aws-data-lake',
        requester: 'Charlie Data',
        submittedAt: '2023-10-24 10:00 AM',
        cost: '$5.00',
        status: 'PROVISIONED',
        stage: 'Active',
        avatar: 'C'
    },
    {
        id: 'REQ-1021',
        service: 'GKE Cluster',
        type: 'KUBERNETES',
        tenant: 'Engineering',
        cloud: 'gcp-dev',
        requester: 'Dave DevOps',
        submittedAt: '2023-10-23 04:45 PM',
        cost: '$450.00',
        status: 'REJECTED',
        stage: 'Policy Violation',
        avatar: 'D'
    },
    {
        id: 'REQ-1020',
        service: 'AWS EC2 Large',
        type: 'COMPUTE',
        tenant: 'Engineering',
        cloud: 'aws-test',
        requester: 'Eve Tester',
        submittedAt: '2023-10-23 09:00 AM',
        cost: '$0.00',
        status: 'DRAFT',
        stage: 'Drafting',
        avatar: 'E'
    },
    {
        id: 'REQ-1019',
        service: 'Azure VM',
        type: 'COMPUTE',
        tenant: 'Marketing',
        cloud: 'az-dev',
        requester: 'Frank User',
        submittedAt: '2023-10-22 11:20 AM',
        cost: '$0.00',
        status: 'EXPIRED',
        stage: 'Draft Timeout',
        avatar: 'F'
    },
    {
        id: 'REQ-1018',
        service: 'AWS Lambda',
        type: 'COMPUTE',
        tenant: 'Engineering',
        cloud: 'aws-prod',
        requester: 'Grace Dev',
        submittedAt: '2023-10-20 03:00 PM',
        cost: '$15.00',
        status: 'CANCELLED',
        stage: 'User Cancelled',
        avatar: 'G'
    }
];


// --- STYLED COMPONENTS ---

interface StatusChipProps {
    status: string;
}

const StatusChip = styled(Chip, {
    shouldForwardProp: (prop) => prop !== 'status',
})<StatusChipProps>(({ theme, status }) => {
    let color: string = theme.palette.text.primary;
    let bgcolor: string = theme.palette.action.hover;

    switch (status) {
        case 'APPROVED':
        case 'PROVISIONED':
            color = theme.palette.success.main;
            bgcolor = alpha(theme.palette.success.main, 0.1);
            break;
        case 'PENDING_APPROVAL':
            color = theme.palette.warning.main;
            bgcolor = alpha(theme.palette.warning.main, 0.1);
            break;
        case 'REJECTED':
        case 'FAILED':
            color = theme.palette.error.main;
            bgcolor = alpha(theme.palette.error.main, 0.1);
            break;
        case 'DRAFT':
            color = theme.palette.info.main;
            bgcolor = alpha(theme.palette.info.main, 0.1);
            break;
        case 'EXPIRED':
        case 'CANCELLED':
            color = theme.palette.text.secondary;
            bgcolor = alpha(theme.palette.text.secondary, 0.1);
            break;
    }

    return {
        color: color,
        backgroundColor: bgcolor,
        fontWeight: 600,
        borderRadius: '8px',
        border: `1px solid ${alpha(color, 0.2)}`
    };
});

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
            <Box sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(color, 0.1),
                color: color,
                mr: 2,
                display: 'flex'
            }}>
                {icon}
            </Box>
            <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {title}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                    {value}
                </Typography>
            </Box>
        </CardContent>
    </Card>
);

const ResourceRequestsList = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ p: 1 }}>
            {/* PROTOTYPE WARNING */}
            <Typography variant="body2" sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: 'warning.light', color: 'warning.dark', border: '1px solid', borderColor: 'warning.main' }}>
                <strong>Prototype Mode:</strong> The data below is static mock data for visual demonstration.
            </Typography>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom>
                        Resource Requests
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Track and manage provisioning requests across all clouds.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/resource-request/new')}
                    sx={{
                        borderRadius: 2,
                        px: 3,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(108,99,255,0.3)',
                        background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 100%)'
                    }}
                >
                    New Request
                </Button>
            </Box>

            {/* Stats Row */}
            <Grid container spacing={3} mb={5}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Total Requests" value={STATS.total} icon={<CloudIcon />} color="#6C63FF" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Pending Approval" value={STATS.pending} icon={<ScheduleIcon />} color="#F59E0B" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Approved / Active" value={STATS.approved} icon={<CheckCircleIcon />} color="#10B981" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Rejected / Failed" value={STATS.rejected} icon={<ErrorIcon />} color="#EF4444" />
                </Grid>
            </Grid>

            {/* Request Table */}
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>REQUEST ID</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>SERVICE / CLOUD</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>REQUESTER</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>SUBMITTED</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>EST. COST</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>STATUS</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {REQUESTS.map((row) => (
                            <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell component="th" scope="row">
                                    <Typography variant="subtitle2" fontWeight={700} color="primary">
                                        {row.id}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" flexDirection="column">
                                        <Typography variant="body2" fontWeight={600} display="flex" alignItems="center" gap={1}>
                                            {row.service}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {row.tenant} • {row.cloud}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.soft' }}>
                                            {row.avatar}
                                        </Avatar>
                                        <Typography variant="body2">{row.requester}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{row.submittedAt}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600}>{row.cost}</Typography>
                                </TableCell>
                                <TableCell>
                                    <StatusChip
                                        label={row.status.replace('_', ' ')}
                                        size="small"
                                        status={row.status}
                                    />
                                    <Typography variant="caption" display="block" color="text.secondary" mt={0.5} sx={{ fontStyle: 'italic' }}>
                                        {row.stage}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    {row.status === 'DRAFT' ? (
                                        <IconButton size="small" color="primary">
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    ) : (
                                        <IconButton size="small">
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ResourceRequestsList;
