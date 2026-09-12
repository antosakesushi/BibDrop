import { Link } from "react-router-dom";
import { ConfidenceTag } from "./StatusTag.jsx";

export function RaceCard({ race }) {
  return (
    <Link to={`/races/${race.slug}`} className="card" style={{ display: "block", textDecoration: "none", minWidth: 260 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{race.name}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            {race.city}, {race.country}
          </div>
        </div>
        {race.isWorldMajor && (
          <span className="status-tag status-tag--tracking">WORLD MAJOR</span>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <ConfidenceTag confidence={race.lastResearchConfidence} />
      </div>

      {race.agentSummary && (
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          {race.agentSummary}
        </p>
      )}
    </Link>
  );
}
