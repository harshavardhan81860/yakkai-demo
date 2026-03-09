import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Avatar, MenuItem, Select, FormControl, InputLabel, Divider, Stack,
  Autocomplete, Paper
} from "@mui/material";
import {
  Save, Security, Gavel, CheckCircle, Block,
  ArrowBack, Business, Info, Policy as PolicyIcon
} from "@mui/icons-material";
import { createPolicy } from "../services/governanceService";
import { fetchRegistryCatalog } from "../services/registryService";
import { fetchAllTenants } from "../services/tenantsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import GenericResultDialog from "../components/Common/GenericResultDialog";

/* ---------- TYPES ---------- */
type EffectType = "ALLOW" | "DENY";

type RuleState = {
  resource: string | null;
  action: string | null;
  effect: EffectType;
  scope: string | null;
  tenantId: string | null;
};

type ResultState = {
  open: boolean;
  success: boolean;
  message: string;
  policyId?: string;
};

/* ---------- COMPONENT ---------- */
const PermissionPolicyCreate = () => {
  const navigate = useNavigate();

  /* ---------- STATE ---------- */
  const [rule, setRule] = useState<RuleState>({
    resource: null,
    action: null,
    effect: "ALLOW",
    scope: null,
    tenantId: null,
  });

  const [catalog, setCatalog] = useState<Record<string, { actions: string[] }>>({});
  const [tenants, setTenants] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<ResultState>({
    open: false,
    success: false,
    message: "",
  });

  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const catalogRes = await fetchRegistryCatalog();
        setCatalog(catalogRes);

        const tenantRes = await fetchAllTenants();
        setTenants(tenantRes.map((t: any) => ({ id: String(t.id), name: t.name })));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ---------- DERIVED OPTIONS ---------- */
  const resourceOptions = Object.keys(catalog);
  const actionOptions = rule.resource ? catalog[rule.resource]?.actions || [] : [];

  /* ---------- SAVE ---------- */
  const save = async () => {
    if (!rule.resource || !rule.action || !rule.scope) {
      setResult({ open: true, success: false, message: "Please select all required fields" });
      return;
    }

    if (rule.scope === "TENANT" && !rule.tenantId) {
      setResult({ open: true, success: false, message: "Please select tenant" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPolicy({
        resource_type: rule.resource,
        action_name: rule.action,
        effect: rule.effect,
        scope_type: rule.scope,
        ...(rule.scope === "TENANT" ? { scope_id: rule.tenantId! } : {}),
      });

      if (res?.data?.id) {
        setResult({ open: true, success: true, message: "Policy created successfully", policyId: res.data.id });
        return;
      }

      if (res?.data?.policy_id) {
        setResult({ open: true, success: false, message: res.message, policyId: res.data.policy_id });
        return;
      }

      setResult({ open: true, success: false, message: "Failed to create policy" });
    } catch (e) {
      console.error(e);
      setResult({ open: true, success: false, message: "Unexpected error occurred" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Enforce New Policy</Typography>
          <Typography variant="body2" color="text.secondary">Specify resource restrictions and operational guardrails</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Back</Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Permissions", path: "/permissions-management" },
          { label: "Governance Policies", path: "/permissions-management/policy_list" },
          { label: "New Policy" }
        ]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <Card sx={{
          borderRadius: 3,
          boxShadow: 3,
          border: "1px solid",
          borderColor: "divider",
          p: 4
        }}>

          <Grid
            container
            spacing={4}
            sx={(theme) => ({
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: theme.palette.divider
                },
                "&:hover fieldset": {
                  borderColor: theme.palette.text.primary
                },
                "&.Mui-focused fieldset": {
                  borderColor: theme.palette.primary.main
                }
              },
              "& .MuiInputLabel-root": {
                color: theme.palette.text.secondary
              }
            })}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 2,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 1
                }}
              >
                <Security fontSize="small" /> Logic Definition
              </Typography>

              <Stack spacing={3}>
                <Autocomplete
                  options={resourceOptions}
                  value={rule.resource}
                  onChange={(_, v) => setRule({ ...rule, resource: v, action: null })}
                  renderInput={(params) => (
                    <TextField {...params} label="Target Resource Type *" />
                  )}
                />

                <Autocomplete
                  options={actionOptions}
                  value={rule.action}
                  disabled={!rule.resource}
                  onChange={(_, v) => setRule({ ...rule, action: v })}
                  renderInput={(params) => (
                    <TextField {...params} label="Permitted/Restricted Action *" />
                  )}
                />

                <FormControl fullWidth>
                  <InputLabel>Application Effect</InputLabel>
                  <Select
                    value={rule.effect}
                    label="Application Effect"
                    onChange={(e) =>
                      setRule({ ...rule, effect: e.target.value as EffectType })
                    }
                  >
                    <MenuItem value="ALLOW">Explicit Allow</MenuItem>
                    <MenuItem value="DENY">
                      Explicit Deny (Highest Precedence)
                    </MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 2,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 1
                }}
              >
                <Gavel fontSize="small" /> Execution Scope
              </Typography>

              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Enforcement Scope</InputLabel>

                  <Select
                    value={rule.scope || ""}
                    label="Enforcement Scope"
                    onChange={(e) =>
                      setRule({ ...rule, scope: e.target.value, tenantId: null })
                    }
                  >
                    <MenuItem value="SYSTEM">
                      Platform-Wide (System)
                    </MenuItem>

                    <MenuItem value="TENANT">
                      Organization-Specific (Tenant)
                    </MenuItem>
                  </Select>
                </FormControl>

                {rule.scope === "TENANT" && (
                  <Autocomplete
                    options={tenants}
                    getOptionLabel={(t) => t.name}
                    value={tenants.find((t) => t.id === rule.tenantId) || null}
                    onChange={(_, v) =>
                      setRule({ ...rule, tenantId: v?.id || null })
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Select Target Tenant *" />
                    )}
                  />
                )}

                <Box sx={{ pt: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    onClick={save}
                    startIcon={<Save />}
                    sx={(theme) => ({
                      py: 1.5,
                      borderRadius: 3,
                      fontSize: "1rem",
                      fontWeight: 700,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 8px 16px rgba(0,0,0,0.4)"
                          : "0 8px 16px rgba(0,0,0,0.15)"
                    })}
                  >
                    {submitting
                      ? "Establishing Guardrail..."
                      : "Commit Policy"}
                  </Button>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Result Dialog */}
      <GenericResultDialog
        isOpen={result.open}
        success={result.success}
        message={result.message}
        onClose={() => setResult({ ...result, open: false })}
        title={result.success ? "Guardrail Established" : "Configuration Conflict"}
        actions={
          <>
            <Button onClick={() => setResult({ ...result, open: false })}>Stay Here</Button>
            {result.success && (
              <Button variant="contained" onClick={() => navigate("/permissions-management/policy_list")} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
                Return to Catalog
              </Button>
            )}
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, textAlign: 'center' }}>
          <Avatar sx={{
            bgcolor: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
            color: result.success ? '#10B981' : '#F59E0B',
            width: 56, height: 56, mb: 2
          }}>
            {result.success ? <CheckCircle fontSize="large" /> : <Info fontSize="large" />}
          </Avatar>
          <Typography variant="body1">{result.message}</Typography>
          {result.policyId && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Unique Identifier: {result.policyId}
            </Typography>
          )}
        </Box>
      </GenericResultDialog>
    </Box>
  );
};

export default PermissionPolicyCreate;
