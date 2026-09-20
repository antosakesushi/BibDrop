import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { InterestIndicator } from "../components/InterestIndicator.jsx";

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
    // Watched races surface first within each group, then soonest date.
    .sort((a, b) => {
      if (a.interestStage === "watching" && b.interestStage !== "watching") return -1;
      if (b.interestStage === "watching" && a.interestStage !== "watching") return 1;
      return new Date(a.date) - new Date(b.date);
    });

  const groups = GROUP_ORDER.map((type) => ({
    type,
    config: GROUP_CONFIG[type],
    events: allEvents.filter((e) => e.type === type),
  })).filter((g) => g.events.length > 0);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>Deadlines</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        Email and push alerts are not built yet. This calendar is the placeholder behind Alerts in the nav.
      </p>

      {allEvents.length === 0 && (
        <p style={{ color: "var(--text-secondary)" }}>
          No upcoming dated events yet - research a few races to populate this page.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.type} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            {group.config.heading} ({group.events.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {group.events.map((e, i) => {
              const days = daysUntil(e.date);
              const urgent = days <= 7;
              return (
                <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link to={`/races/${e.raceSlug}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                        {e.raceName}
                      </Link>
                      <InterestIndicator stage={e.interestStage} compact />
                    </div>
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
      ))}
    </div>
  );
}
