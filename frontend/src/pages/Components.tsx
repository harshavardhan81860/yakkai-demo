import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Avatar, Tab, Tabs, MenuItem, Select, FormControl, InputLabel, Divider,
  Paper, Stack, Badge, Skeleton
} from "@mui/material";
import {
  Add, Cloud, Layers, CheckCircle, Refresh, Visibility, Storage,
  Computer, ViewInAr, Hub, Language, Info
} from "@mui/icons-material";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import {
  fetchAwsRegions, fetchAwsInstances, fetchAwsImages, fetchAwsClusters,
  fetchAzureRegions, fetchAzureSubscriptions, fetchAzureInstances,
  fetchAzureImages, fetchAzureClusters, testAwsConnection, testAzureConnection
} from "../services/cloudResourcesService";

const Components = () => {
  const { tenantId } = useParams();
  const location = useLocation();

  const cloudAccountType = (location.state as any)?.cloudAccountType as "AWS" | "AZURE";
  const cloudAccountId = (location.state as any)?.cloudAccountId as string;
  const tenantName = (location.state as any)?.tenantName as string;
  const accountName = (location.state as any)?.accountName as string;

  const [region, setRegion] = useState<string>("");
  const [regions, setRegions] = useState<string[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [regionError, setRegionError] = useState<string | null>(null);

  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);

  const awsTiles = [
    { name: "EC2 Instances", icon: <Computer /> },
    { name: "AMI Images", icon: <ViewInAr /> },
    { name: "EKS Clusters", icon: <Hub /> }
  ];
  const azureTiles = [
    { name: "Subscriptions", icon: <Layers /> },
    { name: "Virtual Machines", icon: <Computer /> },
    { name: "Images", icon: <ViewInAr /> },
    { name: "AKS Clusters", icon: <Hub /> }
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

  const handleTileClick = async (tileName: string) => {
    setSelectedTile(tileName);
    setResources([]);
    setResourceLoading(true);
    try {
      let res: any[] = [];
      if (cloudAccountType === "AWS") {
        if (tileName === "EC2 Instances") res = (await fetchAwsInstances(cloudAccountId, region)).instances || [];
        else if (tileName === "AMI Images") res = (await fetchAwsImages(cloudAccountId, region)).images || [];
        else if (tileName === "EKS Clusters") res = (await fetchAwsClusters(cloudAccountId, region)).clusters || [];
      } else if (cloudAccountType === "AZURE") {
        if (tileName === "Subscriptions") res = (await fetchAzureSubscriptions(cloudAccountId)).subscriptions || [];
        else if (tileName === "Virtual Machines") res = (await fetchAzureInstances(cloudAccountId, region)).instances || [];
        else if (tileName === "Images") res = (await fetchAzureImages(cloudAccountId, region)).images || [];
        else if (tileName === "AKS Clusters") res = (await fetchAzureClusters(cloudAccountId, region)).clusters || [];
      }
      setResources(res);
    } catch {
      setResources([]);
    } finally {
      setResourceLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      if (cloudAccountType === "AWS") await testAwsConnection(cloudAccountId);
      else if (cloudAccountType === "AZURE") await testAzureConnection(cloudAccountId);
      loadRegions();
    } catch {
      setRegionError("Validation failed. Check account integration.");
    }
  };

  if (!cloudAccountType) return <Box p={3}><Typography color="error">Inventory Access Denied: Missing Cloud Context</Typography></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Resource Explorer</Typography>
          <Typography variant="body2" color="text.secondary">Inventory optimization for <strong>{accountName}</strong></Typography>
        </Box>
        <Paper variant="outlined" sx={{ p: 1.5, px: 2, display: 'flex', gap: 3, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <Box><Typography variant="caption" display="block" color="text.secondary">Tenant</Typography><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{tenantName}</Typography></Box>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Box><Typography variant="caption" display="block" color="text.secondary">Provider</Typography><Chip label={cloudAccountType} size="small" color={cloudAccountType === 'AWS' ? 'warning' : 'info'} sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} /></Box>
        </Paper>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Tenants", path: "/tenants" },
          { label: "Cloud Accounts", path: `/tenants/${tenantId}/cloud-accounts` },
          { label: "Inventory" },
        ]} />
      </Box>

      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Language fontSize="small" /> Deployment Region
            </Typography>

            {regionLoading ? <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2 }} /> : regionError ? (
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(239,68,68,0.05)', borderRadius: 2 }}>
                <Typography variant="caption" color="error" display="block" sx={{ mb: 2 }}>{regionError}</Typography>
                <Button size="small" variant="contained" color="error" fullWidth onClick={() => loadRegions(true)}>Re-Validate</Button>
              </Box>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl fullWidth size="small">
                  <Select value={region} onChange={e => { setRegion(e.target.value); setSelectedTile(null); setResources([]); }}>
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

            <Typography variant="subtitle2" sx={{ mt: 4, mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Layers fontSize="small" /> Resource Category
            </Typography>
            <Stack spacing={1}>
              {tiles.map((tile) => (
                <Button
                  key={tile.name}
                  variant={selectedTile === tile.name ? "contained" : "outlined"}
                  startIcon={tile.icon}
                  fullWidth
                  disabled={!region || regionLoading || !!regionError}
                  onClick={() => handleTileClick(tile.name)}
                  sx={{
                    justifyContent: 'flex-start',
                    bgcolor: selectedTile === tile.name ? 'primary.main' : 'transparent',
                    borderColor: 'rgba(255,255,255,0.06)',
                    '&:hover': { bgcolor: selectedTile === tile.name ? 'primary.dark' : 'rgba(255,255,255,0.05)' }
                  }}
                >
                  {tile.name}
                </Button>
              ))}
            </Stack>
          </Card>
        </Grid>

        {/* Explorer View */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Card sx={{ minHeight: 500, p: 0 }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF' }}><Storage /></Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedTile || 'Select a Category'}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedTile ? `Real-time data from ${region}` : 'Explore cloud resources across regions'}</Typography>
                </Box>
              </Box>
              {selectedTile && (
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<Refresh />} onClick={() => handleTileClick(selectedTile)}>Update</Button>
                  <Button size="small" variant="contained" startIcon={<Add />}>Provision</Button>
                </Stack>
              )}
            </Box>

            <Box sx={{ p: 0 }}>
              {resourceLoading ? <LinearProgress /> : !selectedTile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, opacity: 0.5 }}>
                  <Info sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h6">Ready to Explore</Typography>
                  <Typography variant="body2">Choose a resource category from the left panel to begin</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {selectedTile === "EC2 Instances" || selectedTile === "Virtual Machines" ? (
                          <>
                            <TableCell>ID / Name</TableCell>
                            <TableCell>State</TableCell>
                            <TableCell>Hardware Type</TableCell>
                            <TableCell>Network</TableCell>
                            <TableCell>Launched</TableCell>
                          </>
                        ) : selectedTile === "Subscriptions" ? (
                          <>
                            <TableCell>ID</TableCell>
                            <TableCell>Label</TableCell>
                            <TableCell>Status</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>Resource Name</TableCell>
                            <TableCell>Condition</TableCell>
                            <TableCell>Timestamp</TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resources.length === 0 ? (
                        <TableRow><TableCell colSpan={8} align="center"><Typography variant="body2" sx={{ py: 8 }}>No active resources found in this category.</Typography></TableCell></TableRow>
                      ) : resources.map((r, idx) => (
                        <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                          {selectedTile === "EC2 Instances" || selectedTile === "Virtual Machines" ? (
                            <>
                              <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.instance_id || r.name}</Typography><Typography variant="caption" color="text.secondary">{r.image_id}</Typography></TableCell>
                              <TableCell><Chip label={r.state || 'Unknown'} size="small" color={r.state === 'running' || r.state === 'active' ? 'success' : 'warning'} sx={{ borderRadius: 1.5, fontSize: '0.7rem' }} /></TableCell>
                              <TableCell><Typography variant="body2">{r.type || r.size}</Typography></TableCell>
                              <TableCell><Typography variant="body2">{r.public_ip || r.private_ip || '-'}</Typography><Typography variant="caption" color="text.secondary">{r.availability_zone}</Typography></TableCell>
                              <TableCell><Typography variant="caption">{r.launch_time ? new Date(r.launch_time).toLocaleDateString() : '-'}</Typography></TableCell>
                            </>
                          ) : selectedTile === "Subscriptions" ? (
                            <>
                              <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{r.subscription_id}</Typography></TableCell>
                              <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.display_name}</Typography></TableCell>
                              <TableCell><Chip label={r.state} size="small" color="primary" sx={{ borderRadius: 1.5 }} /></TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.name || r.display_name}</Typography></TableCell>
                              <TableCell><Chip label={r.status || 'Active'} size="small" color="success" sx={{ borderRadius: 1.5 }} /></TableCell>
                              <TableCell><Typography variant="caption">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</Typography></TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Components;
