import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Avatar, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Stack, Paper, Tab, Tabs, FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import {
  Add, Security, People, Groups, Edit, CheckCircle, Block,
  AccountCircle, AccountTree, Link as LinkIcon
} from "@mui/icons-material";
import {
  fetchAllRoles, activateRole, deactivateRole, createRole, updateRole,
  getRoleUsers, getRoleGroups, type RoleRow,
} from "../services/rolesService";
import { fetchAllTenants, type TenantRow } from "../services/tenantsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import { fetchAllGroups } from "../services/groupsService";


const Roles = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState<RoleRow | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [allGroups, setAllGroups] = useState<any[]>([]);

  const [form, setForm] = useState<any>({ name: "", description: "", is_system_role: true, email: "" });
  const [resultDialog, setResultDialog] = useState<{ success: boolean; message: string } | null>(null);

  const [viewRoleModal, setViewRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [roleGroups, setRoleGroups] = useState<any[]>([]);
  const [loadingRoleData, setLoadingRoleData] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, tenantsData, groupsData] = await Promise.all([
        fetchAllRoles(),
        fetchAllTenants(),
        fetchAllGroups()
      ]);

      setRoles([...rolesData].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id - b.id));
      setTenants(tenantsData.filter((t) => t.is_active));
      setAllGroups(groupsData);
      setRoles([...rolesData].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id - b.id));
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

  const handleToggle = async (role: RoleRow) => {
    try {
      role.is_active ? await deactivateRole(role.id) : await activateRole(role.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewPeople = async (role: RoleRow) => {
    setSelectedRole(role);
    setViewRoleModal(true);
    setActiveTab(0);
    setLoadingRoleData(true);

    try {
      const [users, groups] = await Promise.all([
        getRoleUsers(role.id),
        getRoleGroups(role.id)
      ]);

      console.log("Groups from API:", groups);
      console.log("Users from API:", users);

      setRoleUsers(users);
      setRoleGroups(groups);
    } catch (err) {
      console.error(err);
      setRoleUsers([]);
      setRoleGroups([]);
    } finally {
      setLoadingRoleData(false);
    }
  };


  const submitCreate = async () => {
    if (!form.name || !form.description) return;
    try {
      await createRole({ ...form, email: form.email?.trim() || "" });
      setShowCreate(false);
      setForm({ name: "", description: "", is_system_role: true, email: "" });
      loadData();
      setResultDialog({ success: true, message: "Role created successfully." });
    } catch (err: any) {
      setResultDialog({ success: false, message: err.response?.data?.message || "Failed to create role" });
    }
  };

  const submitUpdate = async () => {
    if (!editRole) return;
    try {
      await updateRole(editRole.id, { description: editDescription, email: editEmail.trim() || "" });
      setEditRole(null);
      loadData();
      setResultDialog({ success: true, message: "Role updated successfully." });
    } catch (err: any) {
      setResultDialog({ success: false, message: err.response?.data?.message || "Update failed" });
    }
  };

  const getTenantName = (id: number | null) => tenants.find((t) => t.id === id)?.display_name ?? "—";

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Roles</Typography>
          <Typography variant="body2" color="text.secondary">Define access permissions and service roles</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<AccountTree />} onClick={() => navigate("/user-role-mapping")}>
            Map Users
          </Button>
          <Button variant="outlined" startIcon={<LinkIcon />} onClick={() => navigate("/group-role-mapping")}>
            Map Groups
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setShowCreate(true)}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Create Role</Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[{ label: "Identity", path: "/users" }, { label: "Roles" }]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Role Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id} sx={{ opacity: r.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{
                        width: 32, height: 32,
                        bgcolor: r.is_system_role ? 'rgba(0,217,255,0.1)' : 'rgba(108,99,255,0.1)',
                        color: r.is_system_role ? '#00D9FF' : '#6C63FF',
                      }}>
                        <Security fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>{r.description}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{r.is_system_role ? "System" : getTenantName(r.tenant_id)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{(r as any).email || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={r.is_active ? "Active" : "Inactive"} size="small" variant="outlined" color={r.is_active ? "success" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Assignments">
                      <IconButton size="small" onClick={() => handleViewPeople(r)} sx={{ mr: 1 }}><People fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditRole(r); setEditDescription(r.description); setEditEmail((r as any).email || ""); }} sx={{ mr: 1 }}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => handleToggle(r)} sx={{ color: r.is_active ? '#EF4444' : '#10B981' }}>
                      {r.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assignments Modal */}
      <Dialog
        open={viewRoleModal}
        onClose={() => setViewRoleModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{selectedRole?.name} Assignments</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
            <Tab label="Users" />
            <Tab label="Groups" />
          </Tabs>
          {loadingRoleData ? <LinearProgress /> : activeTab === 0 ? (
            <Table size="small">
              <TableHead><TableRow><TableCell>User</TableCell><TableCell>Email</TableCell></TableRow></TableHead>
              <TableBody>
                {roleUsers.length ? roleUsers.map(u => (
                  <TableRow key={u.id}><TableCell>{u.username}</TableCell><TableCell>{u.email}</TableCell></TableRow>
                )) : <TableRow><TableCell colSpan={2} align="center" sx={{ py: 4 }}>No users assigned</TableCell></TableRow>}
              </TableBody>
            </Table>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Group</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roleGroups.length ? roleGroups.map(g => {
                  const groupName =
                    allGroups.find(gr => String(gr.id) === String(g.group_id))?.name
                    || g.group_id;

                  return (
                    <TableRow key={g.id}>
                      <TableCell>{groupName}</TableCell>
                      <TableCell>
                        <Chip label="Linked" size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                      No groups linked
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewRoleModal(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreate || !!editRole}
        onClose={() => { setShowCreate(false); setEditRole(null); }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{editRole ? "Edit Role" : "Create Role"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Name" value={editRole ? editRole.name : form.name} disabled={!!editRole} />
            <TextField fullWidth label="Description" multiline rows={3} value={editRole ? editDescription : form.description} onChange={e => editRole ? setEditDescription(e.target.value) : setForm({ ...form, description: e.target.value })} />
            <TextField fullWidth label="Alert Email" value={editRole ? editEmail : form.email} onChange={e => editRole ? setEditEmail(e.target.value) : setForm({ ...form, email: e.target.value })} />
            {!editRole && (
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={String(form.is_system_role)} label="Type" onChange={e => setForm({ ...form, is_system_role: e.target.value === 'true' })}>
                  <MenuItem value="true">System Role</MenuItem>
                  <MenuItem value="false">Tenant Role</MenuItem>
                </Select>
              </FormControl>
            )}
            {!editRole && !form.is_system_role && (
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
          <Button onClick={() => { setShowCreate(false); setEditRole(null); }}>Cancel</Button>
          <Button variant="contained" onClick={editRole ? submitUpdate : submitCreate}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Roles;
