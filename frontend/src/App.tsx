import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/Auth/LoginPage';
import AppLayout from './components/Layout/AppLayout';
import DashboardPage from './components/Dashboard/DashboardPage';
import RequestsListPage from './components/Requests/RequestsListPage';
import NewRequestPage from './components/Requests/NewRequestPage';
import ApprovalsPage from './components/Approvals/ApprovalsPage';
import StatisticsPage from './components/Statistics/StatisticsPage';
import CostAnalyticsPage from './components/Costs/CostAnalyticsPage';
import UsersAdminPage from './components/Admin/UsersAdminPage';
import AccountsAdminPage from './components/Admin/AccountsAdminPage';
import CatalogAdminPage from './components/Admin/CatalogAdminPage';
import WorkflowsAdminPage from './components/Admin/WorkflowsAdminPage';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (roles && user.role && !roles.includes(user.role.name)) return <Navigate to="/" />;
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="requests" element={<RequestsListPage />} />
        <Route path="requests/new" element={<NewRequestPage />} />
        <Route path="approvals" element={<ProtectedRoute roles={['admin', 'manager']}><ApprovalsPage /></ProtectedRoute>} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="costs" element={<ProtectedRoute roles={['admin', 'manager']}><CostAnalyticsPage /></ProtectedRoute>} />
        <Route path="admin/users" element={<ProtectedRoute roles={['admin']}><UsersAdminPage /></ProtectedRoute>} />
        <Route path="admin/accounts" element={<ProtectedRoute roles={['admin']}><AccountsAdminPage /></ProtectedRoute>} />
        <Route path="admin/catalog" element={<ProtectedRoute roles={['admin']}><CatalogAdminPage /></ProtectedRoute>} />
        <Route path="admin/workflows" element={<ProtectedRoute roles={['admin']}><WorkflowsAdminPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
