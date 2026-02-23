import { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, LinearProgress, Tooltip, Avatar,
  Stack, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, StepContent, Paper, Switch, FormControlLabel
} from "@mui/material";
import {
  Assignment, Visibility, Close, Refresh, History,
  Person, SupervisorAccount, CheckCircle, Pending, Block,
  Layers, AdminPanelSettings, Search
} from "@mui/icons-material";
import {
  fetchApprovalRequests,
  fetchApprovalRequestDetails,
  closeApprovalRequest,
} from "../services/approvalRequestsService";
import { fetchApprovalTemplates } from "../services/approvalTemplatesService";
import { useRole } from "../contexts/RoleContext";
import Breadcrumbs from "../components/Common/Breadcrumbs";

type ApprovalRequest = {
  request_id: string;
  template_id: string;
  template_version: number;
  status: string;
  current_level: number;
  requested_by: string;
  created_at: string;
};

const ApprovalRequests = () => {
  const { viewMode, activeTenant } = useRole();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  // In tenant view: always show user's own requests (use_current_user=true)
  // In system view: default OFF = show all, ON = show only mine
  const [onlyMine, setOnlyMine] = useState(false);
  const [viewDetails, setViewDetails] = useState<any | null>(null);
  const [templateMap, setTemplateMap] = useState<Record<string, string>>({});
  const [templateTenantMap, setTemplateTenantMap] = useState<Record<string, string | null>>({});
  const [scopeFilter, setScopeFilter] = useState<"all" | "tenant">(
    viewMode === "tenant" ? "tenant" : "all"
  );

  const loadRequests = async () => {
    setLoading(true);
    try {
      // Tenant view: always current user's requests
      // System view: onlyMine=true → current user, onlyMine=false → all
      const useCurrentUser = viewMode === 'tenant' ? true : onlyMine;
      const res = await fetchApprovalRequests({
        use_current_user: useCurrentUser,
      });
      setRequests(Array.isArray(res?.data) ? res.data : []);
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
      const tenantMap: Record<string, string | null> = {};
      all.forEach((t: any) => {
        nameMap[t.id] = `${t.template_name} (v${t.version})`;
        tenantMap[t.id] = t.tenant_id || null;
      });
      setTemplateMap(nameMap);
      setTemplateTenantMap(tenantMap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRequests();
    loadTemplates();
  }, [onlyMine, viewMode]);

  // In tenant view: filter by tenant. In system view: no filter needed.
  const filteredRequests = useMemo(() => {
    if (viewMode !== 'tenant' || !activeTenant) return requests;
    return requests.filter(r => {
      const tmplTenantId = templateTenantMap[r.template_id];
      return tmplTenantId === activeTenant.tenant_id;
    });
  }, [requests, viewMode, activeTenant, templateTenantMap]);

  const openView = async (requestId: string) => {
    const res = await fetchApprovalRequestDetails(requestId);
    setViewDetails(res.data);
  };

  const handleCloseRequest = async (requestId: string) => {
    const reason = window.prompt("Reason to close this request?");
    if (!reason) return;
    try {
      await closeApprovalRequest(requestId, reason);
      loadRequests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Approval Requests</Typography>
          <Typography variant="body2" color="text.secondary">Monitor and manage operational change requests</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Only Mine toggle — only in system view */}
          {viewMode === "system" && (
            <FormControlLabel
              control={<Switch checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} color="primary" />}
              label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Only Mine</Typography>}
            />
          )}
          <Button variant="contained" startIcon={<Refresh />} onClick={loadRequests} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            Sync
          </Button>
        </Stack>
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Card} sx={{ borderRadius: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request Context</TableCell>
                <TableCell>Process Template</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Initiator</TableCell>
                <TableCell>Submission</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No active approval requests</Typography></TableCell></TableRow>
              ) : (
                filteredRequests.map((r) => (
                  <TableRow key={r.request_id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF' }}>
                          <Assignment fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>#{r.request_id.slice(0, 8)}</Typography>
                          <Typography variant="caption" color="text.secondary">Global ID</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {templateMap[r.template_id] ?? `Template ID: ${r.template_id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.status}
                        size="small"
                        icon={r.status === 'PENDING' ? <Pending /> : r.status === 'CLOSED' ? <Block /> : <CheckCircle />}
                        sx={{
                          bgcolor: r.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : r.status === 'CLOSED' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: r.status === 'PENDING' ? '#F59E0B' : r.status === 'CLOSED' ? '#EF4444' : '#10B981',
                          '& .MuiChip-icon': { color: 'inherit' }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={`L${r.current_level}`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.requested_by}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(r.created_at).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Examine Flow">
                        <IconButton size="small" onClick={() => openView(r.request_id)} sx={{ color: '#6C63FF' }}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {r.status === 'PENDING' && (
                        <Tooltip title="Abort Request">
                          <IconButton size="small" onClick={() => handleCloseRequest(r.request_id)} sx={{ color: '#EF4444', ml: 1 }}>
                            <Close />
                          </IconButton>
                        </Tooltip>
                      )}
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
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Approval Lineage</Typography>
              <Typography variant="caption" color="text.secondary">Request #{viewDetails?.request_id?.slice(0, 12)}</Typography>
            </Box>
          </Box>
          <Chip label={viewDetails?.status} color={viewDetails?.status === 'PENDING' ? 'warning' : 'success'} size="small" />
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'rgba(255,255,255,0.01)' }}>
          <Stepper orientation="vertical" nonLinear activeStep={(viewDetails?.current_level || 1) - 1}>
            {viewDetails?.levels?.map((l: any, index: number) => (
              <Step key={index} expanded>
                <StepLabel
                  StepIconProps={{ sx: { color: l.state === 'COMPLETED' ? '#10B981' : l.state === 'ACTIVE' ? '#6C63FF' : '#4B5563' } }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Level {l.level_order}: {l.state}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2, ml: 1, borderLeft: '2px solid rgba(255,255,255,0.06)', pl: 3 }}>
                    <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                      <Box><Typography variant="caption" color="text.secondary">Mode</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{l.approval_mode}</Typography></Box>
                      <Box><Typography variant="caption" color="text.secondary">Strategy</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{l.approval_strategy}</Typography></Box>
                    </Box>

                    {/* Decisions */}
                    {l.state === 'COMPLETED' && l.decisions?.length > 0 && (
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">Decisions Recorded:</Typography>
                        {l.decisions.map((d: any, i: number) => (
                          <Paper key={i} sx={{ p: 1.5, bgcolor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', fontWeight: 800 }}>{d.approver_type}: {d.approver_value}</Typography>
                              <Chip label={d.decision} size="small" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />
                            </Box>
                            {d.comment && <Typography variant="caption" sx={{ fontStyle: 'italic' }}>"{d.comment}"</Typography>}
                          </Paper>
                        ))}
                      </Stack>
                    )}

                    {/* Eligible Approvers */}
                    {(l.state === 'ACTIVE' || l.state === 'UPCOMING') && l.eligible_approvers?.length > 0 && (
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">Awaiting Input From:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {l.eligible_approvers.map((a: any, i: number) => (
                            <Chip
                              key={i}
                              size="small"
                              variant="outlined"
                              label={a.approver_value}
                              icon={a.approver_type === 'USER' ? <Person sx={{ fontSize: 12 }} /> : <SupervisorAccount sx={{ fontSize: 12 }} />}
                              sx={{ bgcolor: a.is_mandatory ? 'rgba(108,99,255,0.05)' : 'transparent' }}
                            />
                          ))}
                        </Box>
                      </Stack>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDetails(null)}>Close Lineage</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalRequests;
