import { Routes, Route, NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { RaceDetail } from "./pages/RaceDetail";
import { DeadlinesCalendar } from "./pages/DeadlinesCalendar";
import { Discover } from "./pages/Discover";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AuthProvider, useAuth } from "./AuthContext";
import { RaceProvider, useRaces } from "./RaceContext";
import { Icon } from "./components/Icon";
import { Alerts } from "./pages/Alerts";
function Shell() {
  const { user, logout } = useAuth();
  const { demo, setMode, monitoring } = useRaces();
  const location = useLocation();
  const [dark, setDark] = useState(
    () => localStorage.getItem("bibdrop-theme") === "dark",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("bibdrop-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const links = [
    ["/", "home", "My races"],
    ["/discover", "spark", "Discover"],
    ["/deadlines", "calendar", "Deadlines"],
    ["/alerts", "bell", "Alerts"],
  ];
  return (
    <>
      <header className="app-header">
        <Link className="brand" to="/">
          <span className="brand-icon">
            <Icon name="flag" size={23} />
          </span>
          BibDrop<span className="beta">BETA</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end>
              <Icon name={icon} size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDark(!dark)}
          >
            <Icon name={dark ? "sun" : "moon"} />
          </button>
          {user ? (
            <button
              className="btn-secondary small"
              onClick={() => logout().catch((e) => setError(e.message))}
            >
              Log out
            </button>
          ) : (
            <Link className="btn-primary small" to="/login">
              Log in
            </Link>
          )}
        </div>
      </header>
      <div className={`mode-bar ${demo ? "demo" : ""}`}>
        <span>
          {demo
            ? "DEMO · Sample dates and research. Changes stay in this browser."
            : monitoring.enabled
              ? "LIVE · Registration monitoring active. Alerts appear in BibDrop."
              : "LIVE CATALOG · Automatic checks paused. Research available on request."}
        </span>
        <button onClick={() => setMode(!demo)}>
          {demo ? "Use live catalog" : "Explore demo"}{" "}
          <Icon name="arrow" size={13} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/deadlines" element={<DeadlinesCalendar />} />
          <Route path="/races/:slug" element={<RaceDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>That page isn’t here</h1>
                <Link to="/">Back to my races</Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <span className="brand">BibDrop.</span>
        <span>Find your race. Keep your opportunity.</span>
        <Link to="/discover">
          Ask the researcher <Icon name="arrow" size={15} />
        </Link>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end>
            <Icon name={icon} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <RaceProvider>
        <Shell />
      </RaceProvider>
    </AuthProvider>
  );
}
