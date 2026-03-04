import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Avatar, Tab, Tabs, MenuItem, Select, FormControl, InputLabel, Divider,
  Paper, Stack, Badge, Skeleton, Menu, ListItemIcon, ListItemText, Chip
} from "@mui/material";
import {
  Add, Cloud, Layers, CheckCircle, Refresh, Visibility, Storage,
  Computer, ViewInAr, Hub, Language, Info, Science, Warning, Sync,
  MoreVert, Code, PlayArrow, Stop, RestartAlt, AccountBalanceWallet, History, Close, ArrowBack
} from "@mui/icons-material";
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Breadcrumbs from "../components/Common/Breadcrumbs";

const getTimeAgo = (date: Date) => {
  const diffInSecs = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diffInSecs < 60) return "just now";
  const diffInMins = Math.floor(diffInSecs / 60);
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
};
import {
  fetchAwsRegions, fetchAwsInstances, fetchAwsImages, fetchAwsClusters,
  fetchAzureRegions, fetchAzureSubscriptions, fetchAzureInstances,
  fetchAzureImages, fetchAzureClusters, testAwsConnection, testAzureConnection
} from "../services/cloudResourcesService";
import DriftDashboardDialog from "./DriftDashboard";
import UnifiedSyncButton from "../components/common/UnifiedSyncButton";
import CachedInventory from "./CachedInventory";

const Components = () => {
  const { tenantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const cloudAccountType = (location.state as any)?.cloudAccountType as "AWS" | "AZURE";
  const cloudAccountId = (location.state as any)?.cloudAccountId as string;
  const tenantName = (location.state as any)?.tenantName as string;
  const accountName = (location.state as any)?.accountName as string;
  const nativeAccountId = (location.state as any)?.nativeAccountId as string;

  const [region, setRegion] = useState<string>("");
  const [regions, setRegions] = useState<string[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [regionError, setRegionError] = useState<string | null>(null);

  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Layout State
  const [tabIndex, setTabIndex] = useState(0);

  // Raw Payload Inspector State
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<any>(null);

  // Action Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);

  // Drift Dashboard State
  const [driftPopupOpen, setDriftPopupOpen] = useState(false);

  const awsTiles = [
    { name: "Amazon EC2", icon: <Computer /> },
    { name: "AMI Images", icon: <ViewInAr /> },
    { name: "Amazon EKS", icon: <Hub /> },
    { name: "Amazon RDS", icon: <Storage />, disabled: true },
    { name: "Amazon DynamoDB", icon: <Storage />, disabled: true },
    { name: "Amazon S3", icon: <Cloud />, disabled: true },
    { name: "Elastic Load Balancing", icon: <Layers />, disabled: true },
    { name: "AWS Lambda", icon: <Code />, disabled: true },
    { name: "Amazon ECR", icon: <Layers />, disabled: true },
    { name: "Amazon VPC", icon: <Hub />, disabled: true },
    { name: "Amazon CloudWatch", icon: <Visibility />, disabled: true },
  ];
  const azureTiles = [
    { name: "Azure Virtual Machines", icon: <Computer /> },
    { name: "Azure Images", icon: <ViewInAr /> },
    { name: "Azure Kubernetes Service", icon: <Hub /> },
    { name: "Azure SQL Database", icon: <Storage />, disabled: true },
    { name: "Azure Cosmos DB", icon: <Storage />, disabled: true },
    { name: "Azure Blob Storage", icon: <Cloud />, disabled: true },
    { name: "Azure Load Balancer", icon: <Layers />, disabled: true },
    { name: "Azure Functions", icon: <Code />, disabled: true },
    { name: "Azure Container Registry", icon: <Layers />, disabled: true },
    { name: "Azure Virtual Network", icon: <Hub />, disabled: true },
    { name: "Azure Monitor", icon: <Visibility />, disabled: true },
  ];
  const tiles = cloudAccountType === "AWS" ? awsTiles : cloudAccountType === "AZURE" ? azureTiles : [];

  const loadRegions = async (refresh = false) => {
    setRegionLoading(true);
    setRegionError(null);
    try {
      let r: string[] = [];
      if (cloudAccountType === "AWS") r = await fetchAwsRegions(cloudAccountId, refresh);
      else if (cloudAccountType === "AZURE") r = await fetchAzureRegions(cloudAccountId, refresh);
      setRegions(r);
      if (r.length) setRegion(r[0]);
      else setRegionError("No active regions found. Verify credentials.");
    } catch {
      setRegionError("Connectivity error. Please check your cloud credentials.");
    } finally {
      setRegionLoading(false);
    }
  };

  useEffect(() => {
    if (cloudAccountType && cloudAccountId) loadRegions();
  }, [cloudAccountType, cloudAccountId]);

  const handleTileClick = async (tileName: string, overrideRegion?: string) => {
    setSelectedTile(tileName);
    setResources([]);
    setResourceLoading(true);
    const targetRegion = overrideRegion || region;
    try {
      let res: any[] = [];
      if (cloudAccountType === "AWS") {
        if (tileName === "Amazon EC2") res = (await fetchAwsInstances(cloudAccountId, targetRegion)).instances || [];
        else if (tileName === "AMI Images") res = (await fetchAwsImages(cloudAccountId, targetRegion)).images || [];
        else if (tileName === "Amazon EKS") res = (await fetchAwsClusters(cloudAccountId, targetRegion)).clusters || [];
      } else if (cloudAccountType === "AZURE") {
        if (tileName === "Azure Virtual Machines") res = (await fetchAzureInstances(cloudAccountId, targetRegion)).instances || [];
        else if (tileName === "Azure Images") res = (await fetchAzureImages(cloudAccountId, targetRegion)).images || [];
        else if (tileName === "Azure Kubernetes Service") res = (await fetchAzureClusters(cloudAccountId, targetRegion)).clusters || [];
      }
      setResources(res);
      setLastFetched(new Date());
    } catch {
      setResources([]);
      setLastFetched(null);
    } finally {
      setResourceLoading(false);
    }
  };

  if (!cloudAccountType) return <Box p={3}><Typography color="error">Inventory Access Denied: Missing Cloud Context</Typography></Box>;

  const getColumns = (): GridColDef[] => {
    const commonActions: GridColDef = {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
          <Tooltip title="View JSON Payload">
            <IconButton size="small" onClick={() => { setSelectedPayload(params.row._raw || params.row); setPayloadDialogOpen(true); }}>
              <Code fontSize="small" color="primary" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    };

    if (selectedTile === "Amazon EC2" || selectedTile === "Azure Virtual Machines") {
      return [
        { field: 'id_name', headerName: 'ID / Name', flex: 1, minWidth: 200, renderCell: (p) => <Box sx={{ py: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>{p.row.instance_id || p.row.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{p.row.image_id}</Typography></Box> },
        { field: 'state', headerName: 'State', width: 110, renderCell: (p) => <Chip label={p.row.state || 'Unknown'} size="small" color={p.row.state === 'running' || p.row.state === 'active' ? 'success' : 'warning'} sx={{ borderRadius: 1.5, fontSize: '0.7rem' }} /> },
        { field: 'type', headerName: 'Hardware', width: 130, valueGetter: (v, row) => row.type || row.size },
        { field: 'network', headerName: 'Network', width: 160, renderCell: (p) => <Box sx={{ py: 1 }}><Typography variant="body2">{p.row.public_ip || p.row.private_ip || '-'}</Typography><Typography variant="caption" color="text.secondary">{p.row.availability_zone}</Typography></Box> },
        {
          field: 'tags', headerName: 'Tags', width: 100, renderCell: (p) => {
            const tags = p.row.tags || [];
            const count = Array.isArray(tags) ? tags.length : Object.keys(tags).length;
            if (count === 0) return <Typography variant="caption" color="text.secondary">-</Typography>;
            return <Tooltip title={<pre style={{ margin: 0 }}>{JSON.stringify(tags, null, 2)}</pre>}><Chip label={`${count} Tags`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></Tooltip>;
          }
        },
        { field: 'launch_time', headerName: 'Launched', width: 150, valueGetter: (v, row) => row.launch_time ? new Date(row.launch_time).toLocaleDateString() : '-' },
        commonActions
      ];
    } else if (selectedTile === "Azure Images") {
      return [
        { field: 'name', headerName: 'Image Name', flex: 1, minWidth: 200, renderCell: (p) => <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{p.row.name}</Typography> },
        { field: 'location', headerName: 'Location', width: 150, valueGetter: (v, row) => row.location || '-' },
        { field: 'id', headerName: 'Resource ID', flex: 1, minWidth: 250, renderCell: (p) => <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{p.row.id}</Typography> },
        commonActions
      ];
    }

    return [
      { field: 'name', headerName: 'Resource Name', flex: 1, minWidth: 200, valueGetter: (v, row) => row.name || row.display_name },
      { field: 'status', headerName: 'Condition', width: 130, renderCell: (p) => <Chip label={p.row.status || 'Active'} size="small" color="success" sx={{ borderRadius: 1.5 }} /> },
      {
        field: 'tags', headerName: 'Tags', width: 100, renderCell: (p) => {
          const tags = p.row.tags || [];
          const count = Array.isArray(tags) ? tags.length : Object.keys(tags).length;
          if (count === 0) return <Typography variant="caption" color="text.secondary">-</Typography>;
          return <Tooltip title={<pre style={{ margin: 0 }}>{JSON.stringify(tags, null, 2)}</pre>}><Chip label={`${count} Tags`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></Tooltip>;
        }
      },
      { field: 'created_at', headerName: 'Timestamp', flex: 1, valueGetter: (v, row) => row.created_at ? new Date(row.created_at).toLocaleString() : '-' },
      commonActions
    ];
  };

  const columns = getColumns();
  const rows = resources.map((r, i) => ({ id: r.instance_id || r.id || `res-${i}`, ...r }));

  return (
    <Box sx={{ px: 3, pb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Resource Explorer</Typography>
            <Chip
              label="Cloud Account View"
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">Inventory optimization and drift detection</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/tenants/${tenantId}/cloud-accounts`, { state: { tenantName } })}
            sx={{ height: 48, fontWeight: 700, px: 3 }}
          >
            Cloud Accounts
          </Button>
          <Paper variant="outlined" sx={{ p: 1.5, px: 2, display: 'flex', gap: 3, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <Box><Typography variant="caption" display="block" color="text.secondary">Tenant</Typography><Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F59E0B' }}>{tenantName}</Typography></Box>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
            <Box><Typography variant="caption" display="block" color="text.secondary">Provider</Typography><Chip label={cloudAccountType} size="small" color={cloudAccountType === 'AWS' ? 'warning' : 'info'} sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} /></Box>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
            <Box>
              <Typography variant="caption" display="block" color="text.secondary">
                YakkAI Account {cloudAccountType === 'AWS' ? '& Account No.' : ''}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {accountName} {cloudAccountType === 'AWS' && nativeAccountId && <Typography component="span" variant="caption" sx={{ ml: 0.5, fontFamily: 'monospace', color: 'text.secondary' }}>({nativeAccountId})</Typography>}
              </Typography>
            </Box>
          </Paper>
          <UnifiedSyncButton type="account" entityId={cloudAccountId} entityName={accountName} />
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Warning />}
            onClick={() => setDriftPopupOpen(true)}
            sx={{ height: 48, fontWeight: 700 }}
          >
            Detect Drift
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Tenants", path: "/tenants" },
          { label: "Cloud Accounts", path: `/tenants/${tenantId}/cloud-accounts` },
          { label: "Inventory" },
        ]} />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(_, nv) => setTabIndex(nv)}>
          <Tab label="Cached Inventory" sx={{ fontWeight: 600 }} />
          <Tab label="Live Cloud Explorer" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <CachedInventory
          accountName={accountName}
          tenantId={tenantId}
          cloudAccountId={cloudAccountId}
        />
      )}

      {tabIndex === 1 && (
        <Box>
          {!selectedTile ? (
            <Box>
              <Card sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Language fontSize="small" /> Deployment Region
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    {regionLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
                        <Typography variant="caption" color="text.secondary">Fetching available regions...</Typography>
                      </Box>
                    ) : regionError ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="caption" color="error">{regionError}</Typography>
                        <Button size="small" variant="contained" color="error" onClick={() => loadRegions(true)}>Re-Validate</Button>
                      </Box>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl fullWidth size="small">
                          <Select
                            value={region}
                            onChange={e => {
                              const newRegion = e.target.value;
                              setRegion(newRegion);
                              if (selectedTile) {
                                handleTileClick(selectedTile, newRegion);
                              }
                            }}
                          >
                            {regions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <Tooltip title="Refresh Regions">
                          <IconButton size="small" onClick={() => loadRegions(true)} disabled={regionLoading}>
                            <Refresh sx={{ fontSize: 20 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </Card>

              <Grid container spacing={2}>
                {tiles.map((tile) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={tile.name}>
                    <Card
                      sx={{
                        p: 3,
                        cursor: (tile.disabled || !region || regionLoading || !!regionError) ? 'default' : 'pointer',
                        opacity: (tile.disabled || !region || regionLoading || !!regionError) ? 0.5 : 1,
                        transition: 'all 0.2s',
                        border: '1px solid rgba(255,255,255,0.05)',
                        '&:hover': {
                          borderColor: (tile.disabled || !region || regionLoading || !!regionError) ? 'rgba(255,255,255,0.05)' : 'primary.main',
                          transform: (tile.disabled || !region || regionLoading || !!regionError) ? 'none' : 'translateY(-2px)'
                        }
                      }}
                      onClick={() => !tile.disabled && region && !regionLoading && !regionError && handleTileClick(tile.name)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary', gap: 1 }}>
                        {tile.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{tile.name}</Typography>
                      {tile.disabled && (
                        <Chip label="Coming in Next Phase" size="small" variant="outlined" color="warning" sx={{ mt: 1.5, fontSize: '0.65rem' }} />
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Card sx={{ minHeight: 600, p: 0 }}>
              <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF' }}><Storage /></Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedTile}</Typography>
                      <Typography variant="caption" color="text.secondary">Real-time data from {region}</Typography>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {lastFetched && (
                      <Box sx={{ textAlign: 'right', mr: 2 }}>
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                          Last Fetched
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Sync sx={{ fontSize: 14, color: '#00D9FF' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {getTimeAgo(lastFetched)} <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>({lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</Typography>
                          </Typography>
                        </Stack>
                      </Box>
                    )}

                    <Button size="small" startIcon={<Refresh />} onClick={() => handleTileClick(selectedTile)}>Update</Button>
                    <Button size="small" variant="contained" startIcon={<Add />}>Provision</Button>
                  </Stack>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.02)', p: 1.5, borderRadius: 1, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}><Language fontSize="small" /> Region:</Typography>
                    {regionLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="rectangular" width={150} height={32} />
                        <Typography variant="caption" color="text.secondary">Fetching...</Typography>
                      </Box>
                    ) : (
                      <FormControl size="small" sx={{ width: 200 }}>
                        <Select
                          value={region}
                          onChange={e => {
                            const newRegion = e.target.value;
                            setRegion(newRegion);
                            if (selectedTile) {
                              handleTileClick(selectedTile, newRegion);
                            }
                          }}
                        >
                          {regions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </Select>
                      </FormControl>
                    )}
                    <Tooltip title="Refresh Regions">
                      <IconButton size="small" onClick={() => loadRegions(true)} disabled={regionLoading}><Refresh fontSize="small" /></IconButton>
                    </Tooltip>
                  </Stack>
                  <Button size="small" variant="outlined" startIcon={<Layers />} onClick={() => setServiceDrawerOpen(true)}>Change Resource Category</Button>
                </Box>
              </Box>

              <Box sx={{ p: 0 }}>
                {resourceLoading ? <LinearProgress /> : (
                  <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                      rows={rows}
                      columns={columns}
                      getRowHeight={() => 'auto'}
                      getEstimatedRowHeight={() => 65}
                      disableRowSelectionOnClick
                      initialState={{
                        pagination: { paginationModel: { pageSize: 10 } },
                      }}
                      pageSizeOptions={[5, 10, 25]}
                      sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': {
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          py: 1
                        },
                        '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.1)' }
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Card>
          )}

          <Dialog open={serviceDrawerOpen} onClose={() => setServiceDrawerOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#121212', backgroundImage: 'none' } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Layers /> Select Resource Category
              </Box>
              <IconButton size="small" onClick={() => setServiceDrawerOpen(false)}><Close /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 4 }}>
              <Grid container spacing={2}>
                {tiles.map((tile) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tile.name}>
                    <Card
                      sx={{
                        p: 2,
                        cursor: (tile.disabled || !region || regionLoading || !!regionError) ? 'default' : 'pointer',
                        opacity: (tile.disabled || !region || regionLoading || !!regionError) ? 0.5 : 1,
                        transition: 'all 0.2s',
                        border: '1px solid rgba(255,255,255,0.05)',
                        bgcolor: selectedTile === tile.name ? 'rgba(0,217,255,0.05)' : 'transparent',
                        borderColor: selectedTile === tile.name ? 'primary.main' : 'rgba(255,255,255,0.05)',
                        '&:hover': {
                          borderColor: (tile.disabled || !region || regionLoading || !!regionError) ? 'rgba(255,255,255,0.05)' : 'primary.main',
                          transform: (tile.disabled || !region || regionLoading || !!regionError) ? 'none' : 'translateY(-2px)'
                        }
                      }}
                      onClick={() => {
                        if (!tile.disabled && region && !regionLoading && !regionError) {
                          handleTileClick(tile.name);
                          setServiceDrawerOpen(false);
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: selectedTile === tile.name ? 'primary.main' : 'text.secondary', gap: 1 }}>
                        {tile.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{tile.name}</Typography>
                      {tile.disabled && (
                        <Chip label="Coming in Next Phase" size="small" variant="outlined" color="warning" sx={{ mt: 1, fontSize: '0.65rem' }} />
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </DialogContent>
          </Dialog>
        </Box>
      )}


      <DriftDashboardDialog
        open={driftPopupOpen}
        onClose={() => setDriftPopupOpen(false)}
        accountId={cloudAccountId}
        accountName={accountName}
      />

      {/* Payload Inspector Dialog */}
      <Dialog open={payloadDialogOpen} onClose={() => setPayloadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code color="primary" /> Raw JSON Payload Inspector
        </DialogTitle>
        <DialogContent dividers>
          {selectedPayload && (
            <Box
              component="pre"
              sx={{
                bgcolor: '#1e1e1e',
                color: '#d4d4d4',
                p: 2,
                borderRadius: 1,
                overflowX: 'auto',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                margin: 0
              }}
            >
              {JSON.stringify(selectedPayload?._raw || selectedPayload, null, 2)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayloadDialogOpen(false)}>Close Inspector</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Components;
