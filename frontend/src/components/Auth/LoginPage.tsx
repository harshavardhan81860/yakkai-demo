import React, { useState } from 'react';
import { Box, Card, TextField, Button, Typography, Alert, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff, Cloud } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const demoAccounts = [
        { label: 'Admin', email: 'admin@cloudplatform.io', password: 'admin123', color: '#6C63FF' },
        { label: 'Manager', email: 'manager@cloudplatform.io', password: 'manager123', color: '#00D9FF' },
        { label: 'User', email: 'user@cloudplatform.io', password: 'user123', color: '#10B981' },
    ];

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,217,255,0.1) 0%, transparent 50%), #0A0E1A',
        }}>
            {/* Animated background elements */}
            <Box sx={{ position: 'absolute', top: '10%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(108,99,255,0.05)', filter: 'blur(80px)', animation: 'float 6s ease-in-out infinite' }} />
            <Box sx={{ position: 'absolute', bottom: '10%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(0,217,255,0.05)', filter: 'blur(100px)', animation: 'float 8s ease-in-out infinite reverse' }} />

            <Card sx={{ p: 5, width: 440, position: 'relative', zIndex: 1, background: 'linear-gradient(145deg, rgba(17,24,39,0.95) 0%, rgba(15,22,41,0.9) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '16px', background: 'linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(0,217,255,0.2) 100%)', mb: 2 }}>
                        <Cloud sx={{ fontSize: 40, color: '#6C63FF' }} />
                    </Box>
                    <Typography variant="h4" sx={{ background: 'linear-gradient(135deg, #6C63FF, #00D9FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
                        YakkAI
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Multi-Cloud Infrastructure Platform</Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                <form onSubmit={handleLogin}>
                    <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} autoFocus />
                    <TextField fullWidth label="Password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small"><Box sx={{ color: '#9CA3AF' }}>{showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</Box></IconButton>
                                </InputAdornment>
                            )
                        }} />
                    <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
                        sx={{ py: 1.5, fontSize: '1rem', background: 'linear-gradient(135deg, #6C63FF, #4A42D4)', '&:hover': { background: 'linear-gradient(135deg, #7C73FF, #5A52E4)' } }}>
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                    </Button>
                </form>

                <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, textAlign: 'center' }}>Quick Demo Access</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {demoAccounts.map((d) => (
                            <Button key={d.label} size="small" variant="outlined" fullWidth
                                sx={{ borderColor: d.color + '40', color: d.color, fontSize: '0.75rem', '&:hover': { borderColor: d.color, bgcolor: d.color + '10' } }}
                                onClick={() => { setEmail(d.email); setPassword(d.password); }}>
                                {d.label}
                            </Button>
                        ))}
                    </Box>
                </Box>
            </Card>

            <style>{`@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }`}</style>
        </Box>
    );
};

export default LoginPage;
