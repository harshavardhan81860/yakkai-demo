import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Avatar, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, Grid,
  Stack, Paper, ToggleButtonGroup, ToggleButton
} from "@mui/material";
import {
  Add, Inventory, PlayArrow, Edit, SettingsInputComponent, Terminal
} from "@mui/icons-material";
import {
  fetchResources, fetchActions, createResource, updateResource,
  createAction, updateAction, type RegistryRow,
} from "../services/registryService";
import Breadcrumbs from "../components/Common/Breadcrumbs";

type Mode = "resources" | "actions";

const Registry = () => {
  const [mode, setMode] = useState<Mode>("resources");
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<RegistryRow | null>(null);
  const [form, setForm] = useState<{ name: string; description?: string }>({ name: "", description: "" });

  const pageLabel = mode === "resources" ? "Resource" : "Action";

  const loadData = async () => {
    setLoading(true);
    try {
      const data = mode === "resources" ? await fetchResources() : await fetchActions();
      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mode]);

  const sanitizeName = (value: string) => value.toUpperCase().replace(/[^A-Z_]/g, "");

  const openCreate = () => {
    setEditingRow(null);
    setForm({ name: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (row: RegistryRow) => {
    setEditingRow(row);
    setForm({ name: row.name, description: row.description || "" });
    setShowModal(true);
  };

  const submitForm = async () => {
    if (!form.name) return;
    try {
      if (editingRow) {
        mode === "resources" ? await updateResource(editingRow.name, { description: form.description }) : await updateAction(editingRow.name, { description: form.description });
      } else {
        mode === "resources" ? await createResource({ resource_name: form.name, description: form.description }) : await createAction({ action_name: form.name, description: form.description });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Registry</Typography>
          <Typography variant="body2" color="text.secondary">Manage cloud resources and operations</Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.02)', p: 0.5, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <ToggleButton value="resources" sx={{ border: 'none', borderRadius: 2, px: 3, py: 1, '&.Mui-selected': { bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF' } }}>Resources</ToggleButton>
            <ToggleButton value="actions" sx={{ border: 'none', borderRadius: 2, px: 3, py: 1, '&.Mui-selected': { bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF' } }}>Actions</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}
            sx={{ background: 'linear-gradient(135deg,#6C63FF,#4A42D4)' }}>
            Add {pageLabel}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Breadcrumbs items={[{ label: "Management", path: "/registry" }, { label: "Registry" }]} />
      </Box>

      {loading ? <LinearProgress sx={{ borderRadius: 2 }} /> : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >            <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{pageLabel}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{
                        width: 32, height: 32,
                        bgcolor: mode === 'resources' ? 'rgba(108,99,255,0.1)' : 'rgba(0,217,255,0.1)',
                        color: mode === 'resources' ? '#6C63FF' : '#00D9FF',
                      }}>
                        {mode === 'resources' ? <SettingsInputComponent fontSize="small" /> : <Terminal fontSize="small" />}
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{r.description || '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(r)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Editor Modal */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "blur(6px)",
              backgroundColor: "rgba(0,0,0,0.5)"
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{editingRow ? "Edit" : "Add"} {pageLabel}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={form.name}
              disabled={!!editingRow}
              onChange={e => setForm({ ...form, name: sanitizeName(e.target.value) })}
              helperText="Use uppercase (e.g. AWS_S3)"
              autoFocus
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
                }
              })}
            />

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={form.description || ""}
              onChange={e => setForm({ ...form, description: e.target.value })}
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
                }
              })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Registry;
