import { useState } from "react";
import { Link } from "react-router-dom";
import { useRaces } from "../RaceContext";
import { LoadState } from "../components/LoadState";
import { Icon } from "../components/Icon";
import { RaceImage } from "../components/RaceImage";
import { upcoming, dateLabel, timing, makeICS, daysUntil } from "../lib/races";
export function DeadlinesCalendar() {
  const { races, loading, error, demo } = useRaces();
  const [view, setView] = useState("deadlines");
  const [all, setAll] = useState(false);
  if (loading || error) return <LoadState />;
  const pool = races.filter((r) => all || r.interestStage === "watching");
  const events =
    view === "deadlines"
      ? upcoming(pool.filter((r) => r.entryOutcome !== "registered"))
      : pool
          .filter(
            (r) => daysUntil(r.raceDate) !== null && daysUntil(r.raceDate) >= 0,
          )
          .map((r) => ({
            race: r,
            type: "race",
            label: "Race day",
            date: r.raceDate,
            dateConfidence: demo ? "estimated" : "confirmed",
          }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
  const unannounced = pool.filter((r) =>
    view === "deadlines" ? !upcoming([r]).length : !r.raceDate,
  );
  function download() {
    const blob = new Blob([makeICS(events)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = demo ? "bibdrop-DEMO.ics" : "bibdrop-deadlines.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE DATES THAT MATTER</p>
          <h1>Your registration timeline.</h1>
          <p className="muted">
            Openings, closing windows and the start lines beyond them.
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={download}
          disabled={!events.some((e) => e.dateConfidence === "confirmed")}
        >
          <Icon name="download" />
          Export confirmed dates
        </button>
      </div>
      <div className="section-head spaced">
        <div className="segmented">
          <button
            aria-pressed={view === "deadlines"}
            onClick={() => setView("deadlines")}
          >
            Registration deadlines
          </button>
          <button
            aria-pressed={view === "races"}
            onClick={() => setView("races")}
          >
            Race dates
          </button>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />
          Include all catalog races
        </label>
      </div>
      <div className="timeline-layout">
        <section>
          {events.length ? (
            <ol className="timeline calendar-timeline">
              {events.map((e, i) => (
                <li key={`${e.race.slug}-${i}`}>
                  <span className="timeline-icon">
                    <Icon
                      name={daysUntil(e.date) <= 3 ? "timer" : "calendar"}
                    />
                  </span>
                  <article
                    className={`panel calendar-event ${daysUntil(e.date) <= 3 ? "near" : ""}`}
                  >
                    <div className="section-head">
                      <span className="eyebrow">{dateLabel(e.date)}</span>
                      <span className="pill">{timing(e)}</span>
                    </div>
                    <div className="event-body">
                      <div>
                        <h2>
                          <Link to={`/races/${e.race.slug}`}>
                            {e.race.name}
                          </Link>
                        </h2>
                        <p>{e.label}</p>
                        <p className="muted small">
                          {e.dateConfidence} {demo ? "· Sample event" : ""}
                        </p>
                      </div>
                      <Link
                        className="event-photo"
                        to={`/races/${e.race.slug}`}
                        aria-label={`View ${e.race.name}`}
                      >
                        <RaceImage race={e.race} />
                      </Link>
                    </div>
                    <Link
                      className="btn-secondary"
                      to={`/races/${e.race.slug}`}
                    >
                      View {view === "races" ? "race" : "entry"} details{" "}
                      <Icon name="arrow" size={16} />
                    </Link>
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty">
              <Icon name="calendar" size={32} />
              <h2>No upcoming dates here yet</h2>
              <p>
                Watch a race to bring its registration windows into your
                timeline.
              </p>
              <Link className="btn-primary" to="/discover">
                Find a race
              </Link>
            </div>
          )}
        </section>
        <aside className="panel">
          <p className="eyebrow">STILL ON YOUR RADAR</p>
          <h2>Dates to confirm</h2>
          {unannounced.length ? (
            unannounced.map((r) => (
              <Link
                key={r.slug}
                className="pending-race"
                to={`/races/${r.slug}`}
              >
                <Icon name="calendar" size={17} />
                <span>
                  <strong>{r.name}</strong>
                  <small>No upcoming verified date</small>
                </span>
                <Icon name="arrow" size={14} />
              </Link>
            ))
          ) : (
            <p className="muted">
              No additional races awaiting dates in this view.
            </p>
          )}
          <div className="monitor-note">
            <Icon name="info" size={16} />
            <span>
              Calendar exports are snapshots, not subscriptions. Estimated dates
              are excluded.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
