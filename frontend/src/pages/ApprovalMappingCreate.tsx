import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, TextField, Grid,
  Avatar, MenuItem, Select, FormControl, InputLabel, Divider, Stack,
  IconButton, Tooltip, Checkbox, FormControlLabel, Paper, Autocomplete,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert
} from "@mui/material";
import {
  Save, Add, Delete, History, ArrowBack, GroupWork,
  Shield, AccountTree, ManageAccounts, Settings,
  Person, SupervisorAccount, AdminPanelSettings, Info,
  Layers, DragHandle, RemoveCircle, Rule, FilterList
} from "@mui/icons-material";
import { createPolicy, fetchOperators } from "../services/approvalMappingService";
import { fetchRegistryCatalog } from "../services/registryService";
import { fetchApprovalTemplates } from "../services/approvalTemplatesService";
import { fetchAllTenants } from "../services/tenantsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

/* ---------- TYPES ---------- */
type Condition = {
  attribute: string;
  operator: string;
  value: string;
};

type Group = {
  id: string;
  operator: "AND" | "OR";
  conditions: Condition[];
};

type RuleState = {
  resource: string | null;
  action: string | null;
  scope: string;
  template: string | null;
  tenant: string | null;
  isMandatory: boolean;
};

type ResultState = {
  open: boolean;
  success: boolean;
  message: string;
};

const ApprovalPolicyCreate = () => {
  const navigate = useNavigate();

  const [rule, setRule] = useState<RuleState>({
    resource: null,
    action: null,
    scope: "SYSTEM",
    template: null,
    tenant: null,
    isMandatory: false,
  });

  const [catalog, setCatalog] = useState<Record<string, { actions: string[] }>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState>({ open: false, success: false, message: "" });

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [catalogRes, tenantsRes, operatorsRes] = await Promise.all([
          fetchRegistryCatalog(),
          fetchAllTenants(),
          fetchOperators(),
        ]);
        setCatalog(catalogRes);
        setTenants(tenantsRes);
        setOperators(operatorsRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadScopedTemplates = async () => {
      const params: any = { is_active: true, scope: rule.scope };
      if (rule.scope === "TENANT") {
        if (!rule.tenant) {
          setTemplates([]);
          return;
        }
        params.tenant_id = rule.tenant;
      }
      try {
        const res = await fetchApprovalTemplates(params);
        setTemplates(res);
      } catch (err) {
        console.error(err);
      }
    };
    loadScopedTemplates();
  }, [rule.scope, rule.tenant]);

  const handleConditionChange = (groupIdx: number, condIdx: number, field: keyof Condition, value: string) => {
    setGroups(groups.map((grp, idx) => {
      if (idx !== groupIdx) return grp;
      return {
        ...grp,
        conditions: grp.conditions.map((cond, cidx) =>
          cidx === condIdx ? { ...cond, [field]: value } : cond
        ),
      };
    }));
  };

  const handleSave = async () => {
    if (!rule.resource || !rule.action || !rule.template) {
      setResult({ open: true, success: false, message: "Please select all required platform bindings" });
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        resource_name: rule.resource,
        action_name: rule.action,
        scope_type: rule.scope,
        scope_id: rule.scope === "TENANT" ? rule.tenant : "",
        template_id: rule.template,
        is_mandatory: rule.isMandatory,
      };
      if (!rule.isMandatory) payload.groups = groups;
      await createPolicy(payload);
      setResult({ open: true, success: true, message: "Approval policy successfully propagated." });
    } catch (e: any) {
      setResult({ open: true, success: false, message: e?.response?.data?.message || "Fabrication failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Design Approval Policy</Typography>
          <Typography variant="body2" color="text.secondary">Architecting operational guardrails through condition-based logic</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Abort</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={submitting} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            {submitting ? "Propagating..." : "Establish Policy"}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Management", path: "/approvals-management" },
          { label: "Mappings", path: "/approvals-management/policy-mapping" },
          { label: "New Designer" }
        ]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ p: 3, borderRadius: 4, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Shield fontSize="small" /> Infrastructure Binding
              </Typography>
              <Stack spacing={3}>
                <Autocomplete
                  options={Object.keys(catalog)}
                  value={rule.resource}
                  onChange={(_, v) => setRule({ ...rule, resource: v, action: null })}
                  renderInput={p => <TextField {...p} label="Target Resource" />}
                />
                <Autocomplete
                  options={rule.resource ? catalog[rule.resource]?.actions || [] : []}
                  value={rule.action}
                  disabled={!rule.resource}
                  onChange={(_, v) => setRule({ ...rule, action: v })}
                  renderInput={p => <TextField {...p} label="Operation Action" />}
                />
                <FormControl component="fieldset">
                  <Typography variant="caption" color="text.secondary" gutterBottom>Enforcement Scope</Typography>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant={rule.scope === 'SYSTEM' ? 'contained' : 'outlined'}
                      onClick={() => setRule({ ...rule, scope: 'SYSTEM', tenant: null })}
                      fullWidth
                    >System Global</Button>
                    <Button
                      variant={rule.scope === 'TENANT' ? 'contained' : 'outlined'}
                      onClick={() => setRule({ ...rule, scope: 'TENANT' })}
                      fullWidth
                    >Tenant Private</Button>
                  </Stack>
                </FormControl>
                {rule.scope === 'TENANT' && (
                  <Autocomplete
                    options={tenants}
                    getOptionLabel={t => t.name}
                    onChange={(_, v) => setRule({ ...rule, tenant: v?.id?.toString() || null })}
                    renderInput={p => <TextField {...p} label="Designated Tenant" />}
                  />
                )}
                <FormControl fullWidth>
                  <InputLabel>Logic Protocol (Template)</InputLabel>
                  <Select value={rule.template || ""} label="Logic Protocol (Template)" onChange={e => setRule({ ...rule, template: e.target.value })}>
                    {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.template_name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Checkbox checked={rule.isMandatory} onChange={e => setRule({ ...rule, isMandatory: e.target.checked })} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Universal Enforcement (Bypasses Predicates)</Typography>}
                />
                {!rule.isMandatory && (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Conditional mode enabled. Define predicates below to target specific sessions.
                  </Alert>
                )}
              </Stack>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ p: 0, borderRadius: 4, height: '100%', bgcolor: 'transparent', border: 'none' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Logical Predicates</Typography>
                {!rule.isMandatory && (
                  <Button startIcon={<Add />} onClick={() => setGroups([...groups, { id: crypto.randomUUID(), operator: "AND", conditions: [{ attribute: "", operator: operators[0]?.value || "", value: "" }] }])}>
                    Design Group
                  </Button>
                )}
              </Box>

              {rule.isMandatory ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 4, borderStyle: 'dashed' }}>
                  <Rule sx={{ fontSize: 48, opacity: 0.1, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">This is a mandatory policy. It will be enforced on all operations matching the resource and action above, regardless of session context.</Typography>
                </Paper>
              ) : (
                <Stack spacing={3}>
                  {groups.length === 0 && (
                    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 4, borderStyle: 'dashed' }}>
                      <FilterList sx={{ fontSize: 48, opacity: 0.1, mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No predicates established. Add a condition group to begin contextual targeting.</Typography>
                    </Paper>
                  )}
                  {groups.map((g, i) => (
                    <Card key={g.id} sx={{ p: 3, borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF' }}>
                            <GroupWork fontSize="small" />
                          </Avatar>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Evaluation Hub {i + 1}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <FormControl size="small" sx={{ width: 100 }}>
                            <Select value={g.operator} onChange={e => setGroups(groups.map((grp, idx) => idx === i ? { ...grp, operator: e.target.value as any } : grp))}>
                              <MenuItem value="AND">AND</MenuItem>
                              <MenuItem value="OR">OR</MenuItem>
                            </Select>
                          </FormControl>
                          <IconButton color="error" size="small" onClick={() => setGroups(groups.filter((_, idx) => idx !== i))}><Delete /></IconButton>
                        </Stack>
                      </Box>
                      <Stack spacing={2}>
                        {g.conditions.map((c, ci) => (
                          <Grid container spacing={2} key={ci} alignItems="center">
                            <Grid size={4}><TextField fullWidth size="small" label="Attribute" value={c.attribute} onChange={e => handleConditionChange(i, ci, "attribute", e.target.value)} /></Grid>
                            <Grid size={3}>
                              <FormControl fullWidth size="small">
                                <Select value={c.operator} onChange={e => handleConditionChange(i, ci, "operator", e.target.value)}>
                                  {operators.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid size={4}><TextField fullWidth size="small" label="Target Value" value={c.value} onChange={e => handleConditionChange(i, ci, "value", e.target.value)} /></Grid>
                            <Grid size={1}>
                              <IconButton size="small" color="error" onClick={() => setGroups(groups.map((grp, idx) => idx === i ? { ...grp, conditions: grp.conditions.filter((_, cidx) => cidx !== ci) } : grp))}>
                                <RemoveCircle fontSize="small" />
                              </IconButton>
                            </Grid>
                          </Grid>
                        ))}
                        <Button startIcon={<Add />} onClick={() => setGroups(groups.map((grp, idx) => idx === i ? { ...grp, conditions: [...grp.conditions, { attribute: "", operator: operators[0]?.value || "", value: "" }] } : grp))} size="small" sx={{ alignSelf: 'flex-start' }}>Condition</Button>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Result Dialog */}
      <Dialog open={result.open} onClose={() => setResult({ ...result, open: false })}>
        <DialogTitle sx={{ fontWeight: 800 }}>{result.success ? "Design Propagated" : "Design Conflict"}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">{result.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setResult({ ...result, open: false })}>Close</Button>
          {result.success && <Button variant="contained" onClick={() => navigate("/approvals-management/policy-mapping")} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>View Policies</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalPolicyCreate;
