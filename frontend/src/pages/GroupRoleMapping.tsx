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
  Add, Security, People, Groups, Delete, Person, Business,
  AdminPanelSettings, AccountTree, History, CloudCircle
} from "@mui/icons-material";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import { fetchAllGroups, type GroupRow } from "../services/groupsService";
import { fetchAllRoles, type RoleRow } from "../services/rolesService";
import {
  fetchGroupRoles, assignGroupRole, revokeGroupRole, type GroupRoleAssignment,
} from "../services/groupRolesService";
import { fetchAllTenants, type TenantRow } from "../services/tenantsService";
import { fetchCloudAccounts, type CloudAccountRow } from "../services/cloudAccountsService";
import { UserRow } from "../services/usersService";

const GroupRoleMapping = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccountRow[]>([]);

  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
  const [assignments, setAssignments] = useState<GroupRoleAssignment[]>([]);

  const [showAssign, setShowAssign] = useState(false);
  const [assignType, setAssignType] = useState<"system" | "tenant">("system");

  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedCloud, setSelectedCloud] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [usersAssignedToRole, setUsersAssignedToRole] = useState<number[]>([]);
  useEffect(() => {
    if (!selectedRole) {
      setUsersAssignedToRole([]);
      return;
    }
    // Fetch assignments for ALL users, then filter by selectedRole
    Promise.all(users.map(u => fetchGroupRoles(u.id))).then(allAssignments => {
      const assigned = allAssignments
        .flat()
        .filter(a => String(a.role_id) === String(selectedRole.id))
        .map(a => a.group_id);
      setUsersAssignedToRole(assigned);
    });
  }, [selectedRole, users]);
  useEffect(() => {
    const groupId = params.get("groupId");
    const roleId = params.get("roleId");
    const autoAssign = params.get("autoAssign") === "true";

    (async () => {
      const [g, r] = await Promise.all([fetchAllGroups(), fetchAllRoles()]);

      setGroups(g);
      setRoles(r);

      // If coming from Groups page
      if (groupId) {
        const group = g.find(x => String(x.id) === groupId);
        if (group) setSelectedGroup(group);
      }

      // If coming from Roles page
      if (roleId) {
        const role = r.find(x => String(x.id) === roleId);
        if (role) {
          setAssignType(role.is_system_role ? "system" : "tenant");
          setSelectedRole(role);
        }
      }

      // Auto open assign dialog
      if (autoAssign) {
        setShowAssign(true);
      }
    })();
  }, []);


  useEffect(() => {
    if (!selectedTenant) return;
    fetchCloudAccounts(selectedTenant.id).then((res) =>
      setCloudAccounts(res.filter((c) => c.is_active))
    );
  }, [selectedTenant]);

  const assignedRoleIds = assignments.map((a) => a.role_id);
  const systemRoles = roles.filter((r) => r.is_system_role && !assignedRoleIds.includes(Number(r.id)));
  const tenantRoles = roles.filter((r) => !r.is_system_role && r.tenant_id === selectedTenant?.id && !assignedRoleIds.includes(Number(r.id)));

  const tenantAssignments = useMemo(() => {
    const map: Record<string, GroupRoleAssignment[]> = {};
    assignments.forEach((a) => {
      if (!a.tenant_id) return;
      const tKey = String(a.tenant_id);
      map[tKey] = map[tKey] || [];
      map[tKey].push(a);
    });
    return map;
  }, [assignments]);

  const confirmAssign = async () => {
    if (!selectedGroup || !selectedRole) return;
    const payload: any = { group_id: selectedGroup.id, role_id: selectedRole.id };
    if (assignType === "tenant") {
      if (selectedCloud) payload.cloud_account_id = selectedCloud.id;
      else payload.tenant_id = selectedTenant?.id;
    }
    try {
      await assignGroupRole(payload);
      setAssignments(await fetchGroupRoles(selectedGroup.id));
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
      await revokeGroupRole(id);
      if (selectedGroup) setAssignments(await fetchGroupRoles(selectedGroup.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Group Role Mapping</Typography>
          <Typography variant="body2" color="text.secondary">Assign roles to groups</Typography>
        </Box>
        {selectedGroup && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setShowAssign(true)}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Assign Role</Button>
        ) || (
            <Button variant="outlined" startIcon={<Groups />} onClick={() => navigate("/groups")}>Manage Groups</Button>
          )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Breadcrumbs items={[
          { label: "Groups", path: "/groups" },
          { label: "Role Mappings" },
          ...(selectedGroup ? [{ label: selectedGroup.name }] : []),
        ]} />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Groups fontSize="small" /> Select Group
            </Typography>
            <Autocomplete
              options={groups}
              getOptionLabel={(g) => g.name}
              value={selectedGroup}
              onChange={(_, group) => {
                if (!group) return;
                setSelectedGroup(group);
                setAssignments([]);
                fetchGroupRoles(group.id).then(setAssignments);
                navigate(`/group-role-mapping?groupId=${group.id}`, { replace: true });
              }}
              renderInput={(params) => <TextField {...params} label="Search Group" variant="outlined" fullWidth />}
              sx={{ mt: 1 }}
            />
            {selectedGroup && (
              <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="caption" color="text.secondary" display="block">Group Details</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedGroup.name}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedGroup.description}</Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Chip label={selectedGroup.is_system_group ? 'System' : 'Tenant'} size="small" variant="outlined" sx={{ color: selectedGroup.is_system_group ? '#00D9FF' : '#6C63FF', borderColor: selectedGroup.is_system_group ? '#00D9FF' : '#6C63FF' }} />
                </Box>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          {!selectedGroup ? (
            <Card sx={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <Security sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6">Select a group</Typography>
              <Typography variant="body2">Select a group to view and manage their roles</Typography>
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
                      {assignments.filter(a => roles.find(r => String(r.id) === String(a.role_id))?.is_system_role).length === 0 ? (
                        <TableRow><TableCell align="center" sx={{ py: 4 }}><Typography color="text.secondary">No administrative roles assigned</Typography></TableCell></TableRow>
                      ) : assignments.filter(a => roles.find(r => String(r.id) === String(a.role_id))?.is_system_role).map(a => (
                        <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                          <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{roles.find(r => String(r.id) === String(a.role_id))?.name}</Typography></TableCell>
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
                {Object.keys(tenantAssignments).length === 0 ? (
                  <Box sx={{ p: 6, textAlign: 'center' }}><Typography color="text.secondary">No organization-specific roles assigned</Typography></Box>
                ) : (
                  <List disablePadding>
                    {Object.entries(tenantAssignments).map(([tid, assigns], idx) => (
                      <Box key={tid}>
                        {idx > 0 && <Divider />}
                        <Box sx={{ px: 3, pt: 2, pb: 1, bgcolor: 'rgba(255,255,255,0.01)' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#6C63FF', letterSpacing: 1 }}>TENANT: {tenants.find(t => String(t.id) === tid)?.display_name.toUpperCase()}</Typography>
                        </Box>
                        {assigns.map(a => (
                          <ListItem key={a.id} sx={{ px: 3, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <ListItemText primary={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{roles.find(r => String(r.id) === String(a.role_id))?.name}</Typography>}
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
            {/* 1. Select User */}
            <Grid size={12}>
              <Autocomplete
                options={users.filter(u => !usersAssignedToRole.includes(u.id))}
                getOptionLabel={(u) => `${u.username} (${u.email})`}
                value={selectedUser}
                onChange={(_, user) => {
                  setSelectedUser(user || null);
                  if (user) fetchGroupRoles(user.id).then(setAssignments);
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => <TextField {...params} label="Select User *" />}
              />

            </Grid>

            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Assignment Logic</InputLabel>
                <Select value={assignType} label="Assignment Logic" onChange={e => { setAssignType(e.target.value as any); setSelectedRole(null); }}>
                  <MenuItem value="system">Global Roles</MenuItem>
                  <MenuItem value="tenant">Organization Roles</MenuItem>
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

export default GroupRoleMapping;
