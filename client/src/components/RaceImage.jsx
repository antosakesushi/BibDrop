import { useState } from "react";
import credits from "../data/image-credits.json";
import { Icon } from "./Icon";
export function RaceImage({ race, hero = false }) {
  const [failed, setFailed] = useState(false);
  const image =
    credits[race.slug] ||
    Object.values(credits).find((x) =>
      x.alt.toLowerCase().includes(race.city?.toLowerCase() + " —"),
    );
  return (
    <div className={`race-image ${hero ? "hero-image" : ""}`}>
      {image && !failed ? (
        <img
          src={image.src}
          alt={image.alt}
          loading={hero ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="image-empty">
          <Icon name="pin" size={30} />
          <span>{race.city}</span>
          <small>Destination image coming soon</small>
        </div>
      )}
      {image && !failed && (
        <span className="image-caption">
          {race.city} · Destination photograph
        </span>
      )}
    </div>
  );
}
export function PhotoCredit({ race }) {
  const image = credits[race.slug];
  if (!image) return null;
  return (
    <p className="muted small">
      Destination image:{" "}
      <a href={image.sourceUrl} target="_blank" rel="noreferrer">
        {image.artist?.replace(/<[^>]*>/g, "") || "Wikimedia Commons"}
      </a>{" "}
      ·{" "}
      <a
        href={image.licenseUrl || image.sourceUrl}
        target="_blank"
        rel="noreferrer"
      >
        {image.license}
      </a>
      . Not a verified course photograph.
    </p>
  );
}
