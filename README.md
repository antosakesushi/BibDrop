# BibDrop

A planning agent for marathon runners. Registration for popular races is scattered across dozens of sites, opens at different times, and often runs through lotteries or waitlists that are easy to miss. BibDrop points an agent at a race's official site and asks it to figure out where registration currently stands — lottery windows, general entry, price tiers — and report back with sources and a confidence level, rather than a human tracking it all by hand.

Work in progress. Currently a local-only MVP: real agent, real database, no deployment yet.

## How it works

- A curated list of ~28 well-known marathons is seeded into the database by name and official URL only — no registration dates are hardcoded.
- Opening a race and clicking "Research this race" triggers a two-step agent call: first the model researches freely using web search, then a second call converts those findings into a structured record via a forced tool call (more reliable than just asking the model to "reply in JSON," which turned out to be inconsistent).
- Every researched race shows a confidence level and the source snippets the agent based its answer on, so it's clear what's verified versus inferred.

## Architecture

```
bibdrop/
  server/   Express API, MongoDB via Mongoose, Anthropic API integration
  client/   React (Vite) frontend
```

- `server/src/services/claudeResearch.js` — the agent itself. Free-form research with the `web_search` tool, then a forced tool call to extract structured data from the findings.
- `server/src/routes/research.js` — the endpoint behind the "Research this race" button. Rate-limited, since it's the one route that spends API credits.
- `server/src/seed/races.seed.js` — populates the race registry (identity only).

## Guardrails

This isn't deployed publicly yet, but the code already has the basics in place for when it is:

- Per-IP rate limiting and a daily budget cap on the research endpoint, DB-backed so they survive restarts.
- Research only ever runs against races already in the seeded registry — no free-text URL field, so it can't be used as an open web-fetch proxy.
- The research prompt treats fetched page content as data to extract from, never as instructions to follow, as a defense against prompt injection from untrusted race pages.

These are cost/abuse ceilings, not a full security posture — an auth wall or captcha would be the next layer if this ever saw real traffic.

## Local setup

```bash
# Server
cd server
cp .env.example .env   # fill in MONGODB_URI and ANTHROPIC_API_KEY
npm install
npm run seed
npm run dev

# Client (separate terminal)
cd client
npm install
npm run dev
```

Open the client's local URL (Vite prints it, typically `http://localhost:5173`). Open any race and click "Research this race" to watch the agent run.

## Deployment

Not live yet. `DEPLOYMENT.md` has a plan for Vercel (frontend) + Render (API) + MongoDB Atlas once it's ready to go public.

## Not built yet

- Scheduled/background monitoring — this is on-demand only, triggered by the button.
- Goal-based recommendation ranking beyond a simple tag filter.
- User accounts, saved calendars, email/push alerts.
- Multi-source cross-verification (one research pass per race, currently).
