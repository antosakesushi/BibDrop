import { Router } from "express";
import { Alert } from "../models/Alert.js";
import { Deadline } from "../models/Deadline.js";
import { Race } from "../models/Race.js";
import { UserRaceStatus } from "../models/UserRaceStatus.js";
import { requireAuth } from "../middleware/auth.js";
import { currentDeadlinesForRace, serializeDeadline } from "../services/deadlineStore.js";
import { serializeAlert } from "../services/alerts.js";
import { urgencyBand } from "../services/alertPlan.js";

export const alertsRouter = Router();

alertsRouter.use(requireAuth);

// GET /api/deadlines?raceSlug= — current deadlines for one race, or for
// races the user is watching if raceSlug is omitted.
alertsRouter.get("/deadlines", async (req, res, next) => {
  try {
    const { raceSlug } = req.query;
    let slugs;
    if (raceSlug) {
      slugs = [String(raceSlug)];
    } else {
      const watching = await UserRaceStatus.find({
        userId: req.userId,
        interestStage: "watching",
      });
      slugs = watching.map((w) => w.raceSlug);
    }

    const deadlines = [];
    for (const slug of slugs) {
      const rows = await currentDeadlinesForRace(slug);
      deadlines.push(...rows);
    }
    res.json(deadlines.map(serializeDeadline));
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts — this user's scheduled/sent/skipped/failed alerts.
alertsRouter.get("/alerts", async (req, res, next) => {
  try {
    const alerts = await Alert.find({
      userId: req.userId,
      status: { $in: ["scheduled", "sent", "skipped", "failed"] },
    }).sort({ fireAt: 1 });

    const deadlineIds = [...new Set(alerts.map((a) => String(a.deadlineId)))];
    const raceIds = [...new Set(alerts.map((a) => String(a.raceId)))];
    const [deadlines, races] = await Promise.all([
      Deadline.find({ _id: { $in: deadlineIds } }),
      Race.find({ _id: { $in: raceIds } }),
    ]);
    const deadlineById = Object.fromEntries(deadlines.map((d) => [String(d._id), d]));
    const raceById = Object.fromEntries(races.map((r) => [String(r._id), r]));

    res.json(
      alerts.map((alert) => ({
        ...serializeAlert(alert, {
          deadline: deadlineById[String(alert.deadlineId)],
          race: raceById[String(alert.raceId)],
        }),
        urgency: urgencyBand(alert.fireAt),
      }))
    );
  } catch (err) {
    next(err);
  }
});
