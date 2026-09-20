# Deployment guide

This is a suggested path, not the only option — verify current pricing and
steps against each provider's docs, since free tiers and UIs change.

**Honest status:** the app is ready for a **staging** hosted-pilot once
accounts and secrets exist. This repo does not provision Atlas / Redis /
Render / Vercel or paste keys. Merge the stacked PRs, seed the registry,
and hand out invite codes before any real runners log in.

## Go-live checklist

Accounts (human): MongoDB Atlas, Redis (Render Key Value), Render **web**
+ **worker**, Vercel project.

Env on **both** Render services (web + worker unless noted):

- [ ] `MONGODB_URI` — Atlas, Network Access open to Render
- [ ] `REDIS_URL` — same instance on web and worker
- [ ] `JWT_SECRET` — long random string, same on web and worker
- [ ] `ANTHROPIC_API_KEY`
- [ ] `RESEND_API_KEY` (preferred) or `SENDGRID_API_KEY` + `ALERT_FROM_EMAIL`
- [ ] `ALLOWED_ORIGINS` — exact Vercel origin (`https://….vercel.app`)
- [ ] `INVITE_CODES` and/or `SOFT_LAUNCH=true` (invite wall on register)
- [ ] `ADMIN_EMAILS` — spend dashboard on Settings
- [ ] `RESEARCH_DAILY_BUDGET_CAP` / `DISCOVERY_DAILY_BUDGET_CAP` — numbers you can afford
- [ ] `PUBLIC_API_URL` — public API origin for `.ics` subscribe links
- [ ] `NODE_ENV=production` — turns **Secure** cookies on
- [ ] Cookies: keep `COOKIE_SAMESITE=lax` if Vercel **rewrites** `/api` to Render
      (same-site). Set `COOKIE_SAMESITE=none` only if the browser calls Render
      **directly** from the Vercel origin (cross-site). `SameSite=None` requires
      Secure (already forced).
- [ ] Do **not** set `RESEARCH_SYNC_FALLBACK` in production
- [ ] Replace `REPLACE_WITH_RENDER_HOST` in `client/vercel.json` **or** set
      `VITE_API_BASE` (see below)
- [ ] Run `npm run seed` once on the API after first deploy
- [ ] Confirm worker process is running (jobs otherwise stay `queued`)

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
3. Set environment variables from `server/.env.example` (checklist above).
4. Do **not** set `RESEARCH_SYNC_FALLBACK` on Render.
5. After first deploy, run the seed script once (Render's shell tab, or a
   one-off job): `npm run seed`.

## 4. Research worker: Render background worker

Claude runs in a **second** process, not on the HTTP request.

1. New **Background Worker** → same repo, root directory `server/`.
2. Build command: `npm install`. Start command: `npm run worker`.
3. Use the **same** env vars as the web service (`MONGODB_URI`, `REDIS_URL`,
   `ANTHROPIC_API_KEY`, `JWT_SECRET`, budget caps, TTL, and the email keys).
   The worker does not serve HTTP. It runs Claude research **and** the
   repeatable jobs: hourly due-alert scan, 6-hour refresh of races that have
   at least one watcher (still under the daily research budget).

If the worker is down, jobs stay `queued` until it comes back (or the client
poll times out). The web service should still 202 as long as Redis is up.

## 5. Frontend: Vercel

1. New Project → point at `client/` as the root directory. Vercel
   auto-detects Vite.
2. **Preferred (same-site cookies, SameSite=Lax):** edit
   `client/vercel.json` so `/api/:path*` rewrites to your Render host, e.g.
   `https://bibdrop-api.onrender.com/api/:path*`. Leave `VITE_API_BASE` unset
   so the browser keeps calling relative `/api`.
3. **Split domains:** set `VITE_API_BASE=https://your-api.onrender.com/api`
   on Vercel, set Render `ALLOWED_ORIGINS` to the Vercel origin, and set
   `COOKIE_SAMESITE=none` (Secure is on in production).
4. Once deployed, set `ALLOWED_ORIGINS` on Render to this Vercel URL and
   redeploy the API.

## Invite-only register

Set `INVITE_CODES=code1,code2` and/or `SOFT_LAUNCH=true`. The sign-up form
shows an invite field when `GET /api/auth/config` reports `inviteRequired`.
`SOFT_LAUNCH=true` with an empty code list rejects every new account.

Existing accounts can still log in. This is not a full waitlist product.

## Spend observability

Emails in `ADMIN_EMAILS` see last-24h research log counts vs
`RESEARCH_DAILY_BUDGET_CAP`, snapshot status totals, and token sums on
Settings (`GET /api/admin/research-spend`). Non-admins get 403.

## Calendar feed

Signed `purpose=ics` token (calendar clients cannot send cookies).
Watching races only; null/unknown dates omitted. Google/Apple steps are
on Settings after “Show subscribe URL”. Set `PUBLIC_API_URL` so those
links stay on the public API host.

## Before sharing the link with pilots

- Re-read the Guardrails section in the main README.
- Set `RESEARCH_DAILY_BUDGET_CAP` to something you're genuinely fine
  paying for if it gets maxed out every day.
- Confirm both the web service **and** the background worker are running,
  and that `REDIS_URL` is set on both.
- Confirm invite codes are set and you have a short list of pilot emails.
- Merge the stacked feature PRs into the branch you actually deploy
  (do not assume `main` is current).
