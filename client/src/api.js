const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  // 204 No Content (logout) has no body to parse.
  if (res.status === 204) return null;
  return res.json();
}

// credentials: "include" on every call - required so the httpOnly session
// cookie actually gets sent/received. In local dev the Vite proxy makes
// this same-origin so it's not strictly required, but it's needed the
// moment client and server are on different real domains in production.
const jsonHeaders = { "Content-Type": "application/json" };

export const api = {
  listRaces: () => fetch(`${BASE}/races`, { credentials: "include" }).then(handle),
  getRace: (slug) => fetch(`${BASE}/races/${slug}`, { credentials: "include" }).then(handle),
  researchRace: (slug) =>
    fetch(`${BASE}/research/${slug}`, { method: "POST", credentials: "include" }).then(handle),
  setInterestStage: (slug, stage) =>
    fetch(`${BASE}/races/${slug}/interest`, {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ stage }),
    }).then(handle),
  discoverRaces: (criteria) =>
    fetch(`${BASE}/discover`, {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ criteria }),
    }).then(handle),
  confirmDiscoveredRace: (candidate) =>
    fetch(`${BASE}/discover/confirm`, {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify(candidate),
    }).then(handle),

  register: (email, password) =>
    fetch(`${BASE}/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ email, password }),
    }).then(handle),
  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ email, password }),
    }).then(handle),
  logout: () => fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" }).then(handle),
  me: () => fetch(`${BASE}/auth/me`, { credentials: "include" }).then(handle),
};
