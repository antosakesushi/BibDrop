import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const GROUP_ORDER = [
  "lottery_close",
  "general_entry_close",
  "waitlist_open",
  "price_tier_change",
  "lottery_open",
  "general_entry_open",
  "wave_drop",
  "lottery_results",
  "other",
];

const GROUP_CONFIG = {
  lottery_close: { heading: "Lottery entry closing", cta: "Enter the lottery" },
  general_entry_close: { heading: "Registration closing", cta: "Register now" },
  waitlist_open: { heading: "Waitlist open", cta: "Join the waitlist" },
  price_tier_change: { heading: "Price increasing soon", cta: "Register before the price goes up" },
  lottery_open: { heading: "Lottery entry open", cta: "Enter the lottery" },
  general_entry_open: { heading: "Registration open", cta: "Register now" },
  wave_drop: { heading: "Wave pricing update", cta: "Check wave pricing" },
  lottery_results: { heading: "Lottery results", cta: "Check your results" },
  other: { heading: "Other updates", cta: "View details" },
};

function daysUntil(dateStr) {
  const diffMs = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function groupEvents(events) {
  return GROUP_ORDER.map((type) => ({
    type,
    config: GROUP_CONFIG[type],
    events: events.filter((e) => e.type === type),
  })).filter((g) => g.events.length > 0);
}

function EventGroups({ groups }) {
  return groups.map((group) => (
    <div key={group.type} style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 14, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
        {group.config.heading} ({group.events.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {group.events.map((e, i) => {
          const days = daysUntil(e.date);
          const urgent = days <= 7;
          return (
            <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <Link to={`/races/${e.raceSlug}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                  {e.raceName}
                </Link>
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{e.label}</div>
                <div style={{ fontSize: 12, marginTop: 4, color: urgent ? "var(--status-urgent)" : "var(--text-secondary)" }}>
                  {new Date(e.date).toLocaleDateString()} · {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} left`}
                </div>
              </div>
              <a href={e.officialUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: "none", whiteSpace: "nowrap", fontSize: 13 }}>
                {group.config.cta}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  ));
}

export function DeadlinesCalendar() {
  const [races, setRaces] = useState(null);

  useEffect(() => {
    api.listRaces().then(setRaces);
  }, []);

  if (!races) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading…</div>;

  const allEvents = races
    .flatMap((race) =>
      (race.registrationEvents || [])
        .filter((e) => e.date)
        .map((e) => ({
          ...e,
          raceName: race.name,
          raceSlug: race.slug,
          officialUrl: race.officialUrl,
          interestStage: race.interestStage,
        }))
    )
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const watchedEvents = allEvents.filter((e) => e.interestStage === "watching");
  const otherEvents = allEvents.filter((e) => e.interestStage !== "watching");

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1>Deadlines</h1>

      {allEvents.length === 0 && (
        <p style={{ color: "var(--text-secondary)" }}>
          No upcoming dated events yet - research a few races and mark some as watching to populate this page.
        </p>
      )}

      {watchedEvents.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Your watched deadlines</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
            Races you're actively tracking.
          </p>
          <EventGroups groups={groupEvents(watchedEvents)} />
        </div>
      )}

      {otherEvents.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4, color: watchedEvents.length > 0 ? "var(--text-secondary)" : "var(--text-primary)" }}>
            Other upcoming deadlines
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
            Researched races you haven't marked as watching yet.
          </p>
          <EventGroups groups={groupEvents(otherEvents)} />
        </div>
      )}
    </div>
  );
}
