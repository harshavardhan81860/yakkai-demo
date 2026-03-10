import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Avatar, MenuItem, Select, FormControl, InputLabel, InputAdornment
} from "@mui/material";
import {
  Add, VpnKey, GitHub, Code, Visibility, VisibilityOff, CheckCircle, Block,
  Edit, Refresh, Link as LinkIcon
} from "@mui/icons-material";
import {
  fetchCiCredentials, createCiCredential, updateCiCredential,
  activateCiCredential, deactivateCiCredential,
} from "../services/ciCredentialsService";
import type { CiCredentialRow } from "../services/ciCredentialsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const PROVIDERS = ["gitlab", "github"];

const CiCredentials = () => {
  const [rows, setRows] = useState<CiCredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CiCredentialRow | null>(null);
  const [form, setForm] = useState<any>({ provider: "gitlab" });
  const [showToken, setShowToken] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCiCredentials();
      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitCreate = async () => {
    try {
      await createCiCredential(form);
      setShowCreate(false);
      setForm({ provider: "gitlab" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const submitUpdate = async () => {
    if (!editing) return;
    try {
      await updateCiCredential(editing.id, {
        base_url: form.base_url,
        project_id: form.project_id,
        token: form.token,
      });
      setEditing(null);
      setForm({ provider: "gitlab" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (row: CiCredentialRow) => {
    try {
      row.is_active ? await deactivateCiCredential(row.id) : await activateCiCredential(row.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>CI Credentials</Typography>
          <Typography variant="body2" color="text.secondary">Manage automation runners and integration hooks</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setShowCreate(true)}
          sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
          Add Runner
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[{ label: "Infrastructure", path: "/tenants" }, { label: "CI Credentials" }]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer
          component={Card}
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>External Provider</TableCell>
                <TableCell>Platform URL</TableCell>
                <TableCell>Identifier / Project</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, opacity: r.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: r.is_active ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.05)', color: r.is_active ? '#6C63FF' : '#9CA3AF' }}>
                        {r.provider === 'github' ? <GitHub fontSize="small" /> : <Code fontSize="small" />}
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{r.provider}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkIcon sx={{ fontSize: '0.9rem', color: '#6B7280' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.base_url}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.project_id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.is_active ? "Active" : "Inactive"}
                      size="small"
                      icon={r.is_active ? <CheckCircle /> : <Block />}
                      sx={{
                        bgcolor: r.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: r.is_active ? '#10B981' : '#EF4444',
                        '& .MuiChip-icon': { color: 'inherit' }
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Update Configuration">
                      <IconButton size="small" onClick={() => { setEditing(r); setForm({ provider: r.provider, base_url: r.base_url, project_id: r.project_id, token: r.token }); setShowToken(false); }} sx={{ color: '#6C63FF' }}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={r.is_active ? "Deactivate" : "Activate"}>
                      <IconButton size="small" onClick={() => toggleStatus(r)} sx={{ color: r.is_active ? '#EF4444' : '#10B981', ml: 1 }}>
                        {r.is_active ? <Block /> : <CheckCircle />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{editing ? "Update" : "Setup"} CI Runner</DialogTitle>
        <DialogContent sx={{ pt: 20 }}>
          <Grid container spacing={2.5}>
            {!editing && (
              <Grid size={12}>
                <FormControl
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root fieldset": { borderColor: "divider" },
                    "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "primary.main" },
                    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                      borderColor: "primary.main",
                      borderWidth: 2
                    }
                  }}
                >
                  <InputLabel>Provider Platform</InputLabel>
                  <Select
                    value={form.provider}
                    label="Provider Platform"
                    onChange={e => setForm({ ...form, provider: e.target.value })}
                  >
                    {PROVIDERS.map(p => (
                      <MenuItem key={p} value={p} sx={{ textTransform: "capitalize" }}>
                        {p}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid size={12}>
              <TextField
                fullWidth
                label="Base API URL"
                value={form.base_url || ""}
                onChange={e => setForm({ ...form, base_url: e.target.value })}
                placeholder="e.g. https://gitlab.com"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "divider" },
                    "&:hover fieldset": { borderColor: "primary.main" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 }
                  }
                }}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label="Project ID / Scope"
                value={form.project_id || ""}
                onChange={e => setForm({ ...form, project_id: e.target.value })}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "divider" },
                    "&:hover fieldset": { borderColor: "primary.main" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 }
                  }
                }}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label="Security Token / Secret"
                type={showToken ? "text" : "password"}
                value={form.token || ""}
                onChange={e => setForm({ ...form, token: e.target.value })}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "divider" },
                    "&:hover fieldset": { borderColor: "primary.main" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 }
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowToken(!showToken)}>
                        {showToken ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => { setShowCreate(false); setEditing(null); }}>Discard</Button>
          <Button variant="contained" onClick={editing ? submitUpdate : submitCreate} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Save Configuration</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CiCredentials;
