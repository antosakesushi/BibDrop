// Explicit opt-in: this test uses the configured live API and paid AI research.
if (process.env.RUN_LIVE_E2E !== "1")
  throw new Error("Set RUN_LIVE_E2E=1 to authorize the live test.");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const dotenv = require("../server/node_modules/dotenv");
const mongoose = require("../server/node_modules/mongoose");
dotenv.config({ path: "server/.env" });
const email = `bibdrop-e2e-${randomUUID()}@example.invalid`;
(async () => {
  let browser;
  try {
    const catalogResponse = await fetch("http://127.0.0.1:4000/api/races");
    const catalog = await catalogResponse.json();
    const race = process.env.LIVE_RACE_SLUG
      ? catalog.find((r) => r.slug === process.env.LIVE_RACE_SLUG)
      : catalog.find((r) => !r.lastResearchedAt);
    assert.ok(
      race,
      "Choose an unresearched catalog race for the live monitoring test.",
    );
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    const page = await browser.newPage({
      viewport: { width: 1360, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:5173/races/${race.slug}?demo=0`);
    await page
      .getByRole("button", { name: `Save ${race.name}`, exact: true })
      .click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(randomUUID());
    await page
      .getByRole("button", { name: "Create account & continue" })
      .click();
    await page
      .getByRole("button", {
        name: `Remove ${race.name} from my races`,
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Watch registration", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add to watchlist", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Watching · stop", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Watching · stop", exact: true })
      .waitFor();
    console.log(
      "PASS: real account, saved race, watch state persisted after reload.",
    );
    if (process.env.LIVE_SKIP_DISCOVERY !== "1") {
      await page
        .getByRole("link", { name: "Discover", exact: true })
        .first()
        .click();
      await page
        .getByLabel("Ask the researcher")
        .fill(
          "Find a flat autumn marathon in Germany. Include sources and entry routes.",
        );
      const responsePromise = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/discover") && r.request().method() === "POST",
        { timeout: 360000 },
      );
      await page
        .getByRole("button", { name: "Send research question" })
        .click();
      const response = await responsePromise;
      assert.equal(response.status(), 200, await response.text());
      const result = await response.json();
      assert.ok(result.reply?.length);
      assert.ok(result.candidates.length);
      console.log(
        `PASS: live AI discovery returned ${result.candidates.length} race candidates.`,
      );
      await page
        .getByLabel("Ask the researcher")
        .fill(
          "For the first option, explain the entry route and what registration dates are known.",
        );
      const followPromise = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/discover") && r.request().method() === "POST",
        { timeout: 360000 },
      );
      await page
        .getByRole("button", { name: "Send research question" })
        .click();
      const follow = await followPromise;
      assert.equal(follow.status(), 200, await follow.text());
      assert.ok((await follow.json()).reply?.length);
      console.log("PASS: live conversational follow-up.");
      await page.screenshot({
        path: "/tmp/bibdrop-live-discovery.png",
        fullPage: true,
      });
    }
    const deadline = Date.now() + 600000;
    let alerts = [];
    while (Date.now() < deadline) {
      const response = await page.request.get(
        "http://127.0.0.1:5173/api/notifications",
      );
      if (!response.ok()) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
      alerts = await response.json();
      if (alerts.some((a) => a.raceSlug === race.slug)) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    assert.ok(
      alerts.some((a) => a.raceSlug === race.slug),
      "Monitoring must create a real research alert",
    );
    await page
      .getByRole("link", { name: "Alerts", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", {
        name: `${race.name}: registration information updated`,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Mark as read", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Mark as read", exact: true })
      .waitFor({ state: "detached" });
    await page.screenshot({
      path: "/tmp/bibdrop-live-alerts.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: scheduled live research produced a private alert; mark-as-read works; no browser errors.",
    );
  } finally {
    if (browser) await browser.close();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        break;
      } catch (e) {
        await mongoose.disconnect();
        if (attempt === 2) throw e;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    const user = await mongoose.connection
      .collection("users")
      .findOne({ email });
    if (user) {
      await mongoose.connection
        .collection("userracestatuses")
        .deleteMany({ userId: user._id });
      await mongoose.connection
        .collection("notifications")
        .deleteMany({ userId: user._id });
      await mongoose.connection
        .collection("users")
        .deleteOne({ _id: user._id, email });
    }
    await mongoose.disconnect();
    console.log(
      "Temporary test account and its personal data removed; researched race data retained.",
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
