import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";

export function Settings() {
  const { user, loading } = useAuth();
  const [feed, setFeed] = useState(null);
  const [feedError, setFeedError] = useState(null);
  const [spend, setSpend] = useState(null);
  const [spendError, setSpendError] = useState(null);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api.researchSpend().then(setSpend).catch((e) => setSpendError(e.message));
  }, [user]);

  async function loadFeed() {
    setFeedError(null);
    try {
      setFeed(await api.calendarFeedUrl());
    } catch (err) {
      setFeedError(err.message);
    }
  }

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

      {user && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>CALENDAR FEED (.ICS)</div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Watching races only, dated deadlines (confirmed or estimated). Treat the URL like a password — anyone with it can read those dates.
          </p>
          <button type="button" className="btn-secondary" onClick={loadFeed} style={{ fontSize: 13 }}>
            {feed ? "Refresh feed URL" : "Show subscribe URL"}
          </button>
          {feedError && <p style={{ color: "var(--status-urgent)", fontSize: 13 }}>{feedError}</p>}
          {feed && (
            <>
              <textarea
                readOnly
                value={feed.url}
                rows={3}
                style={{
                  width: "100%",
                  marginTop: 12,
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  border: "1px solid #333",
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 12,
                }}
              />
              <ul style={{ color: "var(--text-secondary)", fontSize: 13, paddingLeft: 18 }}>
                <li>{feed.howTo?.google}</li>
                <li>{feed.howTo?.apple}</li>
              </ul>
            </>
          )}
        </div>
      )}

      {user?.isAdmin && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>RESEARCH SPEND (24H)</div>
          {spendError && <p style={{ color: "var(--status-urgent)", fontSize: 13 }}>{spendError}</p>}
          {spend ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 0 }}>
              Research logs: {spend.researchLogCount} / cap {spend.dailyBudgetCap} (remaining {spend.remainingBudget}).
              Snapshots succeeded {spend.snapshots?.succeeded || 0}, failed {spend.snapshots?.failed || 0},
              queued {spend.snapshots?.queued || 0}. Tokens in/out: {spend.usage?.inputTokens || 0} / {spend.usage?.outputTokens || 0}.
            </p>
          ) : !spendError ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 0 }}>Loading spend…</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
