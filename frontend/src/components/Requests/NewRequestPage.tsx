import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Stepper, Step, StepLabel, Button, Grid, Radio, RadioGroup, FormControlLabel, TextField, Select, MenuItem, FormControl, InputLabel, Chip, LinearProgress, Alert } from '@mui/material';
import { CloudQueue, ArrowForward, ArrowBack, Send, AttachMoney } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { CloudAccount, CatalogItem } from '../../types';
import { CLOUD_PROVIDERS, getProviderColor, getProviderIcon, RESOURCE_CATEGORIES, CATEGORY_ICONS } from '../../data/cloudProviders';

const steps = ['Cloud Provider', 'Account', 'Category', 'Resource Type', 'Configuration', 'Cost Estimate', 'Justification', 'Review & Submit'];

const NewRequestPage = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [provider, setProvider] = useState('');
    const [accountId, setAccountId] = useState(0);
    const [category, setCategory] = useState('');
    const [resourceType, setResourceType] = useState('');
    const [config, setConfig] = useState<Record<string, any>>({});
    const [justification, setJustification] = useState('');
    const [duration, setDuration] = useState('6 months');
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { api.get('/api/cloud-accounts').then(r => setAccounts(r.data)); }, []);

    const filteredAccounts = accounts.filter(a => {
        if (!provider) return true;
        return a.provider_type === provider;
    });

    const selectedAccount = accounts.find(a => a.id === accountId);
    const selectedProviderId = selectedAccount?.provider_id || accounts.find(a => a.provider_type === provider)?.provider_id;

    useEffect(() => {
        if (selectedProviderId) {
            api.get(`/api/providers/${selectedProviderId}/resource-catalog`).then(r => setCatalog(r.data));
        }
    }, [selectedProviderId]);

    const filteredCatalog = catalog.filter(c => !category || c.resource_category === category);
    const selectedCatalogItem = catalog.find(c => c.resource_type === resourceType);
    const configFields = selectedCatalogItem?.config_schema_json?.fields || [];

    const estimatedCost = (() => {
        const base: Record<string, number> = { 't3.micro': 7.59, 't3.small': 15.18, 't3.medium': 30.37, 't3.large': 60.74, 'm5.large': 70.08, 'm5.xlarge': 140.16, 'Standard_B2s': 30.37, 'Standard_D2s_v3': 70.08, 'Standard_D4s_v3': 140.16, 'e2-micro': 6.11, 'e2-medium': 24.46, 'n1-standard-1': 24.27, 'n1-standard-2': 48.55, 'VM.Standard2.1': 46.54, 'VM.Standard2.2': 93.07 };
        const key = config.instanceType || config.vmSize || config.machineType || config.shape || '';
        if (base[key]) return base[key];
        if (config.cpu) return config.cpu * 18;
        return 25 + Math.random() * 75;
    })();

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        try {
            await api.post('/api/requests', {
                provider_id: selectedProviderId, cloud_account_id: accountId,
                resource_type: resourceType, resource_category: category || 'compute',
                config_json: config, estimated_cost: parseFloat(estimatedCost.toFixed(2)),
                justification, expected_duration: duration,
            });
            navigate('/requests');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to submit');
            setSubmitting(false);
        }
    };

    const canNext = () => {
        if (activeStep === 0) return !!provider;
        if (activeStep === 1) return !!accountId;
        if (activeStep === 2) return !!category;
        if (activeStep === 3) return !!resourceType;
        if (activeStep === 4) return Object.keys(config).length > 0;
        return true;
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>New Infrastructure Request</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Request cloud resources across any provider</Typography>

            <Card sx={{ p: 3, mb: 3 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>
            </Card>

            <Card sx={{ p: 4, minHeight: 350 }}>
                {/* Step 0: Provider Selection */}
                {activeStep === 0 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>Select Cloud Provider</Typography>
                        <Grid container spacing={2}>
                            {Object.entries(CLOUD_PROVIDERS).map(([key, p]) => (
                                <Grid item xs={12} sm={6} md={4} key={key}>
                                    <Card onClick={() => setProvider(key)} sx={{
                                        p: 3, cursor: 'pointer', textAlign: 'center',
                                        border: provider === key ? `2px solid ${p.color}` : '1px solid rgba(255,255,255,0.06)',
                                        background: provider === key ? `${p.color}10` : 'transparent',
                                        '&:hover': { border: `2px solid ${p.color}60`, background: `${p.color}08` },
                                    }}>
                                        <Box sx={{ fontSize: '2.5rem', mb: 1 }}>{getProviderIcon(key)}</Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{filteredAccounts.filter(a => a.provider_type === key).length} accounts</Typography>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Step 1: Account Selection */}
                {activeStep === 1 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>Select Cloud Account</Typography>
                        <Grid container spacing={2}>
                            {filteredAccounts.map(a => (
                                <Grid item xs={12} sm={6} key={a.id}>
                                    <Card onClick={() => setAccountId(a.id)} sx={{
                                        p: 2.5, cursor: 'pointer',
                                        border: accountId === a.id ? `2px solid ${getProviderColor(a.provider_type || '')}` : '1px solid rgba(255,255,255,0.06)',
                                        background: accountId === a.id ? `${getProviderColor(a.provider_type || '')}10` : 'transparent',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                            <Box sx={{ fontSize: '1.3rem' }}>{getProviderIcon(a.provider_type || '')}</Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{a.account_name}</Typography>
                                            <Chip label={a.status} size="small" sx={{ ml: 'auto', bgcolor: a.status === 'connected' ? '#10B98120' : '#FF980020', color: a.status === 'connected' ? '#10B981' : '#FF9800', fontSize: '0.65rem' }} />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">ID: {a.account_identifier} • Region: {a.region}</Typography>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Step 2: Category */}
                {activeStep === 2 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>Select Resource Category</Typography>
                        <Grid container spacing={2}>
                            {RESOURCE_CATEGORIES.map(cat => (
                                <Grid item xs={6} sm={4} md={3} key={cat}>
                                    <Card onClick={() => setCategory(cat)} sx={{
                                        p: 3, cursor: 'pointer', textAlign: 'center',
                                        border: category === cat ? '2px solid #6C63FF' : '1px solid rgba(255,255,255,0.06)',
                                        background: category === cat ? 'rgba(108,99,255,0.1)' : 'transparent',
                                        '&:hover': { bgcolor: 'rgba(108,99,255,0.05)' },
                                    }}>
                                        <Box sx={{ fontSize: '2rem', mb: 1 }}>{CATEGORY_ICONS[cat]}</Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{cat}</Typography>
                                        <Typography variant="caption" color="text.secondary">{filteredCatalog.filter(c => c.resource_category === cat).length} types</Typography>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Step 3: Resource Type */}
                {activeStep === 3 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>Select Resource Type</Typography>
                        <Grid container spacing={2}>
                            {filteredCatalog.map(c => (
                                <Grid item xs={12} sm={6} md={4} key={c.id}>
                                    <Card onClick={() => setResourceType(c.resource_type)} sx={{
                                        p: 2.5, cursor: 'pointer',
                                        border: resourceType === c.resource_type ? '2px solid #6C63FF' : '1px solid rgba(255,255,255,0.06)',
                                        background: resourceType === c.resource_type ? 'rgba(108,99,255,0.1)' : 'transparent',
                                        '&:hover': { bgcolor: 'rgba(108,99,255,0.05)' },
                                    }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{c.display_name}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{c.description}</Typography>
                                        <Chip label={`${c.request_count} requests`} size="small" sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#958FFF', fontSize: '0.65rem' }} />
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Step 4: Configuration */}
                {activeStep === 4 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>Configure {resourceType}</Typography>
                        <Grid container spacing={2.5}>
                            {configFields.map((f: any) => (
                                <Grid item xs={12} sm={6} key={f.name}>
                                    {f.type === 'select' ? (
                                        <FormControl fullWidth>
                                            <InputLabel>{f.label}</InputLabel>
                                            <Select value={config[f.name] || f.default || ''} label={f.label} onChange={(e) => setConfig({ ...config, [f.name]: e.target.value })}>
                                                {(f.options || []).map((o: string) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        <TextField fullWidth label={f.label} type={f.type === 'number' ? 'number' : 'text'}
                                            value={config[f.name] || f.default || ''}
                                            onChange={(e) => setConfig({ ...config, [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                                            placeholder={f.placeholder} required={f.required}
                                            inputProps={f.type === 'number' ? { min: f.min, max: f.max } : {}} />
                                    )}
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Step 5: Cost Estimate */}
                {activeStep === 5 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>Cost Estimate</Typography>
                        <Card sx={{ p: 3, background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <AttachMoney sx={{ fontSize: 40, color: '#10B981' }} />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Estimated Monthly Cost</Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#10B981' }}>${estimatedCost.toFixed(2)}</Typography>
                                </Box>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Compute</Typography><Typography variant="body1" sx={{ fontWeight: 700 }}>${(estimatedCost * 0.7).toFixed(2)}</Typography></Grid>
                                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Storage</Typography><Typography variant="body1" sx={{ fontWeight: 700 }}>${(estimatedCost * 0.2).toFixed(2)}</Typography></Grid>
                                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Network</Typography><Typography variant="body1" sx={{ fontWeight: 700 }}>${(estimatedCost * 0.1).toFixed(2)}</Typography></Grid>
                            </Grid>
                        </Card>
                    </Box>
                )}

                {/* Step 6: Justification */}
                {activeStep === 6 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>Business Justification</Typography>
                        <TextField fullWidth multiline rows={4} label="Why do you need this resource?" value={justification} onChange={(e) => setJustification(e.target.value)} sx={{ mb: 2 }} />
                        <FormControl fullWidth>
                            <InputLabel>Expected Duration</InputLabel>
                            <Select value={duration} label="Expected Duration" onChange={(e) => setDuration(e.target.value)}>
                                <MenuItem value="1 month">1 Month</MenuItem>
                                <MenuItem value="3 months">3 Months</MenuItem>
                                <MenuItem value="6 months">6 Months</MenuItem>
                                <MenuItem value="1 year">1 Year</MenuItem>
                                <MenuItem value="Permanent">Permanent</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {/* Step 7: Review */}
                {activeStep === 7 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>Review & Submit</Typography>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        <Grid container spacing={2}>
                            {[
                                { label: 'Provider', value: <><Box component="span" sx={{ mr: 1 }}>{getProviderIcon(provider)}</Box>{CLOUD_PROVIDERS[provider]?.name}</> },
                                { label: 'Account', value: selectedAccount?.account_name },
                                { label: 'Category', value: category },
                                { label: 'Resource Type', value: resourceType },
                                { label: 'Est. Monthly Cost', value: <Typography sx={{ fontWeight: 800, color: '#10B981' }}>${estimatedCost.toFixed(2)}</Typography> },
                                { label: 'Duration', value: duration },
                            ].map((item, i) => (
                                <Grid item xs={12} sm={6} key={i}>
                                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(0,0,0,0.2)' }}>
                                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{item.value}</Typography>
                                    </Box>
                                </Grid>
                            ))}
                            <Grid item xs={12}>
                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(0,0,0,0.2)' }}>
                                    <Typography variant="caption" color="text.secondary">Configuration</Typography>
                                    <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem', mt: 0.5 }}><pre style={{ margin: 0, color: '#9CA3AF' }}>{JSON.stringify(config, null, 2)}</pre></Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Card>

            {/* Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button disabled={activeStep === 0} onClick={() => setActiveStep(activeStep - 1)} startIcon={<ArrowBack />} variant="outlined">Back</Button>
                {activeStep < steps.length - 1 ? (
                    <Button onClick={() => setActiveStep(activeStep + 1)} endIcon={<ArrowForward />} variant="contained" disabled={!canNext()}
                        sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>Next</Button>
                ) : (
                    <Button onClick={handleSubmit} endIcon={<Send />} variant="contained" disabled={submitting}
                        sx={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
                )}
            </Box>
        </Box>
    );
};

export default NewRequestPage;
