import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, LinearProgress, Tooltip, Avatar,
  Stack, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormControlLabel, Stepper, Step, StepLabel, StepContent, Paper
} from "@mui/material";
import {
  PlaylistAddCheck, Visibility, CheckCircle, Close, Refresh, History,
  Person, SupervisorAccount, Pending, Block, Assignment,
  AdminPanelSettings, ThumbUp, ThumbDown
} from "@mui/icons-material";
import {
  fetchPendingApprovals,
  submitApprovalDecision,
  fetchApprovalRequestDetails,
} from "../services/pendingApprovalsService";
import type { PendingApproval } from "../services/pendingApprovalsService";
import { fetchApprovalTemplates } from "../services/approvalTemplatesService";
import { useRole } from "../contexts/RoleContext";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const PendingApprovals = () => {
  const { viewMode, activeTenant } = useRole();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  // In tenant view: always show user's pending (use_current_user=true)
  // In system view: default OFF = show all, ON = show only mine
  const [onlyMine, setOnlyMine] = useState(false);
  const [viewDetails, setViewDetails] = useState<any | null>(null);
  const [templateMap, setTemplateMap] = useState<Record<string, string>>({});
  const [templateTenantMap, setTemplateTenantMap] = useState<Record<string, string | null>>({});

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await fetchPendingApprovals({
        use_current_user: onlyMine,
      });
      setApprovals(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const all = await fetchApprovalTemplates();
      const nameMap: Record<string, string> = {};
      const tMap: Record<string, string | null> = {};
      all.forEach((t: any) => {
        nameMap[t.id] = `${t.template_name} (v${t.version})`;
        tMap[t.id] = t.tenant_id ?? null;
      });
      setTemplateMap(nameMap);
      setTemplateTenantMap(tMap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPending();
    loadTemplates();
  }, [onlyMine, viewMode]);

  const filteredApprovals = approvals.filter(a => {
    if (viewMode === 'tenant' && activeTenant) {
      return templateTenantMap[a.template_id] === activeTenant.tenant_id;
    }
    return true;
  });

  const openView = async (id: string) => {
    const res = await fetchApprovalRequestDetails(id);
    setViewDetails(res.data);
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm("Confirm approval for this request?")) return;
    try {
      await submitApprovalDecision(id, { decision: "APPROVED" });
      loadPending();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    const comment = window.prompt("Rejection comment (mandatory)");
    if (!comment) return;
    try {
      await submitApprovalDecision(id, { decision: "REJECTED", comment });
      loadPending();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Pending Actions</Typography>
          <Typography variant="body2" color="text.secondary">Governance tasks awaiting your explicit authorization</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={<Switch checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} color="primary" />}
            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Only Mine</Typography>}
          />
          <Button variant="contained" startIcon={<Refresh />} onClick={loadPending} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            Refresh List
          </Button>
        </Stack>
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Card} sx={{ borderRadius: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Identity Binding</TableCell>
                <TableCell>Workflow Context</TableCell>
                <TableCell>Originator</TableCell>
                <TableCell>Process Level</TableCell>
                <TableCell>Established</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredApprovals.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><Typography color="text.secondary">Operational queue is clear</Typography></TableCell></TableRow>
              ) : (
                filteredApprovals.map((a) => (
                  <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
                          <PlaylistAddCheck fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>#{a.id.slice(0, 8)}</Typography>
                          <Typography variant="caption" color="text.secondary">Awaiting Decision</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{templateMap[a.template_id] ?? `Rev ${a.template_version}`}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{a.requested_by}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`Level ${a.current_level}`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(a.created_at).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {(viewMode === 'tenant' || !onlyMine) && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Approve">
                            <IconButton size="small" onClick={() => handleApprove(a.id)} sx={{ color: '#10B981' }}>
                              <ThumbUp />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton size="small" onClick={() => handleReject(a.id)} sx={{ color: '#EF4444' }}>
                              <ThumbDown />
                            </IconButton>
                          </Tooltip>
                          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        </Stack>
                      )}
                      <Tooltip title="View Flow">
                        <IconButton size="small" onClick={() => openView(a.id)} sx={{ color: '#00D9FF' }}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* FLOW DETAILS DIALOG */}
      <Dialog open={!!viewDetails} onClose={() => setViewDetails(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}><History /></Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Decision Flow</Typography>
              <Typography variant="caption" color="text.secondary">Tracing request #{viewDetails?.request_id?.slice(0, 12)}</Typography>
            </Box>
          </Box>
          <Chip label={viewDetails?.status} color="warning" size="small" />
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'rgba(255,255,255,0.01)' }}>
          <Stepper orientation="vertical" nonLinear activeStep={(viewDetails?.current_level || 1) - 1}>
            {viewDetails?.levels?.map((l: any, index: number) => (
              <Step key={index} expanded>
                <StepLabel StepIconProps={{ sx: { color: l.state === 'COMPLETED' ? '#10B981' : l.state === 'ACTIVE' ? '#6C63FF' : '#4B5563' } }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Level {l.level_order}: {l.state}</Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2, ml: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Strategy: {l.approval_strategy} | Mode: {l.approval_mode}</Typography>

                    {l.eligible_approvers?.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {l.eligible_approvers.map((approver: any, i: number) => (
                          <Chip
                            key={i}
                            size="small"
                            label={`${approver.approver_type}: ${approver.approver_value}`}
                            icon={approver.approver_type === 'USER' ? <Person sx={{ fontSize: 12 }} /> : <SupervisorAccount sx={{ fontSize: 12 }} />}
                            sx={{ bgcolor: approver.is_mandatory ? 'rgba(108,99,255,0.1)' : 'transparent' }}
                          />
                        ))}
                      </Stack>
                    )}

                    {l.decision && (
                      <Paper sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Decision: {l.decision}</Typography>
                        {l.comment && <Typography variant="caption" sx={{ fontStyle: 'italic' }}>Comment: "{l.comment}"</Typography>}
                      </Paper>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDetails(null)}>Dismiss</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingApprovals;
