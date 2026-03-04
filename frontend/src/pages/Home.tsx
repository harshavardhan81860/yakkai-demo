import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useRole } from "../contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Grid, Card, Avatar, Stack,
  Container, Chip, CircularProgress, LinearProgress
} from "@mui/material";
import {
  Business, Gavel, People, ArrowForward,
  AdminPanelSettings, Hub, CheckCircle,
  TrendingUp, TrendingDown, Assignment, CloudCircle,
  RocketLaunch, Category, Inventory
} from "@mui/icons-material";
import api from "../services/api";
import { fetchApprovalTemplates } from "../services/approvalTemplatesService";
import { fetchApprovalRequests } from "../services/approvalRequestsService";
import { fetchPendingApprovals } from "../services/pendingApprovalsService";

/* ────────────────────────────────────────────
   Dashboard Stat Card
   ──────────────────────────────────────────── */
interface StatCardProps {
  title: string;
  total: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  detail1?: { label: string; value: number | string; color?: string };
  detail2?: { label: string; value: number | string; color?: string };
  onClick?: () => void;
}

const StatCard = ({ title, total, subtitle, icon, color, detail1, detail2, onClick }: StatCardProps) => (
  <Card
    onClick={onClick}
    sx={{
      p: 3, cursor: onClick ? 'pointer' : 'default', height: '100%',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      bgcolor: 'rgba(255,255,255,0.01)',
      border: '1px solid rgba(255,255,255,0.05)',
      '&:hover': onClick ? { transform: 'translateY(-4px)', boxShadow: `0 12px 30px ${color}15`, borderColor: `${color}33` } : {},
      '&::before': {
        content: '""', position: 'absolute', top: -50, right: -50,
        width: 150, height: 150, borderRadius: '50%',
        background: color, opacity: 0.04
      }
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
      <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 48, height: 48 }}>
        {icon}
      </Avatar>
    </Box>
    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 1.5, fontSize: '0.65rem' }}>
      {title}
    </Typography>
    <Typography variant="h3" sx={{ fontWeight: 800, my: 0.5 }}>{total}</Typography>
    {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>}
    {(detail1 || detail2) && (
      <Stack direction="row" spacing={3} sx={{ mt: 'auto' }}>
        {detail1 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: detail1.color || '#10B981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TrendingUp sx={{ fontSize: '0.9rem' }} /> {detail1.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">{detail1.label}</Typography>
          </Box>
        )}
        {detail2 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: detail2.color || '#F43F5E', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TrendingDown sx={{ fontSize: '0.9rem' }} /> {detail2.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">{detail2.label}</Typography>
          </Box>
        )}
      </Stack>
    )}
  </Card>
);

/* ────────────────────────────────────────────
   Quick Link Card
   ──────────────────────────────────────────── */
const QuickCard = ({ title, desc, icon, path, color, navigate }: any) => (
  <Card
    onClick={() => navigate(path)}
    sx={{
      p: 3, height: '100%', cursor: 'pointer',
      bgcolor: 'rgba(255,255,255,0.01)',
      border: '1px solid rgba(255,255,255,0.05)',
      transition: 'all 0.2s ease',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)', borderColor: color, transform: 'translateY(-4px)' }
    }}
  >
    <Avatar sx={{ width: 40, height: 40, bgcolor: `${color}15`, color: color, mb: 2 }}>
      {icon}
    </Avatar>
    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>{title}</Typography>
    <Typography variant="body2" color="text.secondary">{desc}</Typography>
  </Card>
);

/* ────────────────────────────────────────────
   Home Component
   ──────────────────────────────────────────── */
const Home = () => {
  const { user } = useAuth();
  const {
    viewMode, systemRole, tenantRoles, activeTenant,
    hasDualAccess, switchToSystem, switchToTenant,
    isAdmin, isManager, loading
  } = useRole();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fullName = user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username;

  // Fetch dashboard stats based on view mode
  useEffect(() => {
    if (viewMode === 'landing' || loading) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        // Common data fetches
        const [usersRes, tenantsRes, templatesData, requestsRes, pendingRes] = await Promise.allSettled([
          api.get('api/v1/users/'),
          api.get('api/v1/tenants/'),
          fetchApprovalTemplates(),
          fetchApprovalRequests({ use_current_user: viewMode === 'tenant' }),
          fetchPendingApprovals({ use_current_user: viewMode === 'tenant' }),
        ]);

        const userData = usersRes.status === 'fulfilled' ? usersRes.value.data?.data?.header : null;
        const tenantData = tenantsRes.status === 'fulfilled' ? tenantsRes.value.data?.data : null;
        const tenantList = tenantData?.tenants || [];
        const templates = templatesData.status === 'fulfilled' ? templatesData.value : [];
        const allRequests = requestsRes.status === 'fulfilled'
          ? (Array.isArray(requestsRes.value?.data) ? requestsRes.value.data : [])
          : [];
        const allPending = pendingRes.status === 'fulfilled'
          ? (Array.isArray(pendingRes.value?.data) ? pendingRes.value.data : [])
          : [];

        // Build template → tenant mapping
        const tmplTenantMap: Record<string, string | null> = {};
        templates.forEach((t: any) => { tmplTenantMap[t.id] = t.tenant_id || null; });

        if (viewMode === 'system') {
          // System view: show all data unfiltered
          const openRequests = allRequests.filter((r: any) => r.status === 'PENDING').length;
          const closedRequests = allRequests.filter((r: any) => r.status !== 'PENDING').length;

          setStats({
            users: { total: userData?.total_users ?? '—', active: userData?.active_users ?? '—', inactive: userData?.inactive_users ?? '—' },
            tenants: { total: tenantList.length || '—', active: tenantList.filter((t: any) => t.is_active).length, inactive: tenantList.filter((t: any) => !t.is_active).length },
            templates: { total: templates.filter((t: any) => t.is_active).length },
            requests: { total: allRequests.length, open: openRequests, closed: closedRequests },
            pending: { total: allPending.length },
          });
        }
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [viewMode, loading, activeTenant]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress sx={{ color: '#6C63FF' }} />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Loading your workspace…
        </Typography>
      </Container>
    );
  }

  /* ──────────────────────────────────────────
     Landing Mode: Chooser
     ────────────────────────────────────────── */
  if (viewMode === "landing") {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Stack spacing={2} sx={{ mb: 8, textAlign: 'center', alignItems: 'center' }}>
          <Typography variant="h1" sx={{
            fontWeight: 900, letterSpacing: -3, lineHeight: 1,
            background: 'linear-gradient(135deg, #fff 0%, #6C63FF 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1
          }}>
            YakkAI
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -1, color: '#f3f4f6', opacity: 0.9 }}>
            Multi-Cloud Infrastructure Platform
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 660, lineHeight: 1.6, mt: 2 }}>
            Welcome, <Box component="span" sx={{ color: '#6C63FF', fontWeight: 700 }}>{fullName}</Box>.
            Select how you'd like to access the platform.
          </Typography>
        </Stack>

        <Grid container spacing={4} justifyContent="center">
          {/* System View Card */}
          {systemRole && (
            <Grid size={{ xs: 12, md: 5 }}>
              <Card
                onClick={() => { switchToSystem(); navigate('/'); }}
                sx={{
                  p: 5, cursor: 'pointer', textAlign: 'center',
                  bgcolor: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(108,99,255,0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(108,99,255,0.05)', borderColor: '#6C63FF',
                    transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(108,99,255,0.15)',
                  }
                }}
              >
                <Avatar sx={{
                  width: 72, height: 72, mx: 'auto', mb: 3,
                  bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF'
                }}>
                  <AdminPanelSettings sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>System View</Typography>
                <Chip
                  label={systemRole.replace('system_', '').replace(/^\w/, c => c.toUpperCase())}
                  size="small"
                  sx={{
                    mb: 2, fontWeight: 800,
                    bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF',
                    border: '1px solid rgba(108,99,255,0.3)'
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Manage the entire platform — all tenants, users, governance, and approvals.
                </Typography>
              </Card>
            </Grid>
          )}

          {/* Tenant Cards */}
          {tenantRoles.map((tr) => (
            <Grid size={{ xs: 12, md: systemRole ? 5 : 4 }} key={tr.tenant_id}>
              <Card
                onClick={() => { switchToTenant(tr.tenant_id); navigate(`/tenants/${tr.tenant_id}/dashboard`); }}
                sx={{
                  p: 5, cursor: 'pointer', textAlign: 'center',
                  bgcolor: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(59,130,246,0.05)', borderColor: '#3B82F6',
                    transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(59,130,246,0.15)',
                  }
                }}
              >
                <Avatar sx={{
                  width: 72, height: 72, mx: 'auto', mb: 3,
                  bgcolor: 'rgba(59,130,246,0.15)', color: '#3B82F6'
                }}>
                  <Business sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>{tr.tenant_name}</Typography>
                <Chip
                  label={tr.role.replace('tenant_', '').replace(/^\w/, c => c.toUpperCase())}
                  size="small"
                  sx={{
                    mb: 2, fontWeight: 800,
                    bgcolor: 'rgba(59,130,246,0.15)', color: '#3B82F6',
                    border: '1px solid rgba(59,130,246,0.3)'
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Manage cloud accounts, users, and resources for this tenant.
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  /* ──────────────────────────────────────────
     SYSTEM Home Dashboard
     ────────────────────────────────────────── */
  if (viewMode === "system") {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Hero */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="h4" sx={{
            fontWeight: 800, mb: 1,
            background: 'linear-gradient(90deg, #fff 0%, #6C63FF 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            System Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, <strong>{fullName}</strong>. Platform overview across all tenants.
          </Typography>
        </Box>

        {statsLoading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

        {/* Stats Row */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Users"
              total={stats?.users?.total ?? '—'}
              icon={<People />}
              color="#6C63FF"
              detail1={{ label: 'Active', value: stats?.users?.active ?? '—' }}
              detail2={{ label: 'Inactive', value: stats?.users?.inactive ?? '—' }}
              onClick={() => navigate('/users')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Tenants"
              total={stats?.tenants?.total ?? '—'}
              icon={<Business />}
              color="#3B82F6"
              detail1={{ label: 'Active', value: stats?.tenants?.active ?? '—' }}
              detail2={{ label: 'Inactive', value: stats?.tenants?.inactive ?? '—' }}
              onClick={() => navigate('/tenants')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Approval Requests"
              total={stats?.requests?.total ?? '—'}
              icon={<Assignment />}
              color="#F59E0B"
              detail1={{ label: 'Open', value: stats?.requests?.open ?? '—' }}
              detail2={{ label: 'Closed', value: stats?.requests?.closed ?? '—' }}
              onClick={() => navigate('/approvals/requests')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending Approvals"
              total={stats?.pending?.total ?? '—'}
              subtitle="Actions required"
              icon={<CheckCircle />}
              color="#10B981"
              onClick={() => navigate('/approvals/pending')}
            />
          </Grid>
        </Grid>

        {/* Second Stats Row */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Workflow Templates"
              total={stats?.templates?.total ?? '—'}
              subtitle="Active templates"
              icon={<Category />}
              color="#8B5CF6"
              onClick={() => navigate('/approvals-management/templates')}
            />
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary' }}>Quick Actions</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <QuickCard title="Infrastructure" desc="Manage tenants and cloud accounts." icon={<Business />} path="/tenants" color="#6C63FF" navigate={navigate} />
          </Grid>
          {(isAdmin || isManager) && (
            <Grid size={{ xs: 12, md: 4 }}>
              <QuickCard title="Governance" desc="Policies and security guardrails." icon={<Gavel />} path="/permissions-management/policy_list" color="#10B981" navigate={navigate} />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 4 }}>
            <QuickCard title="All Requests" desc="View resource requests across all tenants." icon={<Inventory />} path="/resource-request/list" color="#F59E0B" navigate={navigate} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  /* ──────────────────────────────────────────
     TENANT Redirect Fallback
     ────────────────────────────────────────── */
  if (viewMode === "tenant" && activeTenant) {
    navigate(`/tenants/${activeTenant.tenant_id}/dashboard`, { replace: true });
    return null;
  }

  return null;
};

export default Home;
