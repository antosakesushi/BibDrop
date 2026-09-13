import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.get("/", async (req, res, next) => {
  try {
    res.json(
      await Notification.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .limit(100),
    );
  } catch (e) {
    next(e);
  }
});
notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: "Invalid notification ID." });
    const item = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!item)
      return res.status(404).json({ error: "Notification not found." });
    res.json(item);
  } catch (e) {
    next(e);
  }
});
