import { Router } from "express";
import { Race } from "../models/Race.js";
import { UserRaceStatus } from "../models/UserRaceStatus.js";
import { requireAuth, signCalendarToken, verifyCalendarToken } from "../middleware/auth.js";
import { currentDeadlinesForRace } from "../services/deadlineStore.js";
import { renderIcs, selectWatchingCalendarEvents } from "../services/ics.js";

export const calendarRouter = Router();

function publicApiBase(req) {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

calendarRouter.get("/calendar/feed-url", requireAuth, (req, res) => {
  const token = signCalendarToken(req.userId);
  const url = `${publicApiBase(req)}/api/calendar.ics?token=${encodeURIComponent(token)}`;
  res.json({
    url,
    token,
    howTo: {
      google: "Google Calendar → Other calendars → the + → From URL → paste the feed URL.",
      apple: "Calendar → File → New Calendar Subscription → paste the feed URL.",
    },
  });
});

calendarRouter.get("/calendar.ics", async (req, res, next) => {
  try {
    const userId = verifyCalendarToken(req.query.token);
    const watching = await UserRaceStatus.find({ userId, interestStage: "watching" });
    const slugs = watching.map((w) => w.raceSlug);
    const [races, deadlineLists] = await Promise.all([
      Race.find({ slug: { $in: slugs } }),
      Promise.all(slugs.map((slug) => currentDeadlinesForRace(slug))),
    ]);
    const racesBySlug = Object.fromEntries(races.map((r) => [r.slug, r]));
    const events = selectWatchingCalendarEvents({
      watchingSlugs: slugs,
      deadlines: deadlineLists.flat(),
      racesBySlug,
    });
    const body = renderIcs(events);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="bibdrop-watching.ics"');
    res.send(body);
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({ error: err.message });
    }
    next(err);
  }
});
