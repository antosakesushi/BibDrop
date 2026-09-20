import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export function Settings() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading…</div>;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>Settings</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        Account details. Email alerts fire for <strong>watched</strong> races only (14 / 7 / 1 days before a dated deadline).
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        {user ? (
          <>
            <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>SIGNED IN</div>
            <p>{user.email}</p>
            <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>ALERT DEFAULTS</div>
            <p style={{ marginBottom: 0, color: "var(--text-secondary)", fontSize: 14 }}>
              Channel: email · Lead days: 14, 7, 1 · Timezone: UTC
            </p>
          </>
        ) : (
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            <Link to="/login" style={{ color: "var(--accent-primary)" }}>Log in</Link> to see account settings.
          </p>
        )}
      </div>
    </div>
  );
}
