import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, LinearProgress, Tooltip, Avatar,
  Stack, Divider, Select, MenuItem, FormControl, InputLabel, Autocomplete,
  TextField, Paper, Grid
} from "@mui/material";
import {
  History, Person, AdminPanelSettings, Search, Gavel,
  HistoryEdu, Timeline, Info, Comment, Update, CheckCircle
} from "@mui/icons-material";
import { fetchAllUsers } from "../services/usersService";
import {
  fetchApprovalActions,
  type ApprovalAction,
} from "../services/approvalActionsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const DecisionHistory = () => {
  const [mode, setMode] = useState<"user" | "admin">("user");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actions, setActions] = useState<ApprovalAction[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------- LOAD USERS (ADMIN ONLY) ---------- */
  useEffect(() => {
    if (mode === "admin") {
      fetchAllUsers().then((u) => setUsers(u.filter((x) => x.is_active)));
    }
  }, [mode]);

  /* ---------- LOAD ACTIONS ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (mode === "user") {
          const res = await fetchApprovalActions({ use_current_user: true });
          setActions(res);
        } else if (selectedUser) {
          const res = await fetchApprovalActions({ username: selectedUser.username });
          setActions(res);
        } else {
          setActions([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mode, selectedUser]);

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Decision Lineage</Typography>
          <Typography variant="body2" color="text.secondary">Audit trail of authorized governance transactions</Typography>
        </Box>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>View Perspective</InputLabel>
          <Select
            value={mode}
            label="View Perspective"
            onChange={(e) => {
              setMode(e.target.value as any);
              setSelectedUser(null);
              setActions([]);
            }}
          >
            <MenuItem value="user">My Determinations</MenuItem>
            <MenuItem value="admin">Platform-Wide (Admin)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {mode === 'admin' && (
        <Card sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.02)' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                options={users}
                getOptionLabel={(u) => `${u.username} (${u.email})`}
                value={selectedUser}
                onChange={(_, v) => setSelectedUser(v)}
                renderInput={(params) => <TextField {...params} label="Investigation Target (User Email/Username)" size="small" />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Select a user to audit their historical approval decisions across all governance workflows.
              </Typography>
            </Grid>
          </Grid>
        </Card>
      )}

      {loading ? (
        <Box sx={{ mt: 10, textAlign: 'center' }}>
          <LinearProgress sx={{ borderRadius: 2, height: 6, width: 200, mx: 'auto', mb: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 2 }}>SEQUENCING AUDIT TRAIL...</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {actions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <HistoryEdu sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.2 }} />
              <Typography variant="body2" color="text.secondary">No historical decisions identified</Typography>
            </Paper>
          ) : (
            actions.map((a) => (
              <Card
                key={a.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{
                    bgcolor: a.decision === 'APPROVED' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: a.decision === 'APPROVED' ? '#10B981' : '#EF4444',
                    width: 32, height: 32
                  }}>
                    {a.decision === 'APPROVED' ? <CheckCircle sx={{ fontSize: 18 }} /> : <Gavel sx={{ fontSize: 18 }} />}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        #{String(a.request_id || '').slice(0, 8)}
                      </Typography>
                      <Chip label={`Lvl ${a.level_order}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                      <Typography variant="caption" color="text.secondary">
                        by {a.approver_username} • {new Date(a.created_at).toLocaleDateString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.85rem' }}>
                      {a.comment || 'No comments provided.'}
                    </Typography>
                  </Box>

                  <Chip
                    label={a.decision}
                    size="small"
                    color={a.decision === 'APPROVED' ? 'success' : 'error'}
                    variant="filled"
                    sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }}
                  />
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      )}
    </Box>
  );
};

export default DecisionHistory;
