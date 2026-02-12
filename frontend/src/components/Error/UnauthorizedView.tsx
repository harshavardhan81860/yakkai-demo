
import React from 'react';
import { Box, Typography, Button, Paper, Grid, Stack, Container } from '@mui/material';
import { useAuth } from '../../auth/AuthProvider';

const UnauthorizedView = () => {
    const { user, authState, logout } = useAuth();

    let message = "Access Denied";
    let subMessage = "Please contact your system administrator for assistance.";

    if (authState === "INACTIVE") {
        message = "Account Inactive";
        subMessage = `The account for ${user?.username || 'user'} is currently disabled. Please contact admin to activate.`;
    } else if (authState === "NOT_FOUND") {
        message = "Identity Not Found";
        subMessage = "Your identity could not be verified in the local system. Please contact admin to register.";
    } else if (authState === "ERROR") {
        message = "Authentication Failure";
        subMessage = "An unexpected error occurred during authentication. Please login again or contact support.";
    }

    return (
        <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
            <Stack spacing={2} sx={{ mb: 6, alignItems: 'center' }}>
                <Typography variant="h1" sx={{
                    fontWeight: 900,
                    letterSpacing: -3,
                    lineHeight: 1,
                    background: 'linear-gradient(135deg, #fff 0%, #6C63FF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1
                }}>
                    YakkAI
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -1, color: '#f3f4f6', opacity: 0.9 }}>
                    Multi-Cloud Infrastructure Platform
                </Typography>
            </Stack>

            <Box sx={{ p: 6, borderRadius: 8, bgcolor: 'rgba(255,59,48,0.05)', border: '1px dashed rgba(255,59,48,0.2)' }}>
                <Typography variant="h2" sx={{ fontWeight: 900, mb: 2, color: '#FF3B30' }}>{message}</Typography>
                <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4 }}>{subMessage}</Typography>

                {(user?.username || user?.email) && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 4, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: user?.email ? 6 : 12 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>IDENTIFIED USERNAME</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{user?.username || 'N/A'}</Typography>
                            </Grid>
                            {user?.email && (
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>REGISTERED EMAIL</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{user?.email || 'N/A'}</Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                )}

                <Button
                    size="large"
                    variant="contained"
                    onClick={() => logout()}
                    sx={{ px: 6, py: 1.5, borderRadius: 2, fontWeight: 700, background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}
                >
                    Clear Session & Logout
                </Button>
            </Box>
        </Container>
    );
};

export default UnauthorizedView;
