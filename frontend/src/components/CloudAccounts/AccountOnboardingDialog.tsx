// src/components/CloudAccounts/AccountOnboardingDialog.tsx
// ── Unified Cloud Onboarding & Discovery ──
// Handles adding new accounts (with auto-org-detection) and 
// incremental discovery for existing organization accounts.

import { useState, useCallback, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Stepper, Step, StepLabel, Typography, Button, Box,
    TextField, Select, MenuItem, FormControl, InputLabel,
    Checkbox, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Avatar,
    CircularProgress, Alert, Stack, Switch, Divider
} from "@mui/material";
import {
    Cloud, CheckCircle, Error as ErrorIcon, ArrowForward,
    ArrowBack, Search, Science, Refresh, Hub
} from "@mui/icons-material";
import {
    discoverCloudAccount, importDiscoveredAccounts,
    discoverNewAccounts, importIncrementalAccounts,
    type DiscoveredAccount, type DiscoveryResult, type ImportResult,
    type AWSCredentials, type AzureCredentials,
} from "../../services/cloudDiscoveryService";
import AccountSelectionTree from "./AccountSelectionTree";


/* ── Props ── */
interface Props {
    open: boolean;
    onClose: () => void;
    tenantId: string;
    onImportComplete?: () => void;
    // If initialAccountId is provided, we are in "Discovery Only" mode for an existing org
    initialAccountId?: string;
    initialProvider?: "aws" | "azure";
}

const STEPS = [
    "Provider",
    "Credentials",
    "Analyze",
    "Select Accounts",
    "Finalize",
];

const providerColors: Record<string, string> = {
    aws: "#FF9900",
    azure: "#0078D4",
};

const glassCard = {
    background: "linear-gradient(145deg, rgba(17,24,39,0.95) 0%, rgba(17,24,39,0.8) 100%)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 3,
    p: 2.5,
    mb: 2,
};

const AccountOnboardingDialog = ({
    open, onClose, tenantId, onImportComplete,
    initialAccountId, initialProvider
}: Props) => {
    const isDiscoveryOnly = !!initialAccountId;

    // onboarding mode
    const [onboardingType, setOnboardingType] = useState<"root" | "member">("root");
    const [parentAccounts, setParentAccounts] = useState<any[]>([]);
    const [selectedParentId, setSelectedParentId] = useState<string>("");

    // wizard state
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 0 – provider
    const [provider, setProvider] = useState<"aws" | "azure">(initialProvider || "aws");

    // ── MVP TEST MODE (remove for production) ──
    const [testMode, setTestMode] = useState(false);

    // Step 1 – credentials
    const [awsCreds, setAwsCreds] = useState<AWSCredentials>({
        account_id: "", role_name: "", external_id: "",
    });
    const [azureCreds, setAzureCreds] = useState<AzureCredentials>({
        tenant_id: "", client_id: "", client_secret: "",
    });
    // Step 1 - Account Name (optional/custom)
    const [accountName, setAccountName] = useState("");

    // Step 2/3 – discovery results
    const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Step 4 – import result
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // Fetch existing parents for selection
    const loadParents = async () => {
        try {
            const data = await import("../../services/cloudAccountsService").then(m => m.fetchCloudAccounts(tenantId));
            const potentialParents = data.filter((a: any) =>
                a.cloud_provider === provider &&
                (!a.parent_id || a.cred_metadata?.account_type === 'management' || a.cred_metadata?.account_type === 'tenant')
            );
            setParentAccounts(potentialParents);
        } catch (err) {
            console.error("Failed to load parent accounts", err);
        }
    };

    useEffect(() => {
        if (open) {
            loadParents();
        }
    }, [open, provider]);

    // Effect to handle discovery-only mode
    useEffect(() => {
        const initDiscoveryOnly = async () => {
            if (open && isDiscoveryOnly && initialAccountId) {
                setStep(2); // Jump to Analyze step

                // Fetch details to populate locks in Step 1
                try {
                    const data = await import("../../services/cloudAccountsService").then(m => m.fetchCloudAccountById(tenantId, initialAccountId));
                    const meta = data.cred_metadata;
                    if (data.cloud_provider === "aws") {
                        setAwsCreds({
                            account_id: meta.account_id || "",
                            role_name: meta.role_name || meta.auth?.role_name || "",
                            external_id: meta.external_id || meta.auth?.external_id || ""
                        });
                    } else {
                        setAzureCreds({
                            tenant_id: meta.tenant_id || "",
                            client_id: meta.client_id || "",
                            client_secret: "" // Don't fetch secret
                        });
                    }
                } catch (err) {
                    console.error("Failed to fetch initial account details", err);
                }

                // Auto-run discovery scan
                runDiscovery();
            }
        };
        initDiscoveryOnly();
    }, [open, isDiscoveryOnly, initialAccountId]);

    const handleParentChange = (parentId: string) => {
        setSelectedParentId(parentId);
        const parent = parentAccounts.find(p => p.id === parentId);
        if (parent && parent.cred_metadata) {
            const meta = parent.cred_metadata;
            if (provider === "aws") {
                setAwsCreds(prev => ({
                    ...prev,
                    role_name: meta.role_name || meta.auth?.role_name || "",
                    external_id: meta.external_id || meta.auth?.external_id || ""
                }));
            } else {
                setAzureCreds(prev => ({
                    ...prev,
                    tenant_id: meta.tenant_id || "",
                    client_id: meta.client_id || ""
                }));
            }
        }
    };

    const resetWizard = useCallback(() => {
        setStep(0);
        setLoading(false);
        setError(null);
        setProvider(initialProvider || "aws");
        setTestMode(false);
        setOnboardingType("root");
        setSelectedParentId("");
        setAwsCreds({ account_id: "", role_name: "", external_id: "" });
        setAzureCreds({ tenant_id: "", client_id: "", client_secret: "" });
        setDiscoveryResult(null);
        setSelectedIds(new Set());
        setImportResult(null);
    }, [initialProvider]);

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    // Effect to handle Test Mode auto-population
    useEffect(() => {
        if (testMode) {
            if (provider === "aws") {
                setAwsCreds({
                    account_id: "123456789012",
                    role_name: "YakkAI-ExecutionRole",
                    external_id: "demo-external-id"
                });
            } else {
                setAzureCreds({
                    tenant_id: "e8281350-13f5-4422-92a1-1234567890ab",
                    client_id: "b7f8e910-1234-4567-890a-bcdef1234567",
                    client_secret: "demo-client-secret"
                });
            }

            // If member onboarding and no parent selected, pick/create a dummy parent
            if (onboardingType === "member") {
                if (parentAccounts.length === 0) {
                    const dummyId = "dummy-parent-id";
                    setParentAccounts([{
                        id: dummyId,
                        name: "Demo Organization",
                        cloud_provider: provider,
                        cred_metadata: provider === "aws"
                            ? { account_id: "111122223333", role_name: "ManagementRole", account_type: "management" }
                            : { tenant_id: "e8281350-13f5-4422-92a1-1234567890ab", client_id: "b7f8e910-1234-4567-890a-bcdef1234567", account_type: "tenant" }
                    }]);
                    setSelectedParentId(dummyId);
                } else if (!selectedParentId) {
                    setSelectedParentId(parentAccounts[0].id);
                    handleParentChange(parentAccounts[0].id);
                }
            }
        } else {
            // Optional: reset if was in test mode?
            // Avoid resetting if it's already empty to prevent infinite loops if not careful,
            // but here it's fine.
            if (awsCreds.account_id === "123456789012") {
                setAwsCreds({ account_id: "", role_name: "", external_id: "" });
            }
            if (azureCreds.tenant_id === "e8281350-13f5-4422-92a1-1234567890ab") {
                setAzureCreds({ tenant_id: "", client_id: "", client_secret: "" });
            }
        }
    }, [testMode, provider, onboardingType, parentAccounts.length]); // parentAccounts.length added

    const runDiscovery = async () => {
        setLoading(true);
        setError(null);
        try {
            let result: DiscoveryResult;
            if ((isDiscoveryOnly && initialAccountId) || (onboardingType === "member" && selectedParentId)) {
                const targetId = isDiscoveryOnly ? initialAccountId! : selectedParentId!;
                result = await discoverNewAccounts(targetId, testMode);
            } else {
                result = await discoverCloudAccount(
                    tenantId,
                    provider,
                    provider === "aws" ? awsCreds : undefined,
                    provider === "azure" ? azureCreds : undefined,
                    testMode,
                );
            }
            setDiscoveryResult(result);

            // Pre-select new accounts
            const ids = new Set<string>();
            result.discovered_accounts?.forEach((a) => {
                if (!a.already_imported) {
                    ids.add(a.account_id || a.subscription_id || a.management_group_id || a.organizational_unit_id || a.name);
                }
            });
            setSelectedIds(ids);

            // If it's a standalone account, jump straight to finalize (or simple selection)
            // If it's an organization, stay in Analyze step so user can review the "ask"
            if (!result.is_organization) {
                setStep(3);
            }
        } catch (err: any) {
            setError(err?.response?.data?.detail || err?.message || "Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    const runImport = async () => {
        setLoading(true);
        setError(null);
        try {
            let result: ImportResult;
            if (isDiscoveryOnly && initialAccountId && discoveryResult) {
                // For incremental import, we send the selected accounts array
                const accountsToImport = discoveryResult.discovered_accounts
                    .filter(a => selectedIds.has(a.account_id || a.subscription_id || a.name));

                result = await importIncrementalAccounts(initialAccountId, accountsToImport, testMode);
            } else {
                // Helper to inject user-provided name for the root account
                let finalDiscoveredAccounts = discoveryResult?.discovered_accounts ? [...discoveryResult.discovered_accounts] : [];

                // If user provided a name, ensure the root/tenant account in the list has this name
                if (accountName && !isDiscoveryOnly && onboardingType === "root") {
                    if (provider === "aws") {
                        // Find management account
                        const rootId = awsCreds.account_id;
                        const rootIdx = finalDiscoveredAccounts.findIndex(a => a.account_id === rootId);
                        if (rootIdx >= 0) {
                            finalDiscoveredAccounts[rootIdx] = { ...finalDiscoveredAccounts[rootIdx], name: accountName };
                        } else {
                            // If not found (unlikely for mgmt account?), append it so backend sees it
                            finalDiscoveredAccounts.push({
                                account_id: rootId,
                                name: accountName,
                                already_imported: false,
                                // Add other required fields if needed by backend, though backend mostly checks account_id match
                            } as any);
                        }
                    } else if (provider === "azure") {
                        // Azure Tenant is often not in the list of subscriptions
                        // We append a "fake" entry for the tenant to carry the name
                        const tenantId = azureCreds.tenant_id;
                        // Check if it exists (unlikely)
                        const idx = finalDiscoveredAccounts.findIndex(a => a.account_id === tenantId); // Tenant usually doesn't have account_id in this context, but check anyway
                        if (idx >= 0) {
                            finalDiscoveredAccounts[idx] = { ...finalDiscoveredAccounts[idx], name: accountName };
                        } else {
                            // Append special tenant entry
                            finalDiscoveredAccounts.push({
                                account_id: tenantId, // Use this for ID matching override
                                name: accountName,
                                type: 'tenant',
                                already_imported: false
                            } as any);
                        }
                    }
                }

                result = await importDiscoveredAccounts(
                    tenantId,
                    provider,
                    selectedIds.size > 0 ? "add_selected" : "add_all",
                    Array.from(selectedIds),
                    provider === "aws" ? awsCreds : undefined,
                    provider === "azure" ? azureCreds : undefined,
                    testMode,
                    finalDiscoveredAccounts // Pass the modified list
                );
            }
            setImportResult(result);
            setStep(4);
        } catch (err: any) {
            setError(err?.response?.data?.detail || err?.message || "Import failed");
        } finally {
            setLoading(false);
        }
    };

    const handleTreeToggle = (ids: string[], selected: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach(id => selected ? next.add(id) : next.delete(id));
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (!discoveryResult) return;
        const allNew = discoveryResult.discovered_accounts
            .filter((a) => !a.already_imported)
            .map((a) => a.account_id || a.subscription_id || a.management_group_id || a.organizational_unit_id || a.name);

        if (selectedIds.size === allNew.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allNew));
        }
    };

    const canProceedStep = (): boolean => {
        if (step === 0) return true;
        if (step === 1) {
            if (testMode) return true;
            if (onboardingType === "member") return !!selectedParentId;
            if (provider === "aws") return !!(awsCreds.account_id && awsCreds.role_name);
            return !!(azureCreds.tenant_id && azureCreds.client_id && azureCreds.client_secret);
        }
        if (step === 3) {
            // Can proceed if it's a standalone result or if we selected at least one
            return (discoveryResult && !discoveryResult.is_organization) || selectedIds.size > 0;
        }
        return false;
    };

    const handleNext = () => {
        if (step === 0) setStep(1);
        else if (step === 1) setStep(2);
        else if (step === 2) {
            if (discoveryResult) setStep(3);
            else runDiscovery();
        }
        else if (step === 3) runImport();
    };

    const handleBack = () => {
        setError(null);
        if (step === 2 && isDiscoveryOnly) onClose();
        else setStep(Math.max(0, step - 1));
    };

    /* ── Render Helpers ── */

    const renderProviderStep = () => (
        <Box>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
                Select your Cloud Provider
            </Typography>
            <Stack direction="row" spacing={3}>
                {(["aws", "azure"] as const).map((p) => (
                    <Box
                        key={p}
                        onClick={() => setProvider(p)}
                        sx={{
                            flex: 1,
                            cursor: "pointer",
                            p: 3,
                            borderRadius: 3,
                            textAlign: "center",
                            bgcolor: provider === p ? `${providerColors[p]}15` : "rgba(255,255,255,0.03)",
                            border: `2px solid ${provider === p ? providerColors[p] : "transparent"}`,
                            transition: "all 0.2s",
                            "&:hover": { bgcolor: "rgba(255,255,255,0.05)" }
                        }}
                    >
                        <Avatar sx={{
                            width: 56, height: 56, mx: "auto", mb: 2,
                            bgcolor: providerColors[p], fontSize: 24, fontWeight: 800
                        }}>
                            {p === "aws" ? "A" : "Az"}
                        </Avatar>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {p === "aws" ? "Amazon Web Services" : "Microsoft Azure"}
                        </Typography>
                    </Box>
                ))}
            </Stack>

            <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.06)" }} />

            <Box sx={{
                ...glassCard,
                border: testMode ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.08)",
                background: testMode
                    ? "linear-gradient(145deg, rgba(245,158,11,0.08) 0%, rgba(17,24,39,0.95) 100%)"
                    : glassCard.background,
            }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Science sx={{ color: testMode ? "#F59E0B" : "text.secondary" }} />
                    <Box flex={1}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            🧪 Demo Mode
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Use simulated data to try the discovery flow without real credentials.
                        </Typography>
                    </Box>
                    <Switch
                        checked={testMode}
                        onChange={(e) => setTestMode(e.target.checked)}
                        color="warning"
                    />
                </Stack>
            </Box>
        </Box>
    );

    const renderCredentialsStep = () => (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Is this a new root account or a member of an existing {provider === 'azure' ? 'tenant' : 'organization'}?
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                <Button
                    variant={onboardingType === "root" ? "contained" : "outlined"}
                    onClick={() => setOnboardingType("root")}
                    sx={{ flex: 1, py: 1.5 }}
                    startIcon={<Cloud />}
                >
                    New Root / Standalone
                </Button>
                <Button
                    variant={onboardingType === "member" ? "contained" : "outlined"}
                    onClick={() => setOnboardingType("member")}
                    sx={{ flex: 1, py: 1.5 }}
                    startIcon={<Hub />}
                >
                    Member of Existing {provider === 'azure' ? 'Tenant' : 'Org'}
                </Button>
            </Stack>

            {onboardingType === "member" && (
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Select Parent Organization</InputLabel>
                    <Select
                        value={selectedParentId}
                        label="Select Parent Organization"
                        onChange={(e) => handleParentChange(e.target.value)}
                    >
                        {parentAccounts.map(p => (
                            <MenuItem key={p.id} value={p.id}>
                                {p.name} ({p.cred_metadata?.account_id || p.cred_metadata?.tenant_id || p.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {onboardingType === "root" && !isDiscoveryOnly ? (
                <>
                    <TextField
                        fullWidth label="Account Name" placeholder="e.g. Production AWS, Corp Azure Tenant"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        margin="normal"
                        required
                    />
                    {provider === "aws" ? (
                        <Stack spacing={2.5}>
                            <TextField
                                fullWidth label="AWS Account ID" placeholder="12 digit identifier"
                                value={awsCreds.account_id}
                                onChange={(e) => setAwsCreds({ ...awsCreds, account_id: e.target.value })}
                            />
                            <TextField
                                fullWidth label="IAM Role Name" placeholder="DeploymentRole"
                                value={awsCreds.role_name}
                                onChange={(e) => setAwsCreds({ ...awsCreds, role_name: e.target.value })}
                            />
                            <TextField
                                fullWidth label="External ID (Optional)" placeholder="For cross-account role assumption"
                                value={awsCreds.external_id}
                                onChange={(e) => setAwsCreds({ ...awsCreds, external_id: e.target.value })}
                            />
                        </Stack>
                    ) : (
                        <Stack spacing={2.5}>
                            <Typography variant="caption" color="warning.main" sx={{ mb: 1 }}>
                                Note: Azure Tenant is a root container and does not hold resources directly.
                            </Typography>
                            <TextField
                                fullWidth label="Azure Tenant ID"
                                value={azureCreds.tenant_id}
                                onChange={(e) => setAzureCreds({ ...azureCreds, tenant_id: e.target.value })}
                            />
                            <TextField
                                fullWidth label="Client ID"
                                value={azureCreds.client_id}
                                onChange={(e) => setAzureCreds({ ...azureCreds, client_id: e.target.value })}
                            />
                            <TextField
                                fullWidth label="Client Secret" type="password"
                                value={azureCreds.client_secret}
                                onChange={(e) => setAzureCreds({ ...azureCreds, client_secret: e.target.value })}
                                helperText="Optional. Leave empty if using other auth methods."
                            />
                        </Stack>
                    )}
                </>
            ) : (
                <Box sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Typography variant="subtitle2" gutterBottom>
                        {isDiscoveryOnly ? "Account Credentials" : "Inherited Parent Credentials"}
                    </Typography>
                    {provider === "aws" ? (
                        <Stack spacing={1}>
                            <Typography variant="body2">Account ID: <b>{awsCreds.account_id}</b></Typography>
                            <Typography variant="body2">Role: <b>{awsCreds.role_name}</b></Typography>
                            {awsCreds.external_id && <Typography variant="body2">External ID: <b>{awsCreds.external_id}</b></Typography>}
                        </Stack>
                    ) : (
                        <Stack spacing={1}>
                            <Typography variant="body2">Tenant: <b>{azureCreds.tenant_id}</b></Typography>
                            <Typography variant="body2">Client ID: <b>{azureCreds.client_id}</b></Typography>
                        </Stack>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {isDiscoveryOnly
                            ? "Discovery will be performed using these stored credentials."
                            : "Members will be discovered automatically using these credentials. No manual ID entry required."
                        }
                    </Typography>
                </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={16} /> : <Science />}
                    onClick={runDiscovery}
                    disabled={!canProceedStep() || loading}
                >
                    {onboardingType === "member" || isDiscoveryOnly ? "Discover Members" : "Test Connection"}
                </Button>
            </Box>
        </Box>
    );

    const renderAnalyzeStep = () => (
        <Box sx={{ textAlign: "center", py: 4 }}>
            {loading ? (
                <>
                    <CircularProgress size={64} sx={{ color: providerColors[provider], mb: 3 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        Analyzing Environment…
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Connecting to {provider.toUpperCase()} and detecting organization structure
                    </Typography>
                </>
            ) : (
                <>
                    {discoveryResult?.is_organization ? (
                        <Box sx={{ ...glassCard, border: `1px solid ${providerColors[provider]}44` }}>
                            <Hub sx={{ fontSize: 64, color: providerColors[provider], mb: 2 }} />
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                {provider === 'aws' ? 'AWS Organization' : 'Azure Tenant'} Detected!
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                We've successfully connected to <b>{discoveryResult.management_account_name}</b> and identified a hierarchical environment.
                            </Typography>
                            <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', p: 2, borderRadius: 2, textAlign: 'left', mb: 3 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
                                    Discovery Summary
                                </Typography>
                                <Stack direction="row" spacing={3}>
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">{discoveryResult.total_discovered}</Typography>
                                        <Typography variant="caption">Total Members</Typography>
                                    </Box>
                                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">
                                            {discoveryResult.discovered_accounts.filter(a => !a.already_imported).length}
                                        </Typography>
                                        <Typography variant="caption">New Found</Typography>
                                    </Box>
                                </Stack>
                            </Box>
                            <Typography variant="body2" sx={{ mb: 3 }}>
                                Do you want to onboard the discovered accounts and structure?
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Search sx={{ fontSize: 64, color: providerColors[provider], mb: 2 }} />
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                {discoveryResult ? "Analysis Complete" : "Ready to Analyze"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {discoveryResult
                                    ? `This appears to be a standalone account. Proceed to finish onboarding.`
                                    : `We will scan your account to identify if it's a standalone environment or an organization root. Member accounts will be suggested for import.`
                                }
                            </Typography>
                        </>
                    )}

                    <Button
                        variant="contained"
                        size="large"
                        startIcon={discoveryResult ? <ArrowForward /> : <Search />}
                        onClick={discoveryResult ? handleNext : runDiscovery}
                        sx={{
                            px: 5, py: 1.5, minWidth: 200,
                            background: discoveryResult
                                ? "linear-gradient(135deg, #10B981, #059669)"
                                : `linear-gradient(135deg, ${providerColors[provider]}, ${providerColors[provider]}dd)`,
                        }}
                    >
                        {discoveryResult ? (discoveryResult.is_organization ? "Continue to Selection" : "Proceed") : "Start Analysis"}
                    </Button>
                </>
            )}
        </Box>
    );

    const renderSelectionStep = () => {
        if (!discoveryResult) return null;

        // If not an organization, show a simple confirmation
        if (!discoveryResult.is_organization) {
            return (
                <Box sx={{ textAlign: "center", py: 4 }}>
                    <CheckCircle sx={{ fontSize: 64, color: "#10B981", mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        Standalone Environment Detected
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        This is a standalone account. Click Next to finish onboarding.
                    </Typography>
                </Box>
            );
        }

        const accounts = discoveryResult.discovered_accounts;
        const newAccounts = accounts.filter((a) => !a.already_imported);

        return (
            <Box>
                <Box sx={{ ...glassCard, mb: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: `${providerColors[provider]}22`, color: providerColors[provider] }}>
                            <Hub />
                        </Avatar>
                        <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {provider === 'azure' ? "Azure Tenant" : "Organization Root"}: {discoveryResult.management_account_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {discoveryResult.total_discovered} {provider === 'azure' ? "subscriptions" : "accounts"} found in hierarchy
                            </Typography>
                        </Box>
                        <Button size="small" onClick={toggleSelectAll}>
                            {selectedIds.size === newAccounts.length ? "Deselect All" : "Select All"}
                        </Button>
                    </Stack>
                </Box>

                <Paper sx={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", maxHeight: 400, overflow: 'auto' }}>
                    <AccountSelectionTree
                        accounts={accounts}
                        selectedIds={selectedIds}
                        onToggle={handleTreeToggle}
                        provider={provider}
                    />
                </Paper>
            </Box >
        );
    };

    const renderFinalizeStep = () => {
        if (!importResult) return null;
        return (
            <Box sx={{ textAlign: "center", py: 4 }}>
                <CheckCircle sx={{ fontSize: 72, color: "#10B981", mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Success!</Typography>
                <Typography variant="body1" color="text.secondary">
                    {importResult.message}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 2 }}>
                    <Box sx={glassCard}>
                        <Typography variant="h4" fontWeight="bold" color="success.main">{importResult.accounts_created}</Typography>
                        <Typography variant="caption">Imported</Typography>
                    </Box>
                </Box>
            </Box>
        );
    };

    /* ── Main Render ── */
    const renderStepContent = () => {
        switch (step) {
            case 0: return renderProviderStep();
            case 1: return renderCredentialsStep();
            case 2: return renderAnalyzeStep();
            case 3: return renderSelectionStep();
            case 4: return renderFinalizeStep();
            default: return null;
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
            PaperProps={{
                sx: {
                    minHeight: 480,
                    background: "#111827", // Solid Dark Background to fix transparency
                    backgroundImage: "linear-gradient(145deg, #1a2235 0%, #111827 100%)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 3,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                }
            }}>

            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: `${providerColors[provider]}15`, color: providerColors[provider] }}>
                        <Cloud />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">
                            {isDiscoveryOnly ? "Discover New Accounts" : "Add Cloud Account"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {isDiscoveryOnly ? `Find ${provider === 'azure' ? 'subscriptions' : 'accounts'} in your ${provider === 'azure' ? 'tenant' : 'organization'}` : "Onboard your cloud environment"}
                        </Typography>
                    </Box>
                    {testMode && <Chip label="🧪 DEMO" color="warning" size="small" sx={{ ml: "auto !important" }} />}
                </Stack>
            </DialogTitle>

            <Box sx={{ px: 3, py: 1 }}>
                <Stepper activeStep={step} alternativeLabel>
                    {STEPS.map((label, i) => (
                        <Step key={label} completed={step > i}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            <DialogContent sx={{ minHeight: 300 }}>
                {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
                {renderStepContent()}
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                {step < 4 ? (
                    <>
                        <Button onClick={handleClose} color="inherit" sx={{ mr: "auto" }}>Cancel</Button>
                        {step > 0 && step !== 2 && <Button onClick={handleBack} startIcon={<ArrowBack />} color="inherit">Back</Button>}
                        {step !== 2 && (
                            <Button variant="contained" onClick={handleNext} disabled={!canProceedStep() || loading}
                                endIcon={loading ? <CircularProgress size={16} /> : <ArrowForward />}
                                sx={{ background: `linear-gradient(135deg, ${providerColors[provider]}, ${providerColors[provider]}dd)` }}>
                                {step === 3 ? "Import Accounts" : "Next"}
                            </Button>
                        )}
                    </>
                ) : (
                    <Button variant="contained" onClick={() => { handleClose(); onImportComplete?.(); }}
                        sx={{ px: 4, background: "linear-gradient(135deg, #10B981, #059669)" }}>
                        View Accounts
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default AccountOnboardingDialog;
