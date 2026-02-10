import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Avatar, Paper, Stack, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert
} from "@mui/material";
import {
  Add, Cloud, CheckCircle, Block, Visibility, Refresh, ArrowBack,
  Edit, PlayArrow, Check, ErrorOutline, Hub, ArrowForward
} from "@mui/icons-material";
import {
  fetchCloudAccounts, createCloudAccount, activateCloudAccount,
  deactivateCloudAccount, fetchActiveCiCredentials, testCloudConnection,
  updateCloudAccount
} from "../services/cloudAccountsService";
import type {
  CloudAccountRow, CiCredentialDropdown
} from "../services/cloudAccountsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const PROVIDERS = ["aws", "azure", "gcp"];

const CloudAccounts = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [tenantName, setTenantName] = useState<string>("");
  const [accounts, setAccounts] = useState<CloudAccountRow[]>([]);
  const [ciRunners, setCiRunners] = useState<CiCredentialDropdown[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<CloudAccountRow | null>(null);
  const [form, setForm] = useState<any>({
    name: "",
    account_type: "root",
    cloud_provider: "aws",
    parent_id: "",
    ci_credentials_id: "",
    cred_metadata: {}
  });

  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await fetchCloudAccounts(tenantId as string);
      setAccounts(data);
      if (data.length > 0) {
        setTenantName(data[0].tenant_id || "Tenant");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCiRunners = async () => {
    try {
      const runners = await fetchActiveCiCredentials();
      setCiRunners(runners);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadAccounts();
      loadCiRunners();
    }
  }, [tenantId]);

  const goToComponents = (account: CloudAccountRow) => {
    navigate(`/tenants/${tenantId}/cloud-accounts/${account.id}/components`, {
      state: {
        cloudAccountType: account.cloud_provider.toUpperCase(),
        cloudAccountId: account.id,
        tenantName: tenantName,
        accountName: account.name,
      },
    });
  };

  const handleTest = async (id: string, provider: string, type: 'read' | 'write') => {
    const key = `${id}-${type}`;
    setTesting(prev => ({ ...prev, [key]: true }));
    try {
      const res = await testCloudConnection(id, provider, type);
      setMsg({ type: res.status === 'success' ? 'success' : 'error', text: res.message });
      loadAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || `Failed to test ${type} connection` });
    } finally {
      setTesting(prev => ({ ...prev, [key]: false }));
    }
  };

  const openCreate = () => {
    setForm({
      name: "",
      account_type: "root",
      cloud_provider: "aws",
      parent_id: "",
      ci_credentials_id: "",
      cred_metadata: { account_id: "", role_name: "", tenant_id: "", client_id: "", subscription_id: "" }
    });
    setShowModal('create');
  };

  const openEdit = (acc: CloudAccountRow) => {
    setSelectedAccount(acc);
    setForm({
      name: acc.name,
      account_type: acc.parent_id ? "sub" : "root",
      cloud_provider: acc.cloud_provider,
      parent_id: acc.parent_id || "",
      ci_credentials_id: acc.ci_credentials_id || "",
      cred_metadata: acc.cred_metadata || {}
    });
    setShowModal('edit');
  };

  const handleSubmit = async () => {
    if (!form.name || !form.ci_credentials_id) {
      setMsg({ type: 'error', text: "Name and Runner are required" });
      return;
    }

    const payload = {
      ...form,
      tenant_id: tenantId,
      parent_id: form.account_type === 'sub' ? form.parent_id : null
    };

    try {
      if (showModal === 'create') {
        await createCloudAccount(payload);
        setMsg({ type: 'success', text: "Account created successfully" });
      } else {
        // Only allow updating certain fields as per user request
        const updatePayload = {
          name: form.name,
          cred_metadata: form.cred_metadata,
          ci_credentials_id: form.ci_credentials_id
        };
        await updateCloudAccount(selectedAccount!.id, updatePayload);
        setMsg({ type: 'success', text: "Account updated successfully" });
      }
      setShowModal(null);
      loadAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || "Failed to save account" });
    }
  };

  const handleToggleStatus = async (acc: CloudAccountRow) => {
    try {
      acc.is_active ? await deactivateCloudAccount(acc.id) : await activateCloudAccount(acc.id);
      loadAccounts();
      setMsg({ type: 'success', text: `Account ${acc.is_active ? 'deactivated' : 'activated'} successfully` });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || "Failed to toggle status" });
    }
  };

  const rootAccounts = accounts.filter(a => !a.parent_id);
  const getSubAccounts = (pid: string) => accounts.filter(a => a.parent_id === pid);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: 2 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Cloud Accounts</Typography>
          <Typography variant="body2" color="text.secondary">Hierarchical environments for your tenant clusters</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate("/tenants")}>Back</Button>
          <Button variant="outlined" onClick={loadAccounts}><Refresh /></Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            Add Account
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Infrastructure", path: "/tenants" },
          { label: "Cloud Accounts" }
        ]} />
      </Box>

      {loading ? (
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <LinearProgress sx={{ width: '50%', mx: 'auto', borderRadius: 2 }} />
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {rootAccounts.map(root => {
            const allSubAccounts = getSubAccounts(root.id);
            const isExpanded = expandedRoots[root.id];
            const visibleSubAccounts = isExpanded ? allSubAccounts : allSubAccounts.slice(0, 6);

            return (
              <Box key={root.id} sx={{
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.05)',
                bgcolor: 'rgba(255,255,255,0.005)',
                overflow: 'hidden',
                opacity: root.is_active ? 1 : 0.5,
                filter: root.is_active ? 'none' : 'grayscale(0.4)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}>
                {/* Root Row - Dense */}
                <Box sx={{
                  p: 1.5, px: 2.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  bgcolor: 'rgba(108,99,255,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                    <Avatar sx={{
                      width: 32, height: 32,
                      bgcolor: root.cloud_provider === 'aws' ? '#FF990022' : '#0078D422',
                      color: root.cloud_provider === 'aws' ? '#FF9900' : '#0078D4'
                    }}>
                      <Cloud sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1 }}>{root.name}</Typography>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Visibility sx={{ fontSize: 16 }} />}
                          onClick={() => goToComponents(root)}
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            borderRadius: 2,
                            px: 2,
                            background: 'linear-gradient(135deg, #6C63FF 0%, #4A42D4 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #7D75FF 0%, #5B53E5 100%)' }
                          }}
                        >
                          Resources
                        </Button>
                      </Stack>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mt: 0.5, display: 'block' }}>
                        {root.cloud_provider} • ROOT INFRASTRUCTURE
                      </Typography>
                    </Box>

                    {/* Status & Last Test - ROOT */}
                    <Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed', mx: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: root.read_connection_status === 'success' ? '#10B981' : (root.read_connection_status === 'failed' ? '#EF4444' : '#4B5563') }} />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.65rem', color: root.read_connection_status === 'success' ? '#10B981' : (root.read_connection_status === 'failed' ? '#EF4444' : 'text.disabled') }}>
                          {root.read_connection_status?.toUpperCase() || 'NOT VERIFIED'}
                        </Typography>
                        {root.read_last_test && (
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.55rem', color: 'text.secondary', mt: -0.4 }}>
                            Last Check: {new Date(root.read_last_test).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Trigger Connection Audit">
                      <IconButton size="small" onClick={() => handleTest(root.id, root.cloud_provider, 'read')} disabled={testing[`${root.id}-read`]} sx={{ color: '#6C63FF', p: 0.7, bgcolor: 'rgba(108,99,255,0.1)', '&:hover': { bgcolor: 'rgba(108,99,255,0.2)' } }}>
                        <PlayArrow sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={root.is_active ? "Deactivate Entity" : "Activate Entity"}>
                      <IconButton size="small" onClick={() => handleToggleStatus(root)} sx={{ color: root.is_active ? '#EF4444' : '#10B981', p: 0.7, bgcolor: root.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', '&:hover': { bgcolor: root.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' } }}>
                        {root.is_active ? <Block sx={{ fontSize: 20 }} /> : <CheckCircle sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => openEdit(root)} sx={{ p: 0.7 }}><Edit sx={{ fontSize: 20 }} /></IconButton>
                  </Stack>
                </Box>

                {/* Sub-Accounts List - Dense */}
                <Box sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.15)' }}>
                  <Stack spacing={0.8}>
                    {visibleSubAccounts.map(sub => (
                      <Paper key={sub.id} variant="outlined" sx={{
                        p: 1, px: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.015)',
                        borderColor: 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        opacity: sub.is_active ? 1 : 0.6,
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(108,99,255,0.2)' }
                      }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                          <Box sx={{ minWidth: 150 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.8rem' }}>{sub.name}</Typography>
                          </Box>
                          <Button
                            variant="text"
                            size="small"
                            startIcon={<Visibility sx={{ fontSize: 13 }} />}
                            onClick={() => goToComponents(sub)}
                            sx={{ fontSize: '0.65rem', color: 'text.secondary', '&:hover': { color: '#6C63FF' } }}
                          >
                            Resources
                          </Button>

                          {/* Status/Test for SUB */}
                          <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 14, alignSelf: 'center' }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sub.read_connection_status === 'success' ? '#10B981' : (sub.read_connection_status === 'failed' ? '#EF4444' : '#4B5563') }} />
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6rem', textTransform: 'uppercase', color: sub.read_connection_status === 'success' ? '#10B981' : (sub.read_connection_status === 'failed' ? '#EF4444' : 'text.disabled') }}>
                                {sub.read_connection_status || 'NOT DATAED'}
                              </Typography>
                              {sub.read_last_test && (
                                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.55rem', color: 'text.secondary', mt: -0.4 }}>
                                  {new Date(sub.read_last_test).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleTest(sub.id, sub.cloud_provider, 'read')} disabled={testing[`${sub.id}-read`]} sx={{ p: 0.5 }}><PlayArrow sx={{ fontSize: 16 }} /></IconButton>
                          <IconButton size="small" onClick={() => handleToggleStatus(sub)} sx={{ p: 0.5, color: sub.is_active ? '#EF4444' : '#10B981' }}>
                            {sub.is_active ? <Block sx={{ fontSize: 16 }} /> : <CheckCircle sx={{ fontSize: 16 }} />}
                          </IconButton>
                          <IconButton size="small" onClick={() => openEdit(sub)} sx={{ p: 0.5 }}><Edit sx={{ fontSize: 16 }} /></IconButton>
                        </Stack>
                      </Paper>
                    ))}

                    {allSubAccounts.length > 6 && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setExpandedRoots(prev => ({ ...prev, [root.id]: !prev[root.id] }))}
                        sx={{ mt: 1, color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem' }}
                      >
                        {isExpanded ? 'Show Less' : `View All (${allSubAccounts.length})`}
                      </Button>
                    )}

                    {allSubAccounts.length === 0 && (
                      <Typography variant="caption" color="text.disabled" sx={{ py: 2, textAlign: 'center', fontStyle: 'italic', letterSpacing: 1 }}>NO SUB-ENVIRONMENTS IDENTIFIED</Typography>
                    )}
                  </Stack>
                </Box>
              </Box>
            );
          })}
          {rootAccounts.length === 0 && (
            <Paper sx={{ p: 10, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.01)', borderRadius: 6 }}>
              <Cloud sx={{ fontSize: 60, mb: 1, opacity: 0.1 }} />
              <Typography variant="h6" color="text.secondary">No organizational structures identified</Typography>
              <Button size="medium" variant="contained" sx={{ mt: 3, background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }} onClick={openCreate}>Initialize First Environment</Button>
            </Paper>
          )}
        </Stack>
      )}

      {/* Add / Edit Modal */}
      <Dialog
        open={!!showModal}
        onClose={() => setShowModal(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>{showModal === 'create' ? "Add Cloud Account" : "Edit Cloud Account"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ py: 1 }}>
            <TextField fullWidth label="Account Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

            <FormControl fullWidth disabled={showModal === 'edit'}>
              <InputLabel>Parent Account (Optional)</InputLabel>
              <Select
                value={form.parent_id}
                label="Parent Account (Optional)"
                onChange={e => {
                  const parentId = e.target.value;
                  const parent = rootAccounts.find(r => r.id === parentId);
                  setForm({
                    ...form,
                    parent_id: parentId,
                    account_type: parentId ? 'sub' : 'root',
                    cloud_provider: parent ? parent.cloud_provider : form.cloud_provider
                  });
                }}
              >
                <MenuItem value=""><em>None (Root)</em></MenuItem>
                {rootAccounts.map(r => (
                  <MenuItem key={r.id} value={r.id}>{r.name} ({r.cloud_provider.toUpperCase()})</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid size={6}>
                <FormControl fullWidth disabled={showModal === 'edit' || !!form.parent_id}>
                  <InputLabel>Provider</InputLabel>
                  <Select value={form.cloud_provider} label="Provider" onChange={e => setForm({ ...form, cloud_provider: e.target.value })}>
                    {PROVIDERS.map(p => <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <TextField label="Type" fullWidth value={form.account_type.toUpperCase()} disabled />
              </Grid>
            </Grid>

            {/* Credentials - Only show relevant fields */}
            <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>CREDENTIAL METADATA</Typography></Divider>

            {form.cloud_provider === 'aws' && (
              <Stack spacing={2}>
                <TextField fullWidth label="AWS Account ID" value={form.cred_metadata.account_id || ""} onChange={e => setForm({ ...form, cred_metadata: { ...form.cred_metadata, account_id: e.target.value } })} />
                <TextField fullWidth label="Role Name" value={form.cred_metadata.role_name || ""} onChange={e => setForm({ ...form, cred_metadata: { ...form.cred_metadata, role_name: e.target.value } })} />
              </Stack>
            )}

            {form.cloud_provider === 'azure' && (
              <Stack spacing={2}>
                <TextField fullWidth label="Tenant ID" value={form.cred_metadata.tenant_id || ""} onChange={e => setForm({ ...form, cred_metadata: { ...form.cred_metadata, tenant_id: e.target.value } })} />
                <TextField fullWidth label="Client ID" value={form.cred_metadata.client_id || ""} onChange={e => setForm({ ...form, cred_metadata: { ...form.cred_metadata, client_id: e.target.value } })} />
                <TextField fullWidth label="Subscription ID" value={form.cred_metadata.subscription_id || ""} onChange={e => setForm({ ...form, cred_metadata: { ...form.cred_metadata, subscription_id: e.target.value } })} />
              </Stack>
            )}

            <FormControl fullWidth>
              <InputLabel>CI/CD Runner</InputLabel>
              <Select value={form.ci_credentials_id || ""} label="CI/CD Runner" onChange={e => setForm({ ...form, ci_credentials_id: e.target.value })}>
                {ciRunners.map(c => <MenuItem key={c.id} value={c.id}>{c.provider} — {c.id.slice(0, 8)}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowModal(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)', px: 3 }}>
            {showModal === 'create' ? "Add Account" : "Save Configuration"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!msg} autoHideDuration={6000} onClose={() => setMsg(null)}>
        <Alert onClose={() => setMsg(null)} severity={msg?.type} variant="filled" sx={{ width: '100%' }}>
          {msg?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CloudAccounts;
