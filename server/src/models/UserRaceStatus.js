import mongoose from "mongoose";

// Deliberately separate from Race: the race catalog and agent research are
// shared across every account (one research call benefits everyone), but
// whether YOU are interested in or watching a race is personal. One
// document per (user, race) pair.
const userRaceStatusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    raceSlug: { type: String, required: true },
    interestStage: {
      type: String,
      enum: ["none", "interested", "watching"],
      default: "none",
    },
  },
  { timestamps: true }
);

userRaceStatusSchema.index({ userId: 1, raceSlug: 1 }, { unique: true });
userRaceStatusSchema.index({ raceSlug: 1, interestStage: 1 });

export const UserRaceStatus = mongoose.model("UserRaceStatus", userRaceStatusSchema);
