import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Avatar, Stack, Chip, Paper, Grid, CircularProgress } from '@mui/material';
import Breadcrumbs from '../components/Common/Breadcrumbs';
import { Cloud, BarChart, Storage, TrendingUp, TrendingDown, Assignment, CheckCircle, Category } from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';

import api from '../services/api';
import { fetchApprovalTemplates } from '../services/approvalTemplatesService';
import { fetchApprovalRequests } from '../services/approvalRequestsService';
import { fetchPendingApprovals } from '../services/pendingApprovalsService';

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
        sx={(theme) => ({
            p: 3,
            cursor: onClick ? "pointer" : "default",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",

            bgcolor:
                theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.01)"
                    : "#ffffff",

            border:
                theme.palette.mode === "dark"
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "1px solid rgba(0,0,0,0.08)",

            "&:hover": onClick
                ? {
                    transform: "translateY(-4px)",
                    borderColor: `${color}33`,
                    boxShadow:
                        theme.palette.mode === "dark"
                            ? `0 12px 30px ${color}20`
                            : `0 8px 22px ${color}25`,
                }
                : {},

            "&::before": {
                content: '""',
                position: "absolute",
                top: -50,
                right: -50,
                width: 150,
                height: 150,
                borderRadius: "50%",
                background: color,
                opacity: theme.palette.mode === "dark" ? 0.04 : 0.08,
            },
        })}
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


const TenantDashboard = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { activeTenant, viewMode } = useRole();
    const tenantName = activeTenant?.tenant_name || (location.state as any)?.tenantName || "Tenant";

    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        if (!tenantId) return;
        const fetchStats = async () => {
            setStatsLoading(true);
            try {
                const [templatesData, requestsRes, pendingRes] = await Promise.allSettled([
                    fetchApprovalTemplates(),
                    fetchApprovalRequests({ use_current_user: viewMode === 'tenant' }),
                    fetchPendingApprovals({ use_current_user: viewMode === 'tenant' }),
                ]);

                const templates = templatesData.status === 'fulfilled' ? templatesData.value : [];
                const allRequests = requestsRes.status === 'fulfilled' ? (Array.isArray(requestsRes.value?.data) ? requestsRes.value.data : []) : [];
                const allPending = pendingRes.status === 'fulfilled' ? (Array.isArray(pendingRes.value?.data) ? pendingRes.value.data : []) : [];

                const tmplTenantMap: Record<string, string | null> = {};
                templates.forEach((t: any) => { tmplTenantMap[t.id] = t.tenant_id || null; });

                const tenantTemplates = templates.filter((t: any) => t.tenant_id === tenantId);
                const tenantRequests = allRequests.filter((r: any) => tmplTenantMap[r.template_id] === tenantId);
                const tenantPending = allPending.filter((a: any) => tmplTenantMap[a.template_id] === tenantId);
                const openRequests = tenantRequests.filter((r: any) => r.status === 'PENDING').length;
                const closedRequests = tenantRequests.filter((r: any) => r.status !== 'PENDING').length;

                setStats({
                    templates: { total: tenantTemplates.filter((t: any) => t.is_active).length },
                    requests: { total: tenantRequests.length, open: openRequests, closed: closedRequests },
                    pending: { total: tenantPending.length },
                });
            } catch {
                setStats(null);
            } finally {
                setStatsLoading(false);
            }
        };

        fetchStats();
    }, [tenantId, viewMode]);

    const tiles = [
        {
            title: 'Cloud Accounts',
            description: 'Manage AWS and Azure account connections',
            icon: <Cloud sx={{ fontSize: 40 }} />,
            path: `/tenants/${tenantId}/cloud-accounts`,
            color: '#3B82F6',
            bg: 'rgba(59, 130, 246, 0.1)'
        },
        {
            title: 'Cost Analytics',
            description: 'Unified financial visibility and FinOps tracking',
            icon: <BarChart sx={{ fontSize: 40 }} />,
            path: `/tenants/${tenantId}/finops`,
            color: '#10B981',
            bg: 'rgba(16, 185, 129, 0.1)'
        },
        {
            title: 'Resource Explorer',
            description: 'Global unified inventory across all accounts',
            icon: <Storage sx={{ fontSize: 40 }} />,
            path: `/tenants/${tenantId}/resources`,
            color: '#6C63FF',
            bg: 'rgba(108, 99, 255, 0.1)'
        }
    ];

    return (
        <Box sx={{ p: 3, pb: 6, maxWidth: 1200, margin: '0 auto' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Box sx={{ mb: 2 }}>
                        <Breadcrumbs
                            items={[
                                { label: "Infrastructure", path: "/tenants" },
                                { label: "Workspace" }
                            ]}
                        />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Workspace
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Select an area to manage for this tenant</Typography>
                </Box>

                {/* Tenant Context Box */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 1.5,
                        px: 2,
                        display: "flex",
                        gap: 3,
                        bgcolor: "action.hover",
                        borderColor: "divider",
                    }}
                >                    <Box>
                        <Typography variant="caption" display="block" color="text.secondary">Tenant Name</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F59E0B' }}>{tenantName}</Typography>
                    </Box>
                </Paper>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 5 }}>
                {tiles.map((tile, idx) => (
                    <Box key={idx} sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: 280 }}>
                        <Card
                            onClick={() => navigate(tile.path, { state: { tenantName } })}
                            sx={(theme) => ({
                                p: 4,
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "all 0.2s ease",

                                border:
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(255,255,255,0.05)"
                                        : "1px solid rgba(0,0,0,0.08)",

                                bgcolor:
                                    theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.02)"
                                        : "#ffffff",

                                "&:hover": {
                                    borderColor: tile.color,
                                    transform: "translateY(-4px)",

                                    bgcolor:
                                        theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.04)"
                                            : "rgba(0,0,0,0.02)",

                                    boxShadow:
                                        theme.palette.mode === "dark"
                                            ? `0 8px 24px ${tile.bg}`
                                            : `0 6px 18px ${tile.bg}`,
                                },
                            })}
                        >
                            <Avatar sx={{ width: 80, height: 80, mb: 3, bgcolor: tile.bg, color: tile.color }}>
                                {tile.icon}
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{tile.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{tile.description}</Typography>
                        </Card>
                    </Box>
                ))}
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary' }}>Tenant Statistics</Typography>

            {statsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <StatCard
                            title="Workflow Templates"
                            total={stats?.templates?.total ?? '—'}
                            subtitle="Assigned to this tenant"
                            icon={<Category />}
                            color="#8B5CF6"
                            onClick={() => navigate('/approvals-management/templates')}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <StatCard
                            title="My Requests"
                            total={stats?.requests?.total ?? '—'}
                            icon={<Assignment />}
                            color="#F59E0B"
                            detail1={{ label: 'Open', value: stats?.requests?.open ?? '—' }}
                            detail2={{ label: 'Closed', value: stats?.requests?.closed ?? '—' }}
                            onClick={() => navigate('/approvals/requests')}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
            )}
        </Box>
    );
};

export default TenantDashboard;
