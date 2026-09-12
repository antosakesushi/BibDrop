import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { ConfidenceTag } from "../components/StatusTag.jsx";

const EVENT_TYPE_LABEL = {
  lottery_open: "Lottery opens",
  lottery_close: "Lottery closes",
  lottery_results: "Lottery results",
  general_entry_open: "General entry opens",
  general_entry_close: "General entry closes",
  wave_drop: "Wave drop",
  price_tier_change: "Price tier change",
  waitlist_open: "Waitlist opens",
  other: "Other",
};

export function RaceDetail() {
  const { slug } = useParams();
  const [race, setRace] = useState(null);
  const [error, setError] = useState(null);
  const [researching, setResearching] = useState(false);

  function load() {
    api.getRace(slug).then(setRace).catch((e) => setError(e.message));
  }

  useEffect(load, [slug]);

  async function handleResearch() {
    setResearching(true);
    setError(null);
    try {
      const updated = await api.researchRace(slug);
      setRace(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setResearching(false);
    }
  }

  if (!race) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading…</div>;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <Link to="/" style={{ color: "var(--text-secondary)", fontSize: 13 }}>&larr; Back to dashboard</Link>

      <h1 style={{ marginBottom: 4, marginTop: 8 }}>{race.name}</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        {race.city}, {race.country} · {race.season} · {race.courseType?.replace("_", " ")}
      </p>

      <div style={{ margin: "16px 0" }}>
        <ConfidenceTag confidence={race.lastResearchConfidence} />
      </div>

      <button className="btn-primary" onClick={handleResearch} disabled={researching}>
        {researching ? "Agent is researching…" : "Research this race"}
      </button>
      {error && <p style={{ color: "var(--status-urgent)" }}>{error}</p>}

      {race.agentSummary && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
            BIBDROP AI AGENT
          </div>
          <p style={{ marginTop: 8 }}>{race.agentSummary}</p>
        </div>
      )}

      {race.registrationEvents?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>Registration timeline</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {race.registrationEvents.map((e, i) => (
              <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{EVENT_TYPE_LABEL[e.type] || e.label}</div>
                  {e.notes && <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{e.notes}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{e.date ? new Date(e.date).toLocaleDateString() : "Date TBD"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{e.dateConfidence}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {race.researchSourceSnippets?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>Agent's sources</h2>
          <ul style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {race.researchSourceSnippets.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ marginTop: 24 }}>
        <a href={race.officialUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)" }}>
          Official race site &rarr;
        </a>
      </p>
    </div>
  );
}
