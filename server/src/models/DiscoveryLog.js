import mongoose from "mongoose";

// Separate from ResearchLog on purpose - discovery is a distinct, riskier
// action (open-ended criteria vs. a known race) and gets its own budget.
const discoveryLogSchema = new mongoose.Schema(
  {
    requesterIp: { type: String, required: true },
    criteria: String,
    candidateCount: Number,
    succeeded: Boolean,
    errorMessage: String,
  },
  { timestamps: true },
);

discoveryLogSchema.index({ createdAt: 1 });
discoveryLogSchema.index({ requesterIp: 1, createdAt: 1 });

export const DiscoveryLog = mongoose.model("DiscoveryLog", discoveryLogSchema);
