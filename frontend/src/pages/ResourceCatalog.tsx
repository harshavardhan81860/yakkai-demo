import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    Box, Typography, Tabs, Tab, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Select, MenuItem, InputLabel,
    FormControl, CircularProgress, Chip, TextField, Alert, Snackbar,
    IconButton, Tooltip, Paper
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Add, Delete, LinkOff, Link as LinkIcon, Refresh, Search, FilterList } from "@mui/icons-material";
import { useRole } from "../contexts/RoleContext";
import {
    resourceCatalogService,
    Category, CanonicalType, ProviderMapping, UnmappedResource
} from "../services/resourceCatalogService";

export default function ResourceCatalog() {
    const { activeRoleName } = useRole();

    const isAdmin = activeRoleName === "system_admin";
    const isManager = activeRoleName === "system_manager";
    const canManage = isAdmin || isManager;
    const isViewOnly = !canManage;

    const [tabIndex, setTabIndex] = useState(0);
    const [categories, setCategories] = useState<Category[]>([]);
    const [canonicalTypes, setCanonicalTypes] = useState<CanonicalType[]>([]);
    const [mappings, setMappings] = useState<ProviderMapping[]>([]);
    const [unmapped, setUnmapped] = useState<UnmappedResource[]>([]);
    const [loading, setLoading] = useState(true);

    // ─── Filters ───
    const [mappedProviderFilter, setMappedProviderFilter] = useState("ALL");
    const [mappedCategoryFilter, setMappedCategoryFilter] = useState("ALL");
    const [mappedSearch, setMappedSearch] = useState("");

    const [unmappedProviderFilter, setUnmappedProviderFilter] = useState("ALL");
    const [unmappedSearch, setUnmappedSearch] = useState("");

    const [categorySearch, setCategorySearch] = useState("");

    const [typeProviderCategoryFilter, setTypeProviderCategoryFilter] = useState("ALL");
    const [typeSearch, setTypeSearch] = useState("");
    const [typeBillableFilter, setTypeBillableFilter] = useState("ALL");

    // Snackbar
    const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
        open: false, msg: "", severity: "success"
    });

    // Map Dialog
    const [mapDialogOpen, setMapDialogOpen] = useState(false);
    const [selectedUnmapped, setSelectedUnmapped] = useState<UnmappedResource | null>(null);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [providerDisplayName, setProviderDisplayName] = useState("");
    const [saving, setSaving] = useState(false);

    // Create Category Dialog
    const [catDialogOpen, setCatDialogOpen] = useState(false);
    const [newCatKey, setNewCatKey] = useState("");
    const [newCatName, setNewCatName] = useState("");
    const [newCatIcon, setNewCatIcon] = useState("");

    // Create Canonical Type Dialog
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);
    const [newTypeKey, setNewTypeKey] = useState("");
    const [newTypeName, setNewTypeName] = useState("");
    const [newTypeCategoryId, setNewTypeCategoryId] = useState("");
    const [newTypeDescription, setNewTypeDescription] = useState("");
    const [newTypeIsBillable, setNewTypeIsBillable] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [cats, types, maps, unmaps] = await Promise.all([
                resourceCatalogService.getCategories(),
                resourceCatalogService.getCanonicalTypes(),
                resourceCatalogService.getMappings(),
                resourceCatalogService.getUnmapped(),
            ]);
            setCategories(cats);
            setCanonicalTypes(types);
            setMappings(maps);
            setUnmapped(unmaps);
        } catch (err) {
            console.error("Failed to fetch resource catalog data", err);
            setSnack({ open: true, msg: "Failed to load catalog data", severity: "error" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const showSnack = (msg: string, severity: "success" | "error" = "success") =>
        setSnack({ open: true, msg, severity });

    // ─── Distinct provider lists ───
    const mappedProviders = useMemo(() =>
        [...new Set(mappings.map(m => m.provider))].sort(), [mappings]);
    const unmappedProviders = useMemo(() =>
        [...new Set(unmapped.map(u => u.provider))].sort(), [unmapped]);
    const mappedCategories = useMemo(() => {
        const catIds = new Set(mappings.map(m => m.canonical_type?.category?.id).filter(Boolean));
        return categories.filter(c => catIds.has(c.id));
    }, [mappings, categories]);

    // ─── Filtered data ───
    const filteredMappings = useMemo(() => {
        let data = mappings;
        if (mappedProviderFilter !== "ALL") data = data.filter(m => m.provider === mappedProviderFilter);
        if (mappedCategoryFilter !== "ALL") data = data.filter(m => m.canonical_type?.category?.id === mappedCategoryFilter);
        if (mappedSearch) {
            const q = mappedSearch.toLowerCase();
            data = data.filter(m =>
                m.provider_resource_type.toLowerCase().includes(q) ||
                m.canonical_type?.display_name?.toLowerCase().includes(q) ||
                m.provider_display_name?.toLowerCase().includes(q)
            );
        }
        return data;
    }, [mappings, mappedProviderFilter, mappedCategoryFilter, mappedSearch]);

    const filteredUnmapped = useMemo(() => {
        let data = unmapped;
        if (unmappedProviderFilter !== "ALL") data = data.filter(u => u.provider === unmappedProviderFilter);
        if (unmappedSearch) {
            const q = unmappedSearch.toLowerCase();
            data = data.filter(u => u.resource_type.toLowerCase().includes(q));
        }
        return data;
    }, [unmapped, unmappedProviderFilter, unmappedSearch]);

    const filteredCategories = useMemo(() => {
        if (!categorySearch) return categories;
        const q = categorySearch.toLowerCase();
        return categories.filter(c =>
            c.category_key.toLowerCase().includes(q) || c.display_name.toLowerCase().includes(q)
        );
    }, [categories, categorySearch]);

    const filteredCanonicalTypes = useMemo(() => {
        let data = canonicalTypes;
        if (typeProviderCategoryFilter !== "ALL") data = data.filter(t => t.category_id === typeProviderCategoryFilter);
        if (typeBillableFilter !== "ALL") data = data.filter(t =>
            typeBillableFilter === "YES" ? t.is_billable : !t.is_billable
        );
        if (typeSearch) {
            const q = typeSearch.toLowerCase();
            data = data.filter(t =>
                t.canonical_key.toLowerCase().includes(q) ||
                t.display_name.toLowerCase().includes(q) ||
                (t.description && t.description.toLowerCase().includes(q))
            );
        }
        return data;
    }, [canonicalTypes, typeProviderCategoryFilter, typeBillableFilter, typeSearch]);

    // ─── Handlers ───
    const handleOpenMap = (row: UnmappedResource) => {
        setSelectedUnmapped(row);
        setSelectedCategory("");
        setSelectedType("");
        setProviderDisplayName("");
        setMapDialogOpen(true);
    };

    const handleSaveMapping = async () => {
        if (!selectedUnmapped || !selectedType) return;
        setSaving(true);
        try {
            await resourceCatalogService.createMapping({
                provider: selectedUnmapped.provider,
                provider_resource_type: selectedUnmapped.resource_type,
                canonical_type_id: selectedType,
                provider_display_name: providerDisplayName || undefined,
            });
            showSnack(`Mapped "${selectedUnmapped.resource_type}" successfully`);
            setMapDialogOpen(false);
            fetchData();
        } catch (err: any) {
            showSnack(err?.response?.data?.detail || "Failed to create mapping", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleRevokeMapping = async (mapping: ProviderMapping) => {
        if (!window.confirm(`Revoke mapping for "${mapping.provider_resource_type}" (${mapping.provider})?`)) return;
        try {
            await resourceCatalogService.deleteMapping(mapping.id);
            showSnack(`Revoked mapping for "${mapping.provider_resource_type}"`);
            fetchData();
        } catch (err: any) {
            showSnack(err?.response?.data?.detail || "Failed to revoke mapping", "error");
        }
    };

    const handleCreateCategory = async () => {
        if (!newCatKey || !newCatName) return;
        setSaving(true);
        try {
            await resourceCatalogService.createCategory({
                category_key: newCatKey.toUpperCase().replace(/\s+/g, "_"),
                display_name: newCatName,
                icon: newCatIcon || undefined,
            });
            showSnack(`Category "${newCatName}" created`);
            setCatDialogOpen(false);
            setNewCatKey(""); setNewCatName(""); setNewCatIcon("");
            fetchData();
        } catch (err: any) {
            showSnack(err?.response?.data?.detail || "Failed to create category", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateType = async () => {
        if (!newTypeKey || !newTypeName || !newTypeCategoryId) return;
        setSaving(true);
        try {
            await resourceCatalogService.createCanonicalType({
                canonical_key: newTypeKey.toUpperCase().replace(/\s+/g, "_"),
                display_name: newTypeName,
                category_id: newTypeCategoryId,
                description: newTypeDescription || undefined,
                is_billable: newTypeIsBillable,
            });
            showSnack(`Canonical Type "${newTypeName}" created`);
            setTypeDialogOpen(false);
            setNewTypeKey(""); setNewTypeName(""); setNewTypeCategoryId("");
            setNewTypeDescription(""); setNewTypeIsBillable(false);
            fetchData();
        } catch (err: any) {
            showSnack(err?.response?.data?.detail || "Failed to create canonical type", "error");
        } finally {
            setSaving(false);
        }
    };

    // Filter bar styles (not a component to avoid focus loss)
    const filterBarSx = {
        p: 1.5, mb: 2, borderRadius: 2, display: "flex", flexWrap: "wrap",
        gap: 1.5, alignItems: "center", bgcolor: "background.paper"
    };
    // Dialog styles for dark theme
    const dialogPaperSx = {
        bgcolor: "background.paper",
        backgroundImage: "none",
        border: "1px solid",
        borderColor: "divider",
    };

    // ─── DataGrid Columns ───
    const mappedColumns: GridColDef[] = [
        {
            field: "provider", headerName: "Provider", flex: 0.7,
            renderCell: (p) => (
                <Chip label={p.value?.toUpperCase()} size="small" variant="outlined"
                    color={p.value === "azure" ? "primary" : p.value === "aws" ? "warning" : "default"} />
            ),
        },
        { field: "provider_resource_type", headerName: "Raw Resource Type", flex: 2 },
        {
            field: "canonical_type_name", headerName: "Canonical Name", flex: 1.5,
            valueGetter: (_, row) => row.canonical_type?.display_name || "—",
        },
        {
            field: "category_name", headerName: "Category", flex: 1,
            renderCell: (params) => {
                const catName = params.row.canonical_type?.category?.display_name;
                return catName ? <Chip label={catName} size="small" variant="outlined" color="info" /> : "—";
            },
        },
        {
            field: "is_billable", headerName: "Billable", flex: 0.5,
            renderCell: (params) => (
                <Chip label={params.row.canonical_type?.is_billable ? "Yes" : "No"}
                    color={params.row.canonical_type?.is_billable ? "warning" : "default"} size="small" />
            ),
        },
        ...(!isViewOnly ? [{
            field: "actions", headerName: "", flex: 0.5, sortable: false, filterable: false,
            renderCell: (params: any) => (
                <Tooltip title="Revoke Mapping">
                    <IconButton color="error" size="small" onClick={() => handleRevokeMapping(params.row)}>
                        <LinkOff fontSize="small" />
                    </IconButton>
                </Tooltip>
            ),
        } as GridColDef] : []),
    ];

    const unmappedColumns: GridColDef[] = [
        {
            field: "provider", headerName: "Provider", flex: 0.7,
            renderCell: (p) => (
                <Chip label={p.value?.toUpperCase()} size="small" variant="outlined"
                    color={p.value === "azure" ? "primary" : p.value === "aws" ? "warning" : "default"} />
            ),
        },
        { field: "resource_type", headerName: "Discovered Resource Type", flex: 2.5 },
        { field: "resource_count", headerName: "Instances", flex: 0.6, align: "center", headerAlign: "center" },
        ...(!isViewOnly ? [{
            field: "actions", headerName: "", flex: 0.8, sortable: false, filterable: false,
            renderCell: (params: any) => (
                <Button variant="contained" size="small" startIcon={<LinkIcon />}
                    sx={{
                        textTransform: "none", borderRadius: 2,
                        background: "linear-gradient(135deg, #6C63FF, #4A42D4)", fontSize: "0.75rem"
                    }}
                    onClick={() => handleOpenMap(params.row)}>
                    Map
                </Button>
            ),
        } as GridColDef] : []),
    ];

    const categoryColumns: GridColDef[] = [
        { field: "category_key", headerName: "Key", flex: 1 },
        { field: "display_name", headerName: "Display Name", flex: 2 },
        { field: "icon", headerName: "Icon", flex: 1, valueGetter: (_, row) => row.icon || "—" },
        { field: "display_order", headerName: "Order", flex: 0.5, align: "center", headerAlign: "center" },
    ];

    const canonicalTypeColumns: GridColDef[] = [
        { field: "canonical_key", headerName: "Key", flex: 1 },
        { field: "display_name", headerName: "Display Name", flex: 1.5 },
        {
            field: "category_name", headerName: "Category", flex: 1,
            renderCell: (params) => {
                const cat = categories.find(c => c.id === params.row.category_id);
                return cat ? <Chip label={cat.display_name} size="small" variant="outlined" color="info" /> : "—";
            },
        },
        {
            field: "is_billable", headerName: "Billable", flex: 0.5,
            renderCell: (params) => (
                <Chip label={params.row.is_billable ? "Yes" : "No"}
                    color={params.row.is_billable ? "warning" : "default"} size="small" />
            ),
        },
        {
            field: "is_active", headerName: "Status", flex: 0.5,
            renderCell: (params) => (
                <Chip label={params.row.is_active ? "Active" : "Inactive"}
                    color={params.row.is_active ? "success" : "default"} size="small" />
            ),
        },
        { field: "description", headerName: "Description", flex: 2, valueGetter: (_, row) => row.description || "—" },
    ];

    const availableTypes = selectedCategory
        ? canonicalTypes.filter((t) => t.category_id === selectedCategory) : [];

    if (loading) {
        return (
            <Box p={4} display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3} sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Resource Catalog</Typography>
                    <Typography variant="body2" color="textSecondary">
                        Map raw cloud provider resource types to standardized canonical names
                    </Typography>
                </Box>
                <Tooltip title="Refresh data">
                    <IconButton onClick={fetchData} color="primary"><Refresh /></IconButton>
                </Tooltip>
            </Box>

            {isViewOnly && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    You have <strong>view-only</strong> access to the Resource Catalog.
                </Alert>
            )}
            {isManager && !isAdmin && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    As a <strong>System Manager</strong>, you can map and revoke resource mappings. To create new categories or canonical types, contact a System Admin.
                </Alert>
            )}

            {/* Stats */}
            <Box display="flex" gap={2} mb={2}>
                {[
                    { label: "Categories", value: categories.length, color: "#6C63FF" },
                    { label: "Canonical Types", value: canonicalTypes.length, color: "#3B82F6" },
                    { label: "Mapped", value: mappings.length, color: "#10B981" },
                    { label: "Unmapped", value: unmapped.length, color: unmapped.length > 0 ? "#F59E0B" : "#10B981" },
                ].map(s => (
                    <Paper key={s.label} sx={{
                        flex: 1, p: 2, borderRadius: 2, cursor: "pointer",
                        borderLeft: `4px solid ${s.color}`, bgcolor: "background.paper",
                        transition: "transform 0.15s", "&:hover": { transform: "translateY(-2px)" }
                    }}
                        onClick={() => {
                            if (s.label === "Categories") setTabIndex(2);
                            else if (s.label === "Canonical Types") setTabIndex(3);
                            else if (s.label === "Mapped") setTabIndex(0);
                            else if (s.label === "Unmapped") setTabIndex(1);
                        }}>
                        <Typography variant="h5" fontWeight="bold" color={s.color}>{s.value}</Typography>
                        <Typography variant="caption" color="textSecondary">{s.label}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                <Tabs value={tabIndex} onChange={(_, nv) => setTabIndex(nv)}>
                    <Tab label={`Mapped (${mappings.length})`} />
                    <Tab label={`Unmapped (${unmapped.length})`}
                        sx={unmapped.length > 0 ? { color: "#F59E0B", "&.Mui-selected": { color: "#F59E0B" } } : {}} />
                    <Tab label={`Categories (${categories.length})`} />
                    <Tab label={`Canonical Types (${canonicalTypes.length})`} />
                </Tabs>
            </Box>

            {/* ─── Tab 0: Mapped Resources ─── */}
            {tabIndex === 0 && (
                <Box>
                    <Paper variant="outlined" sx={filterBarSx}>
                        <FilterList fontSize="small" sx={{ color: "text.secondary", mr: 0.5 }} />
                        <TextField size="small" placeholder="Search resource type or canonical name…"
                            value={mappedSearch} onChange={e => setMappedSearch(e.target.value)}
                            InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} /> }}
                            sx={{ minWidth: 280 }} />
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Provider</InputLabel>
                            <Select value={mappedProviderFilter} label="Provider"
                                onChange={e => setMappedProviderFilter(e.target.value)}>
                                <MenuItem value="ALL">All Providers</MenuItem>
                                {mappedProviders.map(p => (
                                    <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Category</InputLabel>
                            <Select value={mappedCategoryFilter} label="Category"
                                onChange={e => setMappedCategoryFilter(e.target.value)}>
                                <MenuItem value="ALL">All Categories</MenuItem>
                                {mappedCategories.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.display_name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {(mappedSearch || mappedProviderFilter !== "ALL" || mappedCategoryFilter !== "ALL") && (
                            <Chip label="Clear filters" size="small" onDelete={() => {
                                setMappedSearch(""); setMappedProviderFilter("ALL"); setMappedCategoryFilter("ALL");
                            }} />
                        )}
                        <Typography variant="caption" color="textSecondary" sx={{ ml: "auto" }}>
                            Showing {filteredMappings.length} of {mappings.length}
                        </Typography>
                    </Paper>
                    <Box sx={{ height: 520, bgcolor: "background.paper", borderRadius: 2 }}>
                        <DataGrid rows={filteredMappings} columns={mappedColumns} getRowId={(row) => row.id}
                            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                            pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick density="compact" />
                    </Box>
                </Box>
            )}

            {/* ─── Tab 1: Unmapped ─── */}
            {tabIndex === 1 && (
                <Box>
                    <Paper variant="outlined" sx={filterBarSx}>
                        <FilterList fontSize="small" sx={{ color: "text.secondary", mr: 0.5 }} />
                        <TextField size="small" placeholder="Search resource type…"
                            value={unmappedSearch} onChange={e => setUnmappedSearch(e.target.value)}
                            InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} /> }}
                            sx={{ minWidth: 280 }} />
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Provider</InputLabel>
                            <Select value={unmappedProviderFilter} label="Provider"
                                onChange={e => setUnmappedProviderFilter(e.target.value)}>
                                <MenuItem value="ALL">All Providers</MenuItem>
                                {unmappedProviders.map(p => (
                                    <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {(unmappedSearch || unmappedProviderFilter !== "ALL") && (
                            <Chip label="Clear filters" size="small" onDelete={() => {
                                setUnmappedSearch(""); setUnmappedProviderFilter("ALL");
                            }} />
                        )}
                        <Typography variant="caption" color="textSecondary" sx={{ ml: "auto" }}>
                            Showing {filteredUnmapped.length} of {unmapped.length}
                        </Typography>
                    </Paper>
                    <Box sx={{ height: 520, bgcolor: "background.paper", borderRadius: 2 }}>
                        {unmapped.length === 0 ? (
                            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap={2}>
                                <Typography variant="h6" color="textSecondary">🎉 All resources are mapped!</Typography>
                                <Typography variant="body2" color="textSecondary">No unmapped resource types found.</Typography>
                            </Box>
                        ) : (
                            <DataGrid rows={filteredUnmapped} columns={unmappedColumns}
                                getRowId={(row) => row.provider + "||" + row.resource_type}
                                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                                pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick density="compact" />
                        )}
                    </Box>
                </Box>
            )}

            {/* ─── Tab 2: Categories ─── */}
            {tabIndex === 2 && (
                <Box>
                    <Paper variant="outlined" sx={filterBarSx}>
                        <FilterList fontSize="small" sx={{ color: "text.secondary", mr: 0.5 }} />
                        <TextField size="small" placeholder="Search categories…"
                            value={categorySearch} onChange={e => setCategorySearch(e.target.value)}
                            InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} /> }}
                            sx={{ minWidth: 280 }} />
                        {categorySearch && (
                            <Chip label="Clear" size="small" onDelete={() => setCategorySearch("")} />
                        )}
                        <Typography variant="caption" color="textSecondary" sx={{ ml: "auto" }}>
                            Showing {filteredCategories.length} of {categories.length}
                        </Typography>
                        {isAdmin && (
                            <Button variant="contained" size="small" startIcon={<Add />}
                                onClick={() => setCatDialogOpen(true)}
                                sx={{
                                    textTransform: "none", borderRadius: 2, ml: 1,
                                    background: "linear-gradient(135deg, #6C63FF, #4A42D4)"
                                }}>
                                New Category
                            </Button>
                        )}
                    </Paper>
                    <Box sx={{ height: 420, bgcolor: "background.paper", borderRadius: 2 }}>
                        <DataGrid rows={filteredCategories} columns={categoryColumns} getRowId={(row) => row.id}
                            disableRowSelectionOnClick density="compact" />
                    </Box>
                </Box>
            )}

            {/* ─── Tab 3: Canonical Types ─── */}
            {tabIndex === 3 && (
                <Box>
                    <Paper variant="outlined" sx={filterBarSx}>
                        <FilterList fontSize="small" sx={{ color: "text.secondary", mr: 0.5 }} />
                        <TextField size="small" placeholder="Search canonical types…"
                            value={typeSearch} onChange={e => setTypeSearch(e.target.value)}
                            InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} /> }}
                            sx={{ minWidth: 280 }} />
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Category</InputLabel>
                            <Select value={typeProviderCategoryFilter} label="Category"
                                onChange={e => setTypeProviderCategoryFilter(e.target.value)}>
                                <MenuItem value="ALL">All Categories</MenuItem>
                                {categories.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.display_name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Billable</InputLabel>
                            <Select value={typeBillableFilter} label="Billable"
                                onChange={e => setTypeBillableFilter(e.target.value)}>
                                <MenuItem value="ALL">All</MenuItem>
                                <MenuItem value="YES">Billable</MenuItem>
                                <MenuItem value="NO">Non-Billable</MenuItem>
                            </Select>
                        </FormControl>
                        {(typeSearch || typeProviderCategoryFilter !== "ALL" || typeBillableFilter !== "ALL") && (
                            <Chip label="Clear filters" size="small" onDelete={() => {
                                setTypeSearch(""); setTypeProviderCategoryFilter("ALL"); setTypeBillableFilter("ALL");
                            }} />
                        )}
                        <Typography variant="caption" color="textSecondary" sx={{ ml: "auto" }}>
                            Showing {filteredCanonicalTypes.length} of {canonicalTypes.length}
                        </Typography>
                        {isAdmin && (
                            <Button variant="contained" size="small" startIcon={<Add />}
                                onClick={() => setTypeDialogOpen(true)}
                                sx={{
                                    textTransform: "none", borderRadius: 2, ml: 1,
                                    background: "linear-gradient(135deg, #6C63FF, #4A42D4)"
                                }}>
                                New Canonical Type
                            </Button>
                        )}
                    </Paper>
                    <Box sx={{ height: 480, bgcolor: "background.paper", borderRadius: 2 }}>
                        <DataGrid rows={filteredCanonicalTypes} columns={canonicalTypeColumns} getRowId={(row) => row.id}
                            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                            pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick density="compact" />
                    </Box>
                </Box>
            )}

            {/* ═══ Map Dialog ═══ */}
            <Dialog open={mapDialogOpen} onClose={() => setMapDialogOpen(false)} fullWidth maxWidth="sm"
                PaperProps={{ sx: dialogPaperSx }}>
                <DialogTitle sx={{ fontWeight: 700, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
                    Map Resource Type
                </DialogTitle>
                <DialogContent sx={{ bgcolor: "background.paper", pt: 2 }}>
                    {selectedUnmapped && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 3, mt: 1, borderRadius: 2, bgcolor: "action.hover" }}>
                            <Typography variant="caption" color="textSecondary">Provider</Typography>
                            <Typography fontWeight="bold" mb={1}>{selectedUnmapped.provider.toUpperCase()}</Typography>
                            <Typography variant="caption" color="textSecondary">Raw Type</Typography>
                            <Chip label={selectedUnmapped.resource_type} variant="outlined" sx={{ mt: 0.5 }} />
                            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                                Instances: <strong>{selectedUnmapped.resource_count}</strong>
                            </Typography>
                        </Paper>
                    )}
                    <FormControl fullWidth margin="normal">
                        <InputLabel>1. Select Category</InputLabel>
                        <Select value={selectedCategory} label="1. Select Category"
                            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedType(""); }}>
                            {categories.map((c) => (
                                <MenuItem key={c.id} value={c.id}>{c.display_name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal" disabled={!selectedCategory}>
                        <InputLabel>2. Select Canonical Type</InputLabel>
                        <Select value={selectedType} label="2. Select Canonical Type"
                            onChange={(e) => setSelectedType(e.target.value)}>
                            {availableTypes.map((t) => (
                                <MenuItem key={t.id} value={t.id}>{t.display_name} ({t.canonical_key})</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField fullWidth margin="normal" label="Friendly Display Name (Optional)"
                        helperText="Override canonical name, e.g. 'EC2 Instance' instead of 'Server'"
                        value={providerDisplayName} onChange={(e) => setProviderDisplayName(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
                    <Button onClick={() => setMapDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveMapping} disabled={!selectedType || saving}
                        startIcon={<LinkIcon />}
                        sx={{ background: "linear-gradient(135deg, #6C63FF, #4A42D4)", textTransform: "none" }}>
                        {saving ? "Saving…" : "Save Mapping"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Create Category Dialog ═══ */}
            <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} fullWidth maxWidth="sm"
                PaperProps={{ sx: dialogPaperSx }}>
                <DialogTitle sx={{ fontWeight: 700, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
                    Create New Category
                </DialogTitle>
                <DialogContent sx={{ bgcolor: "background.paper", pt: 2 }}>
                    <TextField fullWidth margin="normal" label="Category Key" required
                        helperText="Unique key, e.g. COMPUTE, NETWORK, STORAGE"
                        value={newCatKey} onChange={(e) => setNewCatKey(e.target.value)} />
                    <TextField fullWidth margin="normal" label="Display Name" required
                        helperText="Human-readable name shown in the portal"
                        value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    <TextField fullWidth margin="normal" label="Icon (Optional)"
                        helperText="MUI icon name, e.g. Memory, Cloud, Storage"
                        value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
                    <Button onClick={() => setCatDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateCategory}
                        disabled={!newCatKey || !newCatName || saving} startIcon={<Add />}
                        sx={{ background: "linear-gradient(135deg, #6C63FF, #4A42D4)", textTransform: "none" }}>
                        {saving ? "Creating…" : "Create Category"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Create Canonical Type Dialog ═══ */}
            <Dialog open={typeDialogOpen} onClose={() => setTypeDialogOpen(false)} fullWidth maxWidth="sm"
                PaperProps={{ sx: dialogPaperSx }}>
                <DialogTitle sx={{ fontWeight: 700, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
                    Create New Canonical Type
                </DialogTitle>
                <DialogContent sx={{ bgcolor: "background.paper", pt: 2 }}>
                    <TextField fullWidth margin="normal" label="Canonical Key" required
                        helperText="Unique key, e.g. SERVER, VPC, MANAGED_DISK"
                        value={newTypeKey} onChange={(e) => setNewTypeKey(e.target.value)} />
                    <TextField fullWidth margin="normal" label="Display Name" required
                        helperText="Portal-facing name"
                        value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Category</InputLabel>
                        <Select value={newTypeCategoryId} label="Category"
                            onChange={(e) => setNewTypeCategoryId(e.target.value)}>
                            {categories.map((c) => (
                                <MenuItem key={c.id} value={c.id}>{c.display_name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField fullWidth margin="normal" label="Description (Optional)" multiline rows={2}
                        value={newTypeDescription} onChange={(e) => setNewTypeDescription(e.target.value)} />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Billable</InputLabel>
                        <Select value={newTypeIsBillable ? "yes" : "no"} label="Billable"
                            onChange={(e) => setNewTypeIsBillable(e.target.value === "yes")}>
                            <MenuItem value="no">No</MenuItem>
                            <MenuItem value="yes">Yes</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
                    <Button onClick={() => setTypeDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateType}
                        disabled={!newTypeKey || !newTypeName || !newTypeCategoryId || saving} startIcon={<Add />}
                        sx={{ background: "linear-gradient(135deg, #6C63FF, #4A42D4)", textTransform: "none" }}>
                        {saving ? "Creating…" : "Create Type"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity}
                    variant="filled" sx={{ width: "100%" }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
