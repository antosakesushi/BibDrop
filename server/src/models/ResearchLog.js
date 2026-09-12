import mongoose from "mongoose";

// Every call to the live research agent is logged here. This is what the
// rate limiter and daily budget cap read from - a DB-backed log survives
// server restarts, which an in-memory counter would not (important for
// serverless/ephemeral hosting).
const researchLogSchema = new mongoose.Schema(
  {
    raceSlug: { type: String, required: true },
    requesterIp: { type: String, required: true },
    succeeded: Boolean,
    errorMessage: String,
  },
  { timestamps: true }
);

researchLogSchema.index({ createdAt: 1 });
researchLogSchema.index({ requesterIp: 1, createdAt: 1 });

export const ResearchLog = mongoose.model("ResearchLog", researchLogSchema);
