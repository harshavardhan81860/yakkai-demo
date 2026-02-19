import React, { useEffect, useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip,
  Avatar, Paper, Stack, Snackbar, Alert
} from "@mui/material";
import {
  Add, Cloud, CheckCircle, Block, Refresh, ArrowBack,
  Edit, Hub, ArrowForward, Search, Folder
} from "@mui/icons-material";
import {
  fetchCloudAccounts, activateCloudAccount,
  deactivateCloudAccount, fetchActiveCiCredentials,
  updateCloudAccount
} from "../services/cloudAccountsService";
import type {
  CloudAccountRow, CiCredentialDropdown
} from "../services/cloudAccountsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import AccountOnboardingDialog from "../components/CloudAccounts/AccountOnboardingDialog";
import AccountEditDialog from "../components/CloudAccounts/AccountEditDialog";
import { testConnection } from "../services/cloudDiscoveryService";

const getTimeAgo = (dateStr?: string | null) => {
  if (!dateStr) return "Never tested";
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSecs < 60) return "just now";
  const diffInMins = Math.floor(diffInSecs / 60);
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};

const RecursiveAccountRow = ({ row, allAccounts, level, expandedRoots, toggleRoot, handlers }: {
  row: CloudAccountRow,
  allAccounts: CloudAccountRow[],
  level: number,
  expandedRoots: Record<string, boolean>,
  toggleRoot: (id: string) => void,
  handlers: any
}) => {
  const subs = allAccounts.filter(a => a.parent_id === row.id);
  const isExpanded = expandedRoots[row.id];
  const type = row.cred_metadata?.account_type || '';
  const isContainer = ['management', 'tenant', 'management_group', 'organizational_unit', 'root'].includes(type);
  const isRoot = level === 0;

  // Type Label Logic
  let typeLabel = "Standalone";
  if (row.cloud_provider === 'azure') {
    if (type === 'tenant') typeLabel = "Tenant";
    else if (type === 'management_group') typeLabel = "Mgmt Group";
    else if (type === 'subscription') typeLabel = "Subscription";
  } else {
    // AWS
    if (type === 'management') typeLabel = "Organization Root";
    else if (type === 'organizational_unit') typeLabel = "Organizational Unit";
    else if (type === 'root') typeLabel = "Root Container";
    else if (type === 'member') typeLabel = "Account";
  }

  return (
    <Fragment>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: level > 0 ? `rgba(255,255,255,${0.02 * level})` : 'transparent' }}>
        <TableCell padding="checkbox">
          <Box sx={{ pl: level * 3, display: 'flex', alignItems: 'center' }}>
            {subs.length > 0 ? (
              <IconButton size="small" onClick={() => toggleRoot(row.id)}>
                {isExpanded ? <ArrowForward sx={{ transform: 'rotate(90deg)', fontSize: 16 }} /> : <ArrowForward sx={{ fontSize: 16 }} />}
              </IconButton>
            ) : <Box sx={{ width: 34 }} />}
          </Box>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isContainer ? (
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(255,255,255,0.1)', color: 'text.secondary' }}>
                <Folder sx={{ fontSize: 16 }} />
              </Avatar>
            ) : (
              <Avatar sx={{
                width: 28, height: 28,
                bgcolor: row.cloud_provider === 'aws' ? '#FF9900' : '#0078D4',
                fontSize: 10, fontWeight: 'bold'
              }}>
                {row.cloud_provider === 'aws' ? 'AWS' : 'AZ'}
              </Avatar>
            )}
            <Box>
              <Typography variant="body2" fontWeight={isRoot || isContainer ? "bold" : "normal"}>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {row.cred_metadata?.account_id || row.cred_metadata?.subscription_id || row.cred_metadata?.management_group_id || row.cred_metadata?.organizational_unit_id || row.tenant_id}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell>
          <Chip label={row.cloud_provider} size="small" sx={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.65rem' }} />
        </TableCell>
        <TableCell>
          <Chip
            label={typeLabel}
            color={isContainer ? "secondary" : "default"}
            size="small" variant="outlined" sx={{ fontSize: '0.7rem' }}
          />
        </TableCell>
        <TableCell align="center">
          {/* Read Status */}
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
            <Tooltip title={`Read: ${row.read_connection_status} (${getTimeAgo(row.read_last_validated_at)})`}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%',
                bgcolor: row.read_connection_status === 'success' ? '#10B981' : (row.read_connection_status === 'error' ? '#EF4444' : '#6B7280'),
              }} />
            </Tooltip>
            {isContainer ? (
              <IconButton size="small" disabled sx={{ p: 0.2, opacity: 0 }}>
                <Refresh sx={{ fontSize: 13 }} />
              </IconButton>
            ) : (
              <IconButton size="small" onClick={() => handlers.handleTestConnection(row.id, row.cloud_provider, 'read')} sx={{ p: 0.2 }}>
                <Refresh sx={{ fontSize: 13 }} />
              </IconButton>
            )}
          </Stack>
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Tooltip title="Edit Account">
              <IconButton size="small" onClick={() => handlers.handleEditAccount(row)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            {isRoot && (
              <Tooltip title="Cloud Discovery / Sync">
                <IconButton size="small" onClick={() => handlers.openDiscoveryForAccount(row)} sx={{ color: '#FF9900' }}>
                  <Search fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {!isContainer && (
              <Tooltip title="View Components">
                <IconButton size="small" onClick={() => handlers.goToComponents(row)} color="primary">
                  <Hub fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={row.is_active ? "Deactivate" : "Activate"}>
              <IconButton size="small" color={row.is_active ? "success" : "default"} onClick={() => handlers.handleToggleActive(row)}>
                {row.is_active ? <CheckCircle fontSize="small" /> : <Block fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>
      {isExpanded && subs.map(sub => (
        <RecursiveAccountRow
          key={sub.id}
          row={sub}
          allAccounts={allAccounts}
          level={level + 1}
          expandedRoots={expandedRoots}
          toggleRoot={toggleRoot}
          handlers={handlers}
        />
      ))}
    </Fragment>
  );
};

const CloudAccounts = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [tenantName, setTenantName] = useState<string>("");
  const [accounts, setAccounts] = useState<CloudAccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New Unified Dialog State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [discoveryAccountId, setDiscoveryAccountId] = useState<string | undefined>();
  const [discoveryProvider, setDiscoveryProvider] = useState<"aws" | "azure" | undefined>();

  // Edit State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAccount, setEditAccount] = useState<CloudAccountRow | null>(null);

  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

  useEffect(() => {
    if (tenantId) {
      loadAccounts();
    }
  }, [tenantId]);

  const toggleRoot = (id: string) => {
    setExpandedRoots(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const handleToggleActive = async (acc: CloudAccountRow) => {
    try {
      if (acc.is_active) await deactivateCloudAccount(acc.id);
      else await activateCloudAccount(acc.id);
      loadAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestConnection = async (accId: string, provider: string, type: 'read' | 'write' = 'read') => {
    try {
      setLoading(true);
      const res = await testConnection(accId, provider, false, type); // Provider specific

      // Check for logical failure despite HTTP 200
      if (res?.data?.status === 'failure' || res?.data?.status === 'error') {
        throw new Error(res.data.message || 'Connection test failed');
      }

      setMsg({ type: 'success', text: `${type.toUpperCase()} connection verified` });
      loadAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  const openOnboarding = () => {
    setDiscoveryAccountId(undefined);
    setDiscoveryProvider(undefined);
    setShowOnboarding(true);
  };

  const openDiscoveryForAccount = (acc: CloudAccountRow) => {
    setDiscoveryAccountId(acc.id);
    setDiscoveryProvider(acc.cloud_provider as "aws" | "azure");
    setShowOnboarding(true);
  };

  const getSubAccounts = (pid: string) => accounts.filter(a => a.parent_id === pid);

  const handleEditAccount = (acc: CloudAccountRow) => {
    setEditAccount(acc);
    setShowEditDialog(true);
  };

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

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openOnboarding}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}
          >
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

      {/* Unified Onboarding & Discovery Dialog */}
      <AccountOnboardingDialog
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        tenantId={tenantId as string}
        initialAccountId={discoveryAccountId}
        initialProvider={discoveryProvider}
        onImportComplete={() => {
          loadAccounts();
          setMsg({ type: 'success', text: 'Operation completed' });
        }}
      />

      {msg && <Snackbar open autoHideDuration={4000} onClose={() => setMsg(null)}>
        <Alert severity={msg.type}>{msg.text}</Alert>
      </Snackbar>}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Paper sx={{ background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'rgba(255,255,255,0.02)' }}>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Name / ID</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Connection</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.filter(a => !a.parent_id).map((row) => (
                <RecursiveAccountRow
                  key={row.id}
                  row={row}
                  allAccounts={accounts}
                  level={0}
                  expandedRoots={expandedRoots}
                  toggleRoot={toggleRoot}
                  handlers={{
                    handleTestConnection,
                    handleEditAccount,
                    openDiscoveryForAccount,
                    goToComponents,
                    handleToggleActive
                  }}
                />
              ))}
              {accounts.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Cloud sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                    <Typography color="text.secondary">No cloud accounts connected yet.</Typography>
                    <Button variant="outlined" sx={{ mt: 2 }} onClick={openOnboarding}>
                      Onboard Account
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <AccountEditDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        account={editAccount}
        onUpdate={() => {
          loadAccounts();
          setMsg({ type: 'success', text: 'Account updated successfully' });
        }}
      />
    </Box>
  );
};

export default CloudAccounts;
