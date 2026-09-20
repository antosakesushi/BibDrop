import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { ConfidenceTag } from "../components/StatusTag.jsx";
import { InterestIndicator } from "../components/InterestIndicator.jsx";
import { useAuth } from "../AuthContext.jsx";

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
  const { user } = useAuth();
  const [race, setRace] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [researching, setResearching] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [updatingStage, setUpdatingStage] = useState(false);

  function load() {
    api.getRace(slug).then(setRace).catch((e) => setError(e.message));
  }

  useEffect(() => {
    setSnapshot(null);
    setError(null);
    setJobStatus(null);
    load();
  }, [slug]);

  async function pollJob(snapshotId) {
    const timeoutAt = Date.now() + 4 * 60 * 1000;
    let delay = 1200;
    while (Date.now() < timeoutAt) {
      const job = await api.getResearchJob(snapshotId);
      setJobStatus(job.status);
      setSnapshot(job);
      if (job.status === "succeeded" || job.status === "failed") return job;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 400, 3000);
    }
    throw new Error("Research is taking longer than expected. Refresh this page to check status.");
  }

  async function handleResearch() {
    if (!user) {
      setError("Log in to research this race.");
      return;
    }
    setResearching(true);
    setError(null);
    setJobStatus("queued");
    try {
      const accepted = await api.researchRace(slug);
      setJobStatus(accepted.status);
      const job = await pollJob(accepted.snapshotId);
      if (job.status === "failed") {
        throw new Error(job.errorMessage || "Research failed.");
      }
      const updated = await api.getRace(slug);
      setRace(updated);
      setSnapshot(job);
    } catch (e) {
      setError(e.message);
    } finally {
      setResearching(false);
      setJobStatus(null);
    }
  }

  async function handleSetStage(stage) {
    setUpdatingStage(true);
    setError(null);
    try {
      const updated = await api.setInterestStage(slug, stage);
      setRace(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingStage(false);
    }
  }

  if (!race) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading…</div>;

  const fromSnapshot = snapshot?.status === "succeeded" ? snapshot : null;
  const confidence = fromSnapshot?.confidence || race.lastResearchConfidence;
  const summary = fromSnapshot?.agentSummary || race.agentSummary;
  const events = fromSnapshot?.registrationEvents?.length
    ? fromSnapshot.registrationEvents
    : race.registrationEvents;
  const snippets = fromSnapshot?.sourceSnippets?.length
    ? fromSnapshot.sourceSnippets
    : race.researchSourceSnippets;
  const sources = fromSnapshot?.sources || [];

  function researchButtonLabel() {
    if (!researching) return "Research this race";
    if (jobStatus === "queued") return "Queued…";
    return "Agent is researching…";
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <Link to="/" style={{ color: "var(--text-secondary)", fontSize: 13 }}>&larr; Back to dashboard</Link>

      <h1 style={{ marginBottom: 4, marginTop: 8 }}>{race.name}</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        {race.city}, {race.country} · {race.season} · {race.courseType?.replace("_", " ")}
      </p>

      <div style={{ margin: "16px 0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <ConfidenceTag confidence={confidence} />
        <InterestIndicator stage={race.interestStage} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={handleResearch} disabled={researching || !user}>
          {researchButtonLabel()}
        </button>
        {!user && (
          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            <Link to="/login" style={{ color: "var(--accent-primary)" }}>Log in</Link> to research this race and save the ones you're interested in.
          </span>
        )}

        {race.lastResearchConfidence !== "not_yet_researched" && user && (
          <>
            {race.interestStage === "none" && (
              <button className="btn-secondary" onClick={() => handleSetStage("interested")} disabled={updatingStage}>
                Mark as interested
              </button>
            )}
            {race.interestStage === "interested" && (
              <button className="btn-secondary" onClick={() => handleSetStage("watching")} disabled={updatingStage}>
                Watch for deadlines
              </button>
            )}
            {race.interestStage !== "none" && (
              <button
                onClick={() => handleSetStage(race.interestStage === "watching" ? "interested" : "none")}
                disabled={updatingStage}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: "4px 2px" }}
              >
                {race.interestStage === "watching" ? "Stop watching" : "Remove"}
              </button>
            )}
          </>
        )}
      </div>
      {error && <p style={{ color: "var(--status-urgent)" }}>{error}</p>}

      {summary && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
            BIBDROP AI AGENT
          </div>
          <p style={{ marginTop: 8 }}>{summary}</p>
        </div>
      )}

      {events?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>Registration timeline</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map((e, i) => (
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

      {(sources.length > 0 || snippets?.length > 0) && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>Agent's sources</h2>
          {sources.length > 0 && (
            <ul style={{ fontSize: 13, marginBottom: snippets?.length ? 12 : 0 }}>
              {sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)" }}>
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {snippets?.length > 0 && (
            <ul style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              {snippets.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
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
