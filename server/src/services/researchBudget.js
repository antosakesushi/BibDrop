import { ResearchBudget } from "../models/ResearchBudget.js";
export async function reserveResearchBudget(now = new Date()) {
  const id = now.toISOString().slice(0, 10);
  const cap = Number(process.env.RESEARCH_DAILY_BUDGET_CAP || 50);
  if (!Number.isSafeInteger(cap) || cap < 1)
    throw new Error("Research budget must be a positive integer.");
  try {
    await ResearchBudget.updateOne(
      { _id: id },
      { $setOnInsert: { used: 0, expiresAt: new Date(+now + 3 * 86400000) } },
      { upsert: true },
    );
  } catch (e) {
    if (e.code !== 11000) throw e;
  }
  const reserved = await ResearchBudget.findOneAndUpdate(
    { _id: id, used: { $lt: cap } },
    { $inc: { used: 1 } },
    { new: true },
  );
  if (!reserved) {
    const e = new Error("Daily research budget reached. Please try tomorrow.");
    e.status = 429;
    throw e;
  }
}
