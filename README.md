# BibDrop — Never miss a race.

BibDrop is a planning agent for goal-oriented marathon runners. Instead of
manually tracking registration windows across dozens of race websites, a
runner points BibDrop at a race and the agent researches its current
registration timeline — lottery windows, general entry, wave releases,
price changes — and reports back with sources and a confidence level.

This is a portfolio MVP of a fuller product concept (full PRD and design
brief available on request). It's scoped down from the original vision in
one deliberate way: **the seed data only contains race *identity*** (name,
official site, course character) for a curated set of ~28 well-known
marathons. **Registration dates are never hardcoded** — they're researched
live, on demand, by the agent hitting the official race site and returning
structured, sourced data. That's the actual product mechanic, not a demo
shortcut: a hardcoded date list goes stale every year, which is the exact
problem BibDrop exists to solve.

## What this demonstrates

- An agent that does real, bounded, cited web research (not just a chatbot
  wrapper) and returns structured data the app can render.
- Human-legible transparency: every researched race shows its confidence
  level and the source snippets the agent based its answer on.
- Production-adjacent guardrails around a public-facing LLM feature — rate
  limiting, a fixed input surface (no free-text URLs), a daily cost cap, and
  treating fetched web content as data rather than instructions.

## Architecture

```
bibdrop/
  server/   Express API, MongoDB via Mongoose, Claude API integration
  client/   React (Vite) frontend
```

- **server/src/services/claudeResearch.js** — the actual agent. Calls the
  Anthropic API with the `web_search` tool, given a race's official URL, and
  asks for structured JSON back (registration events, a summary, a
  confidence level, source snippets).
- **server/src/routes/research.js** — the endpoint the "Research this race"
  button calls. Rate-limited (see below) since it's the one route that
  spends API credits.
- **server/src/seed/races.seed.js** — populates the race registry (identity
  only). Run once after setup.

## Guardrails (read this before deploying publicly)

If you deploy this with a live Anthropic API key behind a public URL,
anyone who finds it can trigger research calls. This repo includes:

- Per-IP rate limiting and a global daily budget cap on the research
  endpoint (`server/src/middleware/rateLimiter.js`), both DB-backed so they
  survive restarts.
- Research is only ever triggered against races already in the seeded
  registry — there's no free-text URL field, which would otherwise let
  anyone use this as an open web-fetch proxy.
- The research prompt explicitly instructs the model to treat fetched page
  content as data to extract from, never as instructions to follow — a
  defense against prompt injection from untrusted race-site content.

These are cost/abuse ceilings, not a full security posture. If you get real
traffic, consider adding an auth wall or a captcha in front of the research
button, and monitor `ResearchLog` for unusual patterns.

## Local setup

```bash
# Server
cd server
cp .env.example .env   # fill in MONGODB_URI and ANTHROPIC_API_KEY
npm install
npm run seed            # populates the race registry
npm run dev

# Client (separate terminal)
cd client
npm install
npm run dev
```

Visit the client's local URL (Vite will print it, typically
`http://localhost:5173`). Open any race and click "Research this race" to
see the agent run.

## Deployment

See `DEPLOYMENT.md` for a suggested Vercel (frontend) + Render (API) +
MongoDB Atlas setup, including where the guardrail env vars go.

## What's deliberately out of scope for v1

- Scheduled/background monitoring (the PRD's Phase 2+) — this MVP is
  on-demand research only, triggered by the button.
- Goal-based recommendation ranking beyond a simple tag filter.
- User accounts, saved calendars, email/push alerts.
- Multi-source cross-verification (currently one research pass per race).

## Origin

Originally scoped as a capstone project for an AI-agents-for-PMs course;
full product documentation (PRD, personas, competitive analysis, design
brief) exists separately and is summarized above.
