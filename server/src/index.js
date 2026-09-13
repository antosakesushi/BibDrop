import "dotenv/config";
import { app } from "./app.js";
import { connectDB } from "./db.js";
import { startMonitor } from "./jobs/monitor.js";
const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app
      .listen(PORT, () => {
        console.log(`[server] BibDrop API listening on :${PORT}`);
        startMonitor();
      })
      .on("error", (err) => {
        console.error("[server]", err.message);
        process.exit(1);
      });
  })
  .catch((err) => {
    console.error("[server] Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
