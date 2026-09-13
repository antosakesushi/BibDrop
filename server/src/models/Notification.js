import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    raceSlug: { type: String, required: true },
    key: { type: String, required: true },
    title: String,
    body: String,
    sourceUrl: String,
    readAt: Date,
  },
  { timestamps: true },
);
schema.index({ userId: 1, key: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });
export const Notification = mongoose.model("Notification", schema);
