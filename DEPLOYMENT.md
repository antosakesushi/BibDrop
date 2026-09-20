# Deployment guide

This is a suggested path, not the only option — verify current pricing and
steps against each provider's docs, since free tiers and UIs change.

## 1. Database: MongoDB Atlas (free tier)

1. Create a free cluster at mongodb.com/atlas.
2. Create a database user and note the connection string.
3. Whitelist `0.0.0.0/0` (or your hosting provider's IP range) under
   Network Access.

## 2. Redis

BullMQ needs Redis. On Render: add a **Key Value** (Redis) instance and copy
its internal URL into `REDIS_URL` for both the web service and the worker.

Locally: `docker run -p 6379:6379 redis:7` and `REDIS_URL=redis://127.0.0.1:6379`.

Without Redis, the API will **503** research requests (unless
`RESEARCH_SYNC_FALLBACK=true`, which is local-demo-only and must not be set
in production).

## 3. API: Render web service

A long-running Express server is a better fit here than a serverless
function — the API itself returns quickly (202 + poll), but you still want
a persistent process for cookies, Mongo, and Redis.

1. New **Web Service** → point at `server/` as the root directory.
2. Build command: `npm install`. Start command: `npm start`.
3. Set environment variables from `server/.env.example`:
   - `MONGODB_URI` (from Atlas)
   - `REDIS_URL` (from the Redis instance)
   - `JWT_SECRET` (long random string)
   - `ANTHROPIC_API_KEY`
   - `ALLOWED_ORIGINS` — set this to your deployed frontend URL once you
     have it (step 5), or the API will reject cross-origin requests.
   - `RESEARCH_RATE_LIMIT_PER_IP_PER_HOUR` and `RESEARCH_DAILY_BUDGET_CAP`
     — tune these to a budget you're comfortable with before going public.
   - `RESEARCH_SNAPSHOT_TTL_HOURS` — default 12; reuse a fresh snapshot
     instead of spending Claude.
4. Do **not** set `RESEARCH_SYNC_FALLBACK` on Render.
5. After first deploy, run the seed script once (Render's shell tab, or a
   one-off job): `npm run seed`.

## 4. Research worker: Render background worker

Claude runs in a **second** process, not on the HTTP request.

1. New **Background Worker** → same repo, root directory `server/`.
2. Build command: `npm install`. Start command: `npm run worker`.
3. Use the **same** env vars as the web service (`MONGODB_URI`, `REDIS_URL`,
   `ANTHROPIC_API_KEY`, `JWT_SECRET`, budget caps, TTL). The worker does not
   serve HTTP.

If the worker is down, jobs stay `queued` until it comes back (or the client
poll times out). The web service should still 202 as long as Redis is up.

## 5. Frontend: Vercel

1. New Project → point at `client/` as the root directory. Vercel
   auto-detects Vite.
2. The client calls `/api/...` relative paths locally (via the Vite proxy),
   but in production it needs to hit your Render API's real URL. Either:
   - Add a Vercel rewrite in `client/vercel.json` forwarding `/api/*` to
     your Render URL, or
   - Change `client/src/api.js`'s `BASE` constant to your full Render API
     URL.
3. Once deployed, go back to Render and set `ALLOWED_ORIGINS` to this
   Vercel URL, then redeploy the API.

## Before sharing the link publicly

- Re-read the Guardrails section in the main README.
- Set `RESEARCH_DAILY_BUDGET_CAP` to something you're genuinely fine
  paying for if it gets maxed out every day.
- Confirm both the web service **and** the background worker are running,
  and that `REDIS_URL` is set on both.
- Consider whether you want the research button live-callable by anyone
  with an account, or gated to a small hosted-pilot group — a public
  GitHub repo with a public demo link is far more discoverable than most
  people expect.
