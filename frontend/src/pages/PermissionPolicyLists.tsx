import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, LinearProgress, Tooltip, Avatar,
  Stack, Paper
} from "@mui/material";
import {
  Add, History, CheckCircle, Block, SwapHoriz, Gavel
} from "@mui/icons-material";
import { fetchPolicies, updatePolicy } from "../services/governanceService";
import type { Policy } from "../services/governanceService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const PolicyList = () => {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

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

  const toggleActive = async (p: Policy) => {
    try {
      await updatePolicy(p.id, { is_active: !p.is_active });
      loadPolicies();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleEffect = async (p: Policy) => {
    try {
      await updatePolicy(p.id, {
        effect: p.effect === "ALLOW" ? "DENY" : "ALLOW",
      });
      loadPolicies();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Policy List</Typography>
          <Typography variant="body2" color="text.secondary">Manage global guardrails and operational access rules</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate("/permissions-management/policy_create")}
          sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
          Create Policy
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Governance", path: "/permissions-management/policy_list" },
          { label: "Policy List" }
        ]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Target</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Effect</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No policies found</Typography></TableCell></TableRow>
              ) : (
                policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF', width: 32, height: 32 }}>
                          <Gavel fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{p.resource_type}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.action_name}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.effect} size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: p.effect === "ALLOW" ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: p.effect === "ALLOW" ? '#10B981' : '#EF4444'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.scope_type}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.scope_id || 'Global'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.is_active ? "Enforced" : "Disabled"} size="small" variant="outlined"
                        color={p.is_active ? "primary" : "default"} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={`Switch to ${p.effect === "ALLOW" ? "DENY" : "ALLOW"}`}>
                        <IconButton size="small" onClick={() => toggleEffect(p)} sx={{ color: '#00D9FF' }}>
                          <SwapHoriz fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
    </Box>
  );
};

export default PolicyList;
