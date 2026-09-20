import mongoose from "mongoose";
import { COURSE_TYPES, SEASONS } from "../constants/raceTags.js";

const constraintsSchema = new mongoose.Schema(
  {
    season: { type: String, enum: SEASONS },
    region: { type: String, trim: true, maxlength: 80 },
    courseType: { type: String, enum: COURSE_TYPES },
  },
  { _id: false }
);

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    tags: { type: [String], default: [] },
    constraints: { type: constraintsSchema, default: undefined },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Goal = mongoose.model("Goal", goalSchema);
