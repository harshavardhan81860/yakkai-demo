import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, LinearProgress, Grid, Avatar, Switch, FormControlLabel } from '@mui/material';
import { Add, Edit, Delete, PersonAdd } from '@mui/icons-material';
import api from '../../api/client';

const UsersAdminPage = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [form, setForm] = useState({ email: '', name: '', password: '', role_id: 3, tenant_id: 1, is_active: true });

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/api/admin/users').then(r => setUsers(r.data)),
            api.get('/api/admin/roles').then(r => setRoles(r.data)),
        ]).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleSave = async () => {
        try {
            if (editUser) {
                await api.put(`/api/admin/users/${editUser.id}`, form);
            } else {
                await api.post('/api/admin/users', form);
            }
            setDialog(false); setEditUser(null); setForm({ email: '', name: '', password: '', role_id: 3, tenant_id: 1, is_active: true }); load();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this user?')) return;
        await api.delete(`/api/admin/users/${id}`); load();
    };

    const openEdit = (u: any) => {
        setEditUser(u);
        setForm({ email: u.email, name: u.name, password: '', role_id: u.role?.id || 3, tenant_id: u.tenant_id || 1, is_active: u.is_active });
        setDialog(true);
    };

    const roleColors: Record<string, string> = { admin: '#6C63FF', manager: '#00D9FF', user: '#10B981' };
    if (loading) return <LinearProgress />;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>User Management</Typography>
                    <Typography variant="body2" color="text.secondary">Manage platform users and roles</Typography>
                </Box>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => { setEditUser(null); setForm({ email: '', name: '', password: '', role_id: 3, tenant_id: 1, is_active: true }); setDialog(true); }}
                    sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Add User</Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Users', value: users.length, color: '#6C63FF' },
                    { label: 'Active', value: users.filter(u => u.is_active).length, color: '#10B981' },
                    { label: 'Admins', value: users.filter(u => u.role?.name === 'admin').length, color: '#F59E0B' },
                ].map((s, i) => (
                    <Grid item xs={4} key={i}>
                        <Card sx={{ p: 2, textAlign: 'center', background: `linear-gradient(135deg,${s.color}15,transparent)` }}>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: s.color }}>{s.value}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Tenant</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Last Login</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map(u => (
                                <TableRow key={u.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: roleColors[u.role?.name] || '#666', fontSize: '0.8rem' }}>{u.name?.charAt(0)}</Avatar>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.name}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{u.email}</Typography></TableCell>
                                    <TableCell><Chip label={u.role?.name || 'N/A'} size="small" sx={{ bgcolor: (roleColors[u.role?.name] || '#666') + '20', color: roleColors[u.role?.name] || '#666', fontWeight: 700 }} /></TableCell>
                                    <TableCell><Typography variant="body2">{u.tenant_name || 'N/A'}</Typography></TableCell>
                                    <TableCell><Chip label={u.is_active ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: u.is_active ? '#10B98120' : '#EF444420', color: u.is_active ? '#10B981' : '#EF4444' }} /></TableCell>
                                    <TableCell><Typography variant="caption" color="text.secondary">{u.last_login?.split('T')[0] || 'Never'}</Typography></TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => openEdit(u)} sx={{ color: '#6C63FF' }}><Edit fontSize="small" /></IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(u.id)} sx={{ color: '#EF4444' }}><Delete fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}><TextField fullWidth label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} helperText={editUser ? 'Leave blank to keep current password' : ''} /></Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Role</InputLabel>
                                <Select value={form.role_id} label="Role" onChange={(e) => setForm({ ...form, role_id: Number(e.target.value) })}>
                                    {roles.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Active" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UsersAdminPage;
