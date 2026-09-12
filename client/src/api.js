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
};
