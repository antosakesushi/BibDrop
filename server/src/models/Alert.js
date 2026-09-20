import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deadlineId: { type: mongoose.Schema.Types.ObjectId, ref: "Deadline", required: true },
    raceId: { type: mongoose.Schema.Types.ObjectId, ref: "Race", required: true },
    channel: { type: String, enum: ["email"], default: "email" },
    leadDays: { type: Number, required: true },
    fireAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "sent", "skipped", "failed", "cancelled"],
      default: "scheduled",
    },
    dedupeKey: { type: String, required: true, unique: true },
    providerMessageId: String,
    sentAt: Date,
    errorMessage: String,
  },
  { timestamps: true }
);

alertSchema.index({ status: 1, fireAt: 1 });
alertSchema.index({ userId: 1, status: 1, fireAt: 1 });
alertSchema.index({ raceId: 1, status: 1 });

export const Alert = mongoose.model("Alert", alertSchema);
