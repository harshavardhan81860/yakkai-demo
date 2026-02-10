import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Grid, LinearProgress } from '@mui/material';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Legend, Cell } from 'recharts';
import api from '../../services/api';
import { CLOUD_PROVIDERS, getProviderColor } from '../../cloudProviders';

const CostAnalyticsPage = () => {
    const [costData, setCostData] = useState<any>(null);
    const [comparison, setComparison] = useState<any>(null);
    const [forecast, setForecast] = useState<any>(null);
    const [optimization, setOptimization] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/api/statistics/costs').then(r => setCostData(r.data)),
            api.get('/api/statistics/costs/comparison').then(r => setComparison(r.data)),
            api.get('/api/statistics/costs/forecast').then(r => setForecast(r.data)),
            api.get('/api/statistics/optimization').then(r => setOptimization(r.data)),
        ]).finally(() => setLoading(false));
    }, []);

    if (loading) return <LinearProgress />;

    const comparisonData = comparison ? Object.entries(comparison).map(([category, providers]: [string, any]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1), ...providers,
    })) : [];

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Cost Analytics</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Cross-cloud cost intelligence and optimization</Typography>

            {/* Forecast cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {forecast && [
                    { label: 'Current Month', value: `$${forecast.current_month?.toLocaleString()}`, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                    { label: 'Next Month Forecast', value: `$${forecast.next_month_forecast?.toLocaleString()}`, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                    { label: 'Quarterly Forecast', value: `$${forecast.quarterly_forecast?.toLocaleString()}`, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                    { label: 'Annual Forecast', value: `$${forecast.annual_forecast?.toLocaleString()}`, color: '#6C63FF', bg: 'rgba(108,99,255,0.1)' },
                ].map((c, i) => (
                    <Grid size={{ xs: 6, md: 3 }} key={i}>
                        <Card sx={{ p: 2.5, textAlign: 'center', background: `linear-gradient(135deg,${c.bg},transparent)` }}>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{c.label}</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: c.color, mt: 0.5 }}>{c.value}</Typography>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={2.5}>
                {/* Cost Trend */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>6-Month Cost Trend</Typography>
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={costData?.trend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v: any) => `$${((v || 0) / 1000).toFixed(0)}k`} />
                                <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: any) => `$${v.toLocaleString()}`} />
                                <Legend />
                                {Object.keys(CLOUD_PROVIDERS).map(p => (
                                    <Area key={p} type="monotone" dataKey={p} stackId="1" stroke={getProviderColor(p)} fill={getProviderColor(p) + '20'} name={p.toUpperCase()} />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                {/* Cross-cloud Comparison */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Cross-Cloud Cost Comparison</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="category" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v: number) => `$${((v || 0) / 1000).toFixed(0)}k`} />
                                <RTooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: any) => `$${v.toLocaleString()}`} />
                                <Legend />
                                {Object.keys(CLOUD_PROVIDERS).map(p => (
                                    <Bar key={p} dataKey={p} fill={getProviderColor(p)} name={p.toUpperCase()} radius={[4, 4, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                {/* Optimization Recommendations */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">Optimization Insights</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>${optimization?.total_savings_potential?.toLocaleString()}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>Total potential monthly savings</Typography>
                        {(optimization?.recommendations || []).map((r: any, i: number) => (
                            <Box key={i} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)', mb: 1.5, '&:hover': { bgcolor: 'rgba(16,185,129,0.04)' } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.resource}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981' }}>-${r.savings}/mo</Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">{r.detail}</Typography>
                            </Box>
                        ))}
                    </Card>
                </Grid>

                {/* Per-provider forecast */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Provider Forecast Breakdown</Typography>
                        <Grid container spacing={2}>
                            {forecast?.by_provider && Object.entries(forecast.by_provider).map(([key, val]: [string, any]) => (
                                <Grid size={{ xs: 6, sm: 4, md: "grow" }} key={key}>
                                    <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${getProviderColor(key)}20`, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>{key}</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 700, color: getProviderColor(key) }}>${val.current?.toLocaleString()}</Typography>
                                        <Typography variant="caption" sx={{ color: val.forecast > val.current ? '#EF4444' : '#10B981' }}>→ ${val.forecast?.toLocaleString()}</Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default CostAnalyticsPage;
