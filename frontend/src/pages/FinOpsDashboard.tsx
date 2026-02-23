import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box, Typography, Grid, Card, Button, Stack, Paper, Select,
    MenuItem, FormControl, InputLabel, CircularProgress, Chip,
    Divider, Tooltip, IconButton, Link,
    Avatar, LinearProgress, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, TableContainer
} from "@mui/material";
import {
    Science, ArrowBack, Refresh, Payments, TrendingUp,
    AccountBalanceWallet, Business, Receipt,
    Cloud, DonutLarge, InsertChartOutlined, Storage, Public, AccountTree
} from "@mui/icons-material";
import { fetchCloudAccounts, CloudAccountRow } from "../services/cloudAccountsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import { useSettings } from "../contexts/SettingsContext";

// --- Deterministic Random Number Generator based on string seed ---
const seedRandom = (seedStr: string) => {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
    }
    return () => {
        hash = Math.imul(741103597, hash) + 1 | 0;
        let t = Math.imul(hash ^ hash >>> 15, 1 | hash);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
};

const FinOpsDashboard = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState<CloudAccountRow[]>([]);
    const [loading, setLoading] = useState(true);
    const { settings } = useSettings();

    // Filters & Tabs
    const [dateRange, setDateRange] = useState("mtd");
    const [selectedProvider, setSelectedProvider] = useState("all");
    const [selectedAccountId, setSelectedAccountId] = useState("all");
    const [tabIndex, setTabIndex] = useState(0);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchCloudAccounts(tenantId as string);
            // Only include actual leaf accounts for cost generation (subscriptions, members)
            const leafAccounts = data.filter(a =>
                a.cred_metadata?.account_type === 'subscription' ||
                a.cred_metadata?.account_type === 'member' ||
                (!a.cred_metadata?.account_type && a.parent_id) // rough fallback
            );
            setAccounts(leafAccounts.length > 0 ? leafAccounts : data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenantId) loadData();
    }, [tenantId]);

    // --- Mock Data Generation ---
    const rng = seedRandom(`${tenantId}-${dateRange}`);

    const filteredAccounts = accounts.filter(a => {
        if (selectedProvider !== "all" && a.cloud_provider !== selectedProvider) return false;
        if (selectedAccountId !== "all" && a.id !== selectedAccountId) return false;
        return true;
    });

    // Cost Aggregators
    let totalCost = 0;
    let providerSplit = { aws: 0, azure: 0 };
    let serviceBreakdown: Record<string, number> = {};
    let regionBreakdown: Record<string, number> = {};
    let accountCosts: { id: string, name: string, provider: string, cost: number }[] = [];
    let resourceCosts: { id: string, accountName: string, service: string, region: string, cost: number }[] = [];

    const servicesMap = {
        aws: ["AmazonEC2", "AmazonRDS", "AmazonS3", "AWSLambda", "AmazonEKS", "DynamoDB"],
        azure: ["Virtual Machines", "SQL Database", "Storage Accounts", "App Service", "Azure Kubernetes Service", "Cosmos DB"]
    };

    const regionsMap = {
        aws: ["us-east-1", "eu-west-1", "ap-south-1", "us-west-2"],
        azure: ["East US", "West Europe", "Central India", "West US 2"]
    };

    const generateResourceId = (svc: string, rngVal: number) => {
        const hex = Math.floor(rngVal * 0xFFFFFF).toString(16).padStart(6, '0');
        if (svc.includes("EC2") || svc.includes("Virtual Machine")) return `i-0${hex}`;
        if (svc.includes("RDS") || svc.includes("SQL")) return `db-${hex}`;
        if (svc.includes("S3") || svc.includes("Storage")) return `bucket-${hex}`;
        return `res-${hex}`;
    };

    const currency = settings?.currency || 'USD';
    const exchangeRate = currency === 'INR' ? 83.5 : 1.0;

    filteredAccounts.forEach(acc => {
        const accRng = seedRandom(acc.id);
        const baseAccountCost = (200 + (accRng() * 1800)) * exchangeRate;

        let m = 1;
        if (dateRange === "mtd") m = 0.6;
        else if (dateRange === "last_month") m = 1.0;
        else if (dateRange === "ytd") m = 6.0;

        const currentCost = baseAccountCost * m;
        totalCost += currentCost;
        accountCosts.push({ id: acc.id, name: acc.name, provider: acc.cloud_provider, cost: currentCost });

        if (acc.cloud_provider === 'aws') providerSplit.aws += currentCost;
        else if (acc.cloud_provider === 'azure') providerSplit.azure += currentCost;

        const svcs = acc.cloud_provider === 'aws' ? servicesMap.aws : servicesMap.azure;
        const regions = acc.cloud_provider === 'aws' ? regionsMap.aws : regionsMap.azure;

        // Distribute cost to resources (5-10 per account)
        const numResources = 5 + Math.floor(accRng() * 5);
        let remainingCost = currentCost;

        for (let i = 0; i < numResources; i++) {
            const svc = svcs[Math.floor(accRng() * svcs.length)];
            const region = regions[Math.floor(accRng() * regions.length)];

            // Last resource gets the remainder
            const costShare = i === numResources - 1 ? remainingCost : remainingCost * (0.1 + accRng() * 0.4);
            remainingCost -= costShare;

            serviceBreakdown[svc] = (serviceBreakdown[svc] || 0) + costShare;
            regionBreakdown[region] = (regionBreakdown[region] || 0) + costShare;

            resourceCosts.push({
                id: generateResourceId(svc, accRng()),
                accountName: acc.name,
                service: svc,
                region: region,
                cost: costShare
            });
        }
    });

    // Sort aggregates
    const topServices = Object.entries(serviceBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sortedRegions = Object.entries(regionBreakdown).sort((a, b) => b[1] - a[1]);
    resourceCosts.sort((a, b) => b.cost - a.cost);
    accountCosts.sort((a, b) => b.cost - a.cost);

    const forecastCost = dateRange === "mtd" ? totalCost * (1 / 0.6) : totalCost;
    const fmt = (num: number) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
    }).format(num);

    return (
        <Box>
            {/* Simulation Banner */}
            <Box sx={{
                bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', px: 4, py: 1.5,
                display: 'flex', alignItems: 'center', gap: 2,
                borderBottom: '1px solid rgba(245, 158, 11, 0.2)', mb: 2
            }}>
                <Science sx={{ fontSize: 22 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                    SIMULATED ENVIRONMENT: FinOps Dashboard is rendering mocked cost analytics derived from your actual cloud accounts structure.
                </Typography>
            </Box>

            <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pb: 6 }}>
                {/* Header */}
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Breadcrumbs items={[
                            { label: "Infrastructure", path: "/tenants" },
                            { label: "Cloud Accounts", path: `/tenants/${tenantId}/cloud-accounts` },
                            { label: "FinOps" }
                        ]} />
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>Cost Analytics</Typography>
                        <Typography variant="body2" color="text.secondary">Unified financial visibility across cloud environments</Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(`/tenants/${tenantId}/cloud-accounts`)}>Workplace</Button>
                        <Button variant="contained" onClick={loadData} startIcon={<Refresh />} disabled={loading}>Refresh</Button>
                    </Stack>
                </Box>

                {/* Filters Panel */}
                <Paper sx={{ p: 2, mb: 4, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Time Period</InputLabel>
                                <Select value={dateRange} label="Time Period" onChange={e => setDateRange(e.target.value)}>
                                    <MenuItem value="mtd">Month to Date (MTD)</MenuItem>
                                    <MenuItem value="last_month">Last Month</MenuItem>
                                    <MenuItem value="ytd">Year to Date (YTD)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Cloud Provider</InputLabel>
                                <Select value={selectedProvider} label="Cloud Provider" onChange={e => { setSelectedProvider(e.target.value); setSelectedAccountId("all"); }}>
                                    <MenuItem value="all">All Providers</MenuItem>
                                    <MenuItem value="aws">AWS</MenuItem>
                                    <MenuItem value="azure">Azure</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Cloud Account</InputLabel>
                                <Select value={selectedAccountId} label="Cloud Account" onChange={e => setSelectedAccountId(e.target.value)}>
                                    <MenuItem value="all">All Accounts</MenuItem>
                                    {accounts
                                        .filter(a => selectedProvider === "all" || a.cloud_provider === selectedProvider)
                                        .map(a => (
                                            <MenuItem key={a.id} value={a.id}>
                                                {a.name} ({a.cloud_provider.toUpperCase()})
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 2 }}>
                            <Button fullWidth variant="outlined" color="inherit" onClick={() => { setDateRange("mtd"); setSelectedProvider("all"); setSelectedAccountId("all"); }}>
                                Reset
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                {loading ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>
                ) : filteredAccounts.length === 0 ? (
                    <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3 }}>
                        <Cloud sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                        <Typography variant="h6">No Accounts Found</Typography>
                        <Typography color="text.secondary">Adjust your filters or onboard cloud accounts to see cost data.</Typography>
                    </Paper>
                ) : (
                    <>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                            <Tabs value={tabIndex} onChange={(_, nv) => setTabIndex(nv)} textColor="primary" indicatorColor="primary">
                                <Tab icon={<InsertChartOutlined />} iconPosition="start" label="Overview" />
                                <Tab icon={<AccountTree />} iconPosition="start" label="Account Breakdown" />
                                <Tab icon={<Storage />} iconPosition="start" label="Resource Details" />
                                <Tab icon={<Public />} iconPosition="start" label="Region Analytics" />
                            </Tabs>
                        </Box>

                        {/* TAB 0: OVERVIEW */}
                        {tabIndex === 0 && (
                            <Grid container spacing={3}>
                                {/* KPI Cards */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Card sx={{ p: 3, borderRadius: 4, height: '100%', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                            <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}><Payments /></Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL SPEND ({dateRange.toUpperCase()})</Typography>
                                                <Typography variant="h4" sx={{ fontWeight: 800 }}>{fmt(totalCost)}</Typography>
                                            </Box>
                                        </Stack>
                                        {dateRange === "mtd" && (
                                            <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <TrendingUp fontSize="small" /> -4.2% vs same period last month
                                            </Typography>
                                        )}
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Card sx={{ p: 3, borderRadius: 4, height: '100%', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                            <Avatar sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}><TrendingUp /></Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>FORECASTED SPEND</Typography>
                                                <Typography variant="h4" sx={{ fontWeight: 800 }}>{fmt(forecastCost)}</Typography>
                                            </Box>
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            Based on current usage trends
                                        </Typography>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Card sx={{ p: 3, borderRadius: 4, height: '100%', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                            <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}><AccountBalanceWallet /></Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>BUDGET HEALTH</Typography>
                                                <Typography variant="h4" sx={{ fontWeight: 800 }}>On Track</Typography>
                                            </Box>
                                        </Stack>
                                        <LinearProgress variant="determinate" value={70} color="success" sx={{ height: 6, borderRadius: 3, mb: 1 }} />
                                        <Typography variant="caption" color="text.secondary">70% of organizational budget utilized</Typography>
                                    </Card>
                                </Grid>

                                {/* Main Chart Area */}
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Card sx={{ p: 3, borderRadius: 4, height: '100%', minHeight: 400, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <InsertChartOutlined color="primary" /> Daily Spend Trend
                                        </Typography>

                                        {/* Simulated Chart Placeholder */}
                                        <Box sx={{ height: 280, display: 'flex', alignItems: 'flex-end', gap: 1, px: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            {Array.from({ length: 30 }).map((_, i) => {
                                                const dayCost = (totalCost / 30) * (0.5 + rng());
                                                const heightPct = Math.min(100, Math.max(10, (dayCost / (totalCost / 15)) * 100));
                                                return (
                                                    <Tooltip key={i} title={`Day ${i + 1}: ${fmt(dayCost)}`}>
                                                        <Box sx={{
                                                            flex: 1,
                                                            bgcolor: 'primary.main',
                                                            height: `${heightPct}%`,
                                                            borderTopLeftRadius: 4,
                                                            borderTopRightRadius: 4,
                                                            opacity: 0.8,
                                                            '&:hover': { opacity: 1, bgcolor: 'primary.light' }
                                                        }} />
                                                    </Tooltip>
                                                );
                                            })}
                                        </Box>
                                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1, px: 2 }}>
                                            <Typography variant="caption" color="text.secondary">Start of Period</Typography>
                                            <Typography variant="caption" color="text.secondary">End of Period</Typography>
                                        </Stack>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Stack spacing={3} sx={{ height: '100%' }}>
                                        {/* Provider Split */}
                                        <Card sx={{ p: 3, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DonutLarge fontSize="small" color="secondary" /> Provider Split
                                            </Typography>
                                            <Stack spacing={2}>
                                                {providerSplit.aws > 0 && (
                                                    <Box>
                                                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar sx={{ width: 16, height: 16, bgcolor: '#FF9900', fontSize: 10 }}>A</Avatar> AWS
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight={700}>{fmt(providerSplit.aws)}</Typography>
                                                        </Stack>
                                                        <LinearProgress variant="determinate" value={(providerSplit.aws / totalCost) * 100} sx={{ height: 4, bgcolor: 'rgba(255,153,0,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#FF9900' } }} />
                                                    </Box>
                                                )}
                                                {providerSplit.azure > 0 && (
                                                    <Box>
                                                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar sx={{ width: 16, height: 16, bgcolor: '#0078D4', fontSize: 10 }}>Z</Avatar> Azure
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight={700}>{fmt(providerSplit.azure)}</Typography>
                                                        </Stack>
                                                        <LinearProgress variant="determinate" value={(providerSplit.azure / totalCost) * 100} sx={{ height: 4, bgcolor: 'rgba(0,120,212,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#0078D4' } }} />
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Card>

                                        {/* Top Services */}
                                        <Card sx={{ p: 3, borderRadius: 4, flexGrow: 1, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Receipt fontSize="small" color="success" /> Top Services
                                            </Typography>
                                            <Stack spacing={2}>
                                                {topServices.map(([svc, cost], i) => (
                                                    <Box key={svc}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" sx={{ width: '60%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {i + 1}. {svc}
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight={700}>{fmt(cost as number)}</Typography>
                                                        </Stack>
                                                        <Divider sx={{ mt: 1, borderColor: 'rgba(255,255,255,0.05)' }} />
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Card>
                                    </Stack>
                                </Grid>
                            </Grid>
                        )}

                        {/* TAB 1: ACCOUNTS */}
                        {tabIndex === 1 && (
                            <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Account Name (ID)</TableCell>
                                            <TableCell>Provider</TableCell>
                                            <TableCell align="right">Billed Cost</TableCell>
                                            <TableCell align="right">% of Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {accountCosts.map((acc) => (
                                            <TableRow key={acc.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>{acc.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{acc.id}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip size="small" label={acc.provider.toUpperCase()} sx={{ fontSize: '0.65rem', fontWeight: 'bold' }} />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(acc.cost)}</TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">{((acc.cost / totalCost) * 100).toFixed(1)}%</Typography>
                                                    <LinearProgress variant="determinate" value={(acc.cost / totalCost) * 100} sx={{ height: 3, mt: 0.5 }} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* TAB 2: RESOURCES */}
                        {tabIndex === 2 && (
                            <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Resource ID</TableCell>
                                            <TableCell>Service</TableCell>
                                            <TableCell>Region</TableCell>
                                            <TableCell>Account</TableCell>
                                            <TableCell align="right">Resource Cost</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {resourceCosts.slice(0, 50).map((res, idx) => (
                                            <TableRow key={idx} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace">{res.id}</Typography>
                                                </TableCell>
                                                <TableCell>{res.service}</TableCell>
                                                <TableCell>{res.region}</TableCell>
                                                <TableCell>{res.accountName}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(res.cost)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {resourceCosts.length > 50 && (
                                    <Box sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="caption" align="center" color="text.secondary">Showing top 50 resources by cost</Typography>
                                    </Box>
                                )}
                            </TableContainer>
                        )}

                        {/* TAB 3: REGIONS */}
                        {tabIndex === 3 && (
                            <Grid container spacing={3}>
                                {sortedRegions.map(([region, cost]) => (
                                    <Grid key={region} size={{ xs: 12, sm: 6, md: 4 }}>
                                        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                                                <Public />
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle2">{region}</Typography>
                                                <Typography variant="h6" fontWeight={700}>{fmt(cost)}</Typography>
                                                <LinearProgress variant="determinate" value={(cost / totalCost) * 100} color="secondary" sx={{ height: 2, mt: 1 }} />
                                            </Box>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default FinOpsDashboard;
