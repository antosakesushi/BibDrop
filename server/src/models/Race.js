import mongoose from "mongoose";

const registrationEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "lottery_open",
        "lottery_close",
        "lottery_results",
        "general_entry_open",
        "general_entry_close",
        "wave_drop",
        "price_tier_change",
        "waitlist_open",
        "other",
      ],
      required: true,
    },
    label: String, // human-readable, e.g. "Tier 2 pricing begins"
    date: Date, // null if agent found a description but not a confirmed date
    dateConfidence: {
      type: String,
      enum: ["confirmed", "estimated", "unknown"],
      default: "unknown",
    },
    notes: String,
    sourceUrl: String,
  },
  { _id: false },
);

const raceSchema = new mongoose.Schema(
  {
    // --- Seeded identity fields (curated by hand, not agent-researched) ---
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    officialUrl: { type: String, required: true },
    city: String,
    country: String,
    isWorldMajor: { type: Boolean, default: false },
    courseType: {
      type: String,
      enum: ["flat_fast", "rolling", "hilly", "point_to_point", "loop"],
    },
    season: { type: String, enum: ["spring", "summer", "fall", "winter"] },
    tags: [String], // e.g. ["bq-friendly", "destination", "charity-heavy"]

    // --- Agent-researched fields (populated by the live research endpoint) ---
    edition: String,
    raceDate: Date,
    profileFacts: [
      {
        key: String,
        label: String,
        value: String,
        context: String,
        sourceUrl: String,
      },
    ],
    researchSources: [{ title: String, url: String, snippet: String }],
    registrationEvents: [registrationEventSchema],
    agentSummary: String, // 1-2 sentence agent-written summary of registration landscape
    lastResearchedAt: Date,
    lastResearchConfidence: {
      type: String,
      enum: ["not_yet_researched", "low", "medium", "high"],
      default: "not_yet_researched",
    },
    researchSourceSnippets: [String], // short quoted fragments the agent cited, for transparency

    // --- Derived / display ---
    heroImageUrl: String,
    pendingAlerts: {
      type: [{ key: String, title: String, body: String, sourceUrl: String }],
      select: false,
    },
    nextResearchAt: Date,
    researchLeaseUntil: Date,
    researchLeaseToken: { type: String, select: false },
    lastMonitorError: String,
  },
  { timestamps: true },
);

export const Race = mongoose.model("Race", raceSchema);
