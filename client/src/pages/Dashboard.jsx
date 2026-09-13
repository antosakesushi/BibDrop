import { useState } from "react";
import { Link } from "react-router-dom";
import { useRaces } from "../RaceContext";
import { useAuth } from "../AuthContext";
import { RaceCard } from "../components/RaceCard";
import { Icon } from "../components/Icon";
import { LoadState } from "../components/LoadState";
import { upcoming, dateLabel, timing } from "../lib/races";
export function Dashboard() {
  const { races, loading, error, demo, monitoring } = useRaces();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  if (loading || error) return <LoadState />;
  const mine = races.filter((r) => r.interestStage !== "none");
  const watching = mine.filter((r) => r.interestStage === "watching");
  const events = upcoming(
    watching.filter((r) => r.entryOutcome !== "registered"),
  );
  const next = events[0];
  const shown = mine.filter(
    (r) => filter === "all" || r.interestStage === filter,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR NEXT START LINE</p>
          <h1>
            {mine.length
              ? "Your races. Your next move."
              : "A start line worth planning for."}
          </h1>
          <p className="muted">
            {mine.length
              ? "Keep the races you care about—and their entry windows—in one place."
              : "Find a marathon, understand the entry route, and build your shortlist."}
          </p>
        </div>
        <Link className="btn-secondary" to="/discover">
          <Icon name="spark" />
          Find a race
        </Link>
      </div>
      {!user && !demo && (
        <div className="guest-note">
          Browse freely. <Link to="/register">Create an account</Link> when
          you’re ready to save your races.
        </div>
      )}
      <div className="dashboard-top">
        <section className="deadline-feature">
          <div className="section-head">
            <span className="eyebrow">
              {next ? "NEXT REGISTRATION EVENT" : "YOUR REGISTRATION WATCHLIST"}
            </span>
            <Icon name="calendar" />
          </div>
          <h2>{next ? next.race.name : "Know when to make your move."}</h2>
          <p>
            {next
              ? next.label
              : "Choose a race to watch. Its known deadlines will appear here."}
          </p>
          {next ? (
            <>
              <div className="deadline-date">
                <strong>{timing(next)}</strong>
                <span>
                  {dateLabel(next.date)}
                  {demo ? " · Sample deadline" : ""}
                </span>
              </div>
              <Link className="btn-primary" to={`/races/${next.race.slug}`}>
                View entry details <Icon name="arrow" />
              </Link>
            </>
          ) : (
            <Link className="btn-primary" to="/discover">
              Discover your next race <Icon name="arrow" />
            </Link>
          )}
        </section>
        <section className="windows">
          <div className="section-head">
            <h2>Coming up</h2>
            <Link to="/deadlines">
              All deadlines <Icon name="arrow" size={15} />
            </Link>
          </div>
          {events.slice(0, 3).map((e, i) => (
            <Link className="window-row" to={`/races/${e.race.slug}`} key={i}>
              <span className="date-tile">
                <small>
                  {new Date(e.date).toLocaleDateString("en-GB", {
                    month: "short",
                    timeZone: "UTC",
                  })}
                </small>
                {new Date(e.date).getUTCDate()}
              </span>
              <span>
                <strong>{e.race.name}</strong>
                <small>
                  {e.label} · {e.dateConfidence}
                </small>
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          ))}
          {!events.length && (
            <p className="muted">
              No upcoming dated events in your watchlist. Unannounced dates stay
              visible on each race.
            </p>
          )}
          <div className="monitor-note">
            <Icon name="info" size={16} />
            <span>
              {!demo && monitoring.enabled
                ? "Monitoring active. Registration updates appear in Alerts."
                : "Automatic checks are paused. Research is available on request."}
            </span>
          </div>
        </section>
      </div>
      <div className="section-head spaced">
        <h2>
          My races <span className="count">{mine.length}</span>
        </h2>
        <div className="segmented" aria-label="Filter my races">
          {[
            ["all", "All saved"],
            ["watching", "Watching"],
            ["interested", "Saved for later"],
          ].map(([v, l]) => (
            <button
              key={v}
              aria-pressed={filter === v}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {shown.length ? (
        <div className="race-grid">
          {shown.map((r) => (
            <RaceCard key={r.slug} race={r} />
          ))}
        </div>
      ) : (
        <div className="empty compact-empty">
          <Icon name="bookmark" size={28} />
          <h2>
            {mine.length
              ? "No races in this view yet"
              : "Your shortlist starts here"}
          </h2>
          <p>Save a possibility or choose to watch its registration.</p>
          <Link to="/discover" className="btn-secondary">
            Explore races <Icon name="arrow" />
          </Link>
        </div>
      )}
      <div className="section-head spaced">
        <div>
          <p className="eyebrow">A LITTLE INSPIRATION</p>
          <h2>Where could your next race take you?</h2>
        </div>
        <Link to="/discover">
          Research more <Icon name="arrow" size={16} />
        </Link>
      </div>
      <div className="race-grid">
        {races
          .filter((r) => r.interestStage === "none")
          .slice(0, 3)
          .map((r) => (
            <RaceCard race={r} key={r.slug} />
          ))}
      </div>
    </>
  );
}
