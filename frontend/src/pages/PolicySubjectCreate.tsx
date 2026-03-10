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
  ArrowBack, Business, Info, Policy as PolicyIcon,
  Person, Group, AdminPanelSettings
} from "@mui/icons-material";
import {
  fetchPolicies,
  createPolicySubject,
} from "../services/governanceService";
import { fetchAllUsers } from "../services/usersService";
import { fetchAllGroups } from "../services/groupsService";
import { fetchAllRoles } from "../services/rolesService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

/* ---------- TYPES ---------- */
type SubjectType = "USER" | "GROUP" | "ROLE";

type FormState = {
  policyId: string | null;
  subjectType: SubjectType | null;
  subjectId: string | null;
};

type ResultState = {
  open: boolean;
  success: boolean;
  message: string;
  subjectId?: string;
};

/* ---------- COMPONENT ---------- */
const PolicySubjectCreate = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    policyId: null,
    subjectType: "USER",
    subjectId: null,
  });

  const [policies, setPolicies] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<ResultState>({
    open: false,
    success: false,
    message: "",
  });

  /* ---------- LOAD POLICIES ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchPolicies();
        setPolicies(res);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ---------- LOAD SUBJECTS BASED ON TYPE ---------- */
  useEffect(() => {
    const loadSubjects = async () => {
      if (!form.subjectType) {
        setSubjects([]);
        return;
      }
      let data: any[] = [];
      if (form.subjectType === "USER") data = await fetchAllUsers();
      if (form.subjectType === "GROUP") data = await fetchAllGroups();
      if (form.subjectType === "ROLE") data = await fetchAllRoles();
      setSubjects(data.map(s => ({ id: String(s.id), name: s.name || s.username || s.id })));
    };
    loadSubjects();
  }, [form.subjectType]);

  /* ---------- SAVE ---------- */
  const save = async () => {
    if (!form.policyId || !form.subjectType || !form.subjectId) {
      setResult({ open: true, success: false, message: "Please select all required fields" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPolicySubject({
        policy_id: form.policyId,
        subject_type: form.subjectType,
        subject_id: form.subjectId,
      });

      if (res?.data?.id) {
        setResult({ open: true, success: true, message: "Policy subject added successfully", subjectId: res.data.id });
        return;
      }

      if (res?.success === false) {
        setResult({ open: true, success: false, message: res.message || "Policy subject already exists", subjectId: res?.data?.subject_id });
        setTimeout(() => navigate("/permissions-management/policy_subjects"), 2000);
        return;
      }

      setResult({ open: true, success: false, message: "Failed to add policy subject" });
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
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Bind Policy Subject</Typography>
          <Typography variant="body2" color="text.secondary">Attach governance logic to active identities</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Back</Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Permissions", path: "/permissions-management" },
          { label: "Policy Subjects", path: "/permissions-management/policy_subjects" },
          { label: "New Binding" }
        ]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <Card   sx={{
            borderRadius: 3,
            boxShadow: 3,
            border: "1px solid",
            borderColor: "divider",
            p:4
          }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PolicyIcon fontSize="small" /> Select Policy
              </Typography>
              <Autocomplete
                options={policies}
                getOptionLabel={(p) => `${p.resource_type} | ${p.action_name} (${p.scope_type})`}
                value={policies.find(p => p.id === form.policyId) || null}
                onChange={(_, v) => setForm({ ...form, policyId: v?.id || null })}
                renderInput={(params) => <TextField {...params} label="Governance Policy *" />}
              />
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="caption" color="text.secondary">Policy details will be enforced on the selected subject below.</Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security fontSize="small" /> Identify Subject
              </Typography>
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Subject Category</InputLabel>
                  <Select
                    value={form.subjectType}
                    label="Subject Category"
                    onChange={e => setForm({ ...form, subjectType: e.target.value as SubjectType, subjectId: null })}
                  >
                    <MenuItem value="USER">Platform User</MenuItem>
                    <MenuItem value="GROUP">Organizational Group</MenuItem>
                    <MenuItem value="ROLE">Predefined Role</MenuItem>
                  </Select>
                </FormControl>

                <Autocomplete
                  options={subjects}
                  getOptionLabel={(s) => s.name}
                  value={subjects.find(s => s.id === form.subjectId) || null}
                  disabled={!form.subjectType}
                  onChange={(_, v) => setForm({ ...form, subjectId: v?.id || null })}
                  renderInput={(params) => <TextField {...params} label={`Select ${form.subjectType} *`} />}
                />

                <Box sx={{ pt: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    onClick={save}
                    startIcon={<Save />}
                    sx={{
                      py: 1.5,
                      borderRadius: 3,
                      fontSize: '1rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg,#6C63FF,#4A42D4)',
                    }}
                  >
                    {submitting ? "Binding identity..." : "Establish Binding"}
                  </Button>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Result Dialog */}
      <Dialog open={result.open} onClose={() => setResult({ ...result, open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{result.success ? "Binding Established" : "Binding Conflict"}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, textAlign: 'center' }}>
            <Avatar sx={{
              bgcolor: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: result.success ? '#10B981' : '#EF4444',
              width: 56, height: 56, mb: 2
            }}>
              {result.success ? <CheckCircle fontSize="large" /> : <Block fontSize="large" />}
            </Avatar>
            <Typography variant="body1">{result.message}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setResult({ ...result, open: false })}>Close</Button>
          <Button variant="contained" onClick={() => navigate("/permissions-management/policy_subjects")} sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            View All Bindings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PolicySubjectCreate;
