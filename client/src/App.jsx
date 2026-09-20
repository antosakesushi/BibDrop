import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard.jsx";
import { RaceDetail } from "./pages/RaceDetail.jsx";
import { DeadlinesCalendar } from "./pages/DeadlinesCalendar.jsx";
import { Discover } from "./pages/Discover.jsx";
import { Goals } from "./pages/Goals.jsx";
import { Settings } from "./pages/Settings.jsx";
import { Login } from "./pages/Login.jsx";
import { Register } from "./pages/Register.jsx";
import { AuthProvider, useAuth } from "./AuthContext.jsx";

function Nav() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 32px", borderBottom: "1px solid #262626" }}>
      <Link to="/" style={{ fontWeight: 700, textDecoration: "none" }}>BibDrop</Link>
      <Link to="/goals" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Goals</Link>
      <Link to="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Races</Link>
      <Link to="/deadlines" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Alerts</Link>
      <Link to="/discover" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Discover</Link>
      <Link to="/settings" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Settings</Link>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        {!loading && (user ? (
          <>
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{user.email}</span>
            <button onClick={handleLogout} className="btn-secondary" style={{ fontSize: 13, padding: "6px 14px" }}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 13 }}>Log in</Link>
            <Link to="/register" className="btn-secondary" style={{ fontSize: 13, padding: "6px 14px", textDecoration: "none" }}>Sign up</Link>
          </>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div>
        <Nav />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/races/:slug" element={<RaceDetail />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/deadlines" element={<DeadlinesCalendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
