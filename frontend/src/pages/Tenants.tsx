import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid, Avatar,
  Stack, Paper
} from "@mui/material";
import {
  Add, Business, CloudCircle, CheckCircle, Block, ArrowForward, Visibility,
  Domain, Hub, AccountBalance, Edit
} from "@mui/icons-material";
import {
  fetchAllTenants, createTenant, activateTenant, deactivateTenant, updateTenant, type TenantRow,
} from "../services/tenantsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import GenericResultDialog from "../components/Common/GenericResultDialog";

const Tenants = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState<'create' | 'edit' | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null);
  const [form, setForm] = useState<{ name: string; display_name: string }>({ name: '', display_name: '' });
  const [resultDialog, setResultDialog] = useState<{ success: boolean; message: string; tenant?: TenantRow } | null>(null);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await fetchAllTenants();
      const sorted = [...data].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id - b.id);
      setTenants(sorted);
    } catch (err) {
      console.error("Failed to load tenants", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleToggle = async (tenant: TenantRow) => {
    try {
      tenant.is_active ? await deactivateTenant(tenant.id) : await activateTenant(tenant.id);
      await loadTenants();
    } catch (err: any) {
      console.error("Failed to toggle tenant status", err);
      alert(err.response?.data?.message || "Failed to toggle tenant status.");
    }
  };

  const openEdit = (t: TenantRow) => {
    setSelectedTenant(t);
    setForm({ name: t.name, display_name: t.display_name });
    setShowCreate('edit');
  };

  const openCreate = () => {
    setSelectedTenant(null);
    setForm({ name: '', display_name: '' });
    setShowCreate('create');
  };

  const submitSave = async () => {
    if (!form.name || !form.display_name) return;
    try {
      if (showCreate === 'create') {
        await createTenant(form);
      } else if (selectedTenant) {
        await updateTenant(selectedTenant.id, { display_name: form.display_name });
      }
      setShowCreate(null);
      setForm({ name: '', display_name: '' });
      setResultDialog({ success: true, message: `Tenant ${showCreate === 'create' ? 'created' : 'updated'} successfully.` });
    } catch (err: any) {
      setResultDialog({
        success: false,
        message: err.response?.data?.message ?? `Failed to save tenant`
      });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Tenants</Typography>
          <Typography variant="body2" color="text.secondary">Manage organizational units and resource boundaries</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            Create Tenant
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[{ label: "Infrastructure" }, { label: "Tenants" }]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <Grid container spacing={3}>
          {tenants.map((t) => (
            <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 4,
                  transition: 'all 0.2s ease',
                  border: '1px solid rgba(255,255,255,0.05)',
                  bgcolor: t.is_active ? 'rgba(108,99,255,0.02)' : 'rgba(255,255,255,0.01)',
                  opacity: t.is_active ? 1 : 0.5,
                  filter: t.is_active ? 'none' : 'grayscale(0.5)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    borderColor: 'rgba(108,99,255,0.3)',
                    bgcolor: 'rgba(255,255,255,0.02)'
                  }
                }}
              >
                {/* Status Indicator Dot */}
                <Box sx={{
                  position: 'absolute', top: 12, right: 12,
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: t.is_active ? '#10B981' : '#4B5563',
                  boxShadow: t.is_active ? '0 0 8px #10B981' : 'none'
                }} />

                <Avatar sx={{
                  width: 48, height: 48, mb: 1.5,
                  background: t.is_active ? 'linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(59,130,246,0.2) 100%)' : 'rgba(255,255,255,0.05)',
                  color: t.is_active ? '#6C63FF' : '#4B5563',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Business sx={{ fontSize: 24 }} />
                </Avatar>

                <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center', mb: 0.2, color: t.is_active ? '#fff' : '#6B7280' }}>
                  {t.display_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', mb: 2 }}>
                  {t.name}
                </Typography>

                {/* Actions - Always Visible */}
                <Stack spacing={1} sx={{ width: '100%' }}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="small"
                      startIcon={<Visibility sx={{ fontSize: 16 }} />}
                      onClick={() => navigate(`/tenants/${t.id}/dashboard`, { state: { tenantName: t.display_name || t.name } })}
                      sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.7rem', py: 0.5 }}
                    >
                      Workspace
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      startIcon={<Edit sx={{ fontSize: 14 }} />}
                      onClick={() => openEdit(t)}
                      sx={{ borderRadius: 1.5, fontSize: '0.65rem', py: 0.4 }}
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleToggle(t)}
                      sx={{
                        border: '1px solid',
                        borderColor: t.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                        color: t.is_active ? '#EF4444' : '#10B981',
                        borderRadius: 1.5,
                        width: 32
                      }}
                    >
                      {t.is_active ? <Block sx={{ fontSize: 16 }} /> : <CheckCircle sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          ))}
          {tenants.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 6, bgcolor: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <Business sx={{ fontSize: 60, color: 'text.disabled', mb: 2, opacity: 0.2 }} />
                <Typography variant="h6" color="text.secondary">No tenants identified in this organization</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create / Edit Modal */}
      <Dialog
        open={!!showCreate}
        onClose={() => setShowCreate(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{showCreate === 'create' ? 'Create New Tenant' : 'Edit Tenant'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Technical Name"
              placeholder="e.g. ALPHA_DIV"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              disabled={showCreate === 'edit'}
            />
            <TextField fullWidth label="Display Name" placeholder="e.g. Alpha Division" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowCreate(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitSave}>{showCreate === 'create' ? 'Create' : 'Save Changes'}</Button>
        </DialogActions>
      </Dialog>

      <GenericResultDialog
        isOpen={!!resultDialog}
        success={resultDialog?.success}
        message={resultDialog?.message}
        onClose={() => { setResultDialog(null); loadTenants(); }}
      />
    </Box>
  );
};

export default Tenants;
