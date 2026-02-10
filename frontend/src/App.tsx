import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/Layout/AppLayout";

// ── Promted MUI Pages (polished UI) ──
import Home from "./pages/Home";
import StatisticsPage from "./components/Statistics/StatisticsPage";
import CostAnalyticsPage from "./components/Costs/CostAnalyticsPage";

// ── Developed Pages (functional, all business logic) ──
import Users from "./pages/Users";
import Tenants from "./pages/Tenants";
import CloudAccounts from "./pages/CloudAccounts";
import Components from "./pages/Components";
import TenantWorkspace from "./pages/TenantWorkspace";
import Settings from "./pages/Settings";
import CiCredentials from "./pages/CiCredentials";
import Roles from "./pages/Roles";
import UserRoleMapping from "./pages/UserRoleMapping";
import Groups from "./pages/Groups";
import UserGroupMapping from "./pages/UserGroupMapping";
import GroupRoleMapping from "./pages/GroupRoleMapping";
import Registry from "./pages/Registry";

// ── Approvals (Developed) ──
import ApprovalsLayout from "./pages/ApprovalsLayout";
import ApprovalRequests from "./pages/ApprovalRequests";
import ApprovalRequestCreate from "./pages/ApprovalRequestCreate";
import PendingApprovals from "./pages/PendingApprovals";
import DecisionHistory from "./pages/DecisionHistory";

// ── Approval Management (Developed) ──
import ApprovalManagementLayout from "./pages/ApprovalManagementLayout";
import ApprovalTemplates from "./pages/ApprovalTemplates";
import ApprovalTemplateEditor from "./pages/ApprovalTemplateEditor";
import ApprovalMappingList from "./pages/ApprovalMappingList";
import ApprovalMappingCreate from "./pages/ApprovalMappingCreate";

// ── Permissions (Developed) ──
import PermissionLayout from "./pages/PermissionLayout";
import PermissionPolicyLists from "./pages/PermissionPolicyLists";
import PermissionPolicyCreate from "./pages/PermissionPolicyCreate";
import PolicySubjectList from "./pages/PolicySubjectList";
import PolicySubjectCreate from "./pages/PolicySubjectCreate";
import BuildInProgress from "./pages/BuildInProgress";

function App() {
    return (
        <Routes>
            {/* Main Layout with Sidebar */}
            <Route element={<AppLayout />}>
                {/* Dashboard (MUI from promted) */}
                <Route path="/" element={<Home />} />

                {/* Core Management (from developed) */}
                <Route path="/users" element={<Users />} />
                <Route path="/tenants" element={<Tenants />} />
                <Route path="/ci-credentials" element={<CiCredentials />} />
                <Route path="/roles" element={<Roles />} />
                <Route path="/user-role-mapping" element={<UserRoleMapping />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/user-group-mapping" element={<UserGroupMapping />} />
                <Route path="/group-role-mapping" element={<GroupRoleMapping />} />

                {/* Cloud Accounts (from developed — nested under tenants) */}
                <Route path="/tenants/:tenantId" element={<TenantWorkspace />} />
                <Route path="/tenants/:tenantId/cloud-accounts" element={<CloudAccounts />} />
                <Route path="/tenants/:tenantId/cloud-accounts/:accountId/components" element={<Components />} />

                {/* Approvals (from developed) */}
                <Route path="/approvals" element={<ApprovalsLayout />}>
                    <Route index element={<Navigate to="requests" replace />} />
                    <Route path="approvalrequestcreate" element={<ApprovalRequestCreate />} />
                    <Route path="requests" element={<ApprovalRequests />} />
                    <Route path="pending" element={<PendingApprovals />} />
                    <Route path="history" element={<DecisionHistory />} />
                </Route>

                {/* Approval Management (from developed) */}
                <Route path="/approvals-management" element={<ApprovalManagementLayout />}>
                    <Route index element={<Navigate to="templates" replace />} />
                    <Route path="templates" element={<ApprovalTemplates />} />
                    <Route path="templates/new" element={<ApprovalTemplateEditor />} />
                    <Route path="templates/:templateId" element={<ApprovalTemplateEditor />} />
                    <Route path="policy-mapping" element={<ApprovalMappingList />} />
                    <Route path="policy-mapping-create" element={<ApprovalMappingCreate />} />
                </Route>

                {/* Permissions (from developed) */}
                <Route path="/permissions-management" element={<PermissionLayout />}>
                    <Route index element={<Navigate to="policy_list" replace />} />
                    <Route path="policy_list" element={<PermissionPolicyLists />} />
                    <Route path="policy_create" element={<PermissionPolicyCreate />} />
                    <Route path="policy_subjects" element={<PolicySubjectList />} />
                    <Route path="policy_subject_create" element={<PolicySubjectCreate />} />
                    <Route path="resource_access" element={<BuildInProgress />} />
                    <Route path="evaluate_access" element={<BuildInProgress />} />
                </Route>

                {/* Registry (from developed) */}
                <Route path="/registry" element={<Registry />} />

                {/* Analytics (MUI from promted) */}
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/costs" element={<CostAnalyticsPage />} />

                {/* Settings */}
                <Route path="/settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

export default App;
