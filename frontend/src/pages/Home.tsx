import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Grid, Card, Avatar, Stack,
  Paper, Divider, Container, Chip
} from "@mui/material";
import {
  Business, Hub, Gavel, RocketLaunch, Lan, Terminal, People, ArrowForward
} from "@mui/icons-material";

const Home = () => {
  const { user, authState, logout } = useAuth();
  const navigate = useNavigate();

  const isActive = authState === "ACTIVE";

  const fullName = user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username;


  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Stack spacing={2} sx={{ mb: 10, textAlign: 'center', alignItems: 'center' }}>
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
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 660, lineHeight: 1.6, mt: 2 }}>
          Welcome, <Box component="span" sx={{ color: '#6C63FF', fontWeight: 700 }}>{fullName}</Box>.
          Control your enterprise cloud journey with automated governance and simple self-service provisioning.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button size="large" variant="contained" onClick={() => navigate('/tenants')} sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: 700, background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            View Infrastructure
          </Button>
          <Button size="large" variant="outlined" onClick={() => navigate('/approvals/requests')} sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: 700 }}>
            Approvals
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={4}>
        {/* Core Sectors - Simplified */}
        {[
          {
            title: "Infrastructure",
            desc: "Manage tenants and cloud accounts across providers.",
            icon: <Business />,
            path: "/tenants",
            color: "#6C63FF"
          },
          {
            title: "Governance",
            desc: "Set policies and security guardrails for your cloud.",
            icon: <Gavel />,
            path: "/permissions-management/policy_list",
            color: "#10B981"
          },
          {
            title: "Identity",
            desc: "Manage users, groups and role assignments.",
            icon: <People />,
            path: "/users",
            color: "#00D9FF"
          }
        ].map((sector, i) => (
          <Grid size={{ xs: 12, md: 4 }} key={i}>
            <Card
              onClick={() => navigate(sector.path)}
              sx={{
                p: 4, height: '100%', cursor: 'pointer',
                bgcolor: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.02)',
                  borderColor: sector.color,
                }
              }}
            >
              <Avatar sx={{ width: 48, height: 48, bgcolor: `${sector.color}15`, color: sector.color, mb: 2 }}>
                {sector.icon}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{sector.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {sector.desc}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Home;
