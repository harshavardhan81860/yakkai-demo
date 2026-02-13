import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Avatar, MenuItem, Select, FormControl, InputLabel, Divider, Stack,
  Autocomplete, Paper, List, ListItem, ListItemText, ListItemAvatar,
  ListItemSecondaryAction, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import {
  Add, People, Groups, Delete, Person, Business, CloudCircle,
  AdminPanelSettings, AccountTree, History, ExpandMore, FolderSpecial
} from "@mui/icons-material";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import { fetchAllUsers, type UserRow } from "../services/usersService";
import { fetchAllGroups, type GroupRow } from "../services/groupsService";
import {
  fetchUserGroups, assignUserGroup, revokeUserGroup, type UserGroupAssignment,
} from "../services/userGroupsService";
import { fetchAllTenants, type TenantRow } from "../services/tenantsService";
import { fetchCloudAccounts, type CloudAccountRow } from "../services/cloudAccountsService";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";


const UserGroupMapping = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccountRow[]>([]);

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [assignments, setAssignments] = useState<UserGroupAssignment[]>([]);

  const [showAssign, setShowAssign] = useState(false);
  const [assignType, setAssignType] = useState<"system" | "tenant">("system");

  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedCloud, setSelectedCloud] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [u, g, t] = await Promise.all([fetchAllUsers(), fetchAllGroups(), fetchAllTenants()]);
        setUsers(u.filter((x) => x.is_active));
        setGroups(g.filter((x) => x.is_active));
        setTenants(t.filter((x) => x.is_active));

        const userId = params.get("userId");
        if (userId) {
          const user = u.find((x) => String(x.id) === String(userId));
          if (user) {
            setSelectedUser(user);
            setAssignments(await fetchUserGroups(user.id));
          }
        }

        // ✅ Pre-fill group from groupId param
        const groupId = params.get("groupId");
        // console.log("groupId from URL:", groupId);
        // console.log("available group ids:", g.map(x => ({ id: x.id, type: typeof x.id, name: x.name })));
        console.log("Assigned Users:", assignments);

        if (groupId) {
          const group = g.find((x) => String(x.id) === String(groupId));
          console.log("matched group:", group);
          if (group) {
            setSelectedGroup(group);
            setAssignType(group.is_system_group ? "system" : "tenant");
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
    const groupId = params.get("groupId");
    if (groupId && selectedGroup) {
      setShowAssign(true);
    }
  }, [selectedGroup]);



  useEffect(() => {
    if (!selectedTenant) return;
    fetchCloudAccounts(selectedTenant.id).then((res) =>
      setCloudAccounts(res.filter((c) => c.is_active))
    );
  }, [selectedTenant]);

  const assignedGroupIds = assignments.map((a) => a.group_id);
  const systemGroups = groups.filter((g) => g.is_system_group && !assignedGroupIds.includes(g.id));
  const tenantGroupsList = groups.filter((g) => !g.is_system_group && g.tenant_id === selectedTenant?.id && !assignedGroupIds.includes(g.id));

  const groupedAssignments = useMemo(() => {
    const map: Record<string, { tenantGroups: UserGroupAssignment[]; cloudGroups: Record<string, UserGroupAssignment[]> }> = {};
    assignments.forEach((a) => {
      let tenantId = a.tenant_id;
      if (!tenantId && a.cloud_account_id) {
        tenantId = cloudAccounts.find((c) => String(c.id) === String(a.cloud_account_id))?.tenant_id ?? null;
      }
      if (!tenantId) return;
      const tKey = String(tenantId);
      if (!map[tKey]) map[tKey] = { tenantGroups: [], cloudGroups: {} };
      if (a.cloud_account_id) {
        const cKey = String(a.cloud_account_id);
        map[tKey].cloudGroups[cKey] = map[tKey].cloudGroups[cKey] || [];
        map[tKey].cloudGroups[cKey].push(a);
      } else {
        map[tKey].tenantGroups.push(a);
      }
    });
    return map;
  }, [assignments, cloudAccounts]);

  const confirmAssign = async () => {
    if (!selectedUser) {
      alert("Please select a user");
      return;
    }

    if (!selectedGroup) {
      alert("Please select a group");
      return;
    }

    const payload: any = {
      user_id: selectedUser.id,
      group_id: selectedGroup.id,
    };
    if (assignType === "tenant") {
      if (selectedCloud) payload.cloud_account_id = selectedCloud.id;
      else payload.tenant_id = selectedTenant?.id;
    }
    try {
      await assignUserGroup(payload);
      setAssignments(await fetchUserGroups(selectedUser.id));
      setShowAssign(false);
      setSelectedGroup(null);
      setSelectedTenant(null);
      setSelectedCloud(null);
    } catch (err) {
      console.error(err);
    }
  };

  const revoke = async (id: number) => {
    try {
      await revokeUserGroup(id);
      if (selectedUser) setAssignments(await fetchUserGroups(selectedUser.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>User Group Mapping</Typography>
          <Typography variant="body2" color="text.secondary">Assign users to groups</Typography>
        </Box>
        {selectedUser && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setShowAssign(true)}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Add to Group</Button>
        ) || (
            <Button variant="outlined" startIcon={<Groups />} onClick={() => navigate("/groups")}>Manage Groups</Button>
          )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Breadcrumbs items={[
          { label: "Users", path: "/users" },
          { label: "Group Mappings" },
          ...(selectedUser ? [{ label: selectedUser.username }] : []),
        ]} />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person fontSize="small" /> Select User
            </Typography>
            <Autocomplete
              options={users}
              getOptionLabel={(u) => `${u.username} (${u.email})`}
              value={selectedUser}
              onChange={(_, user) => {
                if (!user) return;
                setSelectedUser(user);
                fetchUserGroups(user.id).then(setAssignments);
                navigate(`/user-group-mapping?userId=${user.id}`, { replace: true });
              }}
              renderInput={(params) => <TextField {...params} label="Search User" />}
            />
            {selectedUser && (
              <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="caption" color="text.secondary" display="block">User Details</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedUser.username}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          {!selectedUser ? (
            <Card sx={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <AccountTree sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6">Select a user</Typography>
              <Typography variant="body2">Select a user to view and manage their groups</Typography>
            </Card>
          ) : (
            <Stack spacing={3}>
              {/* System Groups */}
              <Card sx={{ p: 0 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF' }}><AdminPanelSettings /></Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Global Groups</Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableBody>
                      {assignments.filter(a => groups.find(g => g.id === a.group_id)?.is_system_group).length === 0 ? (
                        <TableRow><TableCell align="center" sx={{ py: 4 }}><Typography color="text.secondary">No system-level memberships</Typography></TableCell></TableRow>
                      ) : assignments.filter(a => groups.find(g => g.id === a.group_id)?.is_system_group).map(a => (
                        <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                          <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{groups.find(g => g.id === a.group_id)?.name}</Typography></TableCell>
                          <TableCell align="right"><Button size="small" color="error" startIcon={<Delete />} onClick={() => revoke(a.id)}>Revoke</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>

              {/* Organizational Units */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, px: 1 }}>Organization Groups</Typography>
                {Object.keys(groupedAssignments).length === 0 ? (
                  <Card sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No tenant or project memberships</Typography></Card>
                ) : Object.entries(groupedAssignments).map(([tid, data]) => {
                  const tenant = tenants.find(t => String(t.id) === tid);
                  return (
                    <Accordion key={tid} defaultExpanded sx={{ background: 'transparent', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.06)', mb: 2, borderRadius: '16px !important', '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#6C63FF20', color: '#6C63FF' }}><Business fontSize="small" /></Avatar>
                          <Typography sx={{ fontWeight: 700 }}>{tenant?.display_name}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        {/* Tenant Groups */}
                        {data.tenantGroups.length > 0 && (
                          <List subheader={<Typography variant="caption" sx={{ px: 3, pt: 1, pb: 1, display: 'block', fontWeight: 800, color: 'text.secondary' }}>TENANT-WIDE GROUPS</Typography>}>
                            {data.tenantGroups.map(a => (
                              <ListItem key={a.id} sx={{ px: 3 }}>
                                <ListItemText primary={<Typography variant="subtitle2">{groups.find(g => g.id === a.group_id)?.name}</Typography>} />
                                <IconButton color="error" size="small" onClick={() => revoke(a.id)}><Delete fontSize="small" /></IconButton>
                              </ListItem>
                            ))}
                          </List>
                        )}
                        {/* Cloud Categories */}
                        {Object.entries(data.cloudGroups).map(([cid, assigns]) => {
                          const cloud = cloudAccounts.find(c => String(c.id) === cid);
                          return (
                            <Box key={cid} sx={{ ml: 3, mr: 2, mb: 1, p: 1, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.04)' }}>
                              <Typography variant="caption" sx={{ px: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: '#00D9FF' }}>
                                <CloudCircle sx={{ fontSize: '0.9rem' }} /> {cloud?.display_name || 'Cloud Project'}
                              </Typography>
                              <List>
                                {assigns.map(a => (
                                  <ListItem key={a.id} sx={{ py: 0.5 }}>
                                    <ListItemText primary={<Typography variant="body2">{groups.find(g => g.id === a.group_id)?.name}</Typography>} />
                                    <IconButton color="error" size="small" onClick={() => revoke(a.id)}><Delete fontSize="small" /></IconButton>
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          );
                        })}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Add to Group</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2.5}>
            {/* ✅ ADD THIS BLOCK HERE */}
            {/* <Grid size={12}>
              <Autocomplete
                options={users}
                getOptionLabel={(u) => `${u.username} (${u.email})`}
                value={selectedUser}
                onChange={(_, v) => setSelectedUser(v)}
                renderInput={(params) => (
                  <TextField {...params} label="Select User *" />
                )}
              />
            </Grid> */}
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Enrollment Scope</InputLabel>
                <Select value={assignType} label="Enrollment Scope" onChange={e => { setAssignType(e.target.value as any); setSelectedGroup(null); }}>
                  <MenuItem value="system">Global Groups</MenuItem>
                  <MenuItem value="tenant">Organization Teams</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {assignType === 'tenant' && (
              <Grid size={12}>
                <Autocomplete
                  options={tenants}
                  getOptionLabel={(t) => t.display_name}
                  value={selectedTenant}
                  onChange={(_, v) => { setSelectedTenant(v); setSelectedCloud(null); }}
                  renderInput={(params) => <TextField {...params} label="Select Organization *" />}
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
                  renderInput={(params) => <TextField {...params} label="Cloud Environment (Optional)" />}
                />
              </Grid>
            )}
            <Grid size={12}>
              <Autocomplete
                options={assignType === "system" ? systemGroups : tenantGroupsList}
                getOptionLabel={(g) => g.name}
                value={selectedGroup}
                onChange={(_, v) => setSelectedGroup(v)}
                renderInput={(params) => <TextField {...params} label="Select Group *" />}
                disabled={assignType === 'tenant' && !selectedTenant}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowAssign(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmAssign}
            disabled={
              !selectedUser ||
              !selectedGroup ||
              (assignType === "tenant" && !selectedTenant)
            }
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}
          >
            Add to Group
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserGroupMapping;
