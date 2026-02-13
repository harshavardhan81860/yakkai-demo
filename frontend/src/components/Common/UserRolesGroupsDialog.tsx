import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Box, LinearProgress, Avatar, Chip, Stack
} from "@mui/material";
import {
  Group, Security, History, Business, Person
} from "@mui/icons-material";
import {
  fetchUserGroups,
  type UserGroupAssignment,
} from "../../services/userGroupsService";
import {
  fetchUserRoles,
  type UserRoleAssignment,
} from "../../services/userRolesService";
import { fetchAllGroups } from "../../services/groupsService";
import { fetchAllRoles } from "../../services/rolesService";
import { AccessMappingGroup, AccessMappingRole, fetchUserAccessMappings } from "../../services/userAccessMappingService";
import { useNavigate } from "react-router-dom";



interface UserRolesGroupsDialogProps {
  userId: number;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserRolesGroupsDialog = ({
  userId,
  userName,
  isOpen,
  onClose,
}: UserRolesGroupsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<AccessMappingGroup[]>([]);
  const [roles, setRoles] = useState<AccessMappingRole[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();


  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        const response = await fetchUserAccessMappings(userId);
        setGroups(response?.groups ?? []);
        setRoles(response?.roles ?? []);
      } catch (error) {
        console.error("Failed to fetch groups", error);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && userId) {
      loadGroups();
    }
  }, [isOpen, userId]);

  // const loadData = async () => {
  //   setLoading(true);
  //   try {
  //     const [groupsMaster, rolesMaster, userGroupsResp, userRolesResp] = await Promise.all([
  //       fetchAllGroups(),
  //       fetchAllRoles(),
  //       fetchUserGroups(userId),
  //       fetchUserRoles(userId),
  //     ]);

  //     const userGroups: UserGroupAssignment[] = userGroupsResp ?? [];
  //     const userRoles: UserRoleAssignment[] = userRolesResp ?? [];

  //     setGroups(userGroups.map((g) => ({
  //       ...g,
  //       group_name: groupsMaster.find((x) => x.id === g.group_id)?.name ?? `Group #${g.group_id}`,
  //     })));

  //     setRoles(userRoles.map((r) => ({
  //       ...r,
  //       role_name: rolesMaster.find((x) => x.id === r.role_id)?.name ?? `Role #${r.role_id}`,
  //     })));
  //   } catch (error) {
  //     console.error("Failed to fetch user roles/groups:", error);
  //     setGroups([]);
  //     setRoles([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const isGroupsTab = activeTab === 0;
  const assignLabel = isGroupsTab ? "Assign Group" : "Assign Role";

  const handleAssign = () => {
    if (isGroupsTab) {
      console.log("Open Assign Group Dialog");
      navigate(`/user-group-mapping?userId=${userId}`)
    } else {
      console.log("Open Assign Role Dialog");
      navigate(`/user-role-mapping?userId=${userId}`)
    }
  };


  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' } }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, fontWeight: 700 }}>
        <Avatar sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
          <Person />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>User Access Details</Typography>
          <Typography variant="caption" color="text.secondary">Identity: {userName}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab icon={<Group fontSize="small" />} iconPosition="start" label={`Groups (${groups.length})`} sx={{ fontWeight: 700 }} />
            <Tab icon={<Security fontSize="small" />} iconPosition="start" label={`Roles (${roles.length})`} sx={{ fontWeight: 700 }} />
          </Tabs>
        </Box>

        <Box sx={{ minHeight: 400, position: 'relative' }}>
          {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}

          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {activeTab === 0 ? (
                      <>
                        <TableCell>Name</TableCell>
                        <TableCell>ID</TableCell>
                        <TableCell>Scope Type</TableCell>
                        <TableCell>Established</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>Name</TableCell>
                        <TableCell>Scope Type</TableCell>
                        <TableCell>Tenant</TableCell>
                        <TableCell>Assignment Type</TableCell>
                        <TableCell>Assignment Name</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>

          


              <TableBody>
                {activeTab === 0 ? (
                  groups.length === 0 && !loading ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No group assignments detected</Typography></TableCell></TableRow>
                  ) : (
                    groups.length === 0 && !loading ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                          <Typography color="text.secondary">
                            No group assignments detected
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      groups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {g.name}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: "monospace", opacity: 0.6 }}>
                              #{g.id}
                            </Typography>
                          </TableCell>

                          {/* Type */}
                          <TableCell>
                            <Chip label={g.type} size="small" />
                          </TableCell>

                          {/* Established */}
                          <TableCell>
                            <Typography variant="caption">
                              {g.type === "SYSTEM"
                                ? "-"
                                : (g.tenant as any)?.name ?? "-"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))


                    )
                  )
                ) : (
                  roles.length === 0 && !loading ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No roles assigned to this identity</Typography></TableCell></TableRow>
                  ) : (
                    roles.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {r.name}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip label={r.type} size="small" />
                        </TableCell>

                        {/* Tenant */}
                        <TableCell>
                          <Typography variant="caption">
                            {r.type === "SYSTEM"
                              ? "-"
                              : (r.tenant as any)?.name ?? "-"}
                          </Typography>
                        </TableCell>

                        {/* Assignment Type */}
                        <TableCell>
                          <Chip
                            label={r.assignment_type}
                            size="small"
                            color={r.assignment_type === "DIRECT" ? "primary" : "default"}
                          />
                        </TableCell>

                        {/* Assignment Name */}
                        <TableCell>
                          <Typography variant="caption">
                            {r.assignment_type === "DIRECT"
                              ? "-"
                              : r.inherited_from_groups?.map(g => g.name).join(", ")}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Button
          variant="outlined"
          startIcon={isGroupsTab ? <Group /> : <Security />}
          onClick={handleAssign}
          sx={{ px: 4, borderRadius: 2 }}
        >
          {assignLabel}
        </Button>
        <Button onClick={onClose} variant="contained" sx={{ px: 4, borderRadius: 2 }}>Close Auditor</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserRolesGroupsDialog;
