import mongoose from "mongoose";
const schema = new mongoose.Schema({
  _id: String,
  used: { type: Number, default: 0 },
  expiresAt: Date,
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const ResearchBudget = mongoose.model("ResearchBudget", schema);
