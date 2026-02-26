import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Grid, LinearProgress, Chip, Avatar } from '@mui/material';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Legend, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import api from '../../services/api';
import { getProviderColor, CLOUD_PROVIDERS } from '../../cloudProviders';

const MOCK_PROVIDER_STATS = [
    { type: 'aws', name: 'AWS Cloud', accounts: 3, resource_count: 125, active_count: 110, total_cost: 450.20 },
    { type: 'azure', name: 'Microsoft Azure', accounts: 2, resource_count: 85, active_count: 80, total_cost: 320.50 }
];

const MOCK_DASHBOARD_STATS = {
    cost_trend: [
        { month: 'Sep', aws: 250, azure: 150 },
        { month: 'Oct', aws: 320, azure: 210 },
        { month: 'Nov', aws: 400, azure: 280 },
        { month: 'Dec', aws: 450, azure: 320 }
    ],
    category_breakdown: { 'Compute': 45, 'Storage': 25, 'Database': 15, 'Network': 10, 'Security': 5 },
    status_breakdown: { 'Running': 60, 'Stopped': 25, 'Provisioning': 10, 'Terminated': 5 }
};

const StatisticsPage = ({ accountFilter, providerFilter }: { accountFilter?: string, providerFilter?: string }) => {
    const [stats, setStats] = useState<any>(null);
    const [providerStats, setProviderStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/api/statistics/dashboard').then(r => r.data).catch(() => MOCK_DASHBOARD_STATS),
            api.get('/api/statistics/providers').then(r => r.data?.length ? r.data : MOCK_PROVIDER_STATS).catch(() => MOCK_PROVIDER_STATS),
        ]).then(([dashData, provData]) => {
            setStats(dashData);
            setProviderStats(provData);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <LinearProgress />;

    let filteredProviderStats = accountFilter
        ? providerStats.filter(p => p.name.includes(accountFilter) || accountFilter.includes(p.name))
        : providerStats;

    if (providerFilter && providerFilter !== "ALL") {
        filteredProviderStats = filteredProviderStats.filter(p => p.type.toLowerCase() === providerFilter.toLowerCase());
    }

    const filteredDashboardStats = {
        ...stats,
        cost_trend: stats?.cost_trend?.map((t: any) => {
            if (providerFilter?.toUpperCase() === 'AWS') return { month: t.month, aws: t.aws, azure: 0 };
            if (providerFilter?.toUpperCase() === 'AZURE') return { month: t.month, aws: 0, azure: t.azure };
            return t;
        })
    };

    const filteredScores = filteredProviderStats.map(p => ({
        provider: p.type?.toUpperCase(),
        Resources: p.resource_count,
        Cost: Math.round(p.total_cost / 10),
        Accounts: p.accounts * 5,
    }));

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Analytics & Reports</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Multi-cloud infrastructure intelligence {accountFilter ? `for ${accountFilter}` : ''}
            </Typography>

            <Grid container spacing={2.5}>
                {/* Provider Cards */}
                {filteredProviderStats.map((p: any) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 'grow' }} key={p.type}>
                        <Card sx={{ p: 2.5, border: `1px solid ${getProviderColor(p.type)}20`, '&:hover': { border: `1px solid ${getProviderColor(p.type)}50` }, transition: 'all 0.3s' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Avatar sx={{ bgcolor: getProviderColor(p.type) + '20', width: 40, height: 40, fontSize: '1.2rem' }}>{CLOUD_PROVIDERS[p.type]?.icon || '☁️'}</Avatar>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{p.accounts} accounts</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">Resources</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.resource_count}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">Active</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>{p.active_count}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary">Total Cost</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#F59E0B' }}>${p.total_cost?.toFixed(2)}</Typography>
                            </Box>
                        </Card>
                    </Grid>
                ))}

                {/* Cost Trend */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Multi-Cloud Cost Trend</Typography>
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={stats?.cost_trend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                {/* @ts-ignore */}
                                <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: any) => `$${v.toLocaleString()}`} />
                                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                                <Area type="monotone" dataKey="aws" stackId="1" fill="#FF990020" stroke="#FF9900" name="AWS" />
                                <Area type="monotone" dataKey="azure" stackId="1" fill="#0078D420" stroke="#0078D4" name="Azure" />
                                <Area type="monotone" dataKey="gcp" stackId="1" fill="#4285F420" stroke="#4285F4" name="GCP" />
                                <Area type="monotone" dataKey="oci" stackId="1" fill="#F8000020" stroke="#F80000" name="OCI" />
                                <Area type="monotone" dataKey="vmware" stackId="1" fill="#71707420" stroke="#717074" name="VMware" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                {/* Radar */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Provider Comparison</Typography>
                        <ResponsiveContainer width="100%" height={320}>
                            <RadarChart data={filteredScores}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="provider" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                <PolarRadiusAxis tick={false} />
                                <Radar name="Resources" dataKey="Resources" stroke="#6C63FF" fill="#6C63FF" fillOpacity={0.3} />
                                <Radar name="Cost" dataKey="Cost" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                {/* Category Distribution */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Resource Categories</Typography>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={Object.entries(stats?.category_breakdown || {}).map(([k, v]) => ({ name: k, value: v as number }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                                    {Object.keys(stats?.category_breakdown || {}).map((_, i) => <Cell key={i} fill={['#6C63FF', '#00D9FF', '#10B981', '#F59E0B', '#EF4444', '#9C27B0'][i % 6]} />)}
                                </Pie>
                                {/* @ts-ignore */}
                                <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                {/* Status Pipeline */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Request Pipeline</Typography>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={Object.entries(stats?.status_breakdown || {}).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v, fill: ['#FF9800', '#2196F3', '#4CAF50', '#F44336', '#9C27B0'][Math.floor(Math.random() * 5)] }))} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
                                <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                                <Bar dataKey="value" fill="#6C63FF" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default StatisticsPage;
