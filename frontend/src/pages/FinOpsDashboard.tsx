import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    Box, Typography, Grid, Card, Button, Stack, Paper, Select,
    MenuItem, FormControl, InputLabel, CircularProgress, Tooltip,
    Avatar, LinearProgress, Divider, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Tabs, Tab, TextField,
    useTheme
} from "@mui/material";
import {
    ArrowBack, Refresh, Payments, TrendingUp,
    DonutLarge, InsertChartOutlined, Receipt, CloudOff, Storage as StorageIcon
} from "@mui/icons-material";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { fetchCloudAccounts, CloudAccountRow } from "../services/cloudAccountsService";
import { finopsApi } from "../api/finops";
import api from '../services/api';
import Breadcrumbs from "../components/Common/Breadcrumbs";
import { useSettings } from "../contexts/SettingsContext";
import { useRole } from "../contexts/RoleContext";
import UnifiedSyncButton from "../components/common/UnifiedSyncButton";

const FinOpsDashboard = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { activeTenant } = useRole();
    const { settings } = useSettings();
    const theme = useTheme();


    const tenantName = activeTenant?.tenant_name || (location.state as any)?.tenantName || "Tenant";
    const [accounts, setAccounts] = useState<CloudAccountRow[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dateRange, setDateRange] = useState("mtd");
    const [selectedProvider, setSelectedProvider] = useState("all");
    const [selectedAccountId, setSelectedAccountId] = useState("all");

    // Dashboard Data
    const [summary, setSummary] = useState({ total_cost: 0, aws_cost: 0, azure_cost: 0 });
    const [trendData, setTrendData] = useState<{ date: string, cost: number }[]>([]);
    const [servicesData, setServicesData] = useState<{ name: string, cost: number }[]>([]);
    const [servicesTableData, setServicesTableData] = useState<{ name: string, cost: number, trend: { date: string, cost: number }[] }[]>([]);
    const [tabIndex, setTabIndex] = useState(0);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const currency = settings?.currency || 'USD';
    const fmt = (num: number) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
    }).format(num);

    const getDateStrings = () => {
        const end = new Date();
        const start = new Date();
        if (dateRange === "mtd") {
            start.setDate(1);
        } else if (dateRange === "last_month") {
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end.setDate(0);
        } else if (dateRange === "yesterday") {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
        } else if (dateRange === "last_7_days") {
            start.setDate(start.getDate() - 7);
        } else if (dateRange === "last_30_days") {
            start.setDate(start.getDate() - 30);
        } else if (dateRange === "last_90_days") {
            start.setDate(start.getDate() - 90);
        } else if (dateRange === "last_6_months") {
            start.setMonth(start.getMonth() - 6);
        } else if (dateRange === "last_1_year") {
            start.setFullYear(start.getFullYear() - 1);
        } else if (dateRange === "ytd") {
            start.setMonth(0, 1);
        } else if (dateRange === "custom") {
            return {
                startStr: customStart || start.toISOString().split('T')[0],
                endStr: customEnd || end.toISOString().split('T')[0]
            };
        } else {
            start.setDate(start.getDate() - 7);
        }
        return {
            startStr: start.toISOString().split('T')[0],
            endStr: end.toISOString().split('T')[0]
        };
    };

    const loadData = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            // Load Accounts for Filter Dropdown (filtering out containers)
            const rawAccs = await fetchCloudAccounts(tenantId);
            const isContainer = (type: string) => ['management', 'tenant', 'management_group', 'organizational_unit', 'root'].includes(type || '');
            const resourceAccs = rawAccs.filter(a => !isContainer(a.cred_metadata?.account_type));
            setAccounts(resourceAccs);

            // Calculate Dates
            const { startStr, endStr } = getDateStrings();

            // Resolve optional filters. API expects undefined if not filtering by account
            const accIdFilter = selectedAccountId === "all" ? undefined : selectedAccountId;

            // Fetch Real APIs
            const [sumRes, trendRes, svcRes, svcTableRes] = await Promise.all([
                finopsApi.getDashboardSummary(startStr, endStr, tenantId, accIdFilter),
                finopsApi.getDashboardTrend(startStr, endStr, tenantId, accIdFilter),
                finopsApi.getDashboardServices(startStr, endStr, tenantId, accIdFilter),
                finopsApi.getDashboardServicesTable(startStr, endStr, tenantId, accIdFilter)
            ]);

            setSummary(sumRes);
            setTrendData(trendRes);

            // If filtering by provider, ensure we only show those services (if backend didn't filter it already)
            // Backend doesn't currently filter by provider, so we'll just handle account filtering for now
            setServicesData(svcRes);
            setServicesTableData(svcTableRes);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (dateRange === 'custom' && (!customStart || !customEnd)) {
            return; // Wait for both dates to load data in custom mode
        }
        loadData();
    }, [tenantId, dateRange, selectedAccountId, selectedProvider, customStart, customEnd]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    // Provider metric calculations
    const awsPct = summary.total_cost > 0 ? (summary.aws_cost / summary.total_cost) * 100 : 0;
    const azurePct = summary.total_cost > 0 ? (summary.azure_cost / summary.total_cost) * 100 : 0;

    const trendLabels: Record<string, string> = {
        'yesterday': 'Yesterday Trend',
        'last_7_days': '7-Day Trend',
        'last_30_days': '30-Day Trend',
        'last_90_days': '90-Day Trend',
        'last_6_months': '6-Month Trend',
        'last_1_year': '1-Year Trend',
        'mtd': 'MTD Trend',
        'last_month': 'Last Month Trend',
        'ytd': 'YTD Trend',
        'custom': 'Custom Trend'
    };
    const currentTrendLabel = trendLabels[dateRange] || 'Trend';

    return (
        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pb: 6 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pt: 2 }}>
                <Box>
                    <Breadcrumbs items={[
                        { label: "Infrastructure", path: "/tenants" },
                        { label: "Cloud Accounts", path: `/tenants/${tenantId}/cloud-accounts` },
                        { label: "FinOps" }
                    ]} />
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Cost Analytics</Typography>
                    <Typography variant="body2" color="text.secondary">Unified financial visibility across cloud environments</Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Paper
                        variant="outlined"
                        sx={(theme) => ({
                            p: 1.5,
                            px: 2,
                            display: "flex",
                            gap: 3,
                            bgcolor:
                                theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.02)"
                                    : "rgba(0,0,0,0.02)",
                            borderColor:
                                theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.12)"
                        })}
                    >
                        <Box>
                            <Typography variant="caption" display="block" color="text.secondary">
                                Tenant Name
                            </Typography>

                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#F59E0B" }}>
                                {tenantName}
                            </Typography>
                        </Box>
                    </Paper>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(`/tenants/${tenantId}/dashboard`)}>Workspace</Button>
                        <Button variant="outlined" startIcon={<StorageIcon />} color="info" onClick={() => navigate(`/tenants/${tenantId}/resources`)}>Resource Explorer</Button>
                        <UnifiedSyncButton type="tenant" entityId={tenantId as string} entityName={tenantName} />
                        <Button variant="contained" onClick={loadData} startIcon={<Refresh />} disabled={loading}>Refresh</Button>
                    </Stack>
                </Stack>
            </Box>

            {/* Filters Panel */}
            <Paper
                sx={{
                    p: 2,
                    mb: 4,
                    borderRadius: 3,
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider"
                }}
            >                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Time Period</InputLabel>
                            <Select value={dateRange} label="Time Period" onChange={e => {
                                setDateRange(e.target.value);
                                if (e.target.value === 'custom' && !customStart) {
                                    setCustomStart(new Date().toISOString().split('T')[0]);
                                    setCustomEnd(new Date().toISOString().split('T')[0]);
                                }
                            }}>
                                <MenuItem value="yesterday">Yesterday</MenuItem>
                                <MenuItem value="last_7_days">Last 7 Days</MenuItem>
                                <MenuItem value="last_30_days">Last 30 Days</MenuItem>
                                <MenuItem value="last_90_days">Last 90 Days</MenuItem>
                                <MenuItem value="last_6_months">Last 6 Months</MenuItem>
                                <MenuItem value="last_1_year">Last 1 Year</MenuItem>
                                <MenuItem value="mtd">Month to Date (MTD)</MenuItem>
                                <MenuItem value="last_month">Last Month</MenuItem>
                                <MenuItem value="ytd">Year to Date (YTD)</MenuItem>
                                <MenuItem value="custom">Custom Date Range</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 5 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Cloud Account</InputLabel>
                            <Select value={selectedAccountId} label="Cloud Account" onChange={e => setSelectedAccountId(e.target.value)}>
                                <MenuItem value="all">All Accounts (Tenant Level)</MenuItem>
                                {accounts.map(a => (
                                    <MenuItem key={a.id} value={a.id}>
                                        {a.name} ({a.cloud_provider.toUpperCase()})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: dateRange === 'custom' ? 2 : 4 }}>
                        <Button fullWidth variant="outlined" color="inherit" onClick={() => { setDateRange("mtd"); setSelectedAccountId("all"); }}>
                            Reset Filters
                        </Button>
                    </Grid>
                    {dateRange === 'custom' && (
                        <>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <TextField size="small" type="date" label="Start Date" value={customStart} onChange={e => setCustomStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <TextField size="small" type="date" label="End Date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                            </Grid>
                        </>
                    )}
                </Grid>
            </Paper>

            {/* Tabs */}
            <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <Tabs value={tabIndex} onChange={(_, nv) => setTabIndex(nv)} textColor="inherit" indicatorColor="primary">
                    <Tab label="Cost Overview" sx={{ fontWeight: 600 }} />
                    <Tab label="Resource & Service Costs" sx={{ fontWeight: 600 }} />
                </Tabs>
            </Box>

            {loading ? (
                <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>
            ) : servicesData.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 3 }}>
                    <CloudOff sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6">No Cost Data Available</Typography>
                    <Typography color="text.secondary">There is no cost data for the selected date range and account combination. Try expanding the date range.</Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {/* KPI Cards (Always visible or in Tab 0) */}
                    {tabIndex === 0 && (
                        <>
                            {/* KPI Cards */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Card
                                    sx={{
                                        p: 3,
                                        borderRadius: 4,
                                        height: "100%",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        bgcolor: "background.paper"
                                    }}
                                >                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                        <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}><Payments /></Avatar>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL SPEND</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 800 }}>{fmt(summary.total_cost)}</Typography>
                                        </Box>
                                    </Stack>
                                </Card>
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <Card
                                    sx={{
                                        p: 3,
                                        borderRadius: 4,
                                        height: "100%",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        bgcolor: "background.paper"
                                    }}
                                >                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                        <Avatar sx={{ bgcolor: 'rgba(255, 153, 0, 0.1)', color: '#FF9900' }}>A</Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}>AWS SPEND</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 800 }}>{fmt(summary.aws_cost)}</Typography>
                                        </Box>
                                    </Stack>
                                    <LinearProgress variant="determinate" value={awsPct} sx={{ height: 4, bgcolor: 'rgba(255,153,0,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#FF9900' } }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{awsPct.toFixed(1)}% of total spend</Typography>
                                </Card>
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <Card
                                    sx={{
                                        p: 3,
                                        borderRadius: 4,
                                        height: "100%",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        bgcolor: "background.paper"
                                    }}
                                >                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                        <Avatar sx={{ bgcolor: 'rgba(0, 120, 212, 0.1)', color: '#0078D4' }}>Z</Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}>AZURE SPEND</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 800 }}>{fmt(summary.azure_cost)}</Typography>
                                        </Box>
                                    </Stack>
                                    <LinearProgress variant="determinate" value={azurePct} sx={{ height: 4, bgcolor: 'rgba(0,120,212,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#0078D4' } }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{azurePct.toFixed(1)}% of total spend</Typography>
                                </Card>
                            </Grid>

                            {/* Trend Line Chart */}
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Card
                                    sx={{
                                        p: 3,
                                        borderRadius: 4,
                                        height: "100%",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        bgcolor: "background.paper"
                                    }}
                                >                                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <InsertChartOutlined color="primary" /> Daily Spend Trend
                                    </Typography>


                                    <Box sx={{ height: 300, width: "100%" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>

                                                <CartesianGrid
                                                    stroke={theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                                                    strokeDasharray="3 3"
                                                />

                                                <XAxis
                                                    dataKey="date"
                                                    stroke={theme.palette.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"}
                                                    tick={{
                                                        fill: theme.palette.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"
                                                    }}
                                                />

                                                <YAxis
                                                    stroke={theme.palette.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"}
                                                    tick={{
                                                        fill: theme.palette.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"
                                                    }}
                                                    tickFormatter={(val) => `$${val}`}
                                                />

                                                <RechartsTooltip
                                                    contentStyle={{
                                                        backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#ffffff",
                                                        borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                                                        borderRadius: "8px",
                                                        color: theme.palette.text.primary
                                                    }}
                                                    formatter={(value: any) => [fmt(value as number), "Cost"]}
                                                    labelStyle={{ color: theme.palette.text.primary, marginBottom: "8px" }}
                                                />

                                                <Line
                                                    type="monotone"
                                                    dataKey="cost"
                                                    stroke="#3B82F6"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: "#3B82F6" }}
                                                    activeDot={{ r: 8 }}
                                                />

                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Card>
                            </Grid>

                            {/* Donut Services Chart */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Stack spacing={3} sx={{ height: '100%' }}>
                                    <Card
                                        sx={{
                                            p: 3,
                                            borderRadius: 4,
                                            height: "100%",
                                            border: "1px solid",
                                            borderColor: "divider",
                                            bgcolor: "background.paper"
                                        }}
                                    >                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <DonutLarge fontSize="small" color="secondary" /> Top Cost Drivers
                                        </Typography>

                                        <Box sx={{ height: 200, width: '100%', display: 'flex', justifyContent: 'center' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={servicesData.slice(0, 5)}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="cost"
                                                        nameKey="name"
                                                        stroke="none"
                                                    >
                                                        {servicesData.slice(0, 5).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        contentStyle={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                        formatter={(value: any) => [fmt(value as number), "Cost"]}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </Box>

                                        <Stack spacing={1.5} sx={{ mt: 1 }}>
                                            {servicesData.slice(0, 5).map((svc, i) => (
                                                <Box key={svc.name}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="body2" sx={{ width: '60%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                                                            {svc.name}
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={700}>{fmt(svc.cost)}</Typography>
                                                    </Stack>
                                                    <Divider sx={{ mt: 1, borderColor: 'rgba(255,255,255,0.05)' }} />
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Card>
                                </Stack>
                            </Grid>
                        </>
                    )}

                    {/* Service/Resource Cost Tabular View (Tab 1) */}
                    {tabIndex === 1 && (
                        <Grid size={{ xs: 12 }}>
                            <Card
                                sx={{
                                    p: 3,
                                    borderRadius: 4,
                                    height: "100%",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "background.paper"
                                }}
                            >
                                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Resource & Service Cost Breakdown</Typography>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ background: 'rgba(255,255,255,0.02)' }}>
                                                <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Cost</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, width: 250 }}>{currentTrendLabel}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {servicesTableData.map(svc => (
                                                <TableRow key={svc.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                    <TableCell component="th" scope="row">
                                                        {svc.name}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(svc.cost)}</TableCell>
                                                    <TableCell align="right">
                                                        <Box sx={{ width: 180, height: 40, ml: 'auto' }}>
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={svc.trend}>
                                                                    <RechartsTooltip
                                                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                                        contentStyle={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 8px' }}
                                                                        formatter={(value: any) => [fmt(value as number), ""]}
                                                                        labelStyle={{ display: 'none' }}
                                                                    />
                                                                    <Line type="monotone" dataKey="cost" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 2, fill: '#8B5CF6' }} activeDot={{ r: 4 }} isAnimationActive={false} />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {servicesTableData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>No data available for table.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            )}
        </Box>
    );
};

export default FinOpsDashboard;
