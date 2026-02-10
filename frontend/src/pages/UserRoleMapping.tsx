import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Avatar, MenuItem, Select, FormControl, InputLabel, Divider, Stack,
  Autocomplete, Paper, List, ListItem, ListItemText, ListItemAvatar,
  ListItemSecondaryAction
} from "@mui/material";
import {
  Add, Security, People, Groups, Delete, CheckCircle, Block,
  AdminPanelSettings, AccountTree, Mail, Info, Person,
  Business, CloudCircle, ArrowDownward, History
} from "@mui/icons-material";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import { fetchAllUsers, type UserRow } from "../services/usersService";
import { fetchAllRoles, type RoleRow } from "../services/rolesService";
import {
  fetchUserRoles, assignUserRole, revokeUserRole, type UserRoleAssignment,
} from "../services/userRolesService";
import { fetchAllTenants, type TenantRow } from "../services/tenantsService";
import { fetchCloudAccounts, type CloudAccountRow } from "../services/cloudAccountsService";

const UserRoleMapping = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccountRow[]>([]);

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);

  const [showAssign, setShowAssign] = useState(false);
  const [assignType, setAssignType] = useState<"system" | "tenant">("system");

  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedCloud, setSelectedCloud] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [u, r, t] = await Promise.all([fetchAllUsers(), fetchAllRoles(), fetchAllTenants()]);
        setUsers(u.filter((x) => x.is_active));
        setRoles(r.filter((x) => x.is_active));
        setTenants(t.filter((x) => x.is_active));

        const userId = Number(params.get("userId"));
        if (userId) {
          const user = u.find((x) => x.id === userId);
          if (user) {
            setSelectedUser(user);
            setAssignments(await fetchUserRoles(user.id));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedTenant) return;
    fetchCloudAccounts(selectedTenant.id).then((res) =>
      setCloudAccounts(res.filter((c) => c.is_active))
    );
  }, [selectedTenant]);

  const assignedRoleIds = assignments.map((a) => a.role_id);
  const systemRoles = roles.filter((r) => r.is_system_role && !assignedRoleIds.includes(r.id));
  const tenantRoles = roles.filter((r) => !r.is_system_role && r.tenant_id === selectedTenant?.id && !assignedRoleIds.includes(r.id));

  const tenantGroups = useMemo(() => {
    const map: Record<string, UserRoleAssignment[]> = {};
    assignments.forEach((a) => {
      if (!a.tenant_id) return;
      const tKey = String(a.tenant_id);
      map[tKey] = map[tKey] || [];
      map[tKey].push(a);
    });
    return map;
  }, [assignments]);

  const confirmAssign = async () => {
    if (!selectedUser || !selectedRole) return;
    const payload: any = { user_id: selectedUser.id, role_id: selectedRole.id };
    if (assignType === "tenant") {
      if (selectedCloud) payload.cloud_account_id = selectedCloud.id;
      else payload.tenant_id = selectedTenant?.id;
    }
    try {
      await assignUserRole(payload);
      setAssignments(await fetchUserRoles(selectedUser.id));
      setShowAssign(false);
      setSelectedRole(null);
      setSelectedTenant(null);
      setSelectedCloud(null);
    } catch (err) {
      console.error(err);
    }
  };

  const revoke = async (id: number) => {
    try {
      await revokeUserRole(id);
      if (selectedUser) setAssignments(await fetchUserRoles(selectedUser.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>User Role Mapping</Typography>
          <Typography variant="body2" color="text.secondary">Assign roles to platform users</Typography>
        </Box>
        {selectedUser && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setShowAssign(true)}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Assign New Role</Button>
        ) || (
            <Button variant="outlined" startIcon={<Security />} onClick={() => navigate("/roles")}>Manage Roles</Button>
          )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Breadcrumbs items={[
          { label: "Users", path: "/users" },
          { label: "Role Mappings" },
          ...(selectedUser ? [{ label: selectedUser.username }] : []),
        ]} />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person fontSize="small" /> Identity Selection
            </Typography>
            <Autocomplete
              options={users}
              getOptionLabel={(u) => `${u.username} (${u.email})`}
              value={selectedUser}
              onChange={(_, user) => {
                if (!user) return;
                setSelectedUser(user);
                fetchUserRoles(user.id).then(setAssignments);
                navigate(`/user-role-mapping?userId=${user.id}`, { replace: true });
              }}
              renderInput={(params) => <TextField {...params} label="Search User" variant="outlined" fullWidth />}
              sx={{ mt: 1 }}
            />
            {selectedUser && (
              <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="caption" color="text.secondary" display="block">User Details</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedUser.username}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Chip label={`ID: ${selectedUser.id}`} size="small" variant="outlined" />
                  <Chip label="Active" size="small" color="success" />
                </Box>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          {!selectedUser ? (
            <Card sx={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <History sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6">Select a user</Typography>
              <Typography variant="body2">Select a user to view and manage their roles</Typography>
            </Card>
          ) : (
            <Stack spacing={3}>
              {/* System Roles */}
              <Card sx={{ p: 0 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF' }}><AdminPanelSettings /></Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>System Roles</Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableBody>
                      {assignments.filter(a => roles.find(r => r.id === a.role_id)?.is_system_role).length === 0 ? (
                        <TableRow><TableCell align="center" sx={{ py: 4 }}><Typography color="text.secondary">No administrative roles assigned</Typography></TableCell></TableRow>
                      ) : assignments.filter(a => roles.find(r => r.id === a.role_id)?.is_system_role).map(a => (
                        <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                          <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{roles.find(r => r.id === a.role_id)?.name}</Typography></TableCell>
                          <TableCell align="right"><Button size="small" color="error" startIcon={<Delete />} onClick={() => revoke(a.id)}>Revoke</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>

              {/* Tenant Roles */}
              <Card sx={{ p: 0 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}><Business /></Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Organization Roles</Typography>
                </Box>
                {Object.keys(tenantGroups).length === 0 ? (
                  <Box sx={{ p: 6, textAlign: 'center' }}><Typography color="text.secondary">No organization-specific roles assigned</Typography></Box>
                ) : (
                  <List disablePadding>
                    {Object.entries(tenantGroups).map(([tid, assigns], idx) => (
                      <Box key={tid}>
                        {idx > 0 && <Divider />}
                        <Box sx={{ px: 3, pt: 2, pb: 1, bgcolor: 'rgba(255,255,255,0.01)' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#6C63FF', letterSpacing: 1 }}>TENANT: {tenants.find(t => String(t.id) === tid)?.display_name.toUpperCase()}</Typography>
                        </Box>
                        {assigns.map(a => (
                          <ListItem key={a.id} sx={{ px: 3, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <ListItemText primary={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{roles.find(r => r.id === a.role_id)?.name}</Typography>}
                              secondary={a.cloud_account_id ? `Restricted to Cloud Account ID: ${a.cloud_account_id}` : 'Tenant-wide scope'} />
                            <ListItemSecondaryAction>
                              <IconButton edge="end" color="error" onClick={() => revoke(a.id)}><Delete fontSize="small" /></IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </Box>
                    ))}
                  </List>
                )}
              </Card>
            </Stack>
          )}
        </Grid>
      </Grid>

      {/* Assign Dialog */}
      <Dialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Role</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Assignment Logic</InputLabel>
                <Select value={assignType} label="Assignment Logic" onChange={e => { setAssignType(e.target.value as any); setSelectedRole(null); }}>
                  <MenuItem value="system">Global Platform Privilege</MenuItem>
                  <MenuItem value="tenant">Organizational Tenant Access</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {assignType === 'tenant' && (
              <Grid size={12}>
                <Autocomplete
                  options={tenants}
                  getOptionLabel={(t) => t.display_name}
                  value={selectedTenant}
                  onChange={(_, v) => setSelectedTenant(v)}
                  renderInput={(params) => <TextField {...params} label="Target Tenant *" />}
                />
              </Grid>
            )}
            {assignType === "tenant" && selectedTenant && (
              <Grid size={12}>
                <Autocomplete
                  options={cloudAccounts}
                  getOptionLabel={(c) => c.display_name || c.name}
                  value={selectedCloud}
                  onChange={(_, v) => setSelectedCloud(v)}
                  renderInput={(params) => <TextField {...params} label="Restrict to Cloud Account (Optional)" />}
                />
              </Grid>
            )}
            <Grid size={12}>
              <Autocomplete
                options={assignType === "system" ? systemRoles : tenantRoles}
                getOptionLabel={(r) => r.name}
                value={selectedRole}
                onChange={(_, v) => setSelectedRole(v)}
                renderInput={(params) => <TextField {...params} label="Select Role *" />}
                disabled={assignType === 'tenant' && !selectedTenant}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowAssign(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmAssign} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Assign Role</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserRoleMapping;