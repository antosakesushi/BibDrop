import { Link } from "react-router-dom";
import { RaceImage } from "./RaceImage";
import { RaceActions } from "./RaceActions";
import { Icon } from "./Icon";
import { courseLabel, upcoming, timing } from "../lib/races";
export function RaceCard({ race }) {
  const next = upcoming([race])[0];
  return (
    <article className="race-card">
      <Link
        to={`/races/${race.slug}`}
        className="image-link"
        aria-label={`View ${race.name}`}
      >
        <RaceImage race={race} />
      </Link>
      <div className="race-card-body">
        <div className="section-head">
          <span className="eyebrow">
            {race.season === "fall" ? "Autumn" : race.season || "Marathon"}
          </span>
          {race.interestStage === "watching" && (
            <span className="pill">
              <Icon name="bell" size={12} />
              Watching
            </span>
          )}
        </div>
        <Link to={`/races/${race.slug}`} className="race-title">
          {race.name}
        </Link>
        <p className="location">
          <Icon name="pin" size={15} />
          {race.city}, {race.country}
        </p>
        <div className="race-meta">
          <span>
            <Icon name="route" size={15} />
            {courseLabel(race.courseType)}
          </span>
          <span>
            <Icon name="calendar" size={15} />
            {next ? timing(next) : "Entry dates unconfirmed"}
          </span>
        </div>
        <div className="insight">
          <Icon name="spark" size={17} />
          <p>
            {race.matchReason ||
              race.agentSummary ||
              "Explore the course and entry routes. Registration research is still needed."}
          </p>
        </div>
        <RaceActions race={race} compact />
        <Link className="detail-link" to={`/races/${race.slug}`}>
          Race details <Icon name="arrow" size={16} />
        </Link>
      </div>
    </article>
  );
}
