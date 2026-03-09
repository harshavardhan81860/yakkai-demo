import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Typography, Stack, Avatar, Divider,
    IconButton, Tooltip, Box, MenuItem, Select, FormControl,
    InputLabel, Chip
} from '@mui/material';
import {
    Person, Lock, Close, Save
} from '@mui/icons-material';
import { updateUser, resetPassword, type UserRow } from '../../services/usersService';
import { fetchCurrentUser } from '../../services/userMeService';
import { useRole } from '../../contexts/RoleContext';

interface ProfileDialogProps {
    open: boolean;
    onClose: () => void;
    /** If provided, edit this user (admin mode). Otherwise edit logged-in user. */
    targetUser?: UserRow | null;
}

const ProfileDialog = ({ open, onClose, targetUser }: ProfileDialogProps) => {
    const { isAdmin, isManager } = useRole();
    const isEditingSelf = !targetUser;

    const [dbUser, setDbUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        mobile: '',
        department: '',
        gender: '',
    });
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Load user data when dialog opens
    useEffect(() => {
        if (!open) return;
        setResult(null);

        if (targetUser) {
            // Admin editing another user
            setDbUser(targetUser);
            setForm({
                first_name: targetUser.first_name || '',
                last_name: targetUser.last_name || '',
                mobile: targetUser.mobile || '',
                department: targetUser.department || '',
                gender: targetUser.gender || '',
            });
        } else {
            // Self-editing — fetch from /users/me
            setLoading(true);
            fetchCurrentUser().then((res) => {
                if (res.status === 'ACTIVE' && res.user) {
                    setDbUser(res.user);
                    setForm({
                        first_name: res.user.first_name || '',
                        last_name: res.user.last_name || '',
                        mobile: res.user.mobile || '',
                        department: res.user.department || '',
                        gender: res.user.gender || '',
                    });
                }
            }).finally(() => setLoading(false));
        }
    }, [open, targetUser]);

    const userId = dbUser?.id;

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            await updateUser(String(userId), form);
            setResult({ success: true, message: 'Profile updated successfully' });
        } catch (err: any) {
            setResult({
                success: false,
                message: err.response?.data?.message || 'Failed to update profile',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        const email = dbUser?.email;
        if (!email) return;
        try {
            await resetPassword(email);
            setResult({ success: true, message: 'Password reset email sent' });
        } catch (err: any) {
            setResult({
                success: false,
                message: err.response?.data?.message || 'Failed to trigger password reset',
            });
        }
    };

    const canResetPassword = isAdmin || isManager;
    const displayName = dbUser
        ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() || dbUser.username
        : 'User';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{
                backdrop: {
                    sx: { backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)' },
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(108,99,255,0.12)', color: '#6C63FF', width: 36, height: 36 }}>
                        <Person />
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {isEditingSelf ? 'My Profile' : `Edit: ${displayName}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {dbUser?.email || ''}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small"><Close fontSize="small" /></IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent
                sx={(theme) => ({
                    pt: 2,
                    "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                            borderColor:
                                theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.15)"
                                    : "rgba(0,0,0,0.23)"
                        },
                        "&:hover fieldset": {
                            borderColor:
                                theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.35)"
                                    : "rgba(0,0,0,0.45)"
                        },
                        "&.Mui-focused fieldset": {
                            borderColor: theme.palette.primary.main
                        }
                    }
                })}
            >                {loading ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    Loading profile…
                </Typography>
            ) : (
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                        <TextField label="First Name" fullWidth size="small"
                            value={form.first_name}
                            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        />
                        <TextField label="Last Name" fullWidth size="small"
                            value={form.last_name}
                            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        />
                    </Stack>

                    <TextField label="Mobile" fullWidth size="small"
                        value={form.mobile}
                        onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    />

                    <TextField label="Department" fullWidth size="small"
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                    />

                    <FormControl fullWidth size="small">
                        <InputLabel>Gender</InputLabel>
                        <Select value={form.gender} label="Gender"
                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        >
                            <MenuItem value="">Not specified</MenuItem>
                            <MenuItem value="male">Male</MenuItem>
                            <MenuItem value="female">Female</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                        </Select>
                    </FormControl>

                    {result && (
                        <Chip
                            label={result.message}
                            color={result.success ? 'success' : 'error'}
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                </Stack>
            )}
            </DialogContent>

            <Divider />

            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Tooltip title={canResetPassword ? 'Send password reset email' : 'Not available — requires backend integration'}>
                    <span>
                        <Button
                            variant="outlined" color="warning" startIcon={<Lock />}
                            onClick={handleResetPassword}
                            disabled={!canResetPassword}
                            size="small"
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                        >
                            Reset Password
                        </Button>
                    </span>
                </Tooltip>

                <Stack direction="row" spacing={1}>
                    <Button onClick={onClose} size="small" sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button
                        variant="contained" startIcon={<Save />}
                        onClick={handleSave} disabled={saving || loading}
                        size="small"
                        sx={{ textTransform: 'none', borderRadius: 2, background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};

export default ProfileDialog;
