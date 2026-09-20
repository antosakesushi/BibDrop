import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const CANDIDATE_STATUS = {
  IDLE: "idle",
  ADDING: "adding",
  ADDED: "added",
  ERROR: "error",
};

export function Discover() {
  const [criteria, setCriteria] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState(null);
  const [candidateStates, setCandidateStates] = useState({}); // index -> { status, message, slug }

  async function handleSearch(e) {
    e.preventDefault();
    if (!criteria.trim()) return;

    setSearching(true);
    setError(null);
    setCandidates(null);
    setCandidateStates({});

    try {
      const result = await api.discoverRaces(criteria.trim());
      setCandidates(result.candidates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(candidate, index) {
    setCandidateStates((prev) => ({ ...prev, [index]: { status: CANDIDATE_STATUS.ADDING } }));
    try {
      const race = await api.confirmDiscoveredRace(candidate);
      setCandidateStates((prev) => ({
        ...prev,
        [index]: { status: CANDIDATE_STATUS.ADDED, slug: race.slug },
      }));
    } catch (err) {
      setCandidateStates((prev) => ({
        ...prev,
        [index]: { status: CANDIDATE_STATUS.ERROR, message: err.message },
      }));
    }
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <Link to="/races" style={{ color: "var(--text-secondary)", fontSize: 13 }}>&larr; Races</Link>
      <h1 style={{ marginTop: 8 }}>Discover races</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        Describe what you're looking for in plain language - the agent searches for real races matching it.
        Example: "flat fast marathon in Europe in spring" or "small destination race in Southeast Asia."
      </p>

      <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
        <textarea
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="Describe the kind of race you're looking for…"
          maxLength={300}
          rows={3}
          style={{
            width: "100%",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid #333",
            borderRadius: 10,
            padding: 12,
            fontFamily: "inherit",
            fontSize: 14,
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{criteria.length}/300</span>
          <button type="submit" className="btn-primary" disabled={searching || !criteria.trim()}>
            {searching ? "Agent is searching…" : "Find races"}
          </button>
        </div>
      </form>

      {error && <p style={{ color: "var(--status-urgent)" }}>{error}</p>}

      {candidates && candidates.length === 0 && (
        <p style={{ color: "var(--text-secondary)" }}>
          No matches found - try broadening the criteria, or the agent may have flagged the request as not being a real race search.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {candidates?.map((candidate, i) => {
          const state = candidateStates[i] || { status: CANDIDATE_STATUS.IDLE };
          return (
            <div key={i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{candidate.name}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {candidate.city}, {candidate.country}
                  </div>
                </div>

                {state.status === CANDIDATE_STATUS.ADDED ? (
                  <Link to={`/races/${state.slug}`} className="btn-secondary" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
                    View race →
                  </Link>
                ) : (
                  <button
                    className="btn-primary"
                    style={{ whiteSpace: "nowrap" }}
                    onClick={() => handleAdd(candidate, i)}
                    disabled={state.status === CANDIDATE_STATUS.ADDING}
                  >
                    {state.status === CANDIDATE_STATUS.ADDING ? "Adding…" : "Add to registry"}
                  </button>
                )}
              </div>

              {candidate.matchReason && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 10, marginBottom: 0 }}>
                  {candidate.matchReason}
                </p>
              )}

              {state.status === CANDIDATE_STATUS.ERROR && (
                <p style={{ color: "var(--status-urgent)", fontSize: 13, marginTop: 8 }}>{state.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
