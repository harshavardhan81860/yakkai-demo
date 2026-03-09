import { useEffect, useState, useMemo } from "react";
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
import GenericResultDialog from "../components/Common/GenericResultDialog";
import { Tabs, Tab } from "@mui/material";
import { fetchGroupRoles, GroupRoleAssignment }
  from "../services/groupRolesService";
import { useTheme, useMediaQuery } from "@mui/material";
import { AccessMappingRole, fetchUserAccessMappings } from "../services/userAccessMappingService";
import { User } from "..";
import { useRole } from "../contexts/RoleContext";
import { fetchAllRoles, RoleRow } from "../services/rolesService";
import TablePagination from "@mui/material/TablePagination";

interface MergedRole extends GroupRoleAssignment {
  name: string
  scope_type: "SYSTEM" | "TENANT"
  assignment_type: "DIRECT"
}

const Groups = (
) => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { viewMode, activeTenant } = useRole();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<GroupRow | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [form, setForm] = useState<any>({ name: "", description: "", is_system_group: true, email: "", tenant_id: null });
  const [resultDialog, setResultDialog] = useState<{ success: boolean; message: string } | null>(null);

  const [viewUsersModal, setViewUsersModal] = useState(false);
  const [viewUsers, setViewUsers] = useState<GroupUser[]>([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [groupRoles, setGroupRoles] = useState<GroupRoleAssignment[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const isUserTab = tabValue === 0;
  const assignLabel = isUserTab ? "Assign User" : "Assign Role";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [accessRoles, setAccessRoles] = useState<AccessMappingRole[]>([]);
  const [allRoles, setAllRoles] = useState<RoleRow[]>([]);
  const [allGroups, setAllGroups] = useState<GroupRow[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(4);
  useEffect(() => {
    if (!selectedUser) return;

    const loadAccessMappings = async () => {
      const data = await fetchUserAccessMappings(selectedUser.id);
      if (data) {
        setAccessRoles(data.roles);
      }
    };

    loadAccessMappings();
  }, [selectedUser]);

  const mergedRoles: MergedRole[] = groupRoles.map((gr) => {
    const fullRole = allRoles.find(
      (r) => String(r.id) === String(gr.role_id)
    );

    const isSystem = fullRole?.is_system_role === true;

    return {
      ...gr,
      name: fullRole?.name ?? "-",
      scope_type: isSystem ? "SYSTEM" : "TENANT",
      assignment_type: "DIRECT",
    };
  });

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

  // Filter groups by tenant scope
  const filteredGroups = useMemo(() => {
    if (viewMode !== 'tenant' || !activeTenant) return groups;
    return groups.filter(g => String(g.tenant_id) === String(activeTenant.tenant_id));
  }, [groups, viewMode, activeTenant]);

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (group: GroupRow) => {
    try {
      group.is_active ? await deactivateGroup(group.id) : await activateGroup(group.id);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to toggle group status.");
    }
  };

  const handleViewUsers = async (group: GroupRow) => {
    setSelectedGroupName(group.name);
    setSelectedGroupId(group.id);
    setViewUsersModal(true);
    setLoadingUsers(true);
    setLoadingRoles(true);
    setTabValue(0);

    try {
      const [users, roles, rolesList] = await Promise.all([
        getGroupUsers(group.id),
        fetchGroupRoles(group.id),
        fetchAllRoles()
      ]);

      setViewUsers(users);
      setGroupRoles(roles);
      setAllRoles(rolesList);
    } catch {
      setViewUsers([]);
      setGroupRoles([]);
    } finally {
      setLoadingUsers(false);
      setLoadingRoles(false);
    }
  };


  const handleAssign = () => {
    if (!selectedGroupId) return;

    setViewUsersModal(false);

    if (tabValue === 0) {
      navigate(`/user-group-mapping?groupId=${selectedGroupId}`);
    } else {
      navigate(`/group-role-mapping?groupId=${selectedGroupId}&autoAssign=true`);
    }
  };


  const submitCreate = async () => {
    if (!form.name || !form.description) return;
    try {
      const payload = { ...form };
      if (payload.is_system_group) {
        payload.tenant_id = null;
      }
      await createGroup(payload);
      setShowCreate(false);
      setForm({ name: "", description: "", is_system_group: true, email: "", tenant_id: null });
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

  const getTenantName = (id: number | null) => tenants.find((t) => Number(t.id) === id)?.display_name ?? "—";


  /*Pagination */

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };


  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: { xs: 'flex-start', md: 'space-between' },
          alignItems: { xs: 'baseline', md: 'center' },
          gap: { xs: 2.5, md: 0 }
        }}
      >        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Groups</Typography>
          <Typography variant="body2" color="text.secondary">Create and manage user groups</Typography>
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            '& button': {
              width: { xs: '100%', sm: 'auto' }
            }
          }}
        >          <Button variant="outlined" startIcon={<People />} onClick={() => navigate("/user-group-mapping")}>
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
      <TablePagination
        component="div"
        count={filteredGroups.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[4]}
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      />
      {loading ? (
        <LinearProgress sx={{ borderRadius: 2 }} />
      ) : isMobile ? (

        /* ================= MOBILE CARD VIEW ================= */
        <Stack spacing={2}>
          {groups.map((g) => (
            <Card
              key={g.id}
              sx={{
                p: 2,
                borderRadius: 3,
                opacity: g.is_active ? 1 : 0.6,
                border: '1px solid rgba(255,255,255,0.05)',
                bgcolor: 'rgba(255,255,255,0.01)'
              }}
            >
              <Stack spacing={1.5}>

                {/* Group Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: g.is_system_group
                        ? 'rgba(0,217,255,0.1)'
                        : 'rgba(108,99,255,0.1)',
                      color: g.is_system_group ? '#00D9FF' : '#6C63FF',
                    }}
                  >
                    <GroupsIcon fontSize="small" />
                  </Avatar>

                  <Box>
                    <Typography fontWeight={700}>
                      {g.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {g.description}
                    </Typography>
                  </Box>
                </Box>

                {/* Scope */}
                <Typography variant="body2">
                  Scope: {g.is_system_group
                    ? "System"
                    : getTenantName(g.tenant_id || null)}
                </Typography>

                {/* Email */}
                <Typography variant="body2">
                  Email: {g.email || "—"}
                </Typography>

                {/* Status */}
                <Chip
                  label={g.is_active ? "Active" : "Inactive"}
                  size="small"
                  color={g.is_active ? "success" : "default"}
                  variant="outlined"
                  sx={{ width: 'fit-content' }}
                />

                {/* Actions */}
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => handleViewUsers(g)}>
                    <People fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditGroup(g);
                      setEditDescription(g.description);
                      setEditEmail(g.email || "");
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={() => handleToggle(g)}
                    sx={{ color: g.is_active ? '#EF4444' : '#10B981' }}
                  >
                    {g.is_active
                      ? <Block fontSize="small" />
                      : <CheckCircle fontSize="small" />}
                  </IconButton>
                </Stack>

              </Stack>
            </Card>
          ))}
        </Stack>

      ) : (

        /* ================= DESKTOP TABLE ================= */
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Group Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredGroups
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((g) => (
                  <TableRow key={g.id} sx={{ opacity: g.is_active ? 1 : 0.5 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: g.is_system_group
                              ? 'rgba(0,217,255,0.1)'
                              : 'rgba(108,99,255,0.1)',
                            color: g.is_system_group ? '#00D9FF' : '#6C63FF',
                          }}
                        >
                          <GroupsIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {g.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {g.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      {g.is_system_group
                        ? "System"
                        : getTenantName(g.tenant_id || null)}
                    </TableCell>

                    <TableCell>
                      {g.email || "—"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={g.is_active ? "Active" : "Inactive"}
                        size="small"
                        variant="outlined"
                        color={g.is_active ? "success" : "default"}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewUsers(g)}
                        sx={{ mr: 1 }}
                      >
                        <People fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditGroup(g);
                          setEditDescription(g.description);
                          setEditEmail(g.email || "");
                        }}
                        sx={{ mr: 1 }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={() => handleToggle(g)}
                        sx={{ color: g.is_active ? '#EF4444' : '#10B981' }}
                      >
                        {g.is_active
                          ? <Block fontSize="small" />
                          : <CheckCircle fontSize="small" />}
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
        // open={showCreate}
        onClose={() => setViewUsersModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
            },
          },
        }}
      >

        {/* Header */}
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {selectedGroupName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage access mappings
          </Typography>
        </DialogTitle>

        <Divider />

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ px: 2 }}
        >
          <Tab label="Users" />
          <Tab label="Roles" />
        </Tabs>

        <Divider />
        {/* Content */}
        <DialogContent sx={{ p: 3 }}>
          {tabValue === 0 && (
            loadingUsers ? <LinearProgress /> : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewUsers.length ? viewUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center">No members</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )
          )}

          {tabValue === 1 && (
            loadingRoles ? <LinearProgress /> : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Scope Type</TableCell>
                    <TableCell>Tenant</TableCell>
                    {/* <TableCell>Assignment Type</TableCell>
                    <TableCell>Assignment Name</TableCell> */}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {mergedRoles.length ? (
                    mergedRoles.map((r) => (
                      <TableRow key={r.id}>

                        {/* Role Name */}
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {r.name}
                          </Typography>
                        </TableCell>

                        {/* Scope Type */}
                        <TableCell>
                          <Chip
                            label={r.scope_type}
                            size="small"
                            color={r.scope_type === "SYSTEM" ? "secondary" : "primary"}
                          />                        </TableCell>

                        {/* Tenant */}
                        <TableCell>
                          <Typography variant="caption"> {r.scope_type === "SYSTEM" ? "-" : tenants.find((t) => String(t.id) === String(r.tenant_id))?.display_name ?? "-"}
                          </Typography> </TableCell>

                        {/* Assignment Type */}
                        {/* <TableCell>
                          <Chip
                            label="DIRECT"
                            size="small"
                            color="primary"
                          />
                        </TableCell> */}

                        {/* Assignment Name */}
                        {/* <TableCell>
                          -
                        </TableCell> */}

                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No roles assigned
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Button
            variant="outlined"
            startIcon={isUserTab ? <People /> : <Security />} onClick={handleAssign}
            sx={{ px: 4, borderRadius: 2 }}
          >
            {assignLabel}
          </Button>
          <Button
            onClick={() => setViewUsersModal(false)}
            variant="contained"
            sx={{ px: 4, borderRadius: 2 }}
          >
            Close Auditor
          </Button>        </DialogActions>
      </Dialog>
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
            },
          },
        }}
      >
        <DialogTitle>Create Group</DialogTitle>

        <DialogContent sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Group Name"
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 }
              }
            }}
          />

          <TextField
            fullWidth
            label="Description"
            margin="normal"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 }
              }
            }}
          />

          <TextField
            fullWidth
            label="Email"
            margin="normal"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 }
              }
            }}
          />

          <FormControl
            fullWidth
            margin="normal"
            sx={{
              "& .MuiOutlinedInput-root fieldset": { borderColor: "divider" },
              "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "primary.main" },
              "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 }
            }}
          >
            <InputLabel>Group Scope</InputLabel>
            <Select
              value={form.is_system_group}
              label="Group Scope"
              onChange={(e) =>
                setForm({
                  ...form,
                  is_system_group: e.target.value,
                  tenant_id: e.target.value ? null : form.tenant_id
                })
              }
            >
              <MenuItem value={true as any}>System Group (Global)</MenuItem>
              <MenuItem value={false as any}>Tenant Group (Organization specific)</MenuItem>
            </Select>
          </FormControl>

          {!form.is_system_group && (
            <FormControl
              fullWidth
              margin="normal"
              sx={{
                "& .MuiOutlinedInput-root fieldset": { borderColor: "divider" },
                "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "primary.main" },
                "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 }
              }}
            >
              <InputLabel>Select Tenant</InputLabel>
              <Select
                value={form.tenant_id || ""}
                label="Select Tenant"
                onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
              >
                {tenants.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.display_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowCreate(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={submitCreate}
            disabled={!form.name || !form.description || (!form.is_system_group && !form.tenant_id)}
          >
            Create
          </Button>
        </DialogActions>


      </Dialog>

      <Dialog
        open={!!editGroup}
        onClose={() => setEditGroup(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
            },
          },
        }}
      >
        <DialogTitle>Edit Group</DialogTitle>

        <DialogContent sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                  borderWidth: 2
                }
              }
            }}
          />

          <TextField
            fullWidth
            label="Email"
            margin="normal"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                  borderWidth: 2
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditGroup(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitUpdate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <GenericResultDialog
        isOpen={!!resultDialog}
        success={resultDialog?.success}
        message={resultDialog?.message}
        onClose={() => { setResultDialog(null); loadData(); }}
      />
    </Box >
  );
};

export default Groups;



