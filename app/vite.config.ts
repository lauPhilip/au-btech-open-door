import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// In development the app runs on Vite (port 5173) and the rooms run on
// wrangler (port 8787). The proxy makes both look like one site, as in production.
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      "/parties": { target: "http://localhost:8787", ws: true },
      "/api": { target: "http://localhost:8787" },
    },
  },
});
