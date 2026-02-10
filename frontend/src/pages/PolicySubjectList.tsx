import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, LinearProgress, Tooltip, Avatar,
  Stack, Divider
} from "@mui/material";
import {
  Add, Person, Group, Security, CheckCircle, Block,
  History, Business, Info, Policy as PolicyIcon
} from "@mui/icons-material";
import {
  fetchPolicySubjects,
  updatePolicySubject,
  fetchPolicies,
} from "../services/governanceService";
import type {
  Policy,
  PolicySubject,
} from "../services/governanceService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

/* ---------- HELPERS ---------- */
const policyLabel = (p?: Policy) => {
  if (!p) return "-";
  return `${p.resource_type} | ${p.action_name}`;
};

const policyScope = (p?: Policy) => {
  if (!p) return "";
  return `${p.scope_type}${p.scope_id ? " (" + p.scope_id + ")" : ""}`;
};

/* ---------- COMPONENT ---------- */
const PolicySubjectList = () => {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<PolicySubject[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [subjectsRes, policiesRes] = await Promise.all([
        fetchPolicySubjects(),
        fetchPolicies(),
      ]);
      setSubjects(subjectsRes);
      setPolicies(policiesRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (s: PolicySubject) => {
    try {
      await updatePolicySubject(s.id, !s.is_active);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Policy Subject Bindings</Typography>
          <Typography variant="body2" color="text.secondary">Mapping governance guardrails to specific users and groups</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate("/permissions-management/policy_subject_create")}
          sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
          Bind Subject
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Permissions", path: "/permissions-management" },
          { label: "Policy Subjects" }
        ]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Card} sx={{ borderRadius: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Enforced Policy</TableCell>
                <TableCell>Subject Bound</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Binding Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subjects.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No policy subject bindings found</Typography></TableCell></TableRow>
              ) : (
                subjects.map((s) => {
                  const policy = policies.find(p => p.id === s.policy_id);
                  return (
                    <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
                            <PolicyIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{policyLabel(policy)}</Typography>
                            <Typography variant="caption" color="text.secondary">{policyScope(policy)}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {s.subject_type === 'USER' ? <Person sx={{ fontSize: '1rem', color: '#00D9FF' }} /> : <Group sx={{ fontSize: '1rem', color: '#6C63FF' }} />}
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.subject_id}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.subject_type}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={s.is_active ? "Bound" : "Disabled"} size="small"
                          sx={{ bgcolor: s.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: s.is_active ? '#10B981' : '#EF4444' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <History sx={{ fontSize: '0.8rem', opacity: 0.6 }} /> {new Date(s.created_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => toggleActive(s)} sx={{ color: s.is_active ? '#EF4444' : '#10B981' }}>
                          {s.is_active ? <Block /> : <CheckCircle />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default PolicySubjectList;
