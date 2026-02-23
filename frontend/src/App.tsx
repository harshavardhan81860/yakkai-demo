import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/Layout/AppLayout";
import RoleGuard from "./components/Auth/RoleGuard";

// ── Pages ──
import Home from "./pages/Home";
import StatisticsPage from "./components/Statistics/StatisticsPage";
import CostAnalyticsPage from "./components/Costs/CostAnalyticsPage";

// ── Core Management ──
import Users from "./pages/Users";
import Tenants from "./pages/Tenants";
import CloudAccounts from "./pages/CloudAccounts";
import Components from "./pages/Components";
import FinOpsDashboard from "./pages/FinOpsDashboard";
import TenantUsers from "./pages/TenantUsers";
import CiCredentials from "./pages/CiCredentials";
import Roles from "./pages/Roles";
import UserRoleMapping from "./pages/UserRoleMapping";
import Groups from "./pages/Groups";
import UserGroupMapping from "./pages/UserGroupMapping";
import GroupRoleMapping from "./pages/GroupRoleMapping";
import Registry from "./pages/Registry";

// ── Approvals ──
import ApprovalsLayout from "./pages/ApprovalsLayout";
import ApprovalRequests from "./pages/ApprovalRequests";
import ApprovalRequestCreate from "./pages/ApprovalRequestCreate";
import PendingApprovals from "./pages/PendingApprovals";
import DecisionHistory from "./pages/DecisionHistory";

// ── Approval Management ──
import ApprovalManagementLayout from "./pages/ApprovalManagementLayout";
import ApprovalTemplates from "./pages/ApprovalTemplates";
import ApprovalTemplateEditor from "./pages/ApprovalTemplateEditor";
import ApprovalMappingList from "./pages/ApprovalMappingList";
import ApprovalMappingCreate from "./pages/ApprovalMappingCreate";

// ── Permissions ──
import PermissionLayout from "./pages/PermissionLayout";
import PermissionPolicyLists from "./pages/PermissionPolicyLists";
import PermissionPolicyCreate from "./pages/PermissionPolicyCreate";
import PolicySubjectList from "./pages/PolicySubjectList";
import PolicySubjectCreate from "./pages/PolicySubjectCreate";
import BuildInProgress from "./pages/BuildInProgress";
import ResourceRequestWizard from "./pages/ResourceRequest/ResourceRequestWizard";
import ResourceRequestsList from "./pages/ResourceRequest/ResourceRequestsList";

/* ────────────────────────────────────────────
   Role Constants for Guards
   ──────────────────────────────────────────── */
const ALL_ROLES = [
    "system_admin", "system_manager", "system_user",
    "tenant_admin", "tenant_manager", "tenant_user"
];
const ADMIN_MANAGER = [
    "system_admin", "system_manager",
    "tenant_admin", "tenant_manager"
];
const ADMIN_ONLY = ["system_admin", "tenant_admin"];
const TENANT_ROLES = ["tenant_admin", "tenant_manager", "tenant_user"];

function App() {
    return (
        <Routes>
            {/* Main Layout with Sidebar */}
            <Route element={<AppLayout />}>
                {/* Home / Landing — accessible by all */}
                <Route path="/" element={<Home />} />

                {/* ── Core Management ── */}
                <Route path="/users" element={
                    <RoleGuard allowed={["system_admin", "system_manager", "system_user"]}>
                        <Users />
                    </RoleGuard>
                } />
                <Route path="/tenants" element={
                    <RoleGuard allowed={["system_admin", "system_manager", "system_user"]}>
                        <Tenants />
                    </RoleGuard>
                } />
                <Route path="/ci-credentials" element={
                    <RoleGuard allowed={ALL_ROLES}>
                        <CiCredentials />
                    </RoleGuard>
                } />
                <Route path="/roles" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <Roles />
                    </RoleGuard>
                } />
                <Route path="/user-role-mapping" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <UserRoleMapping />
                    </RoleGuard>
                } />
                <Route path="/groups" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <Groups />
                    </RoleGuard>
                } />
                <Route path="/user-group-mapping" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <UserGroupMapping />
                    </RoleGuard>
                } />
                <Route path="/group-role-mapping" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <GroupRoleMapping />
                    </RoleGuard>
                } />
                <Route path="/tenant-users" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <TenantUsers />
                    </RoleGuard>
                } />

                {/* ── Cloud Accounts (tenant-scoped) ── */}
                <Route path="/tenants/:tenantId" element={<Navigate to="cloud-accounts" replace />} />
                <Route path="/tenants/:tenantId/cloud-accounts" element={
                    <RoleGuard allowed={ALL_ROLES}>
                        <CloudAccounts />
                    </RoleGuard>
                } />
                <Route path="/tenants/:tenantId/cloud-accounts/:accountId/components" element={
                    <RoleGuard allowed={ALL_ROLES}>
                        <Components />
                    </RoleGuard>
                } />
                <Route path="/tenants/:tenantId/finops" element={
                    <RoleGuard allowed={ALL_ROLES}>
                        <FinOpsDashboard />
                    </RoleGuard>
                } />
                <Route path="/tenants/:tenantId/users" element={
                    <RoleGuard allowed={ALL_ROLES}>
                        <TenantUsers />
                    </RoleGuard>
                } />

                {/* ── Approvals (all users can see their own) ── */}
                <Route path="/approvals" element={<ApprovalsLayout />}>
                    <Route index element={<Navigate to="requests" replace />} />
                    <Route path="approvalrequestcreate" element={
                        <RoleGuard allowed={ALL_ROLES}>
                            <ApprovalRequestCreate />
                        </RoleGuard>
                    } />
                    <Route path="requests" element={
                        <RoleGuard allowed={ALL_ROLES}>
                            <ApprovalRequests />
                        </RoleGuard>
                    } />
                    <Route path="pending" element={
                        <RoleGuard allowed={ALL_ROLES}>
                            <PendingApprovals />
                        </RoleGuard>
                    } />
                    <Route path="history" element={
                        <RoleGuard allowed={ALL_ROLES}>
                            <DecisionHistory />
                        </RoleGuard>
                    } />
                </Route>

                {/* ── Approval Management (admin + manager) ── */}
                <Route path="/approvals-management" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <ApprovalManagementLayout />
                    </RoleGuard>
                }>
                    <Route index element={<Navigate to="templates" replace />} />
                    <Route path="templates" element={<ApprovalTemplates />} />
                    <Route path="templates/new" element={<ApprovalTemplateEditor />} />
                    <Route path="templates/:templateId" element={<ApprovalTemplateEditor />} />
                    <Route path="policy-mapping" element={<ApprovalMappingList />} />
                    <Route path="policy-mapping-create" element={<ApprovalMappingCreate />} />
                </Route>

                {/* ── Permissions (admin + manager) ── */}
                <Route path="/permissions-management" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <PermissionLayout />
                    </RoleGuard>
                }>
                    <Route index element={<Navigate to="policy_list" replace />} />
                    <Route path="policy_list" element={<PermissionPolicyLists />} />
                    <Route path="policy_create" element={<PermissionPolicyCreate />} />
                    <Route path="policy_subjects" element={<PolicySubjectList />} />
                    <Route path="policy_subject_create" element={<PolicySubjectCreate />} />
                    <Route path="resource_access" element={<BuildInProgress />} />
                    <Route path="evaluate_access" element={<BuildInProgress />} />
                </Route>

                {/* ── Registry (admin + manager) ── */}
                <Route path="/registry" element={
                    <RoleGuard allowed={ADMIN_MANAGER}>
                        <Registry />
                    </RoleGuard>
                } />

                {/* ── Resource Requests ── */}
                <Route path="/resource-request/new" element={
                    <RoleGuard allowed={TENANT_ROLES}>
                        <ResourceRequestWizard />
                    </RoleGuard>
                } />
                <Route path="/resource-request/list" element={
                    <RoleGuard allowed={ALL_ROLES}>
                        <ResourceRequestsList />
                    </RoleGuard>
                } />

                {/* ── Analytics ── */}
                <Route path="/statistics" element={
                    <RoleGuard allowed={ALL_ROLES}>
                        <StatisticsPage />
                    </RoleGuard>
                } />
                <Route path="/costs" element={
                    <RoleGuard allowed={ALL_ROLES}>
                        <CostAnalyticsPage />
                    </RoleGuard>
                } />
            </Route>
        </Routes>
    );
}

export default App;
