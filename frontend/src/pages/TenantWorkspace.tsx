import { useParams, useNavigate } from "react-router-dom";
import {
    Box, Typography, Grid, Card, Avatar, Button, Stack, Breadcrumbs as MuiBreadcrumbs,
    Link, Paper
} from "@mui/material";
import {
    CloudCircle, Dashboard, Payments, People, GroupWork, Security,
    ArrowBack, ChevronRight, Business
} from "@mui/icons-material";

const TenantWorkspace = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();

    const tiles = [
        {
            title: "Cloud Accounts",
            subtitle: "Manage cloud resource boundaries and connections",
            icon: <CloudCircle sx={{ fontSize: 32 }} />,
            path: `/tenants/${tenantId}/cloud-accounts`,
            color: "#6C63FF",
            active: true
        },
        {
            title: "Dashboards",
            subtitle: "Visual operational insights and health metrics",
            icon: <Dashboard sx={{ fontSize: 32 }} />,
            path: "#",
            color: "#10B981",
            active: false
        },
        {
            title: "Cost Analytics",
            subtitle: "Budget tracking and cost optimization summaries",
            icon: <Payments sx={{ fontSize: 32 }} />,
            path: "/costs",
            color: "#F59E0B",
            active: true
        },
        {
            title: "Tenant Users",
            subtitle: "Access control for tenant-specific members",
            icon: <People sx={{ fontSize: 32 }} />,
            path: "/users",
            color: "#3B82F6",
            active: true
        },
        {
            title: "Resource Groups",
            subtitle: "Logical grouping of infrastructure components",
            icon: <GroupWork sx={{ fontSize: 32 }} />,
            path: "/groups",
            color: "#EC4899",
            active: true
        },
        {
            title: "RBAC Roles",
            subtitle: "Define permissions and governance policies",
            icon: <Security sx={{ fontSize: 32 }} />,
            path: "/roles",
            color: "#8B5CF6",
            active: true
        }
    ];

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <MuiBreadcrumbs separator={<ChevronRight fontSize="small" sx={{ color: 'text.disabled' }} />}>
                            <Link underline="hover" color="inherit" onClick={() => navigate('/tenants')} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}>
                                <Business sx={{ fontSize: 16 }} /> Infrastructure
                            </Link>
                            <Typography color="text.primary" sx={{ fontSize: '0.875rem', fontWeight: 700 }}>Workspace</Typography>
                        </MuiBreadcrumbs>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Workspace Studio</Typography>
                    <Typography variant="body2" color="text.secondary">Orchestrate resources and governance for your organizational unit</Typography>
                </Box>
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate("/tenants")} sx={{ borderRadius: 2 }}>
                    Back to Tenants
                </Button>
            </Box>

            <Grid container spacing={3}>
                {tiles.map((tile, i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Card
                            sx={{
                                p: 3,
                                borderRadius: 6,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                bgcolor: 'rgba(255,255,255,0.01)',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: tile.active ? 'pointer' : 'default',
                                opacity: tile.active ? 1 : 0.6,
                                '&:hover': tile.active ? {
                                    transform: 'translateY(-8px)',
                                    borderColor: `${tile.color}66`,
                                    bgcolor: `${tile.color}05`,
                                    boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 20px ${tile.color}15`,
                                    '& .tile-icon': {
                                        transform: 'scale(1.1) rotate(-5deg)',
                                        boxShadow: `0 0 20px ${tile.color}44`
                                    }
                                } : {}
                            }}
                            onClick={() => tile.active && navigate(tile.path)}
                        >
                            <Avatar
                                className="tile-icon"
                                sx={{
                                    width: 64, height: 64, mb: 3,
                                    bgcolor: `${tile.color}15`,
                                    color: tile.color,
                                    transition: 'all 0.3s ease',
                                    border: `1px solid ${tile.color}33`
                                }}
                            >
                                {tile.icon}
                            </Avatar>

                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{tile.title}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 3, lineHeight: 1.6 }}>
                                {tile.subtitle}
                            </Typography>

                            {!tile.active && (
                                <Paper sx={{
                                    position: 'absolute', top: 20, right: 20,
                                    px: 1.5, py: 0.5, borderRadius: 2,
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled' }}>COMING SOON</Typography>
                                </Paper>
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', color: tile.active ? tile.color : 'text.disabled', gap: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1 }}>{tile.active ? 'CONFIGURE' : 'LOCKED'}</Typography>
                                <ChevronRight fontSize="small" />
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default TenantWorkspace;
