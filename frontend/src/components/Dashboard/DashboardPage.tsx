import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip, Avatar, LinearProgress, IconButton, Tooltip, Button } from '@mui/material';
import { TrendingUp, CloudQueue, Storage, People, Assignment, CheckCircle, Speed, ArrowForward, Refresh } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip as RTooltip, Legend, Area, AreaChart } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { DashboardStats } from '../../types';
import { getProviderColor, getProviderIcon, getStatusLabel, STATUS_COLORS, CLOUD_PROVIDERS } from '../../data/cloudProviders';

const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const role = user?.role?.name || 'user';

    useEffect(() => {
        api.get('/api/statistics/dashboard').then((res) => {
            setStats(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading || !stats) return <Box sx={{ p: 3 }}><LinearProgress /></Box>;

    const providerPieData = Object.entries(stats.providers_breakdown).map(([key, val]) => ({
        name: CLOUD_PROVIDERS[key]?.name || key, value: val.resources, color: getProviderColor(key),
    })).filter(d => d.value > 0);

    const categoryData = Object.entries(stats.category_breakdown).map(([key, val]) => ({ name: key, count: val }));

    const statCards = role === 'admin' ? [
        { label: 'Total Users', value: stats.total_users, icon: <People />, color: '#6C63FF', gradient: 'linear-gradient(135deg,rgba(108,99,255,0.15),rgba(108,99,255,0.05))' },
        { label: 'Cloud Accounts', value: stats.total_accounts, icon: <CloudQueue />, color: '#00D9FF', gradient: 'linear-gradient(135deg,rgba(0,217,255,0.15),rgba(0,217,255,0.05))' },
        { label: 'Active Resources', value: stats.active_resources, icon: <Storage />, color: '#10B981', gradient: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))' },
        { label: 'Monthly Spend', value: `$${stats.total_monthly_cost.toLocaleString()}`, icon: <Speed />, color: '#F59E0B', gradient: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))' },
    ] : role === 'manager' ? [
        { label: 'Pending Approvals', value: stats.pending_approvals, icon: <CheckCircle />, color: '#FF9800', gradient: 'linear-gradient(135deg,rgba(255,152,0,0.15),rgba(255,152,0,0.05))' },
        { label: 'Total Requests', value: stats.total_requests, icon: <Assignment />, color: '#6C63FF', gradient: 'linear-gradient(135deg,rgba(108,99,255,0.15),rgba(108,99,255,0.05))' },
        { label: 'Active Resources', value: stats.active_resources, icon: <Storage />, color: '#10B981', gradient: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))' },
        { label: 'Monthly Spend', value: `$${stats.total_monthly_cost.toLocaleString()}`, icon: <Speed />, color: '#F59E0B', gradient: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))' },
    ] : [
        { label: 'My Requests', value: stats.total_requests, icon: <Assignment />, color: '#6C63FF', gradient: 'linear-gradient(135deg,rgba(108,99,255,0.15),rgba(108,99,255,0.05))' },
        { label: 'Active Resources', value: stats.active_resources, icon: <Storage />, color: '#10B981', gradient: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))' },
        { label: 'Pending', value: stats.pending_approvals, icon: <CheckCircle />, color: '#FF9800', gradient: 'linear-gradient(135deg,rgba(255,152,0,0.15),rgba(255,152,0,0.05))' },
        { label: 'Monthly Cost', value: `$${stats.total_monthly_cost.toLocaleString()}`, icon: <Speed />, color: '#F59E0B', gradient: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))' },
    ];

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Welcome back, <span style={{ background: 'linear-gradient(135deg,#6C63FF,#00D9FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.name?.split(' ')[0]}</span>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Here's your multi-cloud infrastructure overview
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" startIcon={<CloudQueue />} onClick={() => navigate('/requests/new')}
                        sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
                        New Request
                    </Button>
                </Box>
            </Box>

            {/* Stat Cards */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {statCards.map((card, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Card sx={{ background: card.gradient, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Avatar sx={{ bgcolor: card.color + '20', color: card.color, width: 48, height: 48 }}>{card.icon}</Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{card.label}</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>{card.value}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={2.5}>
                {/* Cloud Provider Overview */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">Cloud Provider Overview</Typography>
                            <Chip label={`${Object.keys(stats.providers_breakdown).length} Providers`} size="small" sx={{ bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF' }} />
                        </Box>
                        <Grid container spacing={2}>
                            {Object.entries(stats.providers_breakdown).map(([key, val]) => (
                                <Grid item xs={12} sm={6} lg={4} key={key}>
                                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', '&:hover': { border: `1px solid ${getProviderColor(key)}40`, background: `${getProviderColor(key)}08` }, transition: 'all 0.2s' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                            <Box sx={{ fontSize: '1.4rem' }}>{getProviderIcon(key)}</Box>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{val.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{val.accounts} account{val.accounts !== 1 ? 's' : ''}</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">Resources</Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: getProviderColor(key) }}>{val.resources}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="caption" color="text.secondary">Monthly Cost</Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#10B981' }}>${val.monthly_cost?.toLocaleString()}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Card>
                </Grid>

                {/* Resource Distribution Pie */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Resource Distribution</Typography>
                        {providerPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={providerPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                        {providerPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>No resources provisioned</Typography>}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                            {providerPieData.map((d, i) => (
                                <Chip key={i} label={`${d.name.split(' ')[0]} (${d.value})`} size="small" sx={{ bgcolor: d.color + '20', color: d.color, fontSize: '0.7rem' }} />
                            ))}
                        </Box>
                    </Card>
                </Grid>

                {/* Cost Trend Chart */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Cost Trend (6 Months)</Typography>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={stats.cost_trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                                <Area type="monotone" dataKey="aws" stackId="1" fill="#FF990030" stroke="#FF9900" name="AWS" />
                                <Area type="monotone" dataKey="azure" stackId="1" fill="#0078D430" stroke="#0078D4" name="Azure" />
                                <Area type="monotone" dataKey="gcp" stackId="1" fill="#4285F430" stroke="#4285F4" name="GCP" />
                                <Area type="monotone" dataKey="oci" stackId="1" fill="#F8000030" stroke="#F80000" name="OCI" />
                                <Area type="monotone" dataKey="vmware" stackId="1" fill="#71707430" stroke="#717074" name="VMware" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                {/* Recent Requests */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Recent Requests</Typography>
                            <IconButton size="small" onClick={() => navigate('/requests')} sx={{ color: '#6C63FF' }}><ArrowForward fontSize="small" /></IconButton>
                        </Box>
                        {stats.recent_requests.map((r: any, i: number) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, mb: 1, border: '1px solid rgba(255,255,255,0.04)', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                <Box sx={{ fontSize: '1.2rem' }}>{getProviderIcon(r.provider_type)}</Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{r.resource_type}</Typography>
                                    <Typography variant="caption" color="text.secondary">{r.user_name || 'Unknown'}</Typography>
                                </Box>
                                <Chip label={getStatusLabel(r.status)} size="small" sx={{ bgcolor: (STATUS_COLORS[r.status] || '#666') + '20', color: STATUS_COLORS[r.status] || '#666', fontSize: '0.65rem', height: 22 }} />
                            </Box>
                        ))}
                    </Card>
                </Grid>

                {/* Request Status Breakdown */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Request Status</Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={Object.entries(stats.status_breakdown).map(([k, v]) => ({ name: getStatusLabel(k), value: v, fill: STATUS_COLORS[k] || '#666' }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {Object.entries(stats.status_breakdown).map(([k], i) => <Cell key={i} fill={STATUS_COLORS[k] || '#666'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                {/* Category Breakdown */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Resources by Category</Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={categoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#9CA3AF', fontSize: 12, textTransform: 'capitalize' }} />
                                <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                                <Bar dataKey="count" fill="#6C63FF" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DashboardPage;
