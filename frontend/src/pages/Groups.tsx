import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Avatar, MenuItem, Select, FormControl, InputLabel, Divider, Stack, Paper
} from "@mui/material";
import {
  Add, Groups as GroupsIcon, People, Edit, CheckCircle, Block, Mail, Security, Link as LinkIcon
} from "@mui/icons-material";
import {
  fetchAllGroups, activateGroup, deactivateGroup, createGroup, updateGroup,
  getGroupUsers, type GroupRow, type GroupUser,
} from "../services/groupsService";
import { fetchAllTenants, type TenantRow } from "../services/tenantsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<GroupRow | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [form, setForm] = useState<any>({ name: "", description: "", is_system_group: true, email: "" });
  const [resultDialog, setResultDialog] = useState<{ success: boolean; message: string } | null>(null);

  const [viewUsersModal, setViewUsersModal] = useState(false);
  const [viewUsers, setViewUsers] = useState<GroupUser[]>([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsData, tenantsData] = await Promise.all([fetchAllGroups(), fetchAllTenants()]);
      setGroups([...groupsData].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id - b.id));
      setTenants(tenantsData.filter((t) => t.is_active));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (group: GroupRow) => {
    try {
      group.is_active ? await deactivateGroup(group.id) : await activateGroup(group.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewUsers = async (group: GroupRow) => {
    setSelectedGroupName(group.name);
    setViewUsersModal(true);
    setLoadingUsers(true);
    try {
      const users = await getGroupUsers(group.id);
      setViewUsers(users);
    } catch {
      setViewUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const submitCreate = async () => {
    if (!form.name || !form.description) return;
    try {
      await createGroup(form);
      setShowCreate(false);
      setForm({ name: "", description: "", is_system_group: true, email: "" });
      loadData();
      setResultDialog({ success: true, message: "Group created successfully." });
    } catch (err: any) {
      setResultDialog({ success: false, message: err.response?.data?.message || "Failed to create group" });
    }
  };

  const submitUpdate = async () => {
    if (!editGroup) return;
    try {
      await updateGroup(editGroup.id, { description: editDescription, email: editEmail.trim() || "" });
      setEditGroup(null);
      loadData();
      setResultDialog({ success: true, message: "Group updated successfully." });
    } catch (err: any) {
      setResultDialog({ success: false, message: err.response?.data?.message || "Update failed" });
    }
  };

  const getTenantName = (id: number | null) => tenants.find((t) => t.id === id)?.display_name ?? "—";

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Groups</Typography>
          <Typography variant="body2" color="text.secondary">Create and manage user groups</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<People />} onClick={() => navigate("/user-group-mapping")}>
            Assign Users
          </Button>
          <Button variant="outlined" startIcon={<Security />} onClick={() => navigate("/group-role-mapping")}>
            Map Roles
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setShowCreate(true)}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Create Group</Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[{ label: "Identity", path: "/users" }, { label: "Groups" }]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Group Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id} sx={{ opacity: g.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{
                        width: 32, height: 32,
                        bgcolor: g.is_system_group ? 'rgba(0,217,255,0.1)' : 'rgba(108,99,255,0.1)',
                        color: g.is_system_group ? '#00D9FF' : '#6C63FF',
                      }}>
                        <GroupsIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{g.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>{g.description}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{g.is_system_group ? "System" : getTenantName(g.tenant_id || null)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{g.email || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={g.is_active ? "Active" : "Inactive"} size="small" variant="outlined" color={g.is_active ? "success" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Members">
                      <IconButton size="small" onClick={() => handleViewUsers(g)} sx={{ mr: 1 }}><People fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditGroup(g); setEditDescription(g.description); setEditEmail(g.email || ""); }} sx={{ mr: 1 }}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => handleToggle(g)} sx={{ color: g.is_active ? '#EF4444' : '#10B981' }}>
                      {g.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Members Modal */}
      <Dialog
        open={viewUsersModal}
        onClose={() => setViewUsersModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{selectedGroupName} Members</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {loadingUsers ? <LinearProgress /> : (
            <Table>
              <TableHead><TableRow><TableCell>User</TableCell><TableCell>Email</TableCell></TableRow></TableHead>
              <TableBody>
                {viewUsers.length ? viewUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={2} align="center" sx={{ py: 4 }}>No members</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewUsersModal(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreate || !!editGroup}
        onClose={() => { setShowCreate(false); setEditGroup(null); }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{editGroup ? "Edit Group" : "Create Group"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Name" value={editGroup ? editGroup.name : form.name} disabled={!!editGroup} />
            <TextField fullWidth label="Description" multiline rows={3} value={editGroup ? editDescription : form.description} onChange={e => editGroup ? setEditDescription(e.target.value) : setForm({ ...form, description: e.target.value })} />
            <TextField fullWidth label="Email" value={editGroup ? editEmail : form.email} onChange={e => editGroup ? setEditEmail(e.target.value) : setForm({ ...form, email: e.target.value })} />
            {!editGroup && (
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={String(form.is_system_group)} label="Type" onChange={e => setForm({ ...form, is_system_group: e.target.value === 'true' })}>
                  <MenuItem value="true">System Group</MenuItem>
                  <MenuItem value="false">Tenant Group</MenuItem>
                </Select>
              </FormControl>
            )}
            {!editGroup && !form.is_system_group && (
              <FormControl fullWidth>
                <InputLabel>Tenant</InputLabel>
                <Select value={form.tenant_id || ""} label="Tenant" onChange={e => setForm({ ...form, tenant_id: e.target.value })}>
                  {tenants.map(t => <MenuItem key={t.id} value={t.id}>{t.display_name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => { setShowCreate(false); setEditGroup(null); }}>Cancel</Button>
          <Button variant="contained" onClick={editGroup ? submitUpdate : submitCreate}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Groups;
