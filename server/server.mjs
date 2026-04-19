import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const rootDir = process.cwd();
const sessionDir = path.join(rootDir, ".sessions");
const sessionFile = path.join(sessionDir, "google-session.json");

const requiredEnv = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "http://127.0.0.1:8787/auth/google/callback",
  GOOGLE_SHARED_DRIVE_ID: process.env.GOOGLE_SHARED_DRIVE_ID || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "qms-local-dev-secret",
};

const scopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/forms.body.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

app.use(express.json());
app.use(cookieParser(requiredEnv.SESSION_SECRET));

function createOAuthClient() {
  return new google.auth.OAuth2(
    requiredEnv.GOOGLE_CLIENT_ID,
    requiredEnv.GOOGLE_CLIENT_SECRET,
    requiredEnv.GOOGLE_REDIRECT_URI,
  );
}

function envConfigured() {
  return Boolean(
    requiredEnv.GOOGLE_CLIENT_ID &&
      requiredEnv.GOOGLE_CLIENT_SECRET &&
      requiredEnv.GOOGLE_REDIRECT_URI &&
      requiredEnv.GOOGLE_SHARED_DRIVE_ID,
  );
}

function readStoredSession() {
  if (!fs.existsSync(sessionFile)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(sessionFile, "utf8"));
  } catch {
    return null;
  }
}

function writeStoredSession(payload) {
  fs.writeFileSync(sessionFile, JSON.stringify(payload, null, 2));
}

function clearStoredSession() {
  if (fs.existsSync(sessionFile)) {
    fs.unlinkSync(sessionFile);
  }
}

function signedStateCookie(value) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    signed: true,
    maxAge: 10 * 60 * 1000,
  };
}

function getAuthedClient() {
  const session = readStoredSession();
  if (!session?.tokens) {
    return null;
  }
  const auth = createOAuthClient();
  auth.setCredentials(session.tokens);
  return auth;
}

async function listCompanyFolders(auth) {
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.list({
    corpora: "drive",
    driveId: requiredEnv.GOOGLE_SHARED_DRIVE_ID,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: "files(id,name,createdTime)",
    pageSize: 100,
    orderBy: "name_natural",
  });

  const folders = response.data.files || [];

  const results = await Promise.all(
    folders.map(async (folder) => {
      const children = await drive.files.list({
        corpora: "drive",
        driveId: requiredEnv.GOOGLE_SHARED_DRIVE_ID,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        q: `'${folder.id}' in parents and trashed = false`,
        fields: "files(id,name,mimeType)",
        pageSize: 200,
      });

      const files = children.data.files || [];
      const onboardingForm =
        files.find(
          (file) =>
            file.mimeType === "application/vnd.google-apps.form" &&
            file.name?.toLowerCase().includes("onboarding"),
        ) || null;

      const auditForms = files.filter(
        (file) =>
          file.mimeType === "application/vnd.google-apps.form" &&
          !file.name?.toLowerCase().includes("onboarding"),
      );

      const responseSheet =
        files.find(
          (file) =>
            file.mimeType === "application/vnd.google-apps.spreadsheet" &&
            (file.name?.toLowerCase().includes("response") ||
              file.name?.toLowerCase().includes("audit responses") ||
              file.name?.toLowerCase().includes("data")),
        ) || null;

      return {
        id: folder.id,
        name: folder.name,
        linkedAt: folder.createdTime || "",
        onboardingFormName: onboardingForm?.name || "Onboarding Form",
        onboardingFormId: onboardingForm?.id || "",
        onboardingVerified: Boolean(onboardingForm),
        auditFormCount: auditForms.length,
        auditFormIds: auditForms.map((file) => file.id),
        auditFormsVerified: auditForms.length > 0,
        responseSheetName: responseSheet?.name || "Company Response Sheet",
        responseSheetId: responseSheet?.id || "",
        responseSheetVerified: Boolean(responseSheet),
      };
    }),
  );

  return results;
}

app.get("/api/google/status", async (_req, res) => {
  const session = readStoredSession();
  const authed = getAuthedClient();

  let companies = [];

  if (authed && envConfigured()) {
    try {
      companies = await listCompanyFolders(authed);
    } catch (error) {
      return res.status(500).json({
        ok: false,
        configured: true,
        connected: true,
        error: error instanceof Error ? error.message : "Unable to load Google Drive companies.",
      });
    }
  }

  res.json({
    ok: true,
    configured: envConfigured(),
    connected: Boolean(session?.tokens),
    sharedDriveId: requiredEnv.GOOGLE_SHARED_DRIVE_ID || "",
    companies,
  });
});

app.get("/auth/google/login", (req, res) => {
  if (!envConfigured()) {
    return res.status(400).send("Google OAuth environment variables are missing.");
  }

  const auth = createOAuthClient();
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("qms_google_state", state, signedStateCookie(state));

  const authUrl = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
  });

  res.redirect(authUrl);
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    const state = req.query.state;
    const code = req.query.code;

    if (!state || !code || typeof state !== "string" || typeof code !== "string") {
      return res.status(400).send("Missing Google callback parameters.");
    }

    const signedState = req.signedCookies.qms_google_state;
    if (!signedState || signedState !== state) {
      return res.status(400).send("Invalid OAuth state.");
    }

    const auth = createOAuthClient();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    let profile = null;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth });
      const response = await oauth2.userinfo.get();
      profile = response.data;
    } catch {
      profile = null;
    }

    writeStoredSession({
      tokens,
      profile,
      connectedAt: new Date().toISOString(),
    });

    res.clearCookie("qms_google_state");
    res.redirect("http://127.0.0.1:4173/?google=connected");
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Google OAuth callback failed.");
  }
});

app.post("/auth/google/logout", async (_req, res) => {
  const session = readStoredSession();
  if (session?.tokens?.access_token) {
    try {
      const auth = createOAuthClient();
      auth.setCredentials(session.tokens);
      await auth.revokeCredentials();
    } catch {
      // Ignore revoke errors in local dev.
    }
  }

  clearStoredSession();
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: envConfigured(),
    sharedDriveId: requiredEnv.GOOGLE_SHARED_DRIVE_ID || "",
  });
});

app.listen(port, () => {
  console.log(`QMS backend listening on http://127.0.0.1:${port}`);
});
