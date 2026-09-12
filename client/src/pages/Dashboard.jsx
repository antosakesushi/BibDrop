import { useEffect, useState } from "react";
import { api } from "../api.js";
import { RaceCard } from "../components/RaceCard.jsx";

export function Dashboard() {
  const [races, setRaces] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listRaces().then(setRaces).catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 24, color: "var(--status-urgent)" }}>{error}</div>;
  if (!races) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading races…</div>;

  const researched = races.filter((r) => r.lastResearchConfidence !== "not_yet_researched");
  const notYetResearched = races.filter((r) => r.lastResearchConfidence === "not_yet_researched");

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>BibDrop</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        The runner's job is to train. The agent's job is everything else.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Agent picks — researched races ({researched.length})</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {researched.map((r) => (
          <RaceCard key={r.slug} race={r} />
        ))}
        {researched.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>
            No races researched yet — open a race and hit "Research this race" to see the agent in action.
          </p>
        )}
      </div>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Not yet researched ({notYetResearched.length})</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {notYetResearched.map((r) => (
          <RaceCard key={r.slug} race={r} />
        ))}
      </div>
    </div>
  );
}
