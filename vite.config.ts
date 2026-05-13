import type { ServerResponse } from "node:http";
import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Vite calls `os.networkInterfaces()` when `server.host` is `true` (to print LAN URLs). That
 * throws in some environments (`uv_interface_addresses` / system error 1), so the dev server
 * never starts → ERR_CONNECTION_REFUSED in the browser.
 *
 * - Default: `localhost` — no LAN interface scan (unlike `host: true`), but accepts both
 *   `http://localhost:5173` and `http://127.0.0.1:5173` (binding only `127.0.0.1` breaks the former
 *   when `localhost` resolves to `::1` first).
 * - IPv4-only loopback: `VITE_DEV_HOST=127.0.0.1`.
 * - LAN / all interfaces: `VITE_DEV_HOST=all` (or `lan`, `0.0.0.0`) → same as former `host: true`.
 */
function viteDevHost(): boolean | string {
  const raw = String(process.env.VITE_DEV_HOST || "").trim().toLowerCase();
  if (raw === "all" || raw === "lan" || raw === "0.0.0.0" || raw === "true") {
    return true;
  }
  if (raw && raw !== "false") {
    return raw;
  }
  return "localhost";
}

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
    host: viteDevHost(),
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": backendProxy,
      "/auth": backendProxy,
    },
  },
});
