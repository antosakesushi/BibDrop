import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useRaces } from "../RaceContext";
import { api } from "../api";
import { RaceImage, PhotoCredit } from "../components/RaceImage";
import { RaceActions } from "../components/RaceActions";
import { Icon } from "../components/Icon";
import { LoadState } from "../components/LoadState";
import {
  dateLabel,
  timing,
  eventNames,
  safeUrl,
  courseLabel,
} from "../lib/races";
const factTypes = [
  ["course", "Course profile", "route"],
  ["elevation", "Elevation gain", "mountain"],
  ["weather", "Historical weather", "sun"],
  ["field", "Field size", "users"],
  ["bq", "Boston qualifiers", "timer"],
];
export function RaceDetail() {
  const { slug } = useParams();
  const { races, loading, error, demo, updateRace, setOutcome } = useRaces();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const race = races.find((r) => r.slug === slug);
  if (loading || error) return <LoadState />;
  if (!race)
    return (
      <div className="empty">
        <h1>Race not found</h1>
        <Link to="/discover">Find a race</Link>
      </div>
    );
  async function research() {
    setBusy(true);
    setFailure("");
    try {
      const result = await api.researchRace(slug);
      updateRace({
        ...result,
        interestStage: race.interestStage,
        entryOutcome: race.entryOutcome,
      });
    } catch (e) {
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }
  const events = [...(race.registrationEvents || [])].sort((a, b) =>
    a.date ? (b.date ? new Date(a.date) - new Date(b.date) : -1) : 1,
  );
  const sources = race.researchSources || [];
  return (
    <>
      <Link className="back-link" to="/">
        <Icon name="back" size={17} />
        My races
      </Link>
      <div className="race-hero">
        <RaceImage race={race} hero />
        <div className="hero-copy">
          <span className="hero-tag">
            {race.edition || "Edition not verified"}
            {demo ? " · Demo" : ""}
          </span>
          <h1>{race.name}</h1>
          <p>
            <Icon name="pin" size={18} />
            {race.city}, {race.country} <span>·</span>{" "}
            {race.raceDate
              ? dateLabel(race.raceDate)
              : "Race date not verified"}
          </p>
        </div>
      </div>
      <div className="detail-layout">
        <div>
          <section className="panel researcher-brief">
            <div className="section-head">
              <div className="icon-heading">
                <span className="soft-icon">
                  <Icon name="spark" />
                </span>
                <div>
                  <p className="eyebrow">BIBDROP RESEARCHER</p>
                  <h2>The race briefing</h2>
                </div>
              </div>
              <span className="pill">
                {demo
                  ? "Example research"
                  : race.lastResearchConfidence === "not_yet_researched"
                    ? "Research needed"
                    : `${race.lastResearchConfidence} confidence`}
              </span>
            </div>
            <p>
              {race.agentSummary ||
                "There is no current research briefing for this race yet. Request research to check its entry routes and the details that matter to you."}
            </p>
            <p className="muted small">
              {race.lastResearchedAt
                ? `${demo ? "Sample check" : "Last researched"}: ${dateLabel(race.lastResearchedAt)}`
                : "Not yet researched"}{" "}
              ·{" "}
              {demo
                ? "Not verified race advice"
                : "AI findings; check the linked evidence"}
            </p>
            <div className="button-row">
              <Link
                className="btn-secondary"
                to={`/discover?race=${encodeURIComponent(race.name)}`}
              >
                <Icon name="spark" size={17} />
                Ask about this race
              </Link>
              <button
                className="text-button"
                onClick={research}
                disabled={busy || demo}
              >
                {demo
                  ? "Live research unavailable in demo"
                  : busy
                    ? "Researching sources…"
                    : "Refresh research"}
              </button>
            </div>
            {failure && (
              <p role="alert" className="error">
                {failure}
              </p>
            )}
          </section>
          <section className="spaced">
            <div className="section-head">
              <h2>What’s it like to run?</h2>
              <span className="muted small">Evidence, not a match score</span>
            </div>
            <div className="fact-grid">
              {factTypes.map(([key, label, icon]) => {
                const fact = race.profileFacts?.find((f) => f.key === key);
                return (
                  <div className="fact" key={key}>
                    <Icon name={icon} />
                    <p className="eyebrow">{label}</p>
                    <strong>
                      {fact?.value ||
                        (key === "course"
                          ? courseLabel(race.courseType)
                          : "Not yet verified")}
                    </strong>
                    <p className="small muted">
                      {fact?.context ||
                        (key === "course"
                          ? "Catalog description; research may be needed"
                          : "No sourced data available")}
                    </p>
                    {safeUrl(fact?.sourceUrl) && (
                      <a
                        className="small"
                        href={safeUrl(fact.sourceUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source <Icon name="external" size={12} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel spaced">
            <h2>Registration timeline</h2>
            {!events.length ? (
              <div className="callout">
                <Icon name="calendar" />
                <p>
                  No confirmed entry dates yet. You can still add this race to
                  your watchlist.
                </p>
              </div>
            ) : (
              <ol className="timeline">
                {events.map((e, i) => (
                  <li key={i}>
                    <span className="timeline-icon">
                      <Icon
                        name={e.type.includes("close") ? "timer" : "calendar"}
                        size={18}
                      />
                    </span>
                    <div>
                      <div className="section-head">
                        <h3>{e.label || eventNames[e.type]}</h3>
                        <span className="pill neutral">{timing(e)}</span>
                      </div>
                      <p>
                        {dateLabel(e.date)} · {e.dateConfidence || "unknown"}
                      </p>
                      {e.notes && <p className="muted small">{e.notes}</p>}
                      {safeUrl(e.sourceUrl) && (
                        <a
                          className="small"
                          href={safeUrl(e.sourceUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View evidence <Icon name="external" size={12} />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="muted small">
              Dates are shown as calendar dates. Check the organiser’s timezone
              and exact cutoff before acting.
            </p>
          </section>
          <details className="panel spaced">
            <summary>Sources & image credits</summary>
            {sources.length ? (
              sources.map((s, i) => (
                <p key={i}>
                  {safeUrl(s.url) ? (
                    <a href={safeUrl(s.url)} target="_blank" rel="noreferrer">
                      {s.title || s.url}
                    </a>
                  ) : (
                    s.title
                  )}
                  {s.snippet && <span className="muted"> — {s.snippet}</span>}
                </p>
              ))
            ) : (
              <p className="muted">
                No structured research sources available yet.
              </p>
            )}
            {race.researchSourceSnippets?.map((s, i) => (
              <p className="small muted" key={i}>
                {s}
              </p>
            ))}
            <PhotoCredit race={race} />
          </details>
        </div>
        <aside>
          <div className="panel entry-panel">
            <p className="eyebrow">MAKE YOUR NEXT MOVE</p>
            <h2>Keep this race in sight.</h2>
            <p className="muted">
              Save it for later, or add its entry windows to your watchlist.
            </p>
            <RaceActions race={race} />
            <div className="monitor-note">
              <Icon name="info" size={17} />
              <span>
                Watchlist only in this prototype. Automatic monitoring and email
                alerts are not active.
              </span>
            </div>
            {safeUrl(race.officialUrl) && (
              <a
                className="btn-secondary full"
                href={safeUrl(race.officialUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Official race website <Icon name="external" size={16} />
              </a>
            )}
            {race.interestStage !== "none" && (
              <label className="outcome-label">
                Your entry status
                <select
                  value={race.entryOutcome || "not_applied"}
                  onChange={(e) =>
                    setOutcome(slug, e.target.value).catch((e) =>
                      setFailure(e.message),
                    )
                  }
                >
                  <option value="not_applied">Not applied</option>
                  <option value="applied">Applied / awaiting outcome</option>
                  <option value="registered">Entry secured</option>
                  <option value="unsuccessful">Unsuccessful</option>
                </select>
                <small className="muted">
                  Your record, separate from watching. Entry is confirmed by the
                  organiser.
                </small>
              </label>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
