import { Router } from "express";
import mongoose from "mongoose";
import { Goal as GoalModel } from "../models/Goal.js";
import { requireAuth } from "../middleware/auth.js";
import { isOwnedBy, normalizeGoalInput, serializeGoal, sortGoals } from "../services/goals.js";

async function loadOwnedGoal(Goal, req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json({ error: "Goal not found" });
    return null;
  }
  const goal = await Goal.findOne({ _id: id, userId: req.userId });
  if (!goal || !isOwnedBy(goal, req.userId)) {
    res.status(404).json({ error: "Goal not found" });
    return null;
  }
  return goal;
}

export function createGoalsRouter(Goal = GoalModel) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (req, res, next) => {
    try {
      const goals = await Goal.find({ userId: req.userId });
      res.json(sortGoals(goals).map(serializeGoal));
    } catch (err) {
      next(err);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const patch = normalizeGoalInput(req.body, { partial: false });
      const goal = await Goal.create({
        userId: req.userId,
        label: patch.label,
        tags: patch.tags || [],
        constraints: patch.constraints || undefined,
        status: patch.status || "active",
      });
      res.status(201).json(serializeGoal(goal));
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
      next(err);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const goal = await loadOwnedGoal(Goal, req, res);
      if (!goal) return;

      const patch = normalizeGoalInput(req.body, { partial: true });
      if (patch.label !== undefined) goal.label = patch.label;
      if (patch.tags !== undefined) goal.tags = patch.tags;
      if (patch.constraints !== undefined) goal.constraints = patch.constraints || undefined;
      if (patch.status !== undefined) goal.status = patch.status;
      await goal.save();
      res.json(serializeGoal(goal));
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
      next(err);
    }
  });

  // Soft-archive. Permanent delete is out of scope for this stub.
  router.delete("/:id", async (req, res, next) => {
    try {
      const goal = await loadOwnedGoal(Goal, req, res);
      if (!goal) return;
      goal.status = "archived";
      await goal.save();
      res.json(serializeGoal(goal));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const goalsRouter = createGoalsRouter();
