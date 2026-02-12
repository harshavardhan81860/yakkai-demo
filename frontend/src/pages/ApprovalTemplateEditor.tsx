import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Box, Typography, Button, Card, TextField, Grid,
  Avatar, MenuItem, Select, FormControl, InputLabel, Divider, Stack,
  IconButton, Tooltip, Checkbox, FormControlLabel, Paper, Autocomplete,
  LinearProgress, Chip
} from "@mui/material";
import {
  Save, Add, Delete, History, ArrowBack, GroupWork,
  Shield, AccountTree, ManageAccounts, Settings,
  Person, SupervisorAccount, AdminPanelSettings, Info,
  Layers, DragHandle, RemoveCircle
} from "@mui/icons-material";
import { fetchAllUsers } from "../services/usersService";
import { fetchAllRoles } from "../services/rolesService";
import { fetchAllGroups } from "../services/groupsService";
import {
  createApprovalTemplate,
  updateApprovalTemplate,
  getApprovalTemplateDetails,
} from "../services/approvalTemplatesService";
import { fetchAllTenants, TenantRow } from "../services/tenantsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

const ApprovalTemplateEditor = () => {
  const navigate = useNavigate();
  const { templateId: pathTemplateId } = useParams();
  const [params] = useSearchParams();

  const isClone = params.get("clone") === "true";
  const templateId = isClone ? params.get("templateId") : pathTemplateId;
  const isEdit = !!templateId && !isClone;

  const [sourceTemplateName, setSourceTemplateName] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [scope, setScope] = useState<"SYSTEM" | "TENANT">("SYSTEM");
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [defaultSla, setDefaultSla] = useState<number | null>(null);
  const [levels, setLevels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeLevels = (ls: any[]) => ls.map((l, i) => ({ ...l, level_order: i + 1 }));

  const emptyLevel = (order: number) => ({
    level_order: order + 1,
    approval_mode: "MANUAL",
    approval_strategy: "ANY",
    required_approvals: null,
    sla_minutes: null,
    approvers: [],
  });

  const computeRequiredApprovals = (l: any) => {
    if (l.required_approvals !== null) return l.required_approvals;
    if (l.approval_strategy === "ANY") return 1;
    if (l.approval_strategy === "ALL") return Math.max(l.approvers.length, 1);
    const mandatory = l.approvers.filter((a: any) => a.is_mandatory).length;
    return mandatory || 1;
  };

  useEffect(() => {
    Promise.all([fetchAllUsers(), fetchAllRoles(), fetchAllGroups(), fetchAllTenants()]).then(
      ([u, r, g, t]) => {
        setUsers(u.filter((x) => x.is_active));
        setRoles(r.filter((x) => x.is_active));
        setGroups(g.filter((x) => x.is_active));
        setTenants(t.filter((x) => x.is_active));
      }
    );
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!templateId) {
        setLevels([emptyLevel(0)]);
        setLoading(false);
        return;
      }
      try {
        const res = await getApprovalTemplateDetails({ template_id: templateId });
        const t = res.data.template;
        setSourceTemplateName(t.template_name);
        setScope(t.scope || "SYSTEM");
        setSelectedTenant(t.tenant_id || null);
        setDefaultSla(t.default_sla_minutes);
        setLevels(normalizeLevels(t.levels));
        if (isClone) setTemplateName(`${t.template_name}_COPY`);
        else setTemplateName(t.template_name);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [templateId, isClone]);

  const addLevel = () => setLevels(normalizeLevels([...levels, emptyLevel(levels.length)]));
  const removeLevel = (index: number) => {
    if (levels.length === 1) return;
    setLevels(normalizeLevels(levels.filter((_, i) => i !== index)));
  };

  const addApprover = (levelIndex: number, type: "USER" | "ROLE" | "GROUP", value: string) => {
    const updated = [...levels];
    if (updated[levelIndex].approvers.some((a: any) => a.approver_type === type && a.approver_value === value)) return;
    updated[levelIndex].approvers.push({ approver_type: type, approver_value: value, is_mandatory: false });
    setLevels(normalizeLevels(updated));
  };

  const removeApprover = (li: number, ai: number) => {
    const updated = [...levels];
    updated[li].approvers.splice(ai, 1);
    setLevels(normalizeLevels(updated));
  };

  const updateLevel = (li: number, field: string, value: any) => {
    const updated = [...levels];
    updated[li][field] = value;
    setLevels(normalizeLevels(updated));
  };

  const save = async () => {
    if (!templateName.trim()) {
      alert("Template name is required");
      return;
    }
    const payload = {
      template_name: templateName,
      scope: scope,
      tenant_id: scope === "TENANT" ? selectedTenant : null,
      default_sla_minutes: defaultSla,
      levels: normalizeLevels(levels).map((l) => ({
        ...l,
        required_approvals: computeRequiredApprovals(l),
      })),
    };
    try {
      if (isEdit && templateId) await updateApprovalTemplate(templateId, payload);
      else await createApprovalTemplate(payload);
      navigate("/approvals-management/templates");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {isEdit ? "Refine Protocol" : isClone ? "Duplicate Governance" : "Forge New Protocol"}
          </Typography>
          <Typography variant="body2" color="text.secondary">Architecting verification chains for operational integrity</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => navigate("/approvals-management/templates")}>Cancel</Button>
          <Button variant="contained" startIcon={<Save />} onClick={save} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            Release Protocol
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Management", path: "/approvals-management/templates" },
          { label: "Protocols", path: "/approvals-management/templates" },
          { label: isEdit ? "Edit" : "New Editor" }
        ]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <Stack spacing={4}>
          <Card sx={{ p: 4, borderRadius: 4 }}>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Shield fontSize="small" /> Basic Configuration
                </Typography>
                <TextField
                  fullWidth
                  label="Protocol Name *"
                  disabled={isEdit}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Production Infrastructure Change"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Settings fontSize="small" /> Governance Scope
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Scope</InputLabel>
                      <Select
                        value={scope}
                        label="Scope"
                        onChange={(e) => setScope(e.target.value as any)}
                        disabled={isEdit}
                      >
                        <MenuItem value="SYSTEM">Platform Global</MenuItem>
                        <MenuItem value="TENANT">Tenant Specific</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={6}>
                    {scope === "TENANT" && (
                      <Autocomplete
                        size="small"
                        options={tenants}
                        getOptionLabel={(t) => t.display_name}
                        value={tenants.find(t => t.id.toString() === selectedTenant) || null}
                        onChange={(_, v) => setSelectedTenant(v?.id.toString() || null)}
                        disabled={isEdit}
                        renderInput={(p) => <TextField {...p} label="Target Tenant" />}
                      />
                    )}
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={{ xs: 12, md: 12 }}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <History fontSize="small" /> Global SLA Persistence
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Default SLA (Minutes)"
                  value={defaultSla ?? ""}
                  onChange={(e) => setDefaultSla(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Minutes before escalation"
                />
              </Grid>
            </Grid>
          </Card>

          <Typography variant="h6" sx={{ fontWeight: 800, px: 1 }}>Approver Chain Structure</Typography>

          {levels.map((l, i) => (
            <Card key={i} sx={{ p: 0, borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)', overflow: 'visible' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#6C63FF', fontSize: '0.75rem', fontWeight: 800 }}>L{i + 1}</Avatar>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Chain Interval {i + 1}</Typography>
                </Stack>
                <IconButton color="error" disabled={levels.length === 1} onClick={() => removeLevel(i)}><RemoveCircle /></IconButton>
              </Box>

              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {/* Strategy Settings */}
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <Stack spacing={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Decision Strategy</InputLabel>
                        <Select value={l.approval_strategy} label="Decision Strategy" onChange={e => updateLevel(i, "approval_strategy", e.target.value)}>
                          <MenuItem value="ANY">Any Single Approver (OR)</MenuItem>
                          <MenuItem value="ALL">Total Consensus (AND)</MenuItem>
                          <MenuItem value="QUORUM">Weighted Quorum (COUNT)</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        fullWidth
                        size="small"
                        label="Required Count (Optional)"
                        type="number"
                        value={l.required_approvals ?? ""}
                        onChange={e => updateLevel(i, "required_approvals", e.target.value ? Number(e.target.value) : null)}
                      />
                    </Stack>
                  </Grid>

                  {/* Approver Selection */}
                  <Grid size={{ xs: 12, lg: 8 }}>
                    <Stack spacing={2}>
                      <Grid container spacing={1}>
                        <Grid size={4}>
                          <Autocomplete
                            size="small"
                            options={users}
                            getOptionLabel={u => u.username}
                            onChange={(_, v) => v && addApprover(i, "USER", v.username)}
                            renderInput={p => <TextField {...p} label="Inject User" />}
                          />
                        </Grid>
                        <Grid size={4}>
                          <Autocomplete
                            size="small"
                            options={roles}
                            getOptionLabel={r => r.name}
                            onChange={(_, v) => v && addApprover(i, "ROLE", v.name)}
                            renderInput={p => <TextField {...p} label="Inject Role" />}
                          />
                        </Grid>
                        <Grid size={4}>
                          <Autocomplete
                            size="small"
                            options={groups}
                            getOptionLabel={g => g.name}
                            onChange={(_, v) => v && addApprover(i, "GROUP", v.name)}
                            renderInput={p => <TextField {...p} label="Inject Group" />}
                          />
                        </Grid>
                      </Grid>

                      {/* Selected Approvers List */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, p: 2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.1)', minHeight: 60 }}>
                        {l.approvers.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ m: 'auto' }}>No approvers designated for this interval</Typography>}
                        {l.approvers.map((a: any, ai: number) => (
                          <Chip
                            key={ai}
                            avatar={<Avatar sx={{ bgcolor: 'transparent' }}>{a.approver_type === 'USER' ? <Person sx={{ fontSize: 14 }} /> : <GroupWork sx={{ fontSize: 14 }} />}</Avatar>}
                            label={`${a.approver_type}: ${a.approver_value}`}
                            onDelete={() => removeApprover(i, ai)}
                            sx={{
                              bgcolor: a.is_mandatory ? 'rgba(0,217,255,0.1)' : 'rgba(255,255,255,0.05)',
                              borderColor: a.is_mandatory ? '#00D9FF' : 'transparent',
                              borderWidth: 1, borderStyle: 'solid'
                            }}
                            onClick={() => {
                              const u = [...levels];
                              u[i].approvers[ai].is_mandatory = !u[i].approvers[ai].is_mandatory;
                              setLevels(normalizeLevels(u));
                            }}
                          />
                        ))}
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          ))}

          <Button
            fullWidth
            variant="outlined"
            startIcon={<Add />}
            onClick={addLevel}
            sx={{ py: 2, borderRadius: 4, borderStyle: 'dashed', '&:hover': { borderStyle: 'dashed' } }}
          >
            Extend Approval Chain
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default ApprovalTemplateEditor;
