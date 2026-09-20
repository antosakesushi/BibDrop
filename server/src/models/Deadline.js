import mongoose from "mongoose";
import { EVENT_TYPES } from "../services/claudeResearch.js";

const deadlineSchema = new mongoose.Schema(
  {
    raceId: { type: mongoose.Schema.Types.ObjectId, ref: "Race", required: true },
    raceSlug: { type: String, required: true },
    snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: "ResearchSnapshot", required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    label: String,
    date: { type: Date, default: null },
    dateConfidence: {
      type: String,
      enum: ["confirmed", "estimated", "unknown"],
      default: "unknown",
    },
    notes: String,
    isCurrent: { type: Boolean, default: true },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: "Deadline", default: null },
  },
  { timestamps: true }
);

deadlineSchema.index({ raceSlug: 1, isCurrent: 1 });
deadlineSchema.index({ snapshotId: 1 });
deadlineSchema.index({ raceId: 1, isCurrent: 1 });

export const Deadline = mongoose.model("Deadline", deadlineSchema);
