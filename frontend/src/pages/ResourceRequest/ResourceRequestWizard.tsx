
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Stepper,
    Step,
    StepLabel,
    Paper,
    Container,
    TextField,
    MenuItem,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    Divider,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Cloud as CloudIcon,
    Storage as StorageIcon,
    Description as DescriptionIcon,
    CheckCircle as CheckCircleIcon,
    Send as SendIcon
} from '@mui/icons-material';

// --- DUMMY DATA FOR PROTOTYPE ---

const TENANTS = [
    { id: 't1', name: 'Engineering' },
    { id: 't2', name: 'Marketing' },
    { id: 't3', name: 'Data Science' }
];

const CLOUD_ACCOUNTS = {
    't1': [
        { id: 'aws-prod', name: 'AWS Production', provider: 'AWS' },
        { id: 'aws-dev', name: 'AWS Development', provider: 'AWS' }
    ],
    't2': [
        { id: 'az-mrkt', name: 'Azure Marketing', provider: 'AZURE' }
    ],
    't3': [
        { id: 'gcp-ds', name: 'GCP Analytics', provider: 'GCP' } // Just hypothetical
    ]
};

const SERVICE_CATALOG = {
    'AWS': [
        { id: 'aws-ec2', name: 'Elastic Compute Cloud (EC2)', type: 'COMPUTE', icon: <StorageIcon /> },
        { id: 'aws-s3', name: 'Simple Storage Service (S3)', type: 'STORAGE', icon: <CloudIcon /> },
        { id: 'aws-rds', name: 'Relational Database (RDS)', type: 'DATABASE', icon: <StorageIcon /> }
    ],
    'AZURE': [
        { id: 'az-vm', name: 'Virtual Machine', type: 'COMPUTE', icon: <StorageIcon /> },
        { id: 'az-blob', name: 'Blob Storage', type: 'STORAGE', icon: <CloudIcon /> }
    ]
};

const SERVICE_FORMS = {
    'aws-ec2': [
        { id: 'instance_type', label: 'Instance Type', type: 'select', options: ['t3.micro', 't3.small', 'm5.large', 'c5.xlarge'], helperText: 't3.micro: $0.0104/hr, m5.large: $0.096/hr' },
        { id: 'ami_id', label: 'AMI ID', type: 'text', placeholder: 'ami-0abcdef12345' },
        { id: 'env', label: 'Environment', type: 'select', options: ['Dev', 'Staging', 'Prod'] }
    ],
    'aws-s3': [
        { id: 'bucket_name', label: 'Bucket Name', type: 'text' },
        { id: 'versioning', label: 'Enable Versioning', type: 'select', options: ['Enabled', 'Suspended'] }
    ],
    'az-vm': [
        { id: 'vm_size', label: 'VM Size', type: 'select', options: ['Standard_B1s', 'Standard_D2s_v3'] },
        { id: 'image', label: 'Image', type: 'select', options: ['Ubuntu 20.04', 'Windows Server 2019'] }
    ]

};


const PRICING_MOCK = {
    't3.micro': 10,
    't3.small': 20,
    'm5.large': 80,
    'c5.xlarge': 150,
    'Standard_B1s': 12,
    'Standard_D2s_v3': 95
}


// --- COMPONENTS ---

const steps = ['Select Context', 'Choose Service', 'Configure Details', 'Review & Submit'];

const ResourceRequestWizard = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({
        tenant: '',
        cloudAccount: '',
        serviceId: '',
        provider: '',
        inputs: {},
        costEstimate: 0
    });

    const [validationState, setValidationState] = useState({
        loading: false,
        quotaStatus: null, // 'OK' | 'WARNING' | 'EXCEEDED'
        policyStatus: null, // 'OK' | 'NEEDS_APPROVAL'
        messages: []
    });


    // --- HANDLERS ---

    const handleNext = async () => {
        if (activeStep === 2) {
            // Trigger Validation Simulation before moving to Review
            await simulateValidation();
        }
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => setActiveStep((prev) => prev - 1);

    const simulateValidation = async () => {
        setValidationState(prev => ({ ...prev, loading: true, messages: [] }));

        // Simulate API delay
        await new Promise(r => setTimeout(r, 1500));

        const instance = formData.inputs['instance_type'] || formData.inputs['vm_size'];
        let quota = 'OK';
        let policy = 'OK';
        let msgs = [];
        const cost = PRICING_MOCK[instance] || 0;

        // Logic for demo
        if (cost > 50) {
            policy = 'NEEDS_APPROVAL';
            msgs.push("Policy Triggered: Estimated monthly cost > $50 requires Manager Approval.");
        }

        if (instance === 'c5.xlarge') {
            quota = 'WARNING';
            msgs.push("Quota Warning: You are using 80% of your vCPU limit.");
        }

        setFormData(prev => ({ ...prev, costEstimate: cost }));

        setValidationState({
            loading: false,
            quotaStatus: quota,
            policyStatus: policy,
            messages: msgs
        });
    }

    const handleContextSelect = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
            // Reset subsequent fields
            ...(field === 'tenant' ? { cloudAccount: '', serviceId: '', provider: '', inputs: {} } : {}),
            ...(field === 'cloudAccount' ? { serviceId: '', inputs: {} } : {})
        }));

        if (field === 'cloudAccount') {
            // Find provider
            const accounts = CLOUD_ACCOUNTS[formData.tenant] || [];
            const acc = accounts.find(a => a.id === value);
            if (acc) setFormData(prev => ({ ...prev, provider: acc.provider }));
        }
    };

    const handleInputCheck = (field, value) => {
        setFormData(prev => ({
            ...prev,
            inputs: {
                ...prev.inputs,
                [field]: value
            }
        }));
    }


    // --- STEP CONTENT RENDERING ---

    const renderStep1_Context = () => (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>Where should this resource behave?</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <TextField
                        select
                        fullWidth
                        label="Select Tenant"
                        value={formData.tenant}
                        onChange={(e) => handleContextSelect('tenant', e.target.value)}
                    >
                        {TENANTS.map(t => (
                            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        select
                        fullWidth
                        label="Select Cloud Account"
                        value={formData.cloudAccount}
                        onChange={(e) => handleContextSelect('cloudAccount', e.target.value)}
                        disabled={!formData.tenant}
                    >
                        {(CLOUD_ACCOUNTS[formData.tenant] || []).map(acc => (
                            <MenuItem key={acc.id} value={acc.id}>{acc.name} ({acc.provider})</MenuItem>
                        ))}
                    </TextField>
                </Grid>
            </Grid>
        </Box>
    );

    const renderStep2_Service = () => {
        const services = SERVICE_CATALOG[formData.provider] || [];
        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>Select a Service</Typography>
                <Grid container spacing={2}>
                    {services.map(srv => (
                        <Grid item xs={12} md={4} key={srv.id}>
                            <Card
                                variant="outlined"
                                sx={{
                                    borderColor: formData.serviceId === srv.id ? 'primary.main' : undefined,
                                    borderWidth: formData.serviceId === srv.id ? 2 : 1,
                                    bgcolor: formData.serviceId === srv.id ? 'action.selected' : undefined
                                }}
                            >
                                <CardActionArea onClick={() => setFormData(p => ({ ...p, serviceId: srv.id }))} sx={{ p: 2 }}>
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        {srv.icon}
                                        <Typography variant="subtitle1" mt={1}>{srv.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{srv.type}</Typography>
                                    </Box>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                    {services.length === 0 && <Typography color="text.secondary">Select a valid Cloud Account first.</Typography>}
                </Grid>
            </Box>
        )
    };

    const renderStep3_Configure = () => {
        const fields = SERVICE_FORMS[formData.serviceId] || [];
        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>Configure Resource</Typography>
                <Grid container spacing={3}>
                    {fields.map(field => (
                        <Grid item xs={12} md={6} key={field.id}>
                            <TextField
                                select={field.type === 'select'}
                                fullWidth
                                label={field.label}
                                helperText={field.helperText}
                                value={formData.inputs[field.id] || ''}
                                onChange={(e) => handleInputCheck(field.id, e.target.value)}
                            >
                                {(field.options || []).map(opt => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    ))}
                    {fields.length === 0 && <Typography>No configuration required.</Typography>}
                </Grid>
            </Box>
        )
    };

    const renderStep4_Review = () => {
        if (validationState.loading) {
            return (
                <Box display="flex" flexDirection="column" alignItems="center" mt={6}>
                    <CircularProgress size={60} />
                    <Typography mt={2}>Validating Quota & Policies...</Typography>
                </Box>
            )
        }

        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>Request Summary</Typography>

                <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={6}><Typography color="text.secondary">Tenant:</Typography> {TENANTS.find(t => t.id === formData.tenant)?.name}</Grid>
                        <Grid item xs={6}><Typography color="text.secondary">Cloud:</Typography> {formData.cloudAccount}</Grid>
                        <Grid item xs={6}><Typography color="text.secondary">Service:</Typography> {SERVICE_CATALOG[formData.provider]?.find(s => s.id === formData.serviceId)?.name}</Grid>
                        <Grid item xs={6}><Typography color="text.secondary">Estimated Cost:</Typography> <b>${formData.costEstimate}/month</b></Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2">Configuration:</Typography>
                    <pre>{JSON.stringify(formData.inputs, null, 2)}</pre>
                </Paper>

                <Box mb={2}>
                    {validationState.messages.map((msg, idx) => (
                        <Alert severity={msg.includes('Warning') ? 'warning' : 'info'} key={idx} sx={{ mb: 1 }}>
                            {msg}
                        </Alert>
                    ))}

                    {validationState.policyStatus === 'NEEDS_APPROVAL' && (
                        <Alert severity="info" icon={<CheckCircleIcon />}>
                            Upon submission, this request will require <b>Manager Approval</b>.
                        </Alert>
                    )}
                </Box>
            </Box>
        )
    }

    // --- MAIN RENDER ---

    return (
        <Container maxWidth="md" sx={{ mt: 5, mb: 10 }}>
            {/* PROTOTYPE WARNING */}
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                This is a <strong>simulation</strong> with dummy data. Requests created here will not provision actual cloud resources yet.
            </Alert>

            <Typography variant="h4" gutterBottom fontWeight="bold">New Resource Request</Typography>

            <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
                {steps.map((label) => (
                    <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
            </Stepper>

            <Paper elevation={3} sx={{ p: 4, minHeight: '400px' }}>
                {activeStep === 0 && renderStep1_Context()}
                {activeStep === 1 && renderStep2_Service()}
                {activeStep === 2 && renderStep3_Configure()}
                {activeStep === 3 && renderStep4_Review()}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 5 }}>
                    <Button disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>Back</Button>
                    <Button
                        variant="contained"
                        onClick={activeStep === steps.length - 1 ? () => alert("Submitting Request... (API Hook Here)") : handleNext}
                        disabled={activeStep === 0 && !formData.tenant}
                        startIcon={activeStep === steps.length - 1 ? <SendIcon /> : undefined}
                    >
                        {activeStep === steps.length - 1 ? 'Submit Request' : 'Next'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default ResourceRequestWizard;
