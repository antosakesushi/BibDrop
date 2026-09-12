import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // During local dev, forward API calls to the Express server so the
      // client can just call /api/... without worrying about ports.
      "/api": "http://localhost:4000",
    },
  },
});
