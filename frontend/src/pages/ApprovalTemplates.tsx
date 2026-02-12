import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, LinearProgress, Tooltip, Avatar,
  Stack, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Collapse, Paper, Grid
} from "@mui/material";
import {
  Add, Visibility, Edit, ContentCopy, CheckCircle, Block,
  KeyboardArrowDown, KeyboardArrowUp, Timer,
  Assignment, AccountTree, Person, Security, Group
} from "@mui/icons-material";
import {
  fetchApprovalTemplates,
  getApprovalTemplateDetails,
  activateApprovalTemplate,
  deactivateApprovalTemplate,
} from "../services/approvalTemplatesService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

type TemplateGroup = {
  name: string;
  latest: any;
  inactive: any[];
  expanded: boolean;
};

const ApprovalTemplates = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTemplate, setViewTemplate] = useState<any | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const all = await fetchApprovalTemplates();
      const map = new Map<string, any[]>();
      all.forEach((t: any) => {
        if (!map.has(t.template_name)) map.set(t.template_name, []);
        map.get(t.template_name)!.push(t);
      });

      const grouped: TemplateGroup[] = [];
      map.forEach((versions, name) => {
        versions.sort((a, b) => b.version - a.version);
        const active = versions.find((v) => v.is_active);
        const latest = active ?? versions[0];
        grouped.push({
          name,
          latest,
          inactive: versions.filter((v) => v.id !== latest.id),
          expanded: false,
        });
      });
      setGroups(grouped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const toggleGroup = (name: string) => {
    setGroups(prev => prev.map(g => g.name === name ? { ...g, expanded: !g.expanded } : g));
  };

  const openView = async (id: string) => {
    try {
      const res = await getApprovalTemplateDetails({ template_id: id });
      setViewTemplate(res.data.template);
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivate = async (id: string) => {
    if (!window.confirm("Activate this version?")) return;
    try {
      await activateApprovalTemplate(id);
      await loadTemplates();
    } catch (err) { console.error(err); }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm("Deactivate this template?")) return;
    try {
      await deactivateApprovalTemplate(id);
      await loadTemplates();
    } catch (err) { console.error(err); }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Workflow Defined</Typography>
          <Typography variant="body2" color="text.secondary">Configure multi-stage approval sequences and rules</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate("/approvals-management/templates/new")}
          sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
          New Workflow
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[
          { label: "Approvals", path: "/approvals/requests" },
          { label: "Workflow Defined" }
        ]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Timeout (SLA)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <Fragment key={g.name}>
                  <TableRow sx={{ opacity: g.latest.is_active ? 1 : 0.5 }}>
                    <TableCell>
                      {g.inactive.length > 0 && (
                        <IconButton size="small" onClick={() => toggleGroup(g.name)}>
                          {g.expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF', width: 32, height: 32 }}>
                          <AccountTree fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{g.name}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={g.latest.scope === 'SYSTEM' ? 'Global' : 'Tenant'}
                        size="small"
                        color={g.latest.scope === 'SYSTEM' ? 'primary' : 'warning'}
                        variant="outlined"
                        sx={{ fontWeight: 700, borderRadius: '6px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={`v${g.latest.version}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{g.latest.default_sla_minutes ? `${g.latest.default_sla_minutes}m` : 'None'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={g.latest.is_active ? "Active" : "Draft"}
                        size="small"
                        variant="outlined"
                        color={g.latest.is_active ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => openView(g.latest.id)} sx={{ color: '#00D9FF' }}><Visibility fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => navigate(`/approvals-management/templates/new?templateId=${g.latest.id}&clone=true`)}><ContentCopy fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => navigate(`/approvals-management/templates/${g.latest.id}`)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => g.latest.is_active ? handleDeactivate(g.latest.id) : handleActivate(g.latest.id)} sx={{ color: g.latest.is_active ? '#EF4444' : '#10B981' }}>
                          {g.latest.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {/* Archived Versions */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                      <Collapse in={g.expanded} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2 }}>
                          <Table size="small">
                            <TableBody>
                              {g.inactive.map((v) => (
                                <TableRow key={v.id} sx={{ '& td': { border: 0 } }}>
                                  <TableCell width={30}></TableCell>
                                  <TableCell><Typography variant="body2" color="text.secondary">v{v.version}</Typography></TableCell>
                                  <TableCell align="right">
                                    <Button size="small" onClick={() => openView(v.id)}>View</Button>
                                    <Button size="small" onClick={() => navigate(`/approvals-management/templates/new?templateId=${v.id}&clone=true`)}>Clone</Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Protocol Inspector */}
      <Dialog open={!!viewTemplate} onClose={() => setViewTemplate(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Workflow Visualizer: {viewTemplate?.template_name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ py: 1 }}>
            {viewTemplate?.levels?.map((l: any) => (
              <Paper key={l.level_order} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#6C63FF' }}>Level {l.level_order}</Typography>
                  <Chip label={l.approval_mode} size="small" variant="outlined" />
                </Box>
                <Grid container spacing={2}>
                  <Grid size={6}><Typography variant="caption" color="text.secondary">Strategy</Typography><Typography variant="body2">{l.approval_strategy}</Typography></Grid>
                  <Grid size={6}><Typography variant="caption" color="text.secondary">SLA</Typography><Typography variant="body2">{l.sla_minutes || 'Inherited'}</Typography></Grid>
                </Grid>
                <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.05)' }} />
                <Typography variant="caption" color="text.secondary">Designated Approvers:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {l.approvers.map((a: any, i: number) => {
                    let color: any = 'default';
                    let icon: any = <Person sx={{ fontSize: '14px !important' }} />;
                    let label = 'User';

                    if (a.approver_type === 'ROLE') {
                      color = 'warning';
                      icon = <Security sx={{ fontSize: '14px !important' }} />;
                      label = 'Role';
                    } else if (a.approver_type === 'GROUP') {
                      color = 'info';
                      icon = <Group sx={{ fontSize: '14px !important' }} />;
                      label = 'Group';
                    }

                    return (
                      <Tooltip key={i} title={label} arrow>
                        <Chip
                          size="small"
                          label={a.approver_value}
                          icon={icon}
                          color={color}
                          variant="outlined"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: color === 'default' ? 'rgba(255,255,255,0.05)' : undefined
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setViewTemplate(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalTemplates;
