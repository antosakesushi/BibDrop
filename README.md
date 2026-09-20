# BibDrop

A planning agent for marathon runners. Registration for popular races is scattered across dozens of sites, opens at different times, and often runs through lotteries or waitlists that are easy to miss. BibDrop points an agent at a race's official site and asks it to figure out where registration currently stands — lottery windows, general entry, price tiers — and report back with sources and a confidence level, rather than a human tracking it all by hand.

Work in progress. Currently a local MVP: real agent, real database, async research jobs, no public deployment yet.

## How it works

- A curated list of ~28 well-known marathons is seeded into the database by name and official URL only — no registration dates are hardcoded.
- Opening a race and clicking "Research this race" (logged-in) enqueues a job and returns immediately. A worker runs a two-step agent call: first the model researches freely using web search, then a second call converts those findings into a structured record via a forced tool call. The client polls the job until it succeeds or fails.
- Each run is stored as an append-only `ResearchSnapshot`. The shared `Race` document still holds the latest denormalized summary/confidence/events for the dashboard.
- Every researched race shows a confidence level and the source snippets (and URLs when the agent cited them) the findings are based on.

## Architecture

```
bibdrop/
  server/   Express API, MongoDB via Mongoose, BullMQ/Redis, Anthropic API
  client/   React (Vite) frontend
```

- `server/src/services/claudeResearch.js` — the agent itself. Free-form research with the `web_search` tool, then a forced tool call to extract structured data from the findings.
- `server/src/routes/research.js` — `POST /api/research/:slug` (auth, rate/budget, registry-only, **202** `{ snapshotId, status }`) and `GET /api/research/jobs/:snapshotId` (poll).
- `server/src/models/ResearchSnapshot.js` — append-only history of each run (`queued|running|succeeded|failed`).
- `server/src/worker.js` — BullMQ worker. Research jobs, hourly alert scanner, 6h refresh of races with ≥1 watcher.
- `server/src/models/Goal.js` — per-user goal stub (label, race tags, optional constraints). Does not spend Claude credits.
- `server/src/models/Deadline.js` / `Alert.js` — current registration deadlines from the latest succeeded snapshot; watching-only email alert rows (14/7/1 day).
- `server/src/seed/races.seed.js` — populates the race registry (identity only).

## Guardrails

This isn't deployed publicly yet, but the code already has the basics in place for when it is:

- Cookie JWT auth is required to trigger or poll research.
- Per-IP rate limiting and a daily budget cap on *new* research jobs (TTL cache hits and in-flight dedupe do not spend Claude or count against the cap). DB-backed so they survive restarts.
- Research only ever runs against races already in the seeded registry — no free-text URL field, so it can't be used as an open web-fetch proxy. Workers ignore any extra URL fields on the job payload.
- The research prompt treats fetched page content as data to extract from, never as instructions to follow, as a defense against prompt injection from untrusted race pages.

These are cost/abuse ceilings, not a full security posture.

## Local setup

You need **two server processes** (API + worker) plus Redis and MongoDB.

```bash
# Redis (example)
docker run --name bibdrop-redis -p 6379:6379 -d redis:7

# Server
cd server
cp .env.example .env   # fill in MONGODB_URI, ANTHROPIC_API_KEY, JWT_SECRET, REDIS_URL
npm install
npm run seed
npm run dev            # API on :4000

# Worker (separate terminal) — this is what runs Claude
cd server
npm run worker

# Client (separate terminal)
cd client
npm install
npm run dev
```

Open the client's local URL (Vite prints it, typically `http://localhost:5173`). Sign in, open any race, and click "Research this race". The API should return immediately; the page polls until the worker finishes.

If Redis is missing, `POST /api/research/:slug` returns **503** with a clear error. It does **not** silently fall back to running Claude on the request. For a local demo without Redis you may set `RESEARCH_SYNC_FALLBACK=true` in `.env` — that path is **not for production**.

Succeeded snapshots for a race are reused for `RESEARCH_SNAPSHOT_TTL_HOURS` (default 12) instead of spending Claude again.

A **Goals** stub (`/goals`) lets a signed-in runner create/list/archive a goal (BQ / World Major / destination tags, optional season/region/course). Creating a goal does not run research. The home page is still the race catalog — a Goals-first “what do I do next?” home is forthcoming.

**Watching → alerts:** marking a race as watching materializes `Deadline` rows from the latest succeeded snapshot and upserts idempotent `Alert` rows (email, 14/7/1 days before). Dates that are null or `unknown` are never scheduled. The worker scans due alerts hourly. Set `RESEND_API_KEY` (preferred) or `SENDGRID_API_KEY` to actually send; without a key the scanner logs and leaves rows `scheduled`.

## Deployment

Not live yet. `DEPLOYMENT.md` has a plan for Vercel (frontend) + Render (web API **and** background worker) + MongoDB Atlas + Redis once it's ready to go public.

## Not built yet

- Goals-first home (the Goal entity exists as a stub; dashboard is still race-catalog first).
- Pathway / match ranking that uses Goal tags against researched races.
- .ics calendar feed and push/SMS channels.
- Invite-only hosted-pilot wall / WTP instrumentation.
- Multi-source cross-verification beyond one research pass per snapshot.
