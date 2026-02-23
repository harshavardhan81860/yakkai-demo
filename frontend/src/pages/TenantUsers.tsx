import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, LinearProgress, Dialog,
    DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, Avatar, Chip, Card
} from "@mui/material";
import { Add, Delete, Person } from "@mui/icons-material";
import { fetchTenantUsers, addTenantUser, removeTenantUser, TenantUserRow } from "../services/tenantUsersService";
import { fetchAllUsers, UserRow } from "../services/usersService";
import { fetchAllTenants, TenantRow } from "../services/tenantsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const TenantUsers = () => {
    const { tenantId: routeTenantId } = useParams<{ tenantId: string }>();
    const [activeTenantId, setActiveTenantId] = useState<string>(routeTenantId || "");
    const [tenants, setTenants] = useState<TenantRow[]>([]);
    const [mappedUsers, setMappedUsers] = useState<TenantUserRow[]>([]);
    const [allUsers, setAllUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [showAdd, setShowAdd] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const loadData = async () => {
        setLoading(true);
        try {
            const usersRes = await fetchAllUsers();
            setAllUsers(usersRes.filter(u => u.is_active));

            if (!routeTenantId) {
                const tenantsRes = await fetchAllTenants();
                setTenants(tenantsRes.filter(t => t.is_active));
            }

            if (activeTenantId) {
                const tenantUsersRes = await fetchTenantUsers(activeTenantId);
                setMappedUsers(tenantUsersRes);
            } else {
                setMappedUsers([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTenantId]);

    const handleAddUser = async () => {
        if (!activeTenantId || !selectedUserId) return;
        try {
            await addTenantUser(activeTenantId, selectedUserId);
            setShowAdd(false);
            setSelectedUserId("");
            loadData();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to add user to tenant.");
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!activeTenantId) return;
        if (!window.confirm("Are you sure you want to remove this user from the tenant? This will also revoke their tenant groups and roles.")) return;
        try {
            await removeTenantUser(activeTenantId, userId);
            loadData();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to remove user from tenant.");
        }
    };

    const getUserDetails = (userId: string) => {
        return allUsers.find(u => String(u.id) === String(userId));
    };

    const unassignedUsers = allUsers.filter(u => !mappedUsers.some(mu => String(mu.user_id) === String(u.id)));

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Breadcrumbs items={[
                        routeTenantId ? { label: "Infrastructure", path: "/tenants" } : { label: "Identity", path: "/users" },
                        routeTenantId ? { label: "Workspace", path: `/tenants/${routeTenantId}` } : null,
                        { label: "Tenant Users" }
                    ].filter((x): x is { label: string, path?: string } => x !== null)} />
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Tenant Users</Typography>
                    <Typography variant="body2" color="text.secondary">Manage users who have access to organizational workspaces</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {!routeTenantId && (
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Select Tenant Workspace</InputLabel>
                            <Select
                                value={activeTenantId}
                                label="Select Tenant Workspace"
                                onChange={(e) => setActiveTenantId(e.target.value)}
                            >
                                {tenants.map(t => (
                                    <MenuItem key={t.id} value={t.id}>{t.display_name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setShowAdd(true)}
                        disabled={!activeTenantId}
                        sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}
                    >
                        Add User
                    </Button>
                </Box>
            </Box>

            {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : !activeTenantId ? (
                <Card sx={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="h6">Select a tenant</Typography>
                    <Typography variant="body2">Please select a tenant workspace to view its users</Typography>
                </Card>
            ) : (
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
                            {mappedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary">No users mapped to this tenant.</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : mappedUsers.map((mu) => {
                                const user = getUserDetails(mu.user_id);
                                return (
                                    <TableRow key={mu.id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
                                                    <Person fontSize="small" />
                                                </Avatar>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                    {user?.username || user?.first_name || "Unknown User"}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">{user?.email || "—"}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label="Active" size="small" variant="outlined" color="success" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => handleRemoveUser(mu.user_id)} sx={{ color: '#EF4444' }}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add User Modal */}
            <Dialog
                open={showAdd}
                onClose={() => setShowAdd(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Add User to Tenant</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>Select User</InputLabel>
                        <Select
                            value={selectedUserId}
                            label="Select User"
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            {unassignedUsers.map(u => (
                                <MenuItem key={u.id} value={u.id}>
                                    {u.username || u.email}
                                </MenuItem>
                            ))}
                            {unassignedUsers.length === 0 && (
                                <MenuItem disabled value="">No available users</MenuItem>
                            )}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddUser}
                        disabled={!selectedUserId}
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TenantUsers;
