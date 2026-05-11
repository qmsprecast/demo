import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
