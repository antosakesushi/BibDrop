function normalized(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
function host(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
export function findExistingRace(races, candidate) {
  return races.find((race) => {
    if (candidate.slug && candidate.slug === race.slug) return true;
    const a = normalized(race.name),
      b = normalized(candidate.name);
    if (a && a === b) return true;
    // Sponsor prefixes and language paths should not create a second race.
    // Require both a shared official host and compatible names, not just a shared organiser.
    return (
      host(race.officialUrl) &&
      host(race.officialUrl) === host(candidate.officialUrl) &&
      Math.min(a.length, b.length) >= 10 &&
      (a.includes(b) || b.includes(a))
    );
  });
}
