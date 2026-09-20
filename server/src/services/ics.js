import { isDeadlineSchedulable } from "./deadlines.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

export function formatIcsDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export function icsEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Watching races only; skip null / unknown dates. Calendar clients cannot
 * send cookies, so the feed is authorized with a signed purpose=ics token.
 */
export function selectWatchingCalendarEvents({ watchingSlugs, deadlines, racesBySlug }) {
  const watch = new Set(watchingSlugs || []);
  const events = [];
  for (const deadline of deadlines || []) {
    if (!watch.has(deadline.raceSlug)) continue;
    if (!isDeadlineSchedulable({ ...deadline, isCurrent: deadline.isCurrent !== false })) continue;
    const race = racesBySlug?.[deadline.raceSlug];
    if (!race) continue;
    events.push({
      uid: `deadline-${deadline._id || deadline.id}@bibdrop`,
      date: deadline.date,
      summary: `${race.name} — ${deadline.label || deadline.type}`,
      description: [
        `Confidence: ${deadline.dateConfidence}`,
        deadline.notes || "",
        `Official: ${race.officialUrl}`,
        "BibDrop does not register for you. Confirm on the official race site.",
      ]
        .filter(Boolean)
        .join("\n"),
      url: race.officialUrl,
    });
  }
  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function renderIcs(events, { calName = "BibDrop watching deadlines" } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BibDrop//Watching Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calName)}`,
  ];
  for (const event of events) {
    const day = formatIcsDate(event.date);
    if (!day) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${icsEscape(event.uid)}`);
    lines.push(`DTSTAMP:${day}T000000Z`);
    lines.push(`DTSTART;VALUE=DATE:${day}`);
    lines.push(`SUMMARY:${icsEscape(event.summary)}`);
    lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
    if (event.url) lines.push(`URL:${icsEscape(event.url)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
