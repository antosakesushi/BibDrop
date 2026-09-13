const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({
    viewport: { width: 1360, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/auth/me", (r) =>
    r.fulfill({
      status: 401,
      contentType: "application/json",
      body: '{"error":"Not logged in"}',
    }),
  );
  await page.addInitScript(() => localStorage.setItem("bibdrop-demo", "true"));
  await page.goto("http://127.0.0.1:5173");
  await page
    .getByRole("heading", { name: "Your races. Your next move." })
    .waitFor();
  await page.screenshot({ path: "/tmp/bibdrop-desktop.png", fullPage: true });
  await page
    .getByRole("link", { name: "Discover", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "A fast autumn marathon in Europe" })
    .click();
  await page
    .getByText("Example result for your conversation.")
    .first()
    .waitFor();
  await page.getByLabel("Ask the researcher").fill("Show me a smaller race");
  await page.getByRole("button", { name: "Send research question" }).click();
  await page.getByRole("heading", { name: "No matches yet" }).waitFor();
  await page.getByRole("button", { name: "New chat" }).click();
  await page.getByLabel("Search catalog by race or city").fill("London");
  await page.getByRole("link", { name: "Race details", exact: true }).click();
  await page
    .getByRole("heading", { name: "London Marathon", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Watch registration", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("button", { name: "Add to watchlist", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Watching · stop", exact: true })
    .waitFor();
  await page.getByLabel("Your entry status").selectOption("registered");
  await page.reload();
  await page
    .getByRole("button", { name: "Watching · stop", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Your entry status").inputValue(),
    "registered",
  );
  await page
    .getByRole("link", { name: "Deadlines", exact: true })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Your registration timeline." })
    .waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export confirmed dates" }).click();
  assert.match((await downloadPromise).suggestedFilename(), /DEMO/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5173/");
  await page
    .getByRole("heading", { name: "Your races. Your next move." })
    .waitFor();
  await page.screenshot({ path: "/tmp/bibdrop-mobile.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({ path: "/tmp/bibdrop-dark.png", fullPage: true });
  await page.goto("http://127.0.0.1:5173/discover");
  await page.getByLabel("Search catalog by race or city").waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "/tmp/bibdrop-discover-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  const live = await browser.newPage();
  live.on("pageerror", (e) => errors.push(e.message));
  let signedIn = false;
  const race = {
    slug: "test-marathon",
    name: "Test Marathon",
    city: "Berlin",
    country: "Germany",
    officialUrl: "https://example.org",
    interestStage: "none",
    registrationEvents: [],
  };
  await live.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body,
      status = 200;
    if (path === "/api/monitoring") {
      body = { enabled: false };
    } else if (path === "/api/notifications") {
      body = [
        {
          _id: "test-alert",
          raceSlug: race.slug,
          title: "Registration updated",
          body: "Review the latest entry dates.",
          createdAt: new Date().toISOString(),
        },
      ];
    } else if (path === "/api/notifications/test-alert/read") {
      body = {
        _id: "test-alert",
        raceSlug: race.slug,
        title: "Registration updated",
        body: "Review the latest entry dates.",
        createdAt: new Date().toISOString(),
        readAt: new Date().toISOString(),
      };
    } else if (path === "/api/auth/me") {
      status = 401;
      body = { error: "Not logged in" };
    } else if (path === "/api/auth/register") {
      signedIn = true;
      body = { id: "test", email: "runner@example.org" };
    } else if (path === "/api/races") {
      body = [{ ...race }];
    } else if (path.endsWith("/interest")) {
      assert.ok(signedIn);
      race.interestStage = route.request().postDataJSON().stage;
      body = { ...race };
    } else {
      throw new Error("Unexpected API call: " + path);
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await live.goto("http://127.0.0.1:5173/discover");
  await live
    .getByRole("button", { name: "Watch registration", exact: true })
    .click();
  await live.getByLabel("Email", { exact: true }).fill("runner@example.org");
  await live.getByLabel("Password", { exact: true }).fill("test-password-123");
  await live.getByRole("button", { name: "Create account & continue" }).click();
  await live
    .getByRole("button", { name: "Add to watchlist", exact: true })
    .click();
  await live
    .getByRole("button", { name: "Watching · stop", exact: true })
    .waitFor();
  assert.equal(race.interestStage, "watching");
  await live.getByRole("link", { name: "Alerts", exact: true }).first().click();
  await live
    .getByRole("heading", { name: "Registration updated", exact: true })
    .waitFor();
  await live.getByRole("button", { name: "Mark as read", exact: true }).click();
  await live
    .getByRole("button", { name: "Mark as read", exact: true })
    .waitFor({ state: "detached" });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: desktop/mobile, discovery follow-up, watch dialog, outcome persistence, export, dark mode; no page errors.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
