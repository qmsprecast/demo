import type { ServerResponse } from "node:http";
import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Vite's default proxy error responds with HTTP 500 and an empty body, which breaks JSON clients. */
const backendProxy: ProxyOptions = {
  target: "http://127.0.0.1:8787",
  changeOrigin: true,
  configure(proxy) {
    proxy.on("error", (_err, _req, res) => {
      if (!res || typeof (res as ServerResponse).writeHead !== "function") {
        return;
      }
      const response = res as ServerResponse;
      if (response.headersSent || response.writableEnded) {
        return;
      }
      const error =
        "API server is not reachable on port 8787. From the project root run `npm run dev:full` (starts API + UI), or run `npm run server` in one terminal and `npm run dev` in another.";
      response.writeHead(502, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: false, error }));
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    // Bind on all interfaces so http://127.0.0.1:5173 and http://localhost:5173 work reliably.
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": backendProxy,
      "/auth": backendProxy,
    },
  },
});
