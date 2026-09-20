import { Router } from "express";
import { User } from "../models/User.js";
import { ResearchLog } from "../models/ResearchLog.js";
import { ResearchSnapshot } from "../models/ResearchSnapshot.js";
import { requireAuth } from "../middleware/auth.js";
import { isAdminEmail } from "../services/admin.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: "Admin only." });
    }
    req.adminEmail = user.email;
    next();
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/research-spend", async (req, res, next) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [logCount, snapshots, usage] = await Promise.all([
      ResearchLog.countDocuments({ createdAt: { $gte: dayAgo } }),
      ResearchSnapshot.aggregate([
        { $match: { createdAt: { $gte: dayAgo } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      ResearchSnapshot.aggregate([
        { $match: { createdAt: { $gte: dayAgo }, "usage.inputTokens": { $exists: true } } },
        {
          $group: {
            _id: null,
            inputTokens: { $sum: "$usage.inputTokens" },
            outputTokens: { $sum: "$usage.outputTokens" },
          },
        },
      ]),
    ]);

    const byStatus = Object.fromEntries(snapshots.map((row) => [row._id, row.count]));
    const cap = Number(process.env.RESEARCH_DAILY_BUDGET_CAP || 50);

    res.json({
      window: "last_24h",
      researchLogCount: logCount,
      dailyBudgetCap: cap,
      remainingBudget: Math.max(0, cap - logCount),
      snapshots: {
        queued: byStatus.queued || 0,
        running: byStatus.running || 0,
        succeeded: byStatus.succeeded || 0,
        failed: byStatus.failed || 0,
      },
      usage: {
        inputTokens: usage[0]?.inputTokens || 0,
        outputTokens: usage[0]?.outputTokens || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});
