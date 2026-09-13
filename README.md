# BibDrop

Find a marathon worth running, understand how to enter, and keep its registration windows in one place. BibDrop helps runners prepare for entry; it cannot guarantee a place or a lottery result.

## Rebuilt prototype

- **My races:** the next registration action, upcoming windows, and separate saved and watched lists.
- **Discover:** a conversational researcher with follow-up questions, suggested prompts, structured results, and catalog search.
- **Race details:** destination photography, entry timeline, course/elevation/weather/field-size/historical Boston-qualifier facts, and visible source links. Missing facts stay unknown.
- **Deadlines:** registration events versus race dates, watched/all filters, and calendar export of confirmed dates only.
- **Personal state:** save/watch status is separate from applied/registered/unsuccessful entry outcomes. Accounts use the existing API; demo choices stay in the browser.
- Responsive layouts, mobile navigation, light/dark themes, and credited destination photographs.

## Try without a backend

```sh
npm install --prefix client
npm run dev --prefix client
```

Open `http://localhost:5173/?demo=1`. The explicit demo uses sample dates and research, simulated conversation, and browser-local choices. It makes no AI calls and sends no alerts. Calendar exports are labeled DEMO. Use the banner to switch to the live catalog.

## Live development

```sh
cd server
npm install
cp .env.example .env
# Configure MongoDB, Anthropic, and JWT_SECRET (see deployment notes).
npm run seed
npm run dev
```

Start the client in a second terminal. The live API retains Express, MongoDB/Mongoose, cookie authentication, and Anthropic two-stage research. Discovery now accepts bounded conversation history and returns an answer plus structured race candidates. Research persists profile facts and their sources alongside registration events.

## Scope and verification

**Monitoring and in-app alerts are implemented but disabled by default.** Set `MONITORING_ENABLED=true` only after verifying the configured research account. The API process must remain running: this is not yet a deployed always-on service. The worker checks watched races weekly, daily within 14 days of a future entry event. Research is shared across watchers, protected by database leases and an atomic UTC-day budget. A check failure retains the previous findings and retries after an hour.

Registration changes are persisted with a retryable alert outbox. Confirmed dates generate in-app reminders at 7 days, 1 day, and on the date, deduplicated per account and event. Reminder dates use UTC because source timezone/time is not yet modeled; always check exact entry cutoffs at the official source. Reminders are evaluated while the process is running and do not backfill dates missed during downtime. Registered runners receive no further registration reminders. Email/push delivery is not implemented.

The redesign has been verified with a production client build, date/export/input tests, and Chrome flows covering desktop/mobile navigation, demo conversation follow-ups, watch confirmation, outcome persistence, calendar export, and theme switching. The configured MongoDB connection and real database persistence have been verified using an isolated temporary test database, covering research leases, failure recovery, alert deduplication, account ownership, and concurrent budget reservations. Paid model calls remain unverified in this build. Demo and injected test research do not validate research accuracy.

```sh
npm run build --prefix client
node --test tests/prototype.test.mjs tests/monitoring.test.mjs
# Uses configured MongoDB in an isolated temporary database, then removes it:
node tests/database-integration.mjs
# With Vite running and Playwright plus Chrome available:
node tests/browser-check.cjs
# Or set PLAYWRIGHT_MODULE to the installed Playwright module path.
```

Photo attribution and license links are shown on race details; metadata is in `client/src/data/image-credits.json`. Unillustrated catalog races show a destination placeholder rather than an unrelated photograph.

See `DEPLOYMENT.md` for the existing deployment plan. This prototype has not been deployed.

Research preserves citation URLs for extraction and rejects confirmed dates without a date and source URL. The existing basic web-search tool is retained with a maximum of five searches per research step; see [Anthropic web search documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool). Each check includes a separate structured extraction call.
