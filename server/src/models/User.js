import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    alertDefaults: {
      leadDays: { type: [Number], default: [14, 7, 1] },
      channel: { type: String, enum: ["email"], default: "email" },
      timezone: { type: String, default: "UTC" },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
