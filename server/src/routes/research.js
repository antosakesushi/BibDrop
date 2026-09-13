import { Router } from "express";
import { Race } from "../models/Race.js";
import { refreshRace } from "../services/refreshRace.js";
import { researchRateLimiter } from "../middleware/rateLimiter.js";
export const researchRouter = Router();
researchRouter.post("/:slug", researchRateLimiter, async (req, res, next) => {
  try {
    if (!(await Race.exists({ slug: req.params.slug })))
      return res.status(404).json({ error: "Race not found" });
    res.json(await refreshRace(req.params.slug, req.ip));
  } catch (e) {
    if ([409, 429].includes(e.status))
      return res.status(e.status).json({ error: e.message });
    next(e);
  }
});
