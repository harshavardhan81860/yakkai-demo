import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Avatar, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Stack, Paper, Tab, Tabs, FormControl, InputLabel, Select, MenuItem,
  Divider
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
import { useRole } from "../contexts/RoleContext";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import { fetchAllGroups, GroupRow } from "../services/groupsService";
import { GroupRoleAssignment } from "../services/groupRolesService";
import TablePagination from "@mui/material/TablePagination";


const Roles = () => {
  const navigate = useNavigate();
  const { viewMode, activeTenant } = useRole();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupRoles, setGroupRoles] = useState<GroupRoleAssignment[]>([]);
  const [viewRoleModal, setViewRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [roleGroups, setRoleGroups] = useState<any[]>([]);
  const [loadingRoleData, setLoadingRoleData] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [allGroups, setAllGroups] = useState<GroupRow[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(4);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, tenantsData, groupsData] = await Promise.all([
        fetchAllRoles(),
        fetchAllTenants(),
        fetchAllGroups(),
      ]);
      setAllGroups(groupsData);
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

  // Filter roles by tenant scope
  const filteredRoles = useMemo(() => {
    if (viewMode !== 'tenant' || !activeTenant) return roles;
    return roles.filter(r => !r.is_system_role);
  }, [roles, viewMode, activeTenant]);

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

  const mergedGroupAssignments = groupRoles.map((gr) => {
    const fullGroup = allGroups.find(
      (g) => String(g.id) === String(gr.group_id)
    );

    const scopeType = fullGroup?.is_system_group
      ? "SYSTEM"
      : "TENANT";

    return {
      ...gr,
      name: fullGroup?.name ?? "-",
      email: fullGroup?.email ?? "-",
      scope_type: scopeType,
    };
  });

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
      <TablePagination
        component="div"
        count={filteredRoles.length}
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
      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Role Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRoles
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((r) => (
                  <TableRow key={r.id} sx={{
                    transition: "0.2s",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}>
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
        {/* ================= HEADER ================= */}
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {selectedRole?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage access mappings
          </Typography>
        </DialogTitle>

        <Divider />

        {/* ================= TABS ================= */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 2 }}
        >
          <Tab label="Users" />
          <Tab label="Groups" />
        </Tabs>

        <Divider />

        {/* ================= CONTENT ================= */}
        <DialogContent sx={{ p: 3 }}>
          {loadingRoleData ? (
            <LinearProgress />
          ) : (
            <>
              {/* -------- USERS TAB -------- */}
              {activeTab === 0 && (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Tenant</TableCell>
                      <TableCell>Email</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roleUsers.length ? (
                      roleUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.username}</TableCell>
                          <TableCell>{getTenantName(u.tenant_id)}</TableCell>
                          <TableCell>{u.email}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No users assigned
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

              )}


              {/* -------- GROUPS TAB -------- */}
              {activeTab === 1 && (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Scope Type</TableCell>
                      <TableCell>Tenant</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roleGroups.length ? (
                      roleGroups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell>
                            <Typography fontWeight={600}>
                              {g.name}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={g.is_system_group ? "SYSTEM" : "TENANT"}
                              size="small"
                              color={
                                g.is_system_group ? "secondary" : "primary"
                              }
                            />
                          </TableCell>

                          <TableCell>
                            {g.is_system_group
                              ? "-"
                              : getTenantName(g.tenant_id)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No groups assigned
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </DialogContent>

        <Divider />

        {/* ================= ACTIONS ================= */}
        <DialogActions
          sx={{
            p: 2.5,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Button
            variant="outlined"
            startIcon={activeTab === 0 ? <People /> : <Groups />}
            onClick={handleAssign}
            sx={{ px: 4, borderRadius: 2 }}
          >
            {activeTab === 0 ? "Assign User" : "Assign Group"}
          </Button>

          <Button
            onClick={() => setViewRoleModal(false)}
            variant="contained"
            sx={{ px: 4, borderRadius: 2 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Roles;
