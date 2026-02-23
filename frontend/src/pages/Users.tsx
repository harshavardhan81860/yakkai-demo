import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Avatar, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Stack, Paper
} from "@mui/material";
import {
  PersonAdd, Person, Mail, MoreVert, Block, CheckCircle,
  AccountCircle, GroupWork, Security, Link as LinkIcon, Edit
} from "@mui/icons-material";
import {
  fetchAllUsers, activateUser, deactivateUser, createUser, type UserRow,
} from "../services/usersService";
import UserRolesGroupsDialog from "../components/Common/UserRolesGroupsDialog";
import ProfileDialog from "../components/Profile/ProfileDialog";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import GenericResultDialog from "../components/Common/GenericResultDialog";

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState<any>({ email: "" });
  const [viewRolesUser, setViewRolesUser] = useState<{ id: number; name: string } | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [resultDialog, setResultDialog] = useState<{ success: boolean; message: string; user?: UserRow } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      const sorted = [...data].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id - b.id);
      setUsers(sorted);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggle = async (user: UserRow) => {
    try {
      user.is_active ? await deactivateUser(user.id) : await activateUser(user.id);
      await loadUsers();
    } catch (err: any) {
      console.error("Failed to toggle user status", err);
      alert(err.response?.data?.message || "Failed to toggle user status.");
    }
  };

  const submitInvite = async () => {
    if (!form.email) return;
    try {
      const res = await createUser(form);
      setShowInvite(false);
      setForm({ email: "" });
      setResultDialog({ success: true, message: res.message, user: res.data?.user });
    } catch (err: any) {
      setResultDialog({
        success: false,
        message: err.response?.data?.message ?? "Failed to create user"
      });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Users</Typography>
          <Typography variant="body2" color="text.secondary">Manage platform users and their access</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<Security />} onClick={() => navigate("/user-role-mapping")}>
            Map Roles
          </Button>
          <Button variant="outlined" startIcon={<GroupWork />} onClick={() => navigate("/user-group-mapping")}>
            Map Groups
          </Button>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setShowInvite(true)}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            Add User
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[{ label: "Identity", path: "/users" }, { label: "Users" }]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} sx={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{
                        width: 38, height: 38,
                        bgcolor: u.is_active ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.05)',
                        color: u.is_active ? '#6C63FF' : '#4B5563',
                        fontWeight: 700
                      }}>
                        {u.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{u.username}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{u.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.is_active ? "Active" : "Inactive"}
                      size="small"
                      icon={u.is_active ? <CheckCircle /> : <Block />}
                      sx={{
                        color: u.is_active ? '#10B981' : '#EF4444',
                        borderColor: u.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                        '& .MuiChip-icon': { color: 'inherit' }
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Access">
                      <IconButton size="small" onClick={() => setViewRolesUser({ id: u.id, name: u.username })} sx={{ mr: 1 }}>
                        <AccountCircle fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Details">
                      <IconButton size="small" onClick={() => setEditUser(u)} sx={{ mr: 1 }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={u.is_active ? "Disable" : "Enable"}>
                      <IconButton size="small" onClick={() => handleToggle(u)} sx={{ color: u.is_active ? '#EF4444' : '#10B981' }}>
                        {u.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Modal */}
      <Dialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add New User</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}><TextField fullWidth label="First Name" value={form.first_name || ""} onChange={e => setForm({ ...form, first_name: e.target.value })} /></Grid>
              <Grid size={{ xs: 6 }}><TextField fullWidth label="Last Name" value={form.last_name || ""} onChange={e => setForm({ ...form, last_name: e.target.value })} /></Grid>
            </Grid>
            <TextField fullWidth label="Password" type="password" value={form.password || ""} onChange={e => setForm({ ...form, password: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInvite(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitInvite}>Create User</Button>
        </DialogActions>
      </Dialog>

      <GenericResultDialog
        isOpen={!!resultDialog}
        success={resultDialog?.success}
        message={resultDialog?.message}
        onClose={() => setResultDialog(null)}
      />

      <UserRolesGroupsDialog
        userId={viewRolesUser?.id ?? 0}
        userName={viewRolesUser?.name}
        isOpen={!!viewRolesUser}
        onClose={() => setViewRolesUser(null)}
      />

      {/* Admin Edit Profile Dialog */}
      <ProfileDialog
        open={!!editUser}
        onClose={() => { setEditUser(null); loadUsers(); }}
        targetUser={editUser}
      />
    </Box>
  );
};

export default Users;