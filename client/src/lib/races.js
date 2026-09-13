export const eventNames = {
  lottery_open: "Lottery opens",
  lottery_close: "Lottery closes",
  lottery_results: "Lottery results",
  general_entry_open: "Registration opens",
  general_entry_close: "Registration closes",
  wave_drop: "Entry wave opens",
  price_tier_change: "Price changes",
  waitlist_open: "Waitlist opens",
  other: "Registration update",
};
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function dayKey(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
export function daysUntil(value, now = new Date()) {
  const key = dayKey(value);
  return key
    ? Math.round(
        (Date.parse(key) - Date.parse(now.toISOString().slice(0, 10))) /
          86400000,
      )
    : null;
}
export function dateLabel(value) {
  return dayKey(value)
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Not announced";
}
export function upcoming(races, now = new Date()) {
  return races
    .flatMap((race) =>
      (race.registrationEvents || [])
        .filter(
          (e) => daysUntil(e.date, now) !== null && daysUntil(e.date, now) >= 0,
        )
        .map((e) => ({ ...e, race })),
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}
export function timing(event) {
  const d = daysUntil(event.date);
  if (d === null) return "Date not announced";
  return `${event.dateConfidence === "estimated" ? "Estimated · " : ""}${d === 0 ? "Today" : d === 1 ? "Tomorrow" : d > 0 ? `In ${d} days` : "Past event"}`;
}
export function courseLabel(value) {
  return (
    {
      flat_fast: "Flat & fast",
      point_to_point: "Point to point",
      rolling: "Rolling",
      hilly: "Hilly",
      loop: "Loop course",
    }[value] || "Course not researched"
  );
}
export const stages = {
  none: "Not saved",
  interested: "Saved",
  watching: "Watching",
};
export function makeICS(events) {
  const escape = (s) =>
    String(s || "")
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", "\\n")
      .replaceAll(",", "\\,")
      .replaceAll(";", "\\;");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BibDrop//Registration calendar//EN",
  ];
  for (const e of events) {
    if (e.dateConfidence !== "confirmed" || !dayKey(e.date)) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escape(e.race.slug)}-${e.type}-${dayKey(e.date)}@bibdrop`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${dayKey(e.date).replaceAll("-", "")}`,
      `SUMMARY:${escape(e.race.isDemo ? "[DEMO] " : "")}${escape(e.race.name)}: ${escape(e.label || eventNames[e.type])}`,
      `DESCRIPTION:${escape("Check the organiser for exact cutoff time. " + (e.notes || ""))}`,
      `URL:${safeUrl(e.race.officialUrl) || ""}`,
      "END:VEVENT",
    );
  }
  return [...lines, "END:VCALENDAR"].join("\r\n");
}
