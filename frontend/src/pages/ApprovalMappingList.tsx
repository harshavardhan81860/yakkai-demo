import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, LinearProgress, Tooltip, Avatar,
  Stack, Paper, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import {
  Add, History, CheckCircle, Block, Security, Rule, Lan, Info
} from "@mui/icons-material";
import { fetchPolicies, fetchPolicyDetails, updatePolicy } from "../services/approvalMappingService";
import type { ApprovalPolicy, ApprovalGroup } from "../services/approvalMappingService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const ApprovalPolicyList = () => {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<ApprovalPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewGroups, setViewGroups] = useState<{ groups: ApprovalGroup[]; open: boolean }>({ groups: [], open: false });

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetchPolicies();
      setPolicies(res);
    } catch (err) {
      console.error("Failed to load policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const toggleActive = async (p: ApprovalPolicy) => {
    if (!window.confirm(`Are you sure you want to ${p.is_active ? 'suspend' : 'activate'} this mapping?`)) return;
    try {
      await updatePolicy(p.id, { is_active: !p.is_active });
      loadPolicies();
    } catch (err) {
      console.error(err);
    }
  };

  const viewConditions = async (policyId: string) => {
    try {
      const res: any = await fetchPolicyDetails(policyId);
      // The backend sends groups inside the policy object
      const groups = res.groups ?? res.policy?.groups ?? [];
      setViewGroups({ groups, open: true });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Workflow Mapping</Typography>
          <Typography variant="body2" color="text.secondary">Connect operational actions to verification protocols</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate("/approvals-management/policy-mapping-create")}
          sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
          Create Mapping
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Approvals", path: "/approvals/requests" },
          { label: "Workflow Mapping" }
        ]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Target</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Protocol</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No mappings found</Typography></TableCell></TableRow>
              ) : (
                policies.map((p) => (
                  <TableRow key={p.id} sx={{ opacity: p.is_active ? 1 : 0.5 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF', width: 32, height: 32 }}>
                          <Security fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{p.resource_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.action_name}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.scope_type}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.scope_id ?? 'Global'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={p.template_name || p.template_id.substring(0, 8)}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={p.is_mandatory ? "Critical" : "Conditional"}
                        size="small"
                        sx={{
                          bgcolor: p.is_mandatory ? 'rgba(239,68,68,0.1)' : 'rgba(108,99,255,0.1)',
                          color: p.is_mandatory ? '#EF4444' : '#6C63FF'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={p.is_active ? "Active" : "Suspended"}
                        size="small"
                        variant="outlined"
                        color={p.is_active ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {!p.is_mandatory && (
                        <Tooltip title="View Conditions">
                          <IconButton size="small" onClick={() => viewConditions(p.id)} sx={{ color: '#00D9FF' }}>
                            <Lan fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={() => toggleActive(p)} sx={{ color: p.is_active ? '#EF4444' : '#10B981', ml: 1 }}>
                        {p.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Condition Inspector */}
      <Dialog open={viewGroups.open} onClose={() => setViewGroups({ groups: [], open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Enforcement Conditions</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ py: 1 }}>
            {viewGroups.groups.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                <Info sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body2">No semantic conditions mapped to this policy.</Typography>
              </Box>
            ) : (
              viewGroups.groups.map((g, gi) => (
                <Paper key={g.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: '#6C63FF', fontWeight: 800 }}>Rule Group {gi + 1} ({g.operator})</Typography>
                  {g.conditions.map((c) => (
                    <Box key={c.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.attribute}</Typography>
                      <Typography variant="body2" color="text.secondary">{c.operator}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#00D9FF' }}>{c.value}</Typography>
                    </Box>
                  ))}
                </Paper>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewGroups({ groups: [], open: false })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalPolicyList;
