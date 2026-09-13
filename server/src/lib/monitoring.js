import { createHash } from "node:crypto";
const DAY = 86400000;
export function validDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    d.toISOString().slice(0, 10) !== value
  )
    return null;
  return d;
}
export function nextCheck(race, now = new Date()) {
  const dates = (race.registrationEvents || [])
    .map((e) => validDate(e.date))
    .filter((d) => d && d >= now);
  const nearest = Math.min(...dates.map((d) => d - now));
  // Unknown dates retain a weekly baseline; announced windows are checked daily within two weeks.
  return new Date(+now + (nearest <= 14 * DAY ? DAY : 7 * DAY));
}
export function fingerprint(events = []) {
  const values = events.map((e) => ({
    type: e.type,
    date: validDate(e.date)?.toISOString().slice(0, 10) || null,
    confidence: e.dateConfidence || "unknown",
  }));
  return createHash("sha256")
    .update(
      JSON.stringify(
        values.sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        ),
      ),
    )
    .digest("hex");
}
export function reminders(race, now = new Date()) {
  return (race.registrationEvents || []).flatMap((e) => {
    const date = validDate(e.date);
    if (!date || e.dateConfidence !== "confirmed") return [];
    const days = Math.round(
      (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
        DAY,
    );
    if (![7, 1, 0].includes(days)) return [];
    const dateKey = date.toISOString().slice(0, 10);
    return [
      {
        key: `reminder:${race.slug}:${e.type}:${dateKey}:${days}`,
        title: `${race.name}: ${e.label || e.type.replaceAll("_", " ")}`,
        body: `${days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`} (${dateKey}). Check the official site for the exact time and entry requirements.`,
        sourceUrl: e.sourceUrl || race.officialUrl,
      },
    ];
  });
}
