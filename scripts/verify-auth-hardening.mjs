#!/usr/bin/env node
/**
 * Pilot auth hardening — static checks on the production Vite bundle plus a printed
 * manual checklist for live API/Sheets verification. Does not call authenticated endpoints,
 * read cookies, or print secrets or password hashes.
 *
 * Usage:
 *   npm run verify:auth
 *   npm run verify:auth -- --build     # run `npm run build` first
 *
 * For APK/release pipelines, run after `npm run build` with the same env as production
 * (omit VITE_ENABLE_DEMO_LOGIN / VITE_SHOW_DEBUG_UI / demo passwords).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const args = process.argv.slice(2);
const shouldBuild = args.includes("--build");

if (shouldBuild) {
  console.log("[verify:auth] running npm run build …\n");
  execSync("npm run build", { stdio: "inherit", cwd: root });
}

const distDir = path.join(root, "dist");
if (!fs.existsSync(distDir)) {
  console.error("[verify:auth] FAIL: dist/ missing. Run: npm run build");
  process.exit(1);
}

/** @returns {string[]} */
function collectJsBundlePaths(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...collectJsBundlePaths(p));
    } else if (name.isFile() && (name.name.endsWith(".js") || name.name.endsWith(".mjs"))) {
      out.push(p);
    }
  }
  return out;
}

const bundlePaths = collectJsBundlePaths(distDir);
if (bundlePaths.length === 0) {
  console.error("[verify:auth] FAIL: no .js/.mjs files under dist/");
  process.exit(1);
}

const combined = bundlePaths.map((p) => fs.readFileSync(p, "utf8")).join("\n");

/** { name: string, re: RegExp }[] */
const forbiddenInDist = [
  { name: 'literal password: "demo" (or single-quoted)', re: /password\s*:\s*["']demo["']/i },
  {
    name: "VITE_ENABLE_DEMO_LOGIN compared to true (demo login path still in bundle)",
    re: /VITE_ENABLE_DEMO_LOGIN\s*===?\s*["']true["']/,
  },
  {
    name: "VITE_SHOW_DEBUG_UI compared to true (debug UI path still in bundle)",
    re: /VITE_SHOW_DEBUG_UI\s*===?\s*["']true["']/,
  },
];

let failed = false;
for (const { name, re } of forbiddenInDist) {
  if (re.test(combined)) {
    console.error(`[verify:auth] FAIL (dist bundle): ${name}`);
    failed = true;
  } else {
    console.log(`[verify:auth] OK (dist): ${name}`);
  }
}

const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const scripts = pkg.scripts || {};
if (typeof scripts["migrate:userauth"] === "string" && scripts["migrate:userauth"].includes("migrate-userauth-passwords")) {
  console.log("[verify:auth] OK: package.json defines npm run migrate:userauth");
} else {
  console.error("[verify:auth] FAIL: package.json missing migrate:userauth script");
  failed = true;
}

const migrateScript = path.join(root, "scripts", "migrate-userauth-passwords.mjs");
if (fs.existsSync(migrateScript)) {
  console.log("[verify:auth] OK: scripts/migrate-userauth-passwords.mjs exists");
} else {
  console.error("[verify:auth] FAIL: migrate script missing");
  failed = true;
}

const serverPath = path.join(root, "server", "server.mjs");
const serverSrc = fs.readFileSync(serverPath, "utf8");
if (
  serverSrc.includes('key.toLowerCase().startsWith("userauth.")') &&
  serverSrc.includes('Value: "", value: ""')
) {
  console.log("[verify:auth] OK: server Config sanitisation for UserAuth.* (spot-check)");
} else {
  console.warn("[verify:auth] WARN: could not spot-check UserAuth.* Config sanitisation in server/server.mjs");
}

console.log(`
--- Manual checklist (pilot / staging; do not paste secrets or full hashes) ---

1) Invite completion → Config
   - Complete a test company-user invite.
   - In the company master sheet Config tab, find Key UserAuth.<email>.
   - Confirm the Value starts with "scrypt$" only (lengthy; do not copy into chat/logs).

2) Company login — wrong password
   - With API Google session connected and a known test user:
   - POST /api/auth/company/login with wrong password → expect 401 JSON (no cookie or stale session cleared).

3) Company login — correct password
   - POST /api/auth/company/login with correct password → 200 and Set-Cookie for bert_company_session (httpOnly).

4) Logout
   - POST /api/auth/company/logout → 200; subsequent GET /api/auth/company/session → 401.

5) SPA / company sheet read
   - GET /api/company-sheet/:folderId or /api/google-sheet-by-id/:id with auth as your app does.
   - In JSON, Config rows for UserAuth.* must have empty Value (sanitised for the browser).

6) Migration (optional bulk legacy plaintext → hash)
   - After .sessions/google-session.json exists:
   - npm run migrate:userauth -- <masterSpreadsheetId>
   - Expect stdout JSON with { "ok": true, "migrated": <number> }.

7) Repeat static verify after production-like build
   - npm run verify:auth

--- End checklist ---
`);

if (failed) {
  process.exit(1);
}

console.log("[verify:auth] All automated checks passed.");
