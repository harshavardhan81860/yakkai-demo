import React, { useEffect, useState, Fragment } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip,
  Avatar, Paper, Stack, Snackbar, Alert, CircularProgress, Divider
} from "@mui/material";
import {
  Add, Cloud, CheckCircle, Block, Refresh, ArrowBack,
  Edit, Hub, Search, Folder, Science, MoreVert, AccountTree
} from "@mui/icons-material";
import { Menu, MenuItem, ListItemIcon, ListItemText, Collapse } from "@mui/material";
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
import DriftDashboardDialog from "./DriftDashboard";
import UnifiedSyncButton from "../components/common/UnifiedSyncButton";
import { useSettings } from "../contexts/SettingsContext";
import { useRole } from "../contexts/RoleContext";
import api from "../services/api";

const getTimeAgo = (dateStr?: string | null) => {
  if (!dateStr) return "Never";
  // Force UTC parsing by appending Z if missing, so browser Date() interprets it correctly against local time
  const utcDateStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const date = new Date(utcDateStr);
  const now = new Date();
  const diffInSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSecs < 60) return "just now";
  const diffInMins = Math.floor(diffInSecs / 60);
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const RecursiveAccountRow = ({ row, allAccounts, level, expandedRoots, toggleRoot, handlers, currency }: {
  row: ExtendedCloudAccountRow,
  allAccounts: ExtendedCloudAccountRow[],
  level: number,
  expandedRoots: Record<string, boolean>,
  toggleRoot: (id: string) => void,
  handlers: any,
  currency: string
}) => {
  const subs = allAccounts.filter(a => a.parent_id === row.id);
  const isExpanded = expandedRoots[row.id];
  const type = row.cred_metadata?.account_type || '';
  const isContainer = ['management', 'tenant', 'management_group', 'organizational_unit', 'root'].includes(type);
  const isRoot = level === 0;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

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

  // Format helper
  const fmt = (num: number) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2
  }).format(num);

  // Format IST explicit date
  const getISTTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Unknown';
    // Ensure we parse it as UTC explicitly since it comes from postgres without timezone often
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  return (
    <Fragment>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: level > 0 ? `rgba(255,255,255,${0.02 * level})` : 'transparent' }}>
        <TableCell padding="checkbox" sx={{ width: level > 0 ? 20 + (level * 20) : 40, pl: level > 0 ? (level * 2) + 'px' : '0' }}>
          {/* Removed expander from here */}
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pl: level * 3 }}>
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
            <Box sx={{ pl: isContainer && level === 0 ? 0 : 0 }}>
              <Typography variant="body2" fontWeight={isRoot || isContainer ? "bold" : "normal"}>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {row.cred_metadata?.account_id || row.cred_metadata?.subscription_id || row.cred_metadata?.management_group_id || row.cred_metadata?.organizational_unit_id || row.tenant_id}
              </Typography>
              {subs.length > 0 && (
                <Button
                  size="small"
                  onClick={() => toggleRoot(row.id)}
                  startIcon={<AccountTree fontSize="small" />}
                  sx={{ mt: 0.5, py: 0, px: 1, fontSize: '0.65rem', textTransform: 'none', bgcolor: 'rgba(255,255,255,0.05)' }}
                >
                  {isExpanded ? "Hide" : "Show"} {subs.length} Sub-Account{subs.length > 1 ? 's' : ''}
                </Button>
              )}
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
        <TableCell>
          {!isContainer ? (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(row.last_month_cost || 0)}</Typography>
          ) : <Typography variant="caption" color="text.secondary">-</Typography>}
        </TableCell>
        <TableCell>
          {!isContainer ? (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(row.mtd_cost || 0)}</Typography>
          ) : <Typography variant="caption" color="text.secondary">-</Typography>}
        </TableCell>
        <TableCell align="center">
          <Stack direction="row" spacing={1} alignItems="center" justifyItems="center" sx={{ display: 'inline-flex' }}>
            <Tooltip title={`Read Connection: ${row.read_connection_status || 'Unknown'} (Last verified: ${getISTTime(row.read_last_validated_at)} IST)`}>
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
              <Tooltip title="Verify Read Access">
                <IconButton size="small" onClick={() => handlers.handleTestConnection(row.id, row.cloud_provider, 'read')} sx={{ p: 0.2 }}>
                  <Refresh sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            )}
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', minWidth: 45 }}>
              {getTimeAgo(row.read_last_validated_at)}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
            {subs.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => toggleRoot(row.id)}
                startIcon={<AccountTree fontSize="small" />}
                sx={{ textTransform: 'none', py: 0.2, borderColor: 'rgba(255,255,255,0.2)' }}
              >
                {isExpanded ? "Hide" : "Show"} Sub-Accounts ({subs.length})
              </Button>
            )}
            {isRoot && (
              <Button size="small" variant="contained" color="warning" onClick={() => handlers.openDiscoveryForAccount(row)} startIcon={<Search fontSize="small" />} sx={{ textTransform: 'none', py: 0.2 }}>
                Discovery
              </Button>
            )}
            {!isContainer && (
              <Button size="small" variant="contained" color="primary" onClick={() => handlers.goToComponents(row)} startIcon={<Hub fontSize="small" />} sx={{ textTransform: 'none', py: 0.2 }}>
                Resources
              </Button>
            )}

            <Tooltip title="Actions">
              <IconButton size="small" onClick={handleMenuClick} sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
                <MoreVert fontSize="small" />
              </IconButton>
            </Tooltip>

            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose} PaperProps={{ sx: { bgcolor: '#1e1e1e', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)' } }}>
              <MenuItem onClick={() => { handleMenuClose(); handlers.handleEditAccount(row); }}>
                <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                <ListItemText>Edit Account Details</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); handlers.handleToggleActive(row); }}>
                <ListItemIcon>{row.is_active ? <Block fontSize="small" color="error" /> : <CheckCircle fontSize="small" color="success" />}</ListItemIcon>
                <ListItemText>{row.is_active ? "Deactivate Account" : "Activate Account"}</ListItemText>
              </MenuItem>

              {!isContainer && <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.05)' }} />}

              {!isContainer && (
                <MenuItem onClick={() => { handleMenuClose(); handlers.handleOpenDriftDashboard(row.id, row.name); }}>
                  <ListItemIcon><Science fontSize="small" color="warning" /></ListItemIcon>
                  <ListItemText>Drift Detection</ListItemText>
                </MenuItem>
              )}

              {!isContainer && (
                <Box sx={{ px: 2, py: 1 }}>
                  <UnifiedSyncButton type="account" entityId={row.id.toString()} entityName={row.name} />
                </Box>
              )}
            </Menu>
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow /> {/* Empty row for exact Collapse mounting */}
      <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 0 }} colSpan={8}>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Table size="small" sx={{
            "& .MuiTableCell-root": { borderBottom: '1px solid rgba(255,255,255,0.02)' },
            mb: 1
          }}>
            <TableBody>
              {subs.map(sub => (
                <RecursiveAccountRow
                  key={sub.id}
                  row={sub}
                  allAccounts={allAccounts}
                  level={level + 1}
                  expandedRoots={expandedRoots}
                  toggleRoot={toggleRoot}
                  handlers={handlers}
                  currency={currency}
                />
              ))}
            </TableBody>
          </Table>
        </Collapse>
      </TableCell>
    </Fragment>
  );
};

interface ExtendedCloudAccountRow extends CloudAccountRow {
  drift_status?: 'synced' | 'drifted' | 'checking';
  drift_last_checked?: string;
  cost_estimate?: string;
}

const CloudAccounts = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTenant } = useRole();
  const tenantName = activeTenant?.tenant_name || (location.state as any)?.tenantName || "Tenant";

  const [accounts, setAccounts] = useState<ExtendedCloudAccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Rollups
  const [totalLastMonth, setTotalLastMonth] = useState(0);
  const [totalMtd, setTotalMtd] = useState(0);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [discoveryAccountId, setDiscoveryAccountId] = useState<string | undefined>();
  const [discoveryProvider, setDiscoveryProvider] = useState<"aws" | "azure" | undefined>();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAccount, setEditAccount] = useState<CloudAccountRow | null>(null);

  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { settings } = useSettings();
  const currency = settings?.currency || 'USD';

  // Drift Dashboard Popup State
  const [driftPopupOpen, setDriftPopupOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedAccountName, setSelectedAccountName] = useState("");

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await fetchCloudAccounts(tenantId as string);
      setAccounts(data.map(a => ({ ...a, drift_status: 'synced' })));

      // Calculate rollups based on roots to avoid double counting if a root already aggregates its children
      // For now, assuming we sum up all accounts that are NOT containers
      let mtdSum = 0;
      let lmSum = 0;
      data.forEach(a => {
        const type = a.cred_metadata?.account_type || '';
        const isContainer = ['management', 'tenant', 'management_group', 'organizational_unit', 'root'].includes(type);
        if (!isContainer) {
          mtdSum += (a.mtd_cost || 0);
          lmSum += (a.last_month_cost || 0);
        }
      });
      setTotalMtd(mtdSum);
      setTotalLastMonth(lmSum);

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
        nativeAccountId: account.cred_metadata?.account_id || account.cred_metadata?.subscription_id || account.cred_metadata?.management_group_id || account.cred_metadata?.organizational_unit_id
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
      const res = await testConnection(accId, provider, false, type);
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

  const handleEditAccount = (acc: CloudAccountRow) => {
    setEditAccount(acc);
    setShowEditDialog(true);
  };

  const handleOpenDriftDashboard = (accId: string, name: string) => {
    setSelectedAccountId(accId);
    setSelectedAccountName(name);
    setDriftPopupOpen(true);
  };

  return (
    <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Cloud Accounts</Typography>
          <Typography variant="body2" color="text.secondary">Hierarchical environments for your tenant clusters</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Paper variant="outlined" sx={{ p: 1.5, px: 2, display: 'flex', gap: 3, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <Box>
              <Typography variant="caption" display="block" color="text.secondary">Tenant Name</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F59E0B' }}>{tenantName}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Box>
              <Typography variant="caption" display="block" color="text.secondary">Overall Last Month</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: currency }).format(totalLastMonth)}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Box>
              <Typography variant="caption" display="block" color="text.secondary">Overall MTD</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: currency }).format(totalMtd)}
              </Typography>
            </Box>
          </Paper>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(`/tenants/${tenantId}/dashboard`)}>Workspace</Button>
            <UnifiedSyncButton type="tenant" entityId={tenantId as string} entityName={tenantName} />
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
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Infrastructure", path: "/tenants" },
          { label: "Cloud Accounts" }
        ]} />
      </Box>

      {msg && <Snackbar open autoHideDuration={4000} onClose={() => setMsg(null)}>
        <Alert severity={msg.type}>{msg.text}</Alert>
      </Snackbar>}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Paper sx={{ background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'rgba(255,255,255,0.02)' }}>
                <TableCell padding="checkbox" sx={{ width: 40 }}></TableCell>
                <TableCell sx={{ minWidth: 200 }}>Name / ID</TableCell>
                <TableCell sx={{ width: 80 }}>Provider</TableCell>
                <TableCell sx={{ width: 100 }}>Type</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Last Month Cost</TableCell>
                <TableCell sx={{ minWidth: 100 }}>MTD Cost</TableCell>
                <TableCell align="center" sx={{ width: 120 }}>Health Checks</TableCell>
                <TableCell align="right" sx={{ width: 180 }}>Actions</TableCell>
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
                    handleToggleActive,
                    handleOpenDriftDashboard
                  }}
                  currency={currency}
                />
              ))}
              {accounts.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
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

      <AccountEditDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        account={editAccount}
        onUpdate={() => {
          loadAccounts();
          setMsg({ type: 'success', text: 'Account updated successfully' });
        }}
      />

      <DriftDashboardDialog
        open={driftPopupOpen}
        onClose={() => setDriftPopupOpen(false)}
        accountId={selectedAccountId}
        accountName={selectedAccountName}
      />
    </Box>
  );
};

export default CloudAccounts;
