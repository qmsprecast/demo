/**
 * BERT platform Master (internal operator) auth — server-only.
 * Operators live in `.sessions/master-operators.json` with scrypt password hashes.
 * Not bundled into the Vite client; safe for production APK when demo login is off.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getSessionCookieOptions } from "./session-cookie-options.mjs";

const STORE_FILENAME = "master-operators.json";
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MASTER_SESSION_COOKIE = "bert_master_session";
const MASTER_SESSION_MS = Math.max(
  60 * 60 * 1000,
  Number(process.env.MASTER_SESSION_TTL_MS || String(7 * 24 * 60 * 60 * 1000)),
);

function storePath(sessionDir) {
  return path.join(sessionDir, STORE_FILENAME);
}

export function readMasterStore(sessionDir) {
  const p = storePath(sessionDir);
  try {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") {
      return { version: 1, operators: [] };
    }
    if (!Array.isArray(data.operators)) {
      return { version: 1, operators: [] };
    }
    return { version: 1, operators: data.operators };
  } catch {
    return { version: 1, operators: [] };
  }
}

export function writeMasterStore(sessionDir, store) {
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  fs.writeFileSync(storePath(sessionDir), JSON.stringify(store, null, 2), "utf8");
}

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(plain), salt, 64, SCRYPT_PARAMS);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(plain, stored) {
  const s = String(stored || "");
  if (!s.startsWith("scrypt$")) {
    return false;
  }
  const parts = s.split("$");
  if (parts.length !== 3) {
    return false;
  }
  const salt = Buffer.from(parts[1], "base64");
  const expected = Buffer.from(parts[2], "base64");
  try {
    const key = crypto.scryptSync(String(plain), salt, expected.length, SCRYPT_PARAMS);
    return crypto.timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/**
 * Upsert operator (used by seed script). Password is hashed; never stored plain.
 * @param {{ sessionDir: string; email: string; name: string; password: string }} input
 */
export function upsertMasterOperator(input) {
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Master operator email must look like an email address.");
  }
  const name = String(input.name || "").trim() || email;
  const store = readMasterStore(input.sessionDir);
  const next = store.operators.filter((o) => String(o.email || "").toLowerCase() !== email);
  next.push({
    email,
    name,
    passwordHash: hashPassword(input.password),
    createdAt: Date.now(),
  });
  writeMasterStore(input.sessionDir, { version: 1, operators: next });
  return { email, name };
}

function findOperator(sessionDir, email) {
  const e = String(email || "")
    .trim()
    .toLowerCase();
  const store = readMasterStore(sessionDir);
  return store.operators.find((o) => String(o.email || "").toLowerCase() === e) || null;
}

/**
 * @param {import('express').Express} app
 * @param {{ sessionDir: string }} opts
 */
export function installMasterAuthRoutes(app, opts) {
  const { sessionDir } = opts;

  app.post("/api/auth/master/login", (req, res) => {
    const email = String(req.body?.email || req.body?.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required." });
    }
    const op = findOperator(sessionDir, email);
    if (!op || !verifyPassword(password, op.passwordHash)) {
      return res.status(401).json({ ok: false, error: "Invalid email or password." });
    }
    const payload = JSON.stringify({ email: op.email, name: op.name, v: 1 });
    res.cookie(MASTER_SESSION_COOKIE, payload, getSessionCookieOptions({ maxAge: MASTER_SESSION_MS }));
    return res.json({
      ok: true,
      operator: { email: op.email, name: op.name },
    });
  });

  app.post("/api/auth/master/logout", (req, res) => {
    res.clearCookie(MASTER_SESSION_COOKIE, getSessionCookieOptions());
    return res.json({ ok: true });
  });

  app.get("/api/auth/master/session", (req, res) => {
    const raw = req.signedCookies?.[MASTER_SESSION_COOKIE];
    if (!raw || typeof raw !== "string") {
      return res.status(401).json({ ok: false, error: "No Master session." });
    }
    try {
      const data = JSON.parse(raw);
      if (!data?.email || data.v !== 1) {
        return res.status(401).json({ ok: false, error: "Invalid session." });
      }
      const op = findOperator(sessionDir, data.email);
      if (!op) {
        res.clearCookie(MASTER_SESSION_COOKIE, getSessionCookieOptions());
        return res.status(401).json({ ok: false, error: "Operator removed." });
      }
      return res.json({
        ok: true,
        operator: { email: op.email, name: op.name },
      });
    } catch {
      return res.status(401).json({ ok: false, error: "Invalid session." });
    }
  });
}

export { MASTER_SESSION_COOKIE };
