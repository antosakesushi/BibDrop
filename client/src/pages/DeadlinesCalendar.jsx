import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export function DeadlinesCalendar() {
  const [races, setRaces] = useState(null);

  useEffect(() => {
    api.listRaces().then(setRaces);
  }, []);

  if (!races) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading…</div>;

  const events = races
    .flatMap((race) =>
      (race.registrationEvents || [])
        .filter((e) => e.date)
        .map((e) => ({ ...e, raceName: race.name, raceSlug: race.slug }))
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1>Deadlines</h1>
      {events.length === 0 && (
        <p style={{ color: "var(--text-secondary)" }}>
          No dated events yet — research a few races from the dashboard to populate this calendar.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map((e, i) => (
          <Link
            key={i}
            to={`/races/${e.raceSlug}`}
            className="card"
            style={{ display: "flex", justifyContent: "space-between", textDecoration: "none" }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{e.raceName}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{e.label}</div>
            </div>
            <div>{new Date(e.date).toLocaleDateString()}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
