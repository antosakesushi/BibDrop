import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./db.js";
import { racesRouter } from "./routes/races.js";
import { researchRouter } from "./routes/research.js";
import { discoverRouter } from "./routes/discover.js";
import { authRouter } from "./routes/auth.js";
import { goalsRouter } from "./routes/goals.js";

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");

// credentials:true + an explicit origin list (never "*") is required for
// cookies to work cross-origin once this is deployed - the browser refuses
// to send/accept cookies on a wildcard-origin CORS response.
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Trust one hop of proxy (Vercel/Render/etc.) so req.ip reflects the real
// visitor IP, not the proxy's - important for the rate limiter to work.
app.set("trust proxy", 1);

app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    redisConfigured: Boolean(process.env.REDIS_URL),
    researchSyncFallback: process.env.RESEARCH_SYNC_FALLBACK === "true",
  })
);
app.use("/api/auth", authRouter);
app.use("/api/races", racesRouter);
app.use("/api/research", researchRouter);
app.use("/api/discover", discoverRouter);
app.use("/api/goals", goalsRouter);

// Basic error handler - last middleware
app.use((err, req, res, next) => {
  console.error(err);
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  res.status(500).json({ error: "Something went wrong. Check server logs." });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] BibDrop API listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("[server] Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
