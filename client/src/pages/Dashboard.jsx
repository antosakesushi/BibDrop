import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { RaceCard } from "../components/RaceCard.jsx";
import { useAuth } from "../AuthContext.jsx";

// Three sections instead of the old four-bucket funnel: "your list" is
// cumulative (interested AND watching both live here, distinguished by the
// icon on each card) rather than splitting them into separate buckets that
// made a race seem to disappear when it moved from interested to watching.
const GROUPS = [
  {
    key: "yourList",
    heading: "Your list",
    subtitle: "Races you've flagged as interested or are watching for deadlines.",
    filter: (r) => r.interestStage !== "none",
  },
  {
    key: "needsResearch",
    heading: "Needs research",
    subtitle: null,
    filter: (r) => r.lastResearchConfidence === "not_yet_researched",
  },
  {
    key: "explored",
    heading: "Explored, not flagged",
    subtitle: "The agent found data here, but you haven't marked interest yet.",
    filter: (r) => r.lastResearchConfidence !== "not_yet_researched" && r.interestStage === "none",
  },
];

export function Dashboard() {
  const { user } = useAuth();
  const [races, setRaces] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listRaces().then(setRaces).catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 24, color: "var(--status-urgent)" }}>{error}</div>;
  if (!races) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading races…</div>;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Races</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
            Curated catalog. Goals stay on the home page — this list is for browsing and watching.
          </p>
        </div>
        <Link to="/discover" className="btn-secondary" style={{ textDecoration: "none", fontSize: 13 }}>
          Discover
        </Link>
      </div>

      {GROUPS.map((group) => {
        const groupRaces = races.filter(group.filter);
        return (
          <div key={group.key}>
            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: group.subtitle ? 2 : 12 }}>
              {group.heading} ({groupRaces.length})
            </h2>
            {group.subtitle && (
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
                {group.subtitle}
              </p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {group.key === "yourList" && !user ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  <Link to="/login" style={{ color: "var(--accent-primary)" }}>Log in</Link> to start marking races you're interested in.
                </p>
              ) : (
                <>
                  {groupRaces.map((r) => (
                    <RaceCard key={r.slug} race={r} />
                  ))}
                  {groupRaces.length === 0 && (
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Nothing in this list yet.</p>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
