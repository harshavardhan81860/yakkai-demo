import React, { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, Typography, FormControl,
    InputLabel, Select, MenuItem, Switch, FormControlLabel,
    Alert, Stack, CircularProgress, Divider
} from "@mui/material";
import { CloudAccountRow, updateCloudAccount } from "../../services/cloudAccountsService";

interface Props {
    open: boolean;
    onClose: () => void;
    account: CloudAccountRow | null;
    onUpdate: () => void;
}

const AccountEditDialog: React.FC<Props> = ({ open, onClose, account, onUpdate }) => {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Credential Strategy State
    const [strategy, setStrategy] = useState<"inherited" | "own">("inherited");

    // AWS Fields
    const [awsAccountId, setAwsAccountId] = useState("");
    const [awsRole, setAwsRole] = useState("");
    const [awsExternalId, setAwsExternalId] = useState("");

    // Azure Fields
    const [azClientId, setAzClientId] = useState("");
    const [azClientSecret, setAzClientSecret] = useState("");
    const [azTenantId, setAzTenantId] = useState("");
    const [azSubscriptionId, setAzSubscriptionId] = useState("");

    // Read-only info
    const [awsOrgId, setAwsOrgId] = useState("");

    useEffect(() => {
        if (account) {
            setName(account.name || "");
            const meta = account.cred_metadata || {};

            // Determine initial strategy
            const isSub = !!account.parent_id;
            const isInherited = isSub && (meta.auth?.inherits_from_parent !== false && meta.strategy?.source !== "own");
            setStrategy(isInherited ? "inherited" : "own");

            // Pre-fill fields if they exist
            if (account.cloud_provider === "aws") {
                setAwsAccountId(meta.identity?.cloud_id || meta.account_id || "");
                setAwsRole(meta.auth?.role_name || meta.role_name || "");
                setAwsExternalId(meta.auth?.external_id || meta.external_id || "");
                setAwsOrgId(meta.organization_context?.organization_id || meta.organization_id || "N/A");
            } else {
                setAzClientId(meta.auth?.client_id || meta.client_id || "");
                setAzTenantId(meta.auth?.tenant_id || meta.tenant_id || "");
                setAzSubscriptionId(meta.identity?.cloud_id || meta.subscription_id || "");
                // Secret is usually not sent back, so leave empty or placeholder
                setAzClientSecret("");
            }
        }
    }, [account]);

    const handleSave = async () => {
        if (!account) return;
        setLoading(true);
        setError(null);

        try {
            // Construct updated metadata
            // Start with existing to preserve other fields like organization info
            const currentMeta = account.cred_metadata || {};

            const newAuth = { ...currentMeta.auth };
            const newStrategy = { ...currentMeta.strategy };

            if (strategy === "inherited") {
                newAuth.inherits_from_parent = true;
                newStrategy.source = "inherited";
                // Clear specific creds? Optional, but cleaner to keep them in case they toggle back.
                // For now, we just set the flag.
            } else {
                newAuth.inherits_from_parent = false;
                newStrategy.source = "own";

                if (account.cloud_provider === "aws") {
                    newAuth.role_name = awsRole;
                    newAuth.external_id = awsExternalId;
                    // Also update top-level/identity fields if it's a root/standalone
                    if (!isSubAccount) {
                        currentMeta.account_id = awsAccountId;
                    }
                } else {
                    newAuth.client_id = azClientId;
                    newAuth.tenant_id = azTenantId;
                    if (azClientSecret) {
                        newAuth.client_secret = azClientSecret; // Backend handles encryption
                    }
                    // Also update top-level fields if it's a root/standalone
                    if (!isSubAccount) {
                        currentMeta.tenant_id = azTenantId;
                        currentMeta.client_id = azClientId;
                        if (isStandaloneAzure) {
                            currentMeta.subscription_id = azSubscriptionId;
                        }
                    }
                }
            }

            await updateCloudAccount(account.id, {
                name,
                cred_metadata: {
                    ...currentMeta,
                    auth: newAuth,
                    strategy: newStrategy
                }
            });

            onUpdate();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to update account");
        } finally {
            setLoading(false);
        }
    };

    const isSubAccount = !!account?.parent_id;
    const isStandaloneAzure = account?.cloud_provider === 'azure' && !isSubAccount && account?.cred_metadata?.account_type === 'subscription';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{
                sx: {
                    background: "#111827", // Solid Dark Background
                    backgroundImage: "linear-gradient(145deg, #1a2235 0%, #111827 100%)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 3,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                }
            }}
        >
            <DialogTitle>Edit Cloud Account</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="Account Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
                            Cloud Identity
                        </Typography>
                        <Stack spacing={2} sx={{ mb: 3 }}>
                            {account?.cloud_provider === "aws" ? (
                                <>
                                    <TextField
                                        label="AWS Account ID"
                                        size="small"
                                        fullWidth
                                        value={awsAccountId}
                                        disabled
                                        variant="filled"
                                    />
                                    <TextField
                                        label="Organization ID"
                                        size="small"
                                        fullWidth
                                        value={awsOrgId}
                                        disabled
                                        variant="filled"
                                    />
                                </>
                            ) : (
                                <>
                                    <TextField
                                        label="Subscription ID"
                                        size="small"
                                        fullWidth
                                        value={azSubscriptionId}
                                        onChange={(e) => setAzSubscriptionId(e.target.value)}
                                        disabled={!isStandaloneAzure}
                                        helperText={!isStandaloneAzure ? "Inherited from tenant discovery" : "Editable for standalone subscriptions"}
                                        variant={isStandaloneAzure ? "outlined" : "filled"}
                                    />
                                    <TextField
                                        label="Tenant ID"
                                        size="small"
                                        fullWidth
                                        value={azTenantId}
                                        disabled
                                        variant="filled"
                                    />
                                </>
                            )}
                        </Stack>

                        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />

                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                            Credential Settings
                        </Typography>

                        {isSubAccount && (
                            <FormControl component="fieldset" sx={{ mb: 2 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Typography variant="body2" color={strategy === "inherited" ? "primary" : "text.secondary"}>
                                        Inherit from Parent
                                    </Typography>
                                    <Switch
                                        checked={strategy === "own"}
                                        onChange={(e) => setStrategy(e.target.checked ? "own" : "inherited")}
                                    />
                                    <Typography variant="body2" color={strategy === "own" ? "primary" : "text.secondary"}>
                                        Use Own Credentials
                                    </Typography>
                                </Stack>
                            </FormControl>
                        )}

                        {strategy === "own" && (
                            <Box sx={{ mt: 1 }}>
                                {account?.cloud_provider === "aws" ? (
                                    <Stack spacing={2}>
                                        <TextField
                                            label="IAM Role Name"
                                            size="small"
                                            fullWidth
                                            value={awsRole}
                                            onChange={(e) => setAwsRole(e.target.value)}
                                            helperText={isSubAccount ? "The role to assume in this member account" : "The admin role for this management account"}
                                        />
                                        <TextField
                                            label="External ID (Optional)"
                                            size="small"
                                            fullWidth
                                            value={awsExternalId}
                                            onChange={(e) => setAwsExternalId(e.target.value)}
                                        />
                                    </Stack>
                                ) : (
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Client ID"
                                            size="small"
                                            fullWidth
                                            value={azClientId}
                                            onChange={(e) => setAzClientId(e.target.value)}
                                        />
                                        <TextField
                                            label="Client Secret"
                                            type="password"
                                            size="small"
                                            fullWidth
                                            value={azClientSecret}
                                            onChange={(e) => setAzClientSecret(e.target.value)}
                                            placeholder={azClientSecret ? "Has value (leave empty to keep)" : "Enter new secret"}
                                            helperText="Only enter to update the secret"
                                        />
                                    </Stack>
                                )}
                            </Box>
                        )}
                    </Box>

                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading}
                    startIcon={loading && <CircularProgress size={16} />}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AccountEditDialog;
