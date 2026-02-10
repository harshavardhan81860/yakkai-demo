import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import TopBar from "../components/Common/TopBar";
import "../styles/layout.css";
import { useState } from "react";
import {
  People,
  Storage,
  Settings,
  Dashboard as DashboardIcon,
  ChevronRight,
  ExpandMore
} from "@mui/icons-material";

const Layout = () => {
  const { user, isActive, authState, logout } = useAuth();
  const navigate = useNavigate();
  const [identityOpen, setIdentityOpen] = useState(false);
  const [infraOpen, setInfraOpen] = useState(false);
  const [governanceOpen, setGovernanceOpen] = useState(false);

  return (
    <div className="app-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div
          className="sidebar-header clickable"
          onClick={() => navigate("/")}
        >
          {/* <div className="sidebar-title-main">TanichAI</div> */}
          <div className="sidebar-title-main">SuyaSevAI</div>
          <div className="sidebar-title-sub">Cloud Self Service Portal</div>
        </div>

        {isActive && (
          <nav className="sidebar-nav">
            {/* Dashboard */}
            <NavLink to="/dashboard" className="nav-button">
              <DashboardIcon sx={{ fontSize: 20 }} />
              <span>Dashboard</span>
            </NavLink>

            {/* Identity Group */}
            <div className={`nav-group-header ${identityOpen ? 'active' : ''}`} onClick={() => setIdentityOpen(!identityOpen)}>
              <div className="header-label">
                <People sx={{ fontSize: 18 }} />
                <span>Identity & Access</span>
              </div>
              {identityOpen ? <ExpandMore sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
            </div>
            {identityOpen && (
              <div className="nav-sub-group">
                <NavLink to="/users" className="nav-button nav-subitem">Users</NavLink>
                <NavLink to="/groups" className="nav-button nav-subitem">Groups</NavLink>
                <NavLink to="/roles" className="nav-button nav-subitem">Roles</NavLink>
              </div>
            )}

            {/* Infrastructure Group */}
            <div className={`nav-group-header ${infraOpen ? 'active' : ''}`} onClick={() => setInfraOpen(!infraOpen)}>
              <div className="header-label">
                <Storage sx={{ fontSize: 18 }} />
                <span>Infrastructure</span>
              </div>
              {infraOpen ? <ExpandMore sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
            </div>
            {infraOpen && (
              <div className="nav-sub-group">
                <NavLink to="/tenants" className="nav-button nav-subitem">Tenants</NavLink>
                <NavLink to="/ci-credentials" className="nav-button nav-subitem">CICD Runner</NavLink>
              </div>
            )}

            {/* Governance Group */}
            <div className={`nav-group-header ${governanceOpen ? 'active' : ''}`} onClick={() => setGovernanceOpen(!governanceOpen)}>
              <div className="header-label">
                <Settings sx={{ fontSize: 18 }} />
                <span>Governance & Policies</span>
              </div>
              {governanceOpen ? <ExpandMore sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
            </div>
            {governanceOpen && (
              <div className="nav-sub-group">
                <NavLink to="/approvals" className="nav-button nav-subitem">Approval Requests</NavLink>
                <NavLink to="/approvals-management" className="nav-button nav-subitem">Workflow Definitions</NavLink>
                <NavLink to="/permissions-management" className="nav-button nav-subitem">Permissions</NavLink>
                <NavLink to="/registry" className="nav-button nav-subitem">Resource Registry</NavLink>
                <div className="nav-button nav-subitem nav-disabled">
                  Quotas <span className="badge-soon">Soon</span>
                </div>
              </div>
            )}

            <div className="nav-button nav-disabled">
              <span>Notifications</span>
              <span className="badge-soon">Soon</span>
            </div>




          </nav>
        )}

        <div className="sidebar-footer">
          <div className="logged-user hover-card">
            <div className="logged-label">Logged in as</div>
            <div className="logged-name">{user?.username ?? "—"}</div>
            <div className="logged-email">{user?.email ?? ""}</div>

            {/* Hover popup */}
            <div className="user-popup">
              <div><b>Name:</b> {user?.first_name} {user?.last_name}</div>
              <div><b>Department:</b> {user?.department}</div>
              <div><b>Gender:</b> {user?.gender}</div>
              <div><b>Mobile:</b> {user?.mobile}</div>
              <div><b>Status:</b> {isActive ? "Active" : "Inactive"}</div>
            </div>
          </div>

          <button className="nav-button logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <main className="content">
          {authState === "ACTIVE" && <Outlet />}

          {authState === "INACTIVE" && (
            <div className="auth-message">
              Your account is inactive. Please contact administrator.
            </div>
          )}

          {authState === "NOT_FOUND" && (
            <div className="auth-message">
              User does not exist in database. Please contact administrator.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Layout;
