import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { DeadlinesCalendar } from "./DeadlinesCalendar.jsx";

const BANDS = [
  { key: "act_now", heading: "Act now" },
  { key: "this_week", heading: "This week" },
  { key: "upcoming", heading: "Upcoming" },
];

const STATUS_LABEL = {
  scheduled: "Scheduled",
  sent: "Sent",
  skipped: "Skipped",
  failed: "Failed",
};

export function Alerts() {
  const { user, loading } = useAuth();
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAlerts([]);
      return;
    }
    api.listAlerts().then(setAlerts).catch((e) => setError(e.message));
  }, [user, loading]);

  if (loading) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading…</div>;

  if (!user) {
    return (
      <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
        <h1>Alerts</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          <Link to="/login" style={{ color: "var(--accent-primary)" }}>Log in</Link> and watch a race to schedule deadline emails.
        </p>
        <DeadlinesCalendar embedded />
      </div>
    );
  }

  const scheduled = (alerts || []).filter((a) => a.status === "scheduled");

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>Alerts</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        Watching a race schedules email heads-ups 14, 7, and 1 day before dated deadlines
        (confirmed or estimated only — unknown/TBD dates are not emailed).
        Delivery requires <code>RESEND_API_KEY</code> on the worker; without it, rows stay scheduled.
      </p>

      {error && <p style={{ color: "var(--status-urgent)" }}>{error}</p>}

      {alerts === null ? (
        <p style={{ color: "var(--text-secondary)" }}>Loading your alerts…</p>
      ) : scheduled.length === 0 && alerts.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          No alerts yet. Research a race, then choose <strong>Watch for deadlines</strong>.
        </p>
      ) : (
        BANDS.map((band) => {
          const items = (alerts || []).filter((a) => (a.urgency || "upcoming") === band.key);
          if (!items.length) return null;
          return (
            <div key={band.key} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 15, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {band.heading} ({items.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          );
        })
      )}

      <DeadlinesCalendar embedded />
    </div>
  );
}

function AlertRow({ alert }) {
  const race = alert.race || {};
  const deadline = alert.deadline || {};
  const when = deadline.date ? new Date(deadline.date).toLocaleDateString() : "Date TBD";
  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {race.slug ? (
            <Link to={`/races/${race.slug}`} style={{ fontWeight: 600, textDecoration: "none" }}>
              {race.name || "Race"}
            </Link>
          ) : (
            <span style={{ fontWeight: 600 }}>{race.name || "Race"}</span>
          )}
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{STATUS_LABEL[alert.status] || alert.status}</span>
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
          {deadline.label || deadline.type} · {when} · {deadline.dateConfidence || "unknown"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          {alert.leadDays}-day email · fires {alert.fireAt ? new Date(alert.fireAt).toLocaleString() : ""}
        </div>
      </div>
      {race.officialUrl && (
        <a href={race.officialUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: "none", whiteSpace: "nowrap", fontSize: 13 }}>
          Official site
        </a>
      )}
    </div>
  );
}
