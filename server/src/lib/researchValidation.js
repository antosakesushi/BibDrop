import { validDate } from "./monitoring.js";
import { safeHttpUrl } from "./discoveryInput.js";
const types = [
  "lottery_open",
  "lottery_close",
  "lottery_results",
  "general_entry_open",
  "general_entry_close",
  "wave_drop",
  "price_tier_change",
  "waitlist_open",
  "other",
];
export function validateResearch(result) {
  if (
    !result ||
    typeof result.agentSummary !== "string" ||
    !["low", "medium", "high"].includes(result.confidence) ||
    !Array.isArray(result.registrationEvents)
  )
    throw new Error("Research output did not pass validation.");
  for (const event of result.registrationEvents) {
    if (
      !event ||
      !types.includes(event.type) ||
      !["confirmed", "estimated", "unknown"].includes(event.dateConfidence) ||
      (event.date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || !validDate(event.date)))
    )
      throw new Error("Research returned an invalid registration event.");
    if (
      event.dateConfidence === "confirmed" &&
      (!event.date || !safeHttpUrl(event.sourceUrl))
    )
      throw new Error("Confirmed dates require a date and source URL.");
  }
  if (
    result.raceDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(result.raceDate) ||
      !validDate(result.raceDate))
  )
    throw new Error("Research returned an invalid race date.");
  for (const fact of result.profileFacts || [])
    if (
      !["course", "elevation", "weather", "field", "bq"].includes(fact.key) ||
      typeof fact.value !== "string" ||
      !safeHttpUrl(fact.sourceUrl)
    )
      throw new Error(
        "Research facts require a supported category and source URL.",
      );
  return result;
}
export function researchText(response) {
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => {
      const sources = (b.citations || [])
        .filter((c) => safeHttpUrl(c.url))
        .map((c) => `Source: ${c.title || ""} ${c.url}`);
      return [b.text, ...sources].join("\n");
    })
    .join("\n")
    .trim();
}
