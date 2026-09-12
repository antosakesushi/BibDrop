# Deployment guide

This is a suggested path, not the only option — verify current pricing and
steps against each provider's docs, since free tiers and UIs change.

## 1. Database: MongoDB Atlas (free tier)

1. Create a free cluster at mongodb.com/atlas.
2. Create a database user and note the connection string.
3. Whitelist `0.0.0.0/0` (or your hosting provider's IP range) under
   Network Access.

## 2. API: Render (or Railway/Fly.io)

A long-running Express server is a better fit here than a serverless
function, since the research endpoint can take a while (the agent is doing
real web research) and you want the rate-limiter's in-request DB reads to
behave predictably.

1. New Web Service → point at `server/` as the root directory.
2. Build command: `npm install`. Start command: `npm start`.
3. Set environment variables from `server/.env.example`:
   - `MONGODB_URI` (from Atlas)
   - `ANTHROPIC_API_KEY`
   - `ALLOWED_ORIGINS` — set this to your deployed frontend URL once you
     have it (step 3), or the API will reject cross-origin requests.
   - `RESEARCH_RATE_LIMIT_PER_IP_PER_HOUR` and `RESEARCH_DAILY_BUDGET_CAP`
     — tune these to a budget you're comfortable with before going public.
4. After first deploy, run the seed script once (Render's shell tab, or a
   one-off job): `npm run seed`.

## 3. Frontend: Vercel

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
- Consider whether you want the research button live-callable by anyone,
  or gated behind a simple shared password for a portfolio demo — a public
  GitHub repo with a public demo link is far more discoverable than most
  people expect.
