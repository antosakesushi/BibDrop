const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listRaces: () => fetch(`${BASE}/races`).then(handle),
  getRace: (slug) => fetch(`${BASE}/races/${slug}`).then(handle),
  researchRace: (slug) =>
    fetch(`${BASE}/research/${slug}`, { method: "POST" }).then(handle),
  setInterestStage: (slug, stage) =>
    fetch(`${BASE}/races/${slug}/interest`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    }).then(handle),
  discoverRaces: (criteria) =>
    fetch(`${BASE}/discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria }),
    }).then(handle),
  confirmDiscoveredRace: (candidate) =>
    fetch(`${BASE}/discover/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidate),
    }).then(handle),
};
