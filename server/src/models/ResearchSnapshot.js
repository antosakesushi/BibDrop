import mongoose from "mongoose";

const EVENT_TYPES = [
  "lottery_open",
  "lottery_close",
  "lottery_results",
  "general_entry_open",
  "general_entry_close",
  "wave_drop",
  "price_tier_change",
  "waitlist_open",
  "other",
];

const registrationEventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: EVENT_TYPES, required: true },
    label: String,
    date: Date,
    dateConfidence: {
      type: String,
      enum: ["confirmed", "estimated", "unknown"],
      default: "unknown",
    },
    notes: String,
  },
  { _id: false }
);

const sourceSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: String,
  },
  { _id: false }
);

// One document per research run. Status moves queued → running → succeeded|failed
// on the same document; findings on a succeeded snapshot are not overwritten.
// A later refresh inserts a new snapshot (append-only history). Race keeps a
// denormalized copy of the latest succeeded fields for existing UI reads.
const researchSnapshotSchema = new mongoose.Schema(
  {
    raceSlug: { type: String, required: true },
    raceId: { type: mongoose.Schema.Types.ObjectId, ref: "Race", required: true },
    status: {
      type: String,
      enum: ["queued", "running", "succeeded", "failed"],
      required: true,
      default: "queued",
    },
    triggeredBy: {
      type: String,
      enum: ["user", "system"],
      default: "user",
    },
    requesterUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requesterIp: { type: String, required: true },
    model: String,
    usage: {
      inputTokens: Number,
      outputTokens: Number,
    },
    agentSummary: String,
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
    },
    registrationEvents: [registrationEventSchema],
    sourceSnippets: [String],
    sources: [sourceSchema],
    errorMessage: String,
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

researchSnapshotSchema.index({ raceSlug: 1, finishedAt: -1 });
researchSnapshotSchema.index({ status: 1, createdAt: 1 });
// At most one in-flight job per race (concurrent refresh dedupe).
researchSnapshotSchema.index(
  { raceSlug: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["queued", "running"] } },
    name: "one_inflight_per_race",
  }
);

export const ResearchSnapshot = mongoose.model("ResearchSnapshot", researchSnapshotSchema);
