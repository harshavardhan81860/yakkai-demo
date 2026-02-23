import React, { useState, useEffect } from "react";
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, IconButton, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
    Alert, Tooltip, Grid, Divider, Avatar
} from "@mui/material";
import {
    Refresh, History, PlayArrow, Science, CheckCircle, Warning, Close
} from "@mui/icons-material";

// Simulation Dialog (The "Inner" process dialog)
const DriftSimulationDialog = ({ open, onClose, accountName, onComplete }: {
    open: boolean,
    onClose: () => void,
    accountName: string,
    onComplete: (status: string) => void
}) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (open) {
            setStep(0);
            const timer1 = setTimeout(() => setStep(1), 1500);
            const timer2 = setTimeout(() => setStep(4), 4000);
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        }
    }, [open]);

    const handleViewDetails = () => {
        onComplete('drifted');
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
            PaperProps={{
                sx: {
                    background: "#111827",
                    backgroundImage: "linear-gradient(145deg, #1a2235 0%, #111827 100%)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 3,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    minHeight: '400px'
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 2 }}>
                Infrastructure Analysis: {accountName}
            </DialogTitle>
            <DialogContent sx={{ py: 6 }}>
                <Box sx={{ textAlign: 'center' }}>
                    {(step === 0 || step === 1) && (
                        <Stack spacing={3} alignItems="center">
                            <CircularProgress size={80} thickness={4} color={step === 1 ? "warning" : "primary"} />
                            <Box>
                                <Typography variant="h5" gutterBottom>
                                    {step === 0 ? "Initializing State Comparison" : "Analyzing Resource Configurations"}
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    {step === 0 ? "Fetching remote state from S3/Terraform Cloud..." : "Checking configuration of 42 resources against actual cloud state..."}
                                </Typography>
                            </Box>
                        </Stack>
                    )}
                    {step === 4 && (
                        <Stack spacing={3} alignItems="center">
                            <Box sx={{ color: 'warning.main', position: 'relative' }}>
                                <Science sx={{ fontSize: 100 }} />
                                <Warning sx={{ position: 'absolute', bottom: 0, right: 0, fontSize: 40 }} />
                            </Box>
                            <Box>
                                <Typography variant="h4" color="warning.main" fontWeight="bold">Drift Detected</Typography>
                                <Typography variant="h6" sx={{ mt: 1 }}>Analysis complete. Found differences in configuration.</Typography>
                                <Box sx={{ mt: 2, p: 3, background: 'rgba(245, 158, 11, 0.08)', borderRadius: 2, border: '1px solid rgba(245, 158, 11, 0.2)', textAlign: 'left' }}>
                                    <Typography variant="body1" color="warning.light" sx={{ lineHeight: 2 }}>
                                        • Security Group <b>'web-sg'</b>: Inbound rule changed (Port 22 source allowed from 0.0.0.0/0)<br />
                                        • EC2 Instance <b>'app-server-01'</b>: Tag 'Environment' modified from 'Prod' to 'Dev'<br />
                                        • S3 Bucket <b>'logs-prod'</b>: Versioning was disabled manually
                                    </Typography>
                                </Box>
                            </Box>
                        </Stack>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 4, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Button onClick={onClose} size="large" sx={{ color: 'text.secondary' }}>
                    Cancel
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                {step === 4 && (
                    <Button variant="contained" color="warning" size="large" onClick={handleViewDetails} startIcon={<History />}>
                        Log Activity & Close
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

interface DriftDashboardDialogProps {
    open: boolean;
    onClose: () => void;
    accountId: string;
    accountName: string;
}

const DriftDashboardDialog: React.FC<DriftDashboardDialogProps> = ({ open, onClose, accountId, accountName }) => {
    const [showSim, setShowSim] = useState(false);
    const [activities, setActivities] = useState([
        { id: 1, type: "Read Check", status: "success", timestamp: "2024-02-23 10:30", operator: "System", detail: "Regular health synchronized" },
        { id: 2, type: "Drift Detection", status: "drifted", timestamp: "2024-02-22 15:45", operator: "user_admin", detail: "3 resources found out of sync" },
        { id: 3, type: "Drift Detection", status: "synced", timestamp: "2024-02-21 09:12", operator: "System", detail: "Zero differences detected" },
    ]);

    const handleRunDetection = () => {
        setShowSim(true);
    };

    const addActivity = (status: string) => {
        const newAct = {
            id: activities.length + 1,
            type: "Drift Detection (Manual)",
            status: status,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            operator: "current_user",
            detail: status === 'drifted' ? "Detected drift in 3 resources" : "State is synchronized"
        };
        setActivities([newAct, ...activities]);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: {
                    background: "#0F172A",
                    backgroundImage: "linear-gradient(145deg, #1E293B 0%, #0F172A 100%)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 3,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                    minHeight: '80vh'
                }
            }}
        >
            <DialogTitle sx={{ p: 0 }}>
                {/* Simulation Banner */}
                <Box sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.15)',
                    color: '#F59E0B',
                    px: 3, py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderBottom: '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                    <Science sx={{ fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                        SIMULATION ENGINE ACTIVE — Drift analysis is currently operating in a sandboxed demonstration mode. No cloud resources are affected.
                    </Typography>
                </Box>

                <Box sx={{ p: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'warning.main', color: 'black' }}>
                                <Warning />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 900, color: 'white' }}>
                                    Drift Discovery Console
                                </Typography>
                                <Typography variant="body2" color="slate.400" sx={{ mt: 0.5 }}>
                                    Governance & Compliance Tracking for <b>{accountName}</b> ({accountId})
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            color="warning"
                            size="large"
                            startIcon={<PlayArrow />}
                            onClick={handleRunDetection}
                            sx={{
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                px: 4,
                                fontWeight: 800,
                                boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.39)'
                            }}
                        >
                            Execute Drift Scan
                        </Button>
                        <IconButton onClick={onClose} sx={{ color: 'white' }}>
                            <Close />
                        </IconButton>
                    </Stack>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 4, pt: 0 }}>
                <Grid container spacing={4}>
                    {/* KPI Cards */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Typography variant="overline" sx={{ color: 'slate.400', fontWeight: 700 }}>Total Assertions</Typography>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: 'white', mt: 1 }}>12</Typography>
                            <Typography variant="caption" color="success.light" sx={{ mt: 1, display: 'block' }}>↑ 14% vs last period</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Typography variant="overline" color="warning.main" sx={{ fontWeight: 700 }}>Drift Exceptions (MTD)</Typography>
                            <Typography variant="h3" color="warning.main" sx={{ fontWeight: 900, mt: 1 }}>2</Typography>
                            <Typography variant="caption" color="warning.light" sx={{ mt: 1, display: 'block' }}>Critical environmental deviation</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Typography variant="overline" color="success.main" sx={{ fontWeight: 700 }}>Infrastructure health</Typography>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
                                <CheckCircle sx={{ fontSize: 36 }} color="success" />
                                <Typography variant="h3" color="success.main" sx={{ fontWeight: 900 }}>Steady</Typography>
                            </Stack>
                            <Typography variant="caption" color="slate.400" sx={{ mt: 1, display: 'block' }}>Last baseline: 2 hours ago</Typography>
                        </Paper>
                    </Grid>

                    {/* Activity Log */}
                    <Grid size={{ xs: 12 }}>
                        <Paper sx={{ background: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>Audit Ledger & Synchronization History</Typography>
                                <IconButton size="small" sx={{ color: 'slate.400' }}><Refresh /></IconButton>
                            </Box>
                            <TableContainer>
                                <Table>
                                    <TableHead sx={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <TableRow>
                                            <TableCell sx={{ color: 'slate.300', fontWeight: 700 }}>Event Timestamp</TableCell>
                                            <TableCell sx={{ color: 'slate.300', fontWeight: 700 }}>Operation</TableCell>
                                            <TableCell sx={{ color: 'slate.300', fontWeight: 700 }}>Initiator</TableCell>
                                            <TableCell sx={{ color: 'slate.300', fontWeight: 700 }}>Compliance Status</TableCell>
                                            <TableCell sx={{ color: 'slate.300', fontWeight: 700 }}>Analysis Summary</TableCell>
                                            <TableCell align="right" sx={{ color: 'slate.300', fontWeight: 700 }}>Telemetry</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {activities.map((act) => (
                                            <TableRow key={act.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell sx={{ color: 'slate.400', fontFamily: 'monospace' }}>{act.timestamp}</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'white' }}>{act.type}</TableCell>
                                                <TableCell sx={{ color: 'slate.300' }}>{act.operator}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={act.status === 'drifted' ? 'DRIFTED' : 'SYNCHRONIZED'}
                                                        color={act.status === 'drifted' ? 'warning' : 'success'}
                                                        size="small"
                                                        sx={{ fontWeight: 900, fontSize: '0.65rem', borderRadius: 1 }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ color: 'slate.400' }}>{act.detail}</TableCell>
                                                <TableCell align="right">
                                                    <Button size="small" variant="text" sx={{ fontWeight: 700 }}>Raw Data</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            </DialogContent>

            <DriftSimulationDialog
                open={showSim}
                onClose={() => setShowSim(false)}
                accountName={accountName}
                onComplete={addActivity}
            />
        </Dialog>
    );
};

export default DriftDashboardDialog;
