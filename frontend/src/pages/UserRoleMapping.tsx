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
import { fetchUserRoles, assignUserRole, revokeUserRole, type UserRoleAssignment, } from "../services/userRolesService";
import { fetchAllTenants, fetchUserTenants, type TenantRow } from "../services/tenantsService";
import { fetchCloudAccounts, type CloudAccountRow } from "../services/cloudAccountsService";
import { useRole } from "../contexts/RoleContext";

const UserRoleMapping = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { viewMode, activeTenant } = useRole();

  const [usersForSelectedRole, setUsersForSelectedRole] = useState<number[]>([]);


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
  const [usersAssignedToRole, setUsersAssignedToRole] = useState<number[]>([]);

  useEffect(() => {
    if (!selectedRole) {
      setUsersAssignedToRole([]);
      return;
    }
    // Fetch assignments for ALL users, then filter by selectedRole
    Promise.all(users.map(u => fetchUserRoles(u.id))).then(allAssignments => {
      const assigned = allAssignments
        .flat()
        .filter(a => String(a.role_id) === String(selectedRole.id))
        .map(a => a.user_id);
      setUsersAssignedToRole(assigned);
    });
  }, [selectedRole, users]);

  useEffect(() => {
    (async () => {
      const [u, r, t] = await Promise.all([fetchAllUsers(), fetchAllRoles(), fetchAllTenants()]);
      setUsers(u);
      setRoles(r);
      setTenants(t);

      const userId = params.get("userId");
      const roleId = params.get("roleId");
      const autoAssign = params.get("autoAssign") === "true";

      if (userId) {
        const user = u.find(x => String(x.id) === String(userId));
        if (user) {
          setSelectedUser(user);
          const [roles, userTenants] = await Promise.all([
            fetchUserRoles(user.id),
            fetchUserTenants(user.id)
          ]);
          setAssignments(roles);
          setTenants(userTenants);
        }
      }

      if (roleId) {
        const role = r.find(x => String(x.id) === String(roleId));
        if (role) {
          setAssignType(role.is_system_role ? "system" : "tenant");
          setSelectedRole(role);
        }
      }

      if (autoAssign && users) setShowAssign(true);
    })();
  }, []);

  // Set default selection based on viewMode
  useEffect(() => {
    if (showAssign && viewMode === "tenant" && activeTenant && tenants.length > 0) {
      setAssignType("tenant");
      const matchedTenant = tenants.find(t => String(t.id) === String(activeTenant.tenant_id));
      if (matchedTenant) {
        setSelectedTenant(matchedTenant);
      }
    }
  }, [showAssign, viewMode, activeTenant, tenants]);



  useEffect(() => {
    if (!selectedTenant) return;
    fetchCloudAccounts(selectedTenant.id).then((res) =>
      setCloudAccounts(res.filter((c) => c.is_active))
    );
  }, [selectedTenant]);

  const systemRoles = roles.filter((r) => {
    if (!r.is_system_role) return false;
    const isAssigned = assignments.some(a => !a.tenant_id && String(a.role_id) === String(r.id));
    return !isAssigned;
  });

  const tenantRoles = useMemo(() => {
    const result = roles.filter((r) => {
      if (r.is_system_role) return false;
      if (r.tenant_id && String(r.tenant_id) !== String(selectedTenant?.id)) return false;
      const isAssigned = assignments.some(a =>
        String(a.tenant_id) === String(selectedTenant?.id) &&
        String(a.role_id) === String(r.id)
      );
      return !isAssigned;
    });
    console.log('[DEBUG] tenantRoles filter', {
      selectedTenant: selectedTenant ? { id: selectedTenant.id, name: selectedTenant.display_name } : null,
      totalRoles: roles.length,
      nonSystemRoles: roles.filter(r => !r.is_system_role).length,
      matchingRoles: result.length,
      sampleRoleTenantIds: roles.filter(r => !r.is_system_role).slice(0, 3).map(r => ({ name: r.name, tenant_id: r.tenant_id })),
    });
    return result;
  }, [roles, selectedTenant, assignments]);

  // For display: group tenant assignments by tenant
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
    console.log("Selected User:", selectedUser);
    console.log("Selected Role:", selectedRole);

    if (!selectedUser || !selectedRole) return;
    const payload: any = { user_id: selectedUser.id, role_id: selectedRole.id };
    if (assignType === "tenant") {
      payload.tenant_id = selectedTenant?.id;
    }
    try {
      await assignUserRole(payload);
      setAssignments(await fetchUserRoles(selectedUser.id));
      setShowAssign(false);
      setSelectedRole(null);
      setSelectedTenant(null);
      setSelectedCloud(null);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.detail || "Failed to assign role.";
      alert(msg);
    }
  };

  const revoke = async (id: number) => {
    try {
      await revokeUserRole(id);
      if (selectedUser) setAssignments(await fetchUserRoles(selectedUser.id));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to revoke role assignment.");
    }
  };

  useEffect(() => {
    console.log("Selected User:", selectedUser);
  }, [selectedUser]);

  useEffect(() => {
    console.log("Selected Role:", selectedRole);
  }, [selectedRole]);



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
          <Card
            sx={{
              p: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper"
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 1
              }}
            >
              <Person fontSize="small" /> Identity Selection
            </Typography>

            <Autocomplete
              options={users}
              getOptionLabel={(u) => `${u.username} (${u.email})`}
              value={selectedUser}
              onChange={(_, user) => {
                setSelectedUser(user || null);

                if (user) {
                  fetchUserRoles(user.id).then(setAssignments);
                  fetchUserTenants(user.id).then(setTenants);
                  navigate(`/user-role-mapping?userId=${user.id}`, { replace: true });
                }
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search User"
                  fullWidth
                  sx={(theme) => ({
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor:
                          theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.23)"
                      },
                      "&:hover fieldset": {
                        borderColor: theme.palette.primary.main
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.palette.primary.main,
                        borderWidth: 2
                      }
                    }
                  })}
                />)}
            />

            {selectedUser && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider"
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  User Details
                </Typography>

                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {selectedUser.username}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {selectedUser.email}
                </Typography>

                <Box sx={{ mt: 2, display: "flex", gap: 1, flexDirection: "column" }}>
                  <Chip label={`ID: ${selectedUser.id}`} size="small" variant="outlined" />
                  <Chip label="Active" size="small" color="success" />
                </Box>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          {!selectedUser ? (
            <Card
              sx={(theme) => ({
                height: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.7,
                borderRadius: 3,
                border: "1px solid",
                borderColor: theme.palette.divider,
                background:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(0,0,0,0.02)",
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 10px 30px rgba(0,0,0,0.6)"
                    : "0 10px 30px rgba(0,0,0,0.12)"
              })}
            >
              <History sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6">Select a user</Typography>
              <Typography variant="body2">
                Select a user to view and manage their roles
              </Typography>
            </Card>
          ) : (
            <Stack spacing={3}>
              {/* System Roles */}
              <Card sx={{ border: "1px solid", borderColor: "divider" }}>
                <Box
                  sx={{
                    p: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5
                  }}
                >
                  <Avatar sx={{ bgcolor: "rgba(0,217,255,0.1)", color: "#00D9FF" }}>
                    <AdminPanelSettings />
                  </Avatar>

                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    System Roles
                  </Typography>
                </Box>

                <TableContainer>
                  <Table>
                    <TableBody>
                      {assignments.filter(a =>
                        roles.find(r => String(r.id) === String(a.role_id))?.is_system_role
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell align="center" sx={{ py: 4 }}>
                            <Typography color="text.secondary">
                              No administrative roles assigned
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        assignments
                          .filter(a =>
                            roles.find(r => String(r.id) === String(a.role_id))?.is_system_role
                          )
                          .map(a => (
                            <TableRow
                              key={a.id}
                              sx={{ "&:hover": { bgcolor: "action.hover" } }}
                            >
                              <TableCell>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {roles.find(r => String(r.id) === String(a.role_id))?.name}
                                </Typography>
                              </TableCell>

                              <TableCell align="right">
                                {!a.is_inherited && (
                                  <Button
                                    size="small"
                                    color="error"
                                    startIcon={<Delete />}
                                    onClick={() => revoke(a.id as number)}
                                  >
                                    Revoke
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>

              {/* Tenant Roles */}
              <Card sx={{ border: "1px solid", borderColor: "divider" }}>
                <Box
                  sx={{
                    p: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5
                  }}
                >
                  <Avatar sx={{ bgcolor: "rgba(108,99,255,0.1)", color: "#6C63FF" }}>
                    <Business />
                  </Avatar>

                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Organization Roles
                  </Typography>
                </Box>

                {Object.keys(tenantGroups).length === 0 ? (
                  <Box sx={{ p: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      No organization-specific roles assigned
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {Object.entries(tenantGroups).map(([tid, assigns], idx) => (
                      <Box key={tid}>
                        {idx > 0 && <Divider />}

                        <Box
                          sx={{
                            px: 3,
                            pt: 2,
                            pb: 1,
                            bgcolor: "action.hover"
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              color: "#6C63FF",
                              letterSpacing: 1
                            }}
                          >
                            TENANT:{" "}
                            {tenants
                              .find(t => String(t.id) === tid)
                              ?.display_name.toUpperCase()}
                          </Typography>
                        </Box>

                        {assigns.map(a => (
                          <ListItem
                            key={a.id}
                            sx={{ px: 3, "&:hover": { bgcolor: "action.hover" } }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {roles.find(r => String(r.id) === String(a.role_id))?.name}
                                </Typography>
                              }
                            />

                            {!a.is_inherited && (
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={() => revoke(a.id as number)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            )}
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
        PaperProps={{
          sx: (theme) => ({
            borderRadius: 3,
            border: "1px solid",
            borderColor: theme.palette.divider,
            background:
              theme.palette.mode === "dark"
                ? "rgba(20,20,20,0.9)"
                : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(10px)"
          })
        }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(6px)"
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Assign Role
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2.5} >

            {/* Select User */}
            <Grid size={12}>
              <Autocomplete
                options={users.filter(u => !usersAssignedToRole.includes(u.id))}
                getOptionLabel={(u) => `${u.username} (${u.email})`}
                value={selectedUser}
                onChange={(_, user) => {
                  setSelectedUser(user || null)
                  if (user) {
                    fetchUserRoles(user.id).then(setAssignments)
                    fetchUserTenants(user.id).then(setTenants)
                  }
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select User *"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "divider" },
                        "&:hover fieldset": { borderColor: "primary.main" },
                        "&.Mui-focused fieldset": { borderColor: "primary.main" }
                      }
                    }}
                  />
                )}
              />
            </Grid>

            {/* Assignment Logic */}
            <Grid size={12}>
              <FormControl
                fullWidth
                disabled={viewMode === "tenant"}
                sx={{
                  "& .MuiOutlinedInput-root fieldset": { borderColor: "divider" }
                }}
              >
                <InputLabel>Assignment Logic</InputLabel>

                <Select
                  value={assignType}
                  label="Assignment Logic"
                  onChange={e => {
                    setAssignType(e.target.value as any)
                    setSelectedRole(null)
                  }}
                >
                  {viewMode === "system" && (
                    <MenuItem value="system">
                      Global Platform Privilege
                    </MenuItem>
                  )}

                  <MenuItem value="tenant">
                    Organizational Tenant Access
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Tenant Selection */}
            {assignType === "tenant" && (
              <Grid size={12}>
                <Autocomplete
                  options={
                    viewMode === "tenant" && activeTenant
                      ? tenants.filter(
                        t => String(t.id) === String(activeTenant.tenant_id)
                      )
                      : tenants
                  }
                  getOptionLabel={(t) => t.display_name}
                  value={selectedTenant}
                  onChange={(_, v) => setSelectedTenant(v)}
                  disabled={viewMode === "tenant"}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Target Tenant *"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: "divider" },
                          "&:hover fieldset": { borderColor: "primary.main" },
                          "&.Mui-focused fieldset": { borderColor: "primary.main" }
                        }
                      }}
                    />
                  )}
                />
              </Grid>
            )}

            {/* Role Selection */}
            <Grid size={12}>
              <Autocomplete
                options={assignType === "system" ? systemRoles : tenantRoles}
                getOptionLabel={(r) =>
                  r.tenant_id
                    ? `${r.name} (${tenants.find(t => String(t.id) === String(r.tenant_id))?.display_name || "Legacy Tenant"})`
                    : r.name
                }
                value={selectedRole}
                onChange={(_, role) => setSelectedRole(role || null)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                disabled={assignType === "tenant" && !selectedTenant}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Role *"
                    variant="outlined"
                    sx={(theme) => ({
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "& fieldset": {
                          borderColor:
                            theme.palette.mode === "light"
                              ? "rgba(0,0,0,0.23)"
                              : "rgba(255,255,255,0.2)"
                        },
                        "&:hover fieldset": {
                          borderColor: theme.palette.primary.main
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: theme.palette.primary.main,
                          borderWidth: 2
                        }
                      }
                    })}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowAssign(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={confirmAssign}
            disabled={
              !selectedUser ||
              !selectedRole ||
              usersAssignedToRole.length === users.length
            }
          >
            Assign Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserRoleMapping;