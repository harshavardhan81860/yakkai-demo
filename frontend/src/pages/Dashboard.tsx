import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Grid, Card, Typography, LinearProgress, Avatar, Stack,
  IconButton, Button, useTheme, Paper
} from "@mui/material";
import {
  People, Business, TrendingUp, TrendingDown, MoreVert,
  Security, CloudCircle, AutoGraph, Bolt
} from "@mui/icons-material";
import { useAuth } from "../auth/AuthProvider";
import {
  fetchUserHeader,
  fetchTenantHeader,
} from "../services/dashboardService";

type Stats = {
  total: number | "N/A";
  active: number | "N/A";
  inactive: number | "N/A";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const theme = useTheme();

  const [users, setUsers] = useState<Stats>({ total: "N/A", active: "N/A", inactive: "N/A" });
  const [tenants, setTenants] = useState<Stats>({ total: "N/A", active: "N/A", inactive: "N/A" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState !== "ACTIVE") return;

    setLoading(true);
    Promise.all([
      fetchUserHeader().then(h => setUsers({
        total: h?.total_users ?? "N/A",
        active: h?.active_users ?? "N/A",
        inactive: h?.inactive_users ?? "N/A",
      })),
      fetchTenantHeader().then(h => setTenants({
        total: h?.total_tenants ?? "N/A",
        active: h?.active_tenants ?? "N/A",
        inactive: h?.inactive_tenants ?? "N/A",
      }))
    ]).finally(() => setLoading(false));
  }, [authState]);

  const MetricCard = ({ title, stats, icon, color, onClick, description }: any) => (
    <Card
      onClick={onClick}
      sx={{
        p: 3, cursor: 'pointer', height: '100%',
        position: 'relative', overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { transform: 'translateY(-8px)', boxShadow: `0 12px 30px ${color}22` },
        '&::before': {
          content: '""', position: 'absolute', top: -50, right: -50,
          width: 150, height: 150, borderRadius: '50%',
          background: color, opacity: 0.05
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 48, height: 48 }}>
          {icon}
        </Avatar>
        <IconButton size="small"><MoreVert fontSize="small" /></IconButton>
      </Box>

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 1.5 }}>
        {title}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 1 }}>
        <Typography variant="h3" sx={{ fontWeight: 800 }}>{stats.total}</Typography>
        <Typography variant="caption" color="text.secondary">Entity Count</Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{description}</Typography>

      <Stack direction="row" spacing={3} sx={{ mt: 'auto' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUp sx={{ fontSize: '0.9rem' }} /> {stats.active}
          </Typography>
          <Typography variant="caption" color="text.secondary">Active</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ opacity: 0.1 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#F43F5E', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingDown sx={{ fontSize: '0.9rem' }} /> {stats.inactive}
          </Typography>
          <Typography variant="caption" color="text.secondary">Suspended</Typography>
        </Box>
      </Stack>
    </Card>
  );

  const Divider = ({ orientation, flexItem, sx }: any) => <Box sx={{ width: orientation === 'vertical' ? 1 : 'auto', height: orientation === 'vertical' ? 'auto' : 1, bgcolor: 'divider', ...sx }} />;

  if (authState !== "ACTIVE") return null;

  return (
    <Box>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, background: 'linear-gradient(90deg, #fff 0%, #aaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Unified Operations Command
        </Typography>
        <Typography variant="body1" color="text.secondary">Comprehensive platform overview and orchestration status</Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 4, borderRadius: 2 }} />}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Identity Management"
            stats={users}
            icon={<People />}
            color="#6C63FF"
            onClick={() => navigate("/users")}
            description="Global user accounts, administrative privileges, and regional identity mappings across the platform."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Tenant Architecture"
            stats={tenants}
            icon={<Business />}
            color="#00D9FF"
            onClick={() => navigate("/tenants")}
            description="Customer organizations, multi-tenant boundaries, and shared resource isolation management."
          />
        </Grid>

        {/* Auxiliary Cards */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.01)' }}>
            <Avatar sx={{ bgcolor: 'rgba(255,165,0,0.1)', color: 'orange' }}><Security /></Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Security Compliance</Typography>
              <Typography variant="caption" color="text.secondary">98.2% Enforcement Level</Typography>
            </Box>
            <Bolt sx={{ ml: 'auto', color: '#FFD700', opacity: 0.5 }} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.01)' }}>
            <Avatar sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10B981' }}><CloudCircle /></Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Infrastructure Health</Typography>
              <Typography variant="caption" color="text.secondary">All Regions Operational</Typography>
            </Box>
            <AutoGraph sx={{ ml: 'auto', color: '#10B981', opacity: 0.5 }} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{
              height: '100%', borderRadius: 4, textTransform: 'none',
              background: 'linear-gradient(135deg, #2D266F 0%, #1A1643 100%)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              fontSize: '1.1rem', fontWeight: 700
            }}
          >
            Launch System Audit
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
