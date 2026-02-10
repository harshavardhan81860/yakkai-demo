import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, TextField, Grid,
  Avatar, MenuItem, Select, FormControl, InputLabel, Divider, Stack,
  IconButton, Tooltip, Alert, Paper, LinearProgress, Chip
} from "@mui/material";
import {
  Send, Assignment, Add, Delete, History, Info,
  ArrowBack, Code, Person, Group, AdminPanelSettings,
  Security, Speed
} from "@mui/icons-material";
import { fetchApprovalTemplates } from "../services/approvalTemplatesService";
import { submitApprovalRequest } from "../services/approvalRequestsService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

type Template = {
  id: string;
  template_name: string;
  version: number;
  is_active: boolean;
  default_sla_minutes?: number;
  levels?: any[];
};

type ExplicitApprover = {
  approver_type: "USER" | "ROLE" | "GROUP";
  approver_value: string;
};

const ApprovalRequestCreate = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [requestPayload, setRequestPayload] = useState(JSON.stringify({ reason: "System Change Request" }, null, 2));
  const [explicitApprovers, setExplicitApprovers] = useState<ExplicitApprover[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      setInitLoading(true);
      try {
        const res: any = await fetchApprovalTemplates();
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setTemplates(list.filter((t: any) => t.is_active));
      } catch (err) {
        console.error(err);
      } finally {
        setInitLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const onTemplateSelect = (id: string) => {
    const t = templates.find((x) => x.id === id) || null;
    setSelectedTemplate(t);
  };

  const addApprover = () => setExplicitApprovers(prev => [...prev, { approver_type: "USER", approver_value: "" }]);
  const updateApprover = (index: number, field: keyof ExplicitApprover, value: string) => {
    const copy = [...explicitApprovers];
    copy[index] = { ...copy[index], [field]: value };
    setExplicitApprovers(copy);
  };
  const removeApprover = (index: number) => setExplicitApprovers(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(requestPayload);
    } catch {
      setError("Payload validation failed: Invalid JSON structure detected.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await submitApprovalRequest({
        template_id: selectedTemplate.id,
        template_version: selectedTemplate.version,
        request_payload: parsedPayload,
        explicit_approvers: explicitApprovers.filter(a => a.approver_value.trim() !== ""),
      });
      setResponse("Request submitted successfully. Global ID: " + (res.data?.request_id || res.data));
      setTimeout(() => navigate("/approvals/requests"), 2000);
    } catch (err: any) {
      setError(err?.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Initiate Approval</Typography>
          <Typography variant="body2" color="text.secondary">Trigger a new gated operation through established workflows</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Abort</Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Approvals", path: "/approvals/requests" },
          { label: "New Request" }
        ]} />
      </Box>

      {initLoading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ p: 3, height: '100%', borderRadius: 4 }}>
              <Typography variant="subtitle2" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment fontSize="small" color="primary" /> Workflow Context
              </Typography>
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Active Protocol Template</InputLabel>
                  <Select
                    value={selectedTemplate?.id || ""}
                    label="Active Protocol Template"
                    onChange={(e) => onTemplateSelect(e.target.value)}
                  >
                    {templates.map((t) => (
                      <MenuItem key={t.id} value={t.id}>{t.template_name} (v{t.version})</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedTemplate && (
                  <Paper sx={{ p: 2, bgcolor: 'rgba(108,99,255,0.05)', borderRadius: 2, border: '1px solid rgba(108,99,255,0.1)' }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Process Name</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{selectedTemplate.template_name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Version</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Rev {selectedTemplate.version}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Gated Levels</Typography>
                        <Chip label={`${selectedTemplate.levels?.length || 0} Levels`} size="small" variant="outlined" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Active SLA</Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Speed sx={{ fontSize: 14, color: '#00D9FF' }} />
                          <Typography variant="body2" sx={{ color: '#00D9FF', fontWeight: 700 }}>{selectedTemplate.default_sla_minutes ? `${selectedTemplate.default_sla_minutes}m` : 'Unbounded'}</Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </Paper>
                )}

                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Injected Approvers</Typography>
                <Stack spacing={2}>
                  {explicitApprovers.map((a, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                      <FormControl size="small" sx={{ width: 120 }}>
                        <Select value={a.approver_type} onChange={e => updateApprover(i, "approver_type", e.target.value as any)}>
                          <MenuItem value="USER">User</MenuItem>
                          <MenuItem value="ROLE">Role</MenuItem>
                          <MenuItem value="GROUP">Group</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField size="small" fullWidth placeholder="Identity ID" value={a.approver_value} onChange={e => updateApprover(i, "approver_value", e.target.value)} />
                      <IconButton size="small" color="error" onClick={() => removeApprover(i)}><Delete /></IconButton>
                    </Box>
                  ))}
                  <Button startIcon={<Add />} onClick={addApprover} sx={{ justifyContent: 'flex-start', color: '#6C63FF' }}>Add Override</Button>
                </Stack>
              </Stack>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ p: 3, height: '100%', borderRadius: 4, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Code fontSize="small" color="secondary" /> Request Metadata (JSON)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={12}
                value={requestPayload}
                onChange={(e) => setRequestPayload(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    bgcolor: 'rgba(0,0,0,0.2)',
                    color: '#64B5F6'
                  }
                }}
              />
              <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={loading || !selectedTemplate}
                  onClick={handleSubmit}
                  startIcon={<Send />}
                  sx={{
                    py: 1.5,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg,#6C63FF,#4A42D4)',
                    boxShadow: '0 8px 16px rgba(108,99,255,0.2)'
                  }}
                >
                  {loading ? "Transmitting..." : "Propagate for Approval"}
                </Button>
              </Box>

              {response && <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>{response}</Alert>}
              {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ApprovalRequestCreate;
