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
  fetchAllRoles, activateRole, deactivateRole,
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

  const [viewRoleModal, setViewRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [roleGroups, setRoleGroups] = useState<any[]>([]);
  const [loadingRoleData, setLoadingRoleData] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, tenantsData] = await Promise.all([
        fetchAllRoles(),
        fetchAllTenants(),
      ]);

      setRoles([...rolesData].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id.localeCompare(b.id)));
      setTenants(tenantsData.filter((t) => t.is_active));
      // setRoles([...rolesData].sort((a, b) => Number(b.is_active) - Number(a.is_active) ||  a.id.localeCompare(b.id)));
      // setTenants(tenantsData.filter((t) => t.is_active));
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
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to toggle role status.");
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



  const getTenantName = (id: string | null) => tenants.find((t) => String(t.id) === String(id))?.display_name ?? "—";

  const handleAssign = () => {
    if (!selectedRole) return;

    const basePath =
      activeTab === 0 ? "/user-role-mapping" : "/group-role-mapping";

    navigate(
      `${basePath}?roleId=${selectedRole.id}&autoAssign=true`
    );

    setViewRoleModal(false);
  };


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
                    <Chip label={r.is_active ? "Active" : "Inactive"} size="small" variant="outlined" color={r.is_active ? "success" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Assignments">
                      <IconButton size="small" onClick={() => handleViewPeople(r)} sx={{ mr: 1 }}><People fontSize="small" /></IconButton>
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
              <TableHead><TableRow><TableCell>User</TableCell><TableCell>Tenant</TableCell><TableCell>Email</TableCell></TableRow></TableHead>
              <TableBody>
                {roleUsers.length ? roleUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{getTenantName(u.tenant_id)}</TableCell>
                    <TableCell>{u.email}</TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4 }}>No users assigned</TableCell></TableRow>}
              </TableBody>
            </Table>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Tenant</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roleGroups.length ? roleGroups.map(g => (
                  <TableRow key={g.id}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell>{getTenantName(g.tenant_id)}</TableCell>
                    <TableCell>{g.id}</TableCell>
                    <TableCell>{g.email?.trim() ? g.email : "-"}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      No groups linked
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: 2.5,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            justifyContent: "flex-end"
          }}
        >
          {/* Assign Button */}
          <Button
            variant="outlined"
            startIcon={activeTab === 0 ? <People /> : <Groups />}
            onClick={handleAssign}
            sx={{ px: 4, borderRadius: 2 }}
          >
            {activeTab === 0 ? "Assign User" : "Assign Group"}
          </Button>

          {/* Close Button */}
          <Button
            onClick={() => setViewRoleModal(false)}
            variant="contained"
            sx={{ px: 4, borderRadius: 2 }}
          >
            Close
          </Button>
        </DialogActions>  </Dialog>    </Box>
  );
};

export default Roles;
