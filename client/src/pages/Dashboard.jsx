import { useEffect, useState } from "react";
import { api } from "../api.js";
import { RaceCard } from "../components/RaceCard.jsx";

// Order matches the race journey: not researched -> researched -> interested -> watching.
const GROUPS = [
  { key: "notResearched", heading: "Not yet researched", filter: (r) => r.lastResearchConfidence === "not_yet_researched" },
  { key: "researched", heading: "Researched", filter: (r) => r.lastResearchConfidence !== "not_yet_researched" && r.interestStage === "none" },
  { key: "interested", heading: "Interested", filter: (r) => r.interestStage === "interested" },
  { key: "watching", heading: "Watching for deadlines", filter: (r) => r.interestStage === "watching" },
];

export function Dashboard() {
  const [races, setRaces] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listRaces().then(setRaces).catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 24, color: "var(--status-urgent)" }}>{error}</div>;
  if (!races) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading races…</div>;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        The runner's job is to train. The agent's job is everything else.
      </p>

      {GROUPS.map((group) => {
        const groupRaces = races.filter(group.filter);
        return (
          <div key={group.key}>
            <h2 style={{ fontSize: 18, marginTop: 32 }}>{group.heading} ({groupRaces.length})</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {groupRaces.map((r) => (
                <RaceCard key={r.slug} race={r} />
              ))}
              {groupRaces.length === 0 && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Nothing here yet.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
