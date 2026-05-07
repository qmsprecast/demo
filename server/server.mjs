import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { google } from "googleapis";
import nodemailer from "nodemailer";

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
  GOOGLE_ONBOARDING_FORM_ID: process.env.GOOGLE_ONBOARDING_FORM_ID || "",
  GOOGLE_ONBOARDING_SHEET_ID: process.env.GOOGLE_ONBOARDING_SHEET_ID || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "qms-local-dev-secret",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: process.env.SMTP_PORT || "",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || "",
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || "QMS Precast",
};

const scopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
];

const APP_VERSION = (() => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    return String(packageJson.version || "0.0.0");
  } catch {
    return "0.0.0";
  }
})();

const CURRENT_SCHEMA_VERSION = "3.0.0";
const REQUIRED_TABS = ["Config", "Onboarding", "Users", "Schedule", "Actions", "ActionComments", "AuditResults", "AuditFindings", "Evidence", "Reports", "SyncLog", "Notes"];
const TAB_COLUMNS = {
  Config: ["Key", "Value", "Updated At"],
  Onboarding: [
    "Record ID",
    "Company ID",
    "Company Name",
    "Created At",
    "Updated At",
    "Created By",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
  Users: [
    "User ID",
    "Company ID",
    "Full Name",
    "Email",
    "Role",
    "Created At",
    "Updated At",
    "Created By",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
  Actions: [
    "Action ID",
    "Company ID",
    "Source Audit ID",
    "Source Audit Name",
    "Source Question ID",
    "Source Question Text",
    "Source Answer",
    "Non Conformance ID",
    "Severity",
    "Status",
    "Assigned To User ID",
    "Assigned To Name",
    "Created By User ID",
    "Created At",
    "Updated At",
    "Due Date",
    "Closed At",
    "Verified By User ID",
    "Verification Notes",
    "Evidence Links",
    "Local Evidence Refs",
    "Comments",
    "Recurrence Flag",
    "Root Cause",
    "Corrective Action",
    "Preventive Action",
    "Risk Category",
    "Requires Manager Review",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
    "Version Number",
    "Local Updated At",
    "Remote Updated At",
    "Last Synced At",
  ],
  ActionComments: [
    "Comment ID",
    "Action ID",
    "Company ID",
    "Changed At",
    "Changed By",
    "From Status",
    "To Status",
    "Note",
    "Evidence Ref",
    "Created At",
    "Updated At",
    "Created By",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
  Schedule: [
    "Root ID",
    "Schedule ID",
    "Version Number",
    "Version Label",
    "Lifecycle",
    "Company Folder ID",
    "Schedule Name",
    "Audit ID",
    "Audit Name",
    "Days",
    "Frequency",
    "Live Time",
    "Completion Hours",
    "Auditors",
    "Start Date",
    "End Date",
    "Updated At",
    "Parent Schedule ID",
    "Archived At",
    "Reactivated At",
    "Escalation User IDs",
    "Trigger Reaudit On Failure",
    "Reaudit Delay Hours",
    "Missed Audit Count",
    "Last Completed At",
    "Next Due At",
    "Health State",
    "Created By",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
  AuditResults: [
    "Result ID",
    "Audit ID",
    "Company ID",
    "Audit Name",
    "Completed By",
    "Completed At",
    "Status",
    "Total Risk Score",
    "Highest Risk Level",
    "Critical Findings Count",
    "High Findings Count",
    "Signature Ref",
    "Created At",
    "Updated At",
    "Created By",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
    "Version Number",
    "Local Updated At",
    "Remote Updated At",
    "Last Synced At",
  ],
  AuditFindings: [
    "Finding ID",
    "Result ID",
    "Audit ID",
    "Company ID",
    "Question ID",
    "Question Text",
    "Answer",
    "Risk Level",
    "Risk Category",
    "Auto Action Required",
    "Requires Photo Evidence",
    "Requires Manager Review",
    "Note",
    "Local Evidence Refs",
    "Created At",
    "Updated At",
    "Created By",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
  Evidence: [
    "Evidence ID",
    "Company ID",
    "Audit ID",
    "Action ID",
    "Finding ID",
    "File Name",
    "Mime Type",
    "Drive File ID",
    "Drive Link",
    "Local Ref",
    "Created At",
    "Updated At",
    "Created By",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
  Reports: [
    "Report ID",
    "Company ID",
    "Report Type",
    "Title",
    "Created By",
    "Created At",
    "Visible To",
    "Export Links",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
  SyncLog: [
    "Sync Item ID",
    "Company ID",
    "Entity Type",
    "Entity ID",
    "Operation",
    "Status",
    "Created At",
    "Attempted At",
    "Completed At",
    "Retry Count",
    "Priority",
    "Last Error",
    "Payload",
    "Schema Version",
  ],
  Notes: [
    "Note ID",
    "Company ID",
    "Context Type",
    "Context ID",
    "Note",
    "Created At",
    "Updated At",
    "Created By",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
};

const CONFIG_KEYS = [
  "schemaVersion",
  "companyId",
  "companyName",
  "createdAt",
  "lastValidatedAt",
  "lastRepairedAt",
  "appVersion",
];

const APPEND_ONLY_TABS = new Set(["ActionComments", "AuditResults", "AuditFindings", "Evidence", "Reports", "SyncLog"]);
const ID_COLUMNS = {
  Actions: "Action ID",
  ActionComments: "Comment ID",
  AuditResults: "Result ID",
  AuditFindings: "Finding ID",
  Evidence: "Evidence ID",
  Reports: "Report ID",
  Schedule: "Schedule ID",
  SyncLog: "Sync Item ID",
};

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

function sendCallbackPage(res, options) {
  const {
    title,
    message,
    success,
    redirectUrl = "http://127.0.0.1:4173/",
  } = options;

  res
    .status(success ? 200 : 500)
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta http-equiv="refresh" content="2;url=${redirectUrl}" />
    <style>
      body {
        margin: 0;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
      }
      .card {
        max-width: 460px;
        width: 100%;
        background: rgba(15, 23, 42, 0.86);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 24px;
        padding: 24px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.45);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
      }
      p {
        margin: 0;
        line-height: 1.6;
        color: #cbd5e1;
      }
      a {
        color: #93c5fd;
      }
      .pill {
        display: inline-block;
        margin-bottom: 16px;
        padding: 6px 12px;
        border-radius: 999px;
        background: ${success ? "rgba(16,185,129,0.14)" : "rgba(245,158,11,0.14)"};
        color: ${success ? "#6ee7b7" : "#fcd34d"};
        font-size: 12px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="pill">${success ? "Google connected" : "Connection issue"}</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <p style="margin-top:16px;"><a href="${redirectUrl}">Return to QMS Precast</a></p>
    </div>
  </body>
</html>`);
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

function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function emailConfigured() {
  return Boolean(
    requiredEnv.SMTP_HOST &&
      requiredEnv.SMTP_PORT &&
      requiredEnv.SMTP_USER &&
      requiredEnv.SMTP_PASS &&
      requiredEnv.SMTP_FROM_EMAIL,
  );
}

async function sendOnboardingInviteEmail({
  toEmail,
  inviteRole,
  invitedBy,
  onboardingFormUrl,
}) {
  if (!emailConfigured()) {
    throw new Error("SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.");
  }

  const port = Number(requiredEnv.SMTP_PORT);
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host: requiredEnv.SMTP_HOST,
    port,
    secure,
    auth: {
      user: requiredEnv.SMTP_USER,
      pass: requiredEnv.SMTP_PASS,
    },
  });

  const lineManagerRule =
    inviteRole === "Admin"
      ? "Line manager can be left blank for Admin users."
      : "Line manager should be provided where applicable.";
  const requiredFields = [
    "Full name",
    "Job title",
    "Site based",
    "Mobile number",
    "Role / job title",
    "Line manager",
    "Information correct confirmation (Yes/No)",
  ];

  const textBody = [
    `You have been invited to QMS Precast as ${inviteRole}.`,
    "",
    `Invited by: ${invitedBy}`,
    "",
    "Complete your onboarding form:",
    onboardingFormUrl,
    "",
    "The form will collect:",
    ...requiredFields.map((field) => `- ${field}`),
    "",
    lineManagerRule,
    "",
    "After submission, your details will populate the Users tab in the Company Master Sheet.",
  ].join("\n");

  const htmlBody = `
    <p>You have been invited to QMS Precast as <strong>${inviteRole}</strong>.</p>
    <p><strong>Invited by:</strong> ${invitedBy}</p>
    <p>Complete your onboarding form:</p>
    <p><a href="${onboardingFormUrl}">${onboardingFormUrl}</a></p>
    <p>The form will collect:</p>
    <ul>
      ${requiredFields.map((field) => `<li>${field}</li>`).join("")}
    </ul>
    <p>${lineManagerRule}</p>
    <p>After submission, your details will populate the Users tab in the Company Master Sheet.</p>
  `;

  const from = requiredEnv.SMTP_FROM_NAME
    ? `"${requiredEnv.SMTP_FROM_NAME}" <${requiredEnv.SMTP_FROM_EMAIL}>`
    : requiredEnv.SMTP_FROM_EMAIL;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `QMS Precast ${inviteRole} onboarding`,
    text: textBody,
    html: htmlBody,
  });
}

async function sendManagerNonComplianceAlertEmail({
  recipients,
  auditName,
  submittedBy,
  nonComplianceCount,
  queuedForSync,
}) {
  if (!emailConfigured()) {
    throw new Error("SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.");
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("At least one manager recipient is required.");
  }

  const port = Number(requiredEnv.SMTP_PORT);
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host: requiredEnv.SMTP_HOST,
    port,
    secure,
    auth: {
      user: requiredEnv.SMTP_USER,
      pass: requiredEnv.SMTP_PASS,
    },
  });

  const syncLine = queuedForSync
    ? "Submission status: queued offline and will sync once the device reconnects."
    : "Submission status: received and marked for sync.";

  const textBody = [
    "Manager alert: non-compliance submitted.",
    "",
    `Audit: ${auditName}`,
    `Submitted by: ${submittedBy}`,
    `Non-compliance items: ${nonComplianceCount}`,
    syncLine,
    "",
    "Please review and take any required management action.",
  ].join("\n");

  const htmlBody = `
    <p><strong>Manager alert:</strong> non-compliance submitted.</p>
    <p><strong>Audit:</strong> ${auditName}<br />
    <strong>Submitted by:</strong> ${submittedBy}<br />
    <strong>Non-compliance items:</strong> ${nonComplianceCount}<br />
    <strong>${syncLine}</strong></p>
    <p>Please review and take any required management action.</p>
  `;

  const from = requiredEnv.SMTP_FROM_NAME
    ? `"${requiredEnv.SMTP_FROM_NAME}" <${requiredEnv.SMTP_FROM_EMAIL}>`
    : requiredEnv.SMTP_FROM_EMAIL;

  await transporter.sendMail({
    from,
    to: recipients.join(", "),
    subject: `Manager alert: non-compliance in ${auditName}`,
    text: textBody,
    html: htmlBody,
  });
}

async function sendNcrEscalationEmail({
  toEmail,
  ncrReference,
  auditorName,
  site,
  raisedAt,
  auditQuestion,
  selectedAnswer,
  investigationLink,
}) {
  if (!emailConfigured()) {
    throw new Error("SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.");
  }
  const port = Number(requiredEnv.SMTP_PORT);
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host: requiredEnv.SMTP_HOST,
    port,
    secure,
    auth: {
      user: requiredEnv.SMTP_USER,
      pass: requiredEnv.SMTP_PASS,
    },
  });

  const subject = `[${ncrReference}] Non-Conformance Raised`;
  const textBody = [
    `${ncrReference} Non-Conformance Raised`,
    "",
    `NCR reference number: ${ncrReference}`,
    `Auditor name: ${auditorName}`,
    `Site: ${site}`,
    `Date and time raised: ${raisedAt}`,
    `Audit question: ${auditQuestion}`,
    `Selected answer: ${selectedAnswer}`,
    `Open NCR investigation form: ${investigationLink}`,
  ].join("\n");
  const htmlBody = `
    <p><strong>${ncrReference}</strong> Non-Conformance Raised</p>
    <p><strong>NCR reference number:</strong> ${ncrReference}<br />
    <strong>Auditor name:</strong> ${auditorName}<br />
    <strong>Site:</strong> ${site}<br />
    <strong>Date and time raised:</strong> ${raisedAt}<br />
    <strong>Audit question:</strong> ${auditQuestion}<br />
    <strong>Selected answer:</strong> ${selectedAnswer}</p>
    <p><a href="${investigationLink}">Open NCR investigation form</a></p>
  `;
  const from = requiredEnv.SMTP_FROM_NAME
    ? `"${requiredEnv.SMTP_FROM_NAME}" <${requiredEnv.SMTP_FROM_EMAIL}>`
    : requiredEnv.SMTP_FROM_EMAIL;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text: textBody,
    html: htmlBody,
  });
}

function pickValue(record, matchers) {
  const entries = Object.entries(record || {});

  for (const [key, value] of entries) {
    const normalizedKey = safeLower(key);
    if (!value) {
      continue;
    }

    if (matchers.some((matcher) => matcher(normalizedKey))) {
      return String(value).trim();
    }
  }

  return "";
}

function normalizeOnboardingRecord(row, index) {
  const companyName =
    pickValue(row, [
      (key) => key.includes("company name"),
      (key) => key.includes("organisation"),
      (key) => key.includes("organization"),
      (key) => key.includes("business name"),
      (key) => key === "company",
      (key) => key === "client",
    ]) || `Submission ${index + 1}`;

  return {
    id: `onboarding-${index + 1}`,
    submittedAt:
      pickValue(row, [(key) => key === "timestamp", (key) => key.includes("submitted")]) || "",
    companyName,
    siteName: pickValue(row, [
      (key) => key.includes("site name"),
      (key) => key === "site",
      (key) => key.includes("location"),
    ]),
    mainContact: pickValue(row, [
      (key) => key.includes("main contact"),
      (key) => key.includes("primary contact"),
      (key) => key === "contact name",
    ]),
    contactEmail: pickValue(row, [
      (key) => key.includes("contact email"),
      (key) => key === "email address",
      (key) => key === "email",
    ]),
    reportingContact: pickValue(row, [
      (key) => key.includes("reporting contact"),
      (key) => key.includes("manager"),
      (key) => key.includes("reports to"),
    ]),
    auditRecipients: pickValue(row, [
      (key) => key.includes("audit recipients"),
      (key) => key.includes("audit recipient"),
      (key) => key.includes("audit distribution"),
    ]),
    overdueAlertRecipients: pickValue(row, [
      (key) => key.includes("overdue alert"),
      (key) => key.includes("escalation"),
      (key) => key.includes("alert recipients"),
    ]),
    companyFolderReference: pickValue(row, [
      (key) => key.includes("folder"),
      (key) => key.includes("drive reference"),
      (key) => key.includes("company code"),
    ]),
    raw: row,
  };
}

async function discoverOnboardingSource(auth) {
  const drive = google.drive({ version: "v3", auth });
  const resolved = {
    formId: requiredEnv.GOOGLE_ONBOARDING_FORM_ID,
    formName: "QMS Company Onboarding Form",
    sheetId: requiredEnv.GOOGLE_ONBOARDING_SHEET_ID,
    sheetName: "QMS Company Onboarding Responses",
    configured: Boolean(requiredEnv.GOOGLE_ONBOARDING_FORM_ID || requiredEnv.GOOGLE_ONBOARDING_SHEET_ID),
  };

  if (resolved.formId && resolved.sheetId) {
    return resolved;
  }

  const masterControlSearch = await drive.files.list({
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: `'${requiredEnv.GOOGLE_SHARED_DRIVE_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 100,
    orderBy: "name_natural",
  });

  const masterControl =
    (masterControlSearch.data.files || []).find((file) => safeLower(file.name).includes("master control")) ||
    null;

  if (!masterControl) {
    return resolved;
  }

  const contents = await drive.files.list({
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: `'${masterControl.id}' in parents and trashed = false`,
    fields: "files(id,name,mimeType)",
    pageSize: 100,
  });

  const files = contents.data.files || [];
  const onboardingForm = files.find(
    (file) =>
      file.mimeType === "application/vnd.google-apps.form" &&
      safeLower(file.name).includes("onboarding"),
  );
  const onboardingSheet = files.find(
    (file) =>
      file.mimeType === "application/vnd.google-apps.spreadsheet" &&
      safeLower(file.name).includes("onboarding"),
  );

  return {
    formId: resolved.formId || onboardingForm?.id || "",
    formName: onboardingForm?.name || resolved.formName,
    sheetId: resolved.sheetId || onboardingSheet?.id || "",
    sheetName: onboardingSheet?.name || resolved.sheetName,
    configured: Boolean(resolved.formId || resolved.sheetId || onboardingForm || onboardingSheet),
  };
}

async function readOnboardingSubmissions(auth, onboardingSource) {
  if (!onboardingSource?.sheetId) {
    return {
      headers: [],
      records: [],
    };
  }

  const sheets = google.sheets({ version: "v4", auth });
  const workbook = await sheets.spreadsheets.get({
    spreadsheetId: onboardingSource.sheetId,
    fields: "sheets(properties(title))",
  });

  const firstTab = workbook.data.sheets?.[0]?.properties?.title;
  const range = firstTab ? `${firstTab}!A1:ZZ500` : "A1:ZZ500";
  const valuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: onboardingSource.sheetId,
    range,
  });

  const rows = valuesResponse.data.values || [];
  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((value, index) => String(value || `Column ${index + 1}`).trim());
  const records = rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row, index) => {
      const record = headers.reduce((accumulator, header, headerIndex) => {
        accumulator[header] = String(row[headerIndex] || "").trim();
        return accumulator;
      }, {});

      return normalizeOnboardingRecord(record, index);
    })
    .reverse();

  return {
    headers,
    records,
  };
}

async function listCompanyFolders(auth) {
  const drive = google.drive({ version: "v3", auth });
  let folders = [];

  try {
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
    folders = response.data.files || [];
  } catch (error) {
    const fallback = await drive.files.list({
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: `'${requiredEnv.GOOGLE_SHARED_DRIVE_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id,name,createdTime)",
      pageSize: 100,
      orderBy: "name_natural",
    });
    folders = fallback.data.files || [];

    if (folders.length === 0) {
      throw error;
    }
  }

  const results = await Promise.all(
    folders.map(async (folder) => {
      const children = await drive.files.list({
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

async function getDriveFile(auth, fileId) {
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.get({
    fileId,
    supportsAllDrives: true,
    fields: "id,name,mimeType,createdTime",
  });
  return response.data;
}

async function listFormsInFolder(auth, folderId) {
  const drive = google.drive({ version: "v3", auth });
  const folder = await getDriveFile(auth, folderId);

  if (folder.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("The provided Google Drive ID is not a folder.");
  }

  const response = await drive.files.list({
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType)",
    pageSize: 200,
  });

  return {
    folder,
    forms: (response.data.files || []).filter(
      (file) => file.mimeType === "application/vnd.google-apps.form",
    ),
  };
}

async function inspectCompanyFolder(auth, folderId) {
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  const folderResponse = await drive.files.get({
    fileId: folderId,
    supportsAllDrives: true,
    fields: "id,name,mimeType,createdTime",
  });

  const folder = folderResponse.data;
  if (folder.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("The provided Google Drive ID is not a folder.");
  }

  const childrenResponse = await drive.files.list({
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType)",
    pageSize: 200,
  });

  const children = childrenResponse.data.files || [];
  const normalizeFolderName = (value = "") =>
    safeLower(value)
      .replace(/^\d+\s*/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const findNamedFolder = (...names) => {
    const expected = names.map((name) => normalizeFolderName(name));
    return (
      children.find(
        (file) =>
          file.mimeType === "application/vnd.google-apps.folder" &&
          expected.includes(normalizeFolderName(file.name)),
      ) || null
    );
  };

  const auditFormsFolder = findNamedFolder("02 Audit Forms", "Audit Forms", "Audits", "Audit Form Folder");
  const masterDataFolder = findNamedFolder("03 Master Data Sheet", "Master Data Sheet", "Company Master Sheet", "Master Sheet");
  const evidenceFolder = findNamedFolder("04 Evidence", "Evidence", "Evidence Folder");
  const exportsFolder = findNamedFolder("05 Exports", "Exports", "Export Folder");
  const adminNotesFolder = findNamedFolder("06 Admin Notes", "Admin Notes", "Notes");

  let auditFolderContents = [];
  if (auditFormsFolder) {
    const response = await drive.files.list({
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: `'${auditFormsFolder.id}' in parents and trashed = false`,
      fields: "files(id,name,mimeType)",
      pageSize: 200,
    });
    auditFolderContents = response.data.files || [];
  }

  let masterDataContents = [];
  if (masterDataFolder) {
    const response = await drive.files.list({
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: `'${masterDataFolder.id}' in parents and trashed = false`,
      fields: "files(id,name,mimeType)",
      pageSize: 200,
    });
    masterDataContents = response.data.files || [];
  }

  const auditForms = auditFolderContents.filter(
    (file) => file.mimeType === "application/vnd.google-apps.form",
  );

  const masterSheet =
    masterDataContents.find(
      (file) => file.mimeType === "application/vnd.google-apps.spreadsheet",
    ) ||
    children.find(
      (file) => file.mimeType === "application/vnd.google-apps.spreadsheet",
    ) ||
    null;

  let masterSheetTabs = [];
  if (masterSheet?.id) {
    const workbook = await sheets.spreadsheets.get({
      spreadsheetId: masterSheet.id,
      fields: "sheets(properties(title))",
    });

    masterSheetTabs =
      workbook.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) || [];
  }

  return {
    ok: true,
    folder: {
      id: folder.id,
      name: folder.name,
      createdTime: folder.createdTime || "",
    },
    checks: {
      auditFormsFolder: Boolean(auditFormsFolder),
      masterDataFolder: Boolean(masterDataFolder),
      masterSheet: Boolean(masterSheet),
      evidenceFolder: Boolean(evidenceFolder),
      exportsFolder: Boolean(exportsFolder),
      adminNotesFolder: Boolean(adminNotesFolder),
    },
    auditFormsFolder: auditFormsFolder
      ? { id: auditFormsFolder.id, name: auditFormsFolder.name }
      : null,
    masterDataFolder: masterDataFolder
      ? { id: masterDataFolder.id, name: masterDataFolder.name }
      : null,
    masterSheet: masterSheet
      ? {
          id: masterSheet.id,
          name: masterSheet.name,
          tabs: masterSheetTabs,
        }
      : null,
    auditForms: auditForms.map((file) => ({
      id: file.id,
      name: file.name,
    })),
    blockingItems: [...(!masterSheet ? ["Company Master Sheet"] : [])],
    recommendedItems: [
      ...(!auditFormsFolder ? ["02 Audit Forms folder"] : []),
      ...(!masterDataFolder && masterSheet ? ["03 Master Data Sheet folder"] : []),
      ...(!evidenceFolder ? ["04 Evidence folder"] : []),
      ...(!exportsFolder ? ["05 Exports folder"] : []),
      ...(!adminNotesFolder ? ["06 Admin Notes folder"] : []),
    ],
    missingItems: [
      ...(!masterSheet ? ["Company Master Sheet"] : []),
      ...(!auditFormsFolder ? ["02 Audit Forms folder"] : []),
      ...(!masterDataFolder && masterSheet ? ["03 Master Data Sheet folder"] : []),
      ...(!evidenceFolder ? ["04 Evidence folder"] : []),
      ...(!exportsFolder ? ["05 Exports folder"] : []),
      ...(!adminNotesFolder ? ["06 Admin Notes folder"] : []),
    ],
  };
}

function rowsToRecords(values) {
  const rows = values || [];
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((value, index) => String(value || `Column ${index + 1}`).trim());
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) =>
      headers.reduce((accumulator, header, index) => {
        accumulator[header] = String(row[index] || "").trim();
        return accumulator;
      }, {}),
    );
}

function ensureSheetTab(workbook, tabName) {
  return workbook.data.sheets?.some((sheet) => safeLower(sheet.properties?.title) === safeLower(tabName));
}

function findSheetByTitle(workbook, tabName) {
  return workbook.data.sheets?.find((sheet) => safeLower(sheet.properties?.title) === safeLower(tabName));
}

function normalizeCellValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function toObjectArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

async function getWorkbook(auth, spreadsheetId) {
  const sheets = google.sheets({ version: "v4", auth });
  return sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties(title),sheets(properties(sheetId,title))",
  });
}

async function getTabValues(auth, spreadsheetId, tabName, range = "A1:ZZ5000") {
  const sheets = google.sheets({ version: "v4", auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!${range}`,
    });
    return response.data.values || [];
  } catch {
    return [];
  }
}

async function createBackupSheets(auth, spreadsheetId, tabNames) {
  const workbook = await getWorkbook(auth, spreadsheetId);
  const backupRequests = tabNames
    .map((tabName) => findSheetByTitle(workbook, tabName))
    .filter(Boolean)
    .map((sheet) => ({
      duplicateSheet: {
        sourceSheetId: sheet.properties.sheetId,
        newSheetName: `${sheet.properties.title} Backup ${new Date().toISOString().replace(/[:.]/g, "-")}`.slice(0, 90),
      },
    }));

  if (backupRequests.length === 0) {
    return [];
  }

  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: backupRequests },
  });

  return backupRequests.map((request) => request.duplicateSheet.newSheetName);
}

async function ensureTabExists(auth, spreadsheetId, tabName) {
  const workbook = await getWorkbook(auth, spreadsheetId);
  if (ensureSheetTab(workbook, tabName)) {
    return false;
  }

  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: tabName } } }],
    },
  });

  return true;
}

async function ensureColumns(auth, spreadsheetId, tabName, expectedHeaders) {
  await ensureTabExists(auth, spreadsheetId, tabName);

  const sheets = google.sheets({ version: "v4", auth });
  const rows = await getTabValues(auth, spreadsheetId, tabName);
  const existingHeaders = rows[0] || [];
  const missing = expectedHeaders.filter(
    (header) => !existingHeaders.some((existing) => safeLower(existing) === safeLower(header)),
  );

  if (rows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [expectedHeaders] },
    });
    return { addedColumns: [...expectedHeaders], headers: expectedHeaders };
  }

  if (missing.length === 0) {
    return { addedColumns: [], headers: existingHeaders };
  }

  const nextHeaders = [...existingHeaders, ...missing];
  const remainingRows = rows.slice(1).map((row) => {
    const padded = [...row];
    while (padded.length < nextHeaders.length) {
      padded.push("");
    }
    return padded;
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [nextHeaders, ...remainingRows] },
  });

  return { addedColumns: missing, headers: nextHeaders };
}

async function getConfig(auth, spreadsheetId) {
  await ensureColumns(auth, spreadsheetId, "Config", TAB_COLUMNS.Config);
  const rows = rowsToRecords(await getTabValues(auth, spreadsheetId, "Config"));
  return rows.reduce((accumulator, row) => {
    const key = String(row.Key || row.key || "").trim();
    if (!key) {
      return accumulator;
    }
    accumulator[key] = String(row.Value || row.value || "").trim();
    return accumulator;
  }, {});
}

async function updateConfig(auth, spreadsheetId, patch) {
  await ensureColumns(auth, spreadsheetId, "Config", TAB_COLUMNS.Config);
  const sheets = google.sheets({ version: "v4", auth });
  const existingRows = rowsToRecords(await getTabValues(auth, spreadsheetId, "Config"));
  const merged = existingRows.reduce((accumulator, row) => {
    const key = String(row.Key || row.key || "").trim();
    if (!key) {
      return accumulator;
    }
    accumulator[key] = String(row.Value || row.value || "").trim();
    return accumulator;
  }, {});

  Object.assign(merged, patch);

  const orderedKeys = Array.from(new Set([...CONFIG_KEYS, ...Object.keys(merged)]));
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Config!A:C",
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Config!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        TAB_COLUMNS.Config,
        ...orderedKeys.map((key) => [key, merged[key] || "", new Date().toISOString()]),
      ],
    },
  });

  return merged;
}

function mapRowObjectToHeaders(headers, rowObject) {
  return headers.map((header) => normalizeCellValue(rowObject?.[header] ?? ""));
}

async function appendRowObjects(auth, spreadsheetId, tabName, rowObjects) {
  const sanitizedRows = toObjectArray(rowObjects);
  if (sanitizedRows.length === 0) {
    return { ok: true, written: 0, skipped: 0 };
  }

  const headers = TAB_COLUMNS[tabName] || [];
  await ensureColumns(auth, spreadsheetId, tabName, headers);

  const idColumn = ID_COLUMNS[tabName];
  const existingRecords = rowsToRecords(await getTabValues(auth, spreadsheetId, tabName));
  const existingIds = new Set(
    idColumn ? existingRecords.map((record) => String(record[idColumn] || "").trim()).filter(Boolean) : [],
  );

  const uniqueRows = sanitizedRows.filter((row) => !idColumn || !existingIds.has(String(row[idColumn] || "").trim()));
  if (uniqueRows.length === 0) {
    return { ok: true, written: 0, skipped: sanitizedRows.length };
  }

  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: uniqueRows.map((row) => mapRowObjectToHeaders(headers, row)),
    },
  });

  return { ok: true, written: uniqueRows.length, skipped: sanitizedRows.length - uniqueRows.length };
}

async function updateRowById(auth, spreadsheetId, tabName, idColumn, id, patch) {
  const headers = TAB_COLUMNS[tabName] || [];
  await ensureColumns(auth, spreadsheetId, tabName, headers);

  const rows = await getTabValues(auth, spreadsheetId, tabName);
  const existingHeaders = rows[0] || headers;
  const idIndex = existingHeaders.findIndex((header) => safeLower(header) === safeLower(idColumn));
  const rowIndex = rows.findIndex((row, index) => index > 0 && String(row[idIndex] || "").trim() === id);

  const sheets = google.sheets({ version: "v4", auth });
  if (rowIndex === -1) {
    return appendRowObjects(auth, spreadsheetId, tabName, [{ [idColumn]: id, ...patch }]);
  }

  const currentRow = existingHeaders.reduce((accumulator, header, index) => {
    accumulator[header] = rows[rowIndex][index] || "";
    return accumulator;
  }, {});
  const nextRecord = { ...currentRow, ...patch };
  const nextRow = existingHeaders.map((header) => normalizeCellValue(nextRecord[header]));
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [nextRow] },
  });

  return { ok: true, updated: 1 };
}

async function writeSystemSyncLog(auth, spreadsheetId, entry) {
  try {
    await appendRowObjects(auth, spreadsheetId, "SyncLog", [entry]);
  } catch {
    return null;
  }
  return true;
}

async function ensureTabsAndColumns(auth, spreadsheetId, options = {}) {
  const { createBackup = false, companyId = "", companyName = "" } = options;
  let workbook = await getWorkbook(auth, spreadsheetId);
  const tabsAdded = [];
  const columnsAdded = {};
  const warnings = [];
  const errors = [];
  const tabsNeedingBackup = [];

  for (const tab of REQUIRED_TABS) {
    if (!ensureSheetTab(workbook, tab)) {
      tabsAdded.push(tab);
    } else {
      const rows = await getTabValues(auth, spreadsheetId, tab, "A1:ZZ2");
      const existingHeaders = rows[0] || [];
      const missing = (TAB_COLUMNS[tab] || []).filter(
        (header) => !existingHeaders.some((existing) => safeLower(existing) === safeLower(header)),
      );
      if (missing.length > 0) {
        columnsAdded[tab] = missing;
        tabsNeedingBackup.push(tab);
      }
    }
  }

  if (createBackup && tabsNeedingBackup.length > 0) {
    await createBackupSheets(auth, spreadsheetId, tabsNeedingBackup);
  }

  for (const tab of REQUIRED_TABS) {
    const added = await ensureTabExists(auth, spreadsheetId, tab);
    if (added) {
      workbook = await getWorkbook(auth, spreadsheetId);
    }
    const { addedColumns } = await ensureColumns(auth, spreadsheetId, tab, TAB_COLUMNS[tab] || []);
    if (addedColumns.length > 0) {
      columnsAdded[tab] = Array.from(new Set([...(columnsAdded[tab] || []), ...addedColumns]));
    }
  }

  const config = await getConfig(auth, spreadsheetId);
  await updateConfig(auth, spreadsheetId, {
    ...config,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    companyId: companyId || config.companyId || "",
    companyName: companyName || config.companyName || "",
    createdAt: config.createdAt || new Date().toISOString(),
    lastRepairedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  });

  await writeSystemSyncLog(auth, spreadsheetId, {
    "Sync Item ID": `workspace-repair-${Date.now()}`,
    "Company ID": companyId || config.companyId || "",
    "Entity Type": "workspace",
    "Entity ID": spreadsheetId,
    Operation: "Append",
    Status: "Synced",
    "Created At": new Date().toISOString(),
    "Attempted At": new Date().toISOString(),
    "Completed At": new Date().toISOString(),
    "Retry Count": 0,
    Priority: 100,
    "Last Error": "",
    Payload: JSON.stringify({ tabsAdded, columnsAdded }),
    "Schema Version": CURRENT_SCHEMA_VERSION,
  });

  return { ok: errors.length === 0, tabsAdded, columnsAdded, warnings, errors };
}

async function writeCompanySchedules(auth, spreadsheetId, companyFolderId, schedules) {
  const sheets = google.sheets({ version: "v4", auth });
  await ensureTabsAndColumns(auth, spreadsheetId, { companyId: companyFolderId });

  const headers = TAB_COLUMNS.Schedule;
  const existingRows = await getTabValues(auth, spreadsheetId, "Schedule");
  const existingRecords = rowsToRecords(existingRows);
  const existingDataRows = existingRows.length > 0 ? existingRows.slice(1) : [];
  const companyFolderIndex = headers.indexOf("Company Folder ID");
  const scheduleIdIndex = headers.indexOf("Schedule ID");
  const updatedAtIndex = headers.indexOf("Updated At");

  for (const row of existingDataRows) {
    if (String(row[companyFolderIndex] || "").trim() !== companyFolderId) {
      continue;
    }
    const remoteScheduleId = String(row[scheduleIdIndex] || "").trim();
    const remoteUpdatedAt = String(row[updatedAtIndex] || "").trim();
    const localSchedule = schedules.find((schedule) => schedule.id === remoteScheduleId);
    if (localSchedule?.updatedAt && remoteUpdatedAt && new Date(localSchedule.updatedAt).getTime() < new Date(remoteUpdatedAt).getTime()) {
      throw new Error(`Conflict: schedule ${localSchedule.scheduleName || remoteScheduleId} changed in Google Sheets while this tablet was offline.`);
    }
  }

  const keptRows = existingDataRows.filter((row) => String(row[companyFolderIndex] || "").trim() !== companyFolderId);
  const nextRows = schedules.flatMap((schedule) =>
    schedule.audits.map((audit) =>
      mapRowObjectToHeaders(headers, {
        "Root ID": schedule.rootId,
        "Schedule ID": schedule.id,
        "Version Number": schedule.versionNumber,
        "Version Label": schedule.versionLabel,
        Lifecycle: schedule.lifecycle,
        "Company Folder ID": schedule.companyFolderId,
        "Schedule Name": schedule.scheduleName,
        "Audit ID": audit.auditId,
        "Audit Name": audit.auditName,
        Days: (audit.days || []).join(", "),
        Frequency: audit.frequency,
        "Live Time": audit.liveTime,
        "Completion Hours": audit.completionHours,
        Auditors: (schedule.auditors || []).join(", "),
        "Start Date": schedule.startDate,
        "End Date": schedule.endDate,
        "Updated At": schedule.updatedAt,
        "Parent Schedule ID": schedule.parentScheduleId || schedule.rootId || "",
        "Archived At": schedule.archivedAt || "",
        "Reactivated At": schedule.reactivatedAt || "",
        "Escalation User IDs": (schedule.escalationUserIds || []).join(", "),
        "Trigger Reaudit On Failure": String(Boolean(schedule.triggerReauditOnFailure)),
        "Reaudit Delay Hours": schedule.reauditDelayHours || 0,
        "Missed Audit Count": schedule.missedAuditCount || 0,
        "Last Completed At": schedule.lastCompletedAt || "",
        "Next Due At": schedule.nextDueAt || "",
        "Health State": schedule.healthState || "",
        "Created By": schedule.createdBy || "",
        "Updated By": schedule.updatedBy || "",
        "Sync Status": schedule.syncStatus || "Pending",
        "Sync Attempts": schedule.syncAttempts || 0,
        "Last Sync Error": schedule.lastSyncError || "",
        "Remote Row ID": schedule.remoteRowId || "",
        "Schema Version": schedule.schemaVersion || CURRENT_SCHEMA_VERSION,
      }),
    ),
  );

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Schedule!A:ZZ",
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers, ...keptRows, ...nextRows],
    },
  });

  return { ok: true, written: nextRows.length, existing: existingRecords.length };
}

async function writeCompanyActions(auth, spreadsheetId, companyFolderId, actions) {
  const sheets = google.sheets({ version: "v4", auth });
  await ensureTabsAndColumns(auth, spreadsheetId, { companyId: companyFolderId });

  const headers = TAB_COLUMNS.Actions;
  const existingRows = await getTabValues(auth, spreadsheetId, "Actions");
  const existingDataRows = existingRows.length > 0 ? existingRows.slice(1) : [];
  const companyIndex = headers.indexOf("Company ID");
  const actionIdIndex = headers.indexOf("Action ID");
  const remoteUpdatedIndex = headers.indexOf("Updated At");

  for (const row of existingDataRows) {
    if (String(row[companyIndex] || "").trim() !== companyFolderId) {
      continue;
    }
    const remoteActionId = String(row[actionIdIndex] || "").trim();
    const remoteUpdatedAt = String(row[remoteUpdatedIndex] || "").trim();
    const localAction = actions.find((action) => action.id === remoteActionId);
    const localUpdatedAt = localAction?.updatedAt || localAction?.localUpdatedAt || localAction?.createdAt;
    if (localUpdatedAt && remoteUpdatedAt && new Date(localUpdatedAt).getTime() < new Date(remoteUpdatedAt).getTime()) {
      throw new Error(`Conflict: action ${remoteActionId} changed in Google Sheets while this tablet was offline.`);
    }
  }

  const keptRows = existingDataRows.filter((row) => String(row[companyIndex] || "").trim() !== companyFolderId);
  const nextRows = actions.map((action) =>
    mapRowObjectToHeaders(headers, {
      "Action ID": action.id,
      "Company ID": action.companyId,
      "Source Audit ID": action.auditId,
      "Source Audit Name": action.auditName,
      "Source Question ID": action.questionId,
      "Source Question Text": action.questionText,
      "Source Answer": action.sourceAnswer,
      "Non Conformance ID": action.nonConformanceId || "",
      Severity: action.severity,
      Status: action.status,
      "Assigned To User ID": action.assignedToUserId,
      "Assigned To Name": action.assignedToName,
      "Created By User ID": action.createdByUserId,
      "Created At": action.createdAt,
      "Updated At": action.updatedAt || action.localUpdatedAt || action.createdAt,
      "Due Date": action.dueDate,
      "Closed At": action.closedAt,
      "Verified By User ID": action.verifiedByUserId,
      "Verification Notes": action.verificationNotes,
      "Evidence Links": (action.evidenceLinks || []).join(", "),
      "Local Evidence Refs": (action.localEvidenceRefs || []).join(", "),
      Comments: action.comments,
      "Recurrence Flag": String(Boolean(action.recurrenceFlag)),
      "Root Cause": action.rootCause,
      "Corrective Action": action.correctiveAction,
      "Preventive Action": action.preventiveAction,
      "Risk Category": action.riskCategory,
      "Requires Manager Review": String(Boolean(action.requiresManagerReview)),
      "Sync Status": action.syncStatus || "Pending",
      "Sync Attempts": action.syncAttempts || 0,
      "Last Sync Error": action.lastSyncError || "",
      "Remote Row ID": action.remoteRowId || "",
      "Schema Version": action.schemaVersion || CURRENT_SCHEMA_VERSION,
      "Version Number": action.versionNumber || 1,
      "Local Updated At": action.localUpdatedAt || action.updatedAt || action.createdAt,
      "Remote Updated At": action.remoteUpdatedAt || "",
      "Last Synced At": action.lastSyncedAt || "",
    }),
  );

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Actions!A:ZZ",
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Actions!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers, ...keptRows, ...nextRows],
    },
  });

  return { ok: true, written: nextRows.length };
}

async function uploadDataUrlToDrive(auth, folderId, fileName, mimeType, dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return { id: "", link: "" };
  }

  const [, parsedMimeType, encoded] = match;
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: fileName || `evidence-${Date.now()}`,
      parents: [folderId],
      mimeType: mimeType || parsedMimeType,
    },
    media: {
      mimeType: mimeType || parsedMimeType,
      body: Buffer.from(encoded, "base64"),
    },
    fields: "id,webViewLink",
  });

  return {
    id: response.data.id || "",
    link: response.data.webViewLink || "",
  };
}

async function appendEvidenceRecords(auth, spreadsheetId, companyFolderId, evidenceRecords, evidenceFolderId = "") {
  const enrichedRecords = [];
  for (const record of toObjectArray(evidenceRecords)) {
    const nextRecord = { ...record };
    if (
      evidenceFolderId &&
      !nextRecord["Drive File ID"] &&
      typeof nextRecord["Local Ref"] === "string" &&
      nextRecord["Local Ref"].startsWith("data:")
    ) {
      const upload = await uploadDataUrlToDrive(
        auth,
        evidenceFolderId,
        nextRecord["File Name"] || `evidence-${nextRecord["Evidence ID"] || Date.now()}`,
        nextRecord["Mime Type"] || "",
        nextRecord["Local Ref"],
      );
      nextRecord["Drive File ID"] = upload.id;
      nextRecord["Drive Link"] = upload.link;
      nextRecord["Sync Status"] = "Synced";
      nextRecord["Remote Row ID"] = nextRecord["Remote Row ID"] || upload.id;
    }
    enrichedRecords.push(nextRecord);
  }

  const payload = await appendRowObjects(auth, spreadsheetId, "Evidence", enrichedRecords);
  await writeSystemSyncLog(auth, spreadsheetId, {
    "Sync Item ID": `evidence-sync-${Date.now()}`,
    "Company ID": companyFolderId,
    "Entity Type": "evidenceUpload",
    "Entity ID": companyFolderId,
    Operation: "UploadEvidence",
    Status: "Synced",
    "Created At": new Date().toISOString(),
    "Attempted At": new Date().toISOString(),
    "Completed At": new Date().toISOString(),
    "Retry Count": 0,
    Priority: 60,
    "Last Error": "",
    Payload: JSON.stringify({ count: enrichedRecords.length }),
    "Schema Version": CURRENT_SCHEMA_VERSION,
  });
  return { ...payload, records: enrichedRecords };
}

async function validateWorkspace(auth, input) {
  const { companyFolderId, sheetId, auditFormsFolderId, evidenceFolderId, exportsFolderId, adminNotesFolderId } = input;
  const validation = {
    ok: false,
    status: "Broken",
    schemaVersion: "",
    currentSchemaVersion: CURRENT_SCHEMA_VERSION,
    lastValidatedAt: "",
    lastRepairedAt: "",
    folders: {
      companyFolder: false,
      auditFormsFolder: false,
      evidenceFolder: false,
      exportsFolder: false,
      adminNotesFolder: false,
    },
    tabs: {},
    missingTabs: [],
    missingColumns: {},
    warnings: [],
    issues: [],
    repairableIssues: [],
    blockingIssues: [],
  };

  const folderChecks = [
    ["companyFolder", companyFolderId, "Company folder ID is missing or invalid.", true],
    ["auditFormsFolder", auditFormsFolderId, "The audit forms folder is missing or invalid.", false],
    ["evidenceFolder", evidenceFolderId, "The evidence folder is missing or invalid.", false],
    ["exportsFolder", exportsFolderId, "The exports folder is missing or invalid.", false],
    ["adminNotesFolder", adminNotesFolderId, "The admin notes folder is missing or invalid.", false],
  ];

  for (const [key, id, message, blocking] of folderChecks) {
    if (!id) {
      validation[blocking ? "blockingIssues" : "repairableIssues"].push(message);
      continue;
    }
    try {
      const file = await getDriveFile(auth, id);
      validation.folders[key] = file.mimeType === "application/vnd.google-apps.folder";
      if (!validation.folders[key]) {
        validation[blocking ? "blockingIssues" : "repairableIssues"].push(message);
      }
    } catch {
      validation[blocking ? "blockingIssues" : "repairableIssues"].push(message);
    }
  }

  if (!sheetId) {
    validation.blockingIssues.push("The Company Master Sheet link is missing.");
  } else {
    try {
      const payload = await readCompanySheetById(auth, sheetId);
      for (const tab of REQUIRED_TABS) {
        validation.tabs[tab] = payload.tabs.some((name) => safeLower(name) === safeLower(tab));
        if (!validation.tabs[tab]) {
          validation.missingTabs.push(tab);
          validation.repairableIssues.push(`The Company Master Sheet is missing the ${tab} tab.`);
        }
      }

      const config = await getConfig(auth, sheetId);
      validation.schemaVersion = config.schemaVersion || "";
      validation.lastValidatedAt = config.lastValidatedAt || "";
      validation.lastRepairedAt = config.lastRepairedAt || "";

      if (!validation.schemaVersion) {
        validation.repairableIssues.push("The Config tab does not store a schemaVersion yet.");
      } else if (validation.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        validation.warnings.push(`Schema version mismatch: found ${validation.schemaVersion}, expected ${CURRENT_SCHEMA_VERSION}.`);
        validation.repairableIssues.push("The Company Master Sheet schema version is behind the app version.");
      }

      for (const [tab, headers] of Object.entries(TAB_COLUMNS)) {
        const rows = await getTabValues(auth, sheetId, tab, "A1:ZZ2");
        const existingHeaders = rows[0] || [];
        const missing = headers.filter(
          (header) => !existingHeaders.some((existing) => safeLower(existing) === safeLower(header)),
        );
        if (missing.length > 0) {
          validation.missingColumns[tab] = missing;
          validation.repairableIssues.push(`The ${tab} tab is missing: ${missing.join(", ")}.`);
        }
      }

      try {
        const nextValidationStamp = new Date().toISOString();
        const updatedConfig = await updateConfig(auth, sheetId, {
          ...config,
          schemaVersion: config.schemaVersion || CURRENT_SCHEMA_VERSION,
          lastValidatedAt: nextValidationStamp,
          appVersion: APP_VERSION,
        });
        validation.lastValidatedAt = updatedConfig.lastValidatedAt || nextValidationStamp;
      } catch {
        validation.blockingIssues.push("The app can read this Company Master Sheet but cannot safely write validation metadata to Config.");
      }
    } catch (error) {
      validation.blockingIssues.push(
        error instanceof Error
          ? `The Company Master Sheet could not be read: ${error.message}`
          : "The Company Master Sheet could not be read.",
      );
    }
  }

  validation.issues = [
    ...validation.blockingIssues,
    ...validation.repairableIssues,
    ...validation.warnings,
  ];
  validation.status =
    validation.blockingIssues.length > 0
      ? "Broken"
      : validation.repairableIssues.length > 0 || validation.warnings.length > 0
        ? "Warning"
        : "Healthy";
  validation.ok = validation.status !== "Broken";
  return validation;
}

async function readCompanySheetById(auth, spreadsheetId) {
  const sheets = google.sheets({ version: "v4", auth });
  const workbook = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties(title),sheets(properties(title))",
  });

  const availableTabs = workbook.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) || [];
  const tabData = {};

  for (const tab of REQUIRED_TABS) {
    if (!availableTabs.some((name) => safeLower(name) === safeLower(tab))) {
      tabData[tab] = [];
      continue;
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A1:ZZ500`,
    });
    tabData[tab] = rowsToRecords(response.data.values || []);
  }

  return {
    ok: true,
    sheetId: spreadsheetId,
    sheetName: workbook.data.properties?.title || "Company Master Sheet",
    tabs: availableTabs,
    data: tabData,
  };
}

async function readCompanyMasterSheet(auth, folderId) {
  const inspection = await inspectCompanyFolder(auth, folderId);
  if (!inspection.masterSheet?.id) {
    throw new Error("The company folder does not contain a Company Master Sheet.");
  }
  return readCompanySheetById(auth, inspection.masterSheet.id);
}

app.get("/api/google/status", async (_req, res) => {
  const session = readStoredSession();
  const authed = getAuthedClient();

  let companies = [];
  let onboardingSource = {
    configured: false,
    formId: "",
    formName: "",
    sheetId: "",
    sheetName: "",
  };

  if (authed && envConfigured()) {
    try {
      companies = await listCompanyFolders(authed);
      onboardingSource = await discoverOnboardingSource(authed);
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
    onboardingSource,
  });
});

app.get("/api/onboarding/submissions", async (_req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before loading onboarding submissions.",
    });
  }

  try {
    const onboardingSource = await discoverOnboardingSource(authed);
    const submissions = await readOnboardingSubmissions(authed, onboardingSource);

    return res.json({
      ok: true,
      onboardingSource,
      headers: submissions.headers,
      records: submissions.records,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load onboarding submissions.",
    });
  }
});

app.get("/api/company-folder/:folderId", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before checking the company folder.",
    });
  }

  try {
    const inspection = await inspectCompanyFolder(authed, req.params.folderId);
    return res.json(inspection);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to inspect the company folder.",
    });
  }
});

app.get("/api/google-file/:fileId", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before checking Google Drive items.",
    });
  }

  try {
    const file = await getDriveFile(authed, req.params.fileId);
    return res.json({ ok: true, file });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load the Google Drive item.",
    });
  }
});

app.get("/api/google-forms-folder/:folderId", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before checking the audit forms folder.",
    });
  }

  try {
    const payload = await listFormsInFolder(authed, req.params.folderId);
    return res.json({
      ok: true,
      folder: payload.folder,
      forms: payload.forms,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load the audit forms folder.",
    });
  }
});

app.get("/api/company-sheet/:folderId", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before loading the company master sheet.",
    });
  }

  try {
    const payload = await readCompanyMasterSheet(authed, req.params.folderId);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to read the company master sheet.",
    });
  }
});

app.get("/api/google-sheet-by-id/:sheetId", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before loading the company master sheet.",
    });
  }

  try {
    const payload = await readCompanySheetById(authed, req.params.sheetId);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to read the company master sheet.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/schedules", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving schedules.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const schedules = Array.isArray(req.body?.schedules) ? req.body.schedules : [];

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving schedules.",
    });
  }

  try {
    const payload = await writeCompanySchedules(authed, req.params.sheetId, companyFolderId, schedules);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save schedules to the company master sheet.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/actions", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving actions.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving actions.",
    });
  }

  try {
    const payload = await writeCompanyActions(authed, req.params.sheetId, companyFolderId, actions);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save actions to the company master sheet.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/action-comments", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving action history.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const comments = toObjectArray(req.body?.comments);

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving action history.",
    });
  }

  try {
    const payload = await appendRowObjects(authed, req.params.sheetId, "ActionComments", comments);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save action history to the company master sheet.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/audit-results", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving audit results.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const results = toObjectArray(req.body?.results);

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving audit results.",
    });
  }

  try {
    const payload = await appendRowObjects(authed, req.params.sheetId, "AuditResults", results);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save audit results to the company master sheet.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/audit-findings", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving audit findings.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const findings = toObjectArray(req.body?.findings);

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving audit findings.",
    });
  }

  try {
    const payload = await appendRowObjects(authed, req.params.sheetId, "AuditFindings", findings);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save audit findings to the company master sheet.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/evidence", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving evidence.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const evidenceFolderId = String(req.body?.evidenceFolderId || "").trim();
  const evidence = toObjectArray(req.body?.evidence);

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving evidence.",
    });
  }

  try {
    const payload = await appendEvidenceRecords(authed, req.params.sheetId, companyFolderId, evidence, evidenceFolderId);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save evidence to the company workspace.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/sync-log", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving sync history.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const entries = toObjectArray(req.body?.entries);

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving sync history.",
    });
  }

  try {
    const payload = await appendRowObjects(authed, req.params.sheetId, "SyncLog", entries);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save sync history to the company master sheet.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/audit-bundle", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before syncing audits.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const evidenceFolderId = String(req.body?.evidenceFolderId || "").trim();

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before syncing audits.",
    });
  }

  try {
    const results = await appendRowObjects(authed, req.params.sheetId, "AuditResults", toObjectArray(req.body?.results));
    const findings = await appendRowObjects(authed, req.params.sheetId, "AuditFindings", toObjectArray(req.body?.findings));
    const evidence = await appendEvidenceRecords(authed, req.params.sheetId, companyFolderId, toObjectArray(req.body?.evidence), evidenceFolderId);
    const actionComments = await appendRowObjects(authed, req.params.sheetId, "ActionComments", toObjectArray(req.body?.actionComments));
    const syncLogs = await appendRowObjects(authed, req.params.sheetId, "SyncLog", toObjectArray(req.body?.syncLogs));
    return res.json({ ok: true, results, findings, evidence, actionComments, syncLogs });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to sync the audit bundle to Google.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/validate", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before validating the workspace.",
    });
  }

  try {
    const payload = await validateWorkspace(authed, {
      companyFolderId: String(req.body?.companyFolderId || "").trim(),
      sheetId: req.params.sheetId,
      auditFormsFolderId: String(req.body?.auditFormsFolderId || "").trim(),
      evidenceFolderId: String(req.body?.evidenceFolderId || "").trim(),
      exportsFolderId: String(req.body?.exportsFolderId || "").trim(),
      adminNotesFolderId: String(req.body?.adminNotesFolderId || "").trim(),
    });
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to validate the workspace.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/repair", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before repairing the workspace.",
    });
  }

  try {
    const repair = await ensureTabsAndColumns(authed, req.params.sheetId, {
      createBackup: true,
      companyId: String(req.body?.companyFolderId || "").trim(),
      companyName: String(req.body?.companyName || "").trim(),
    });
    const validation = await validateWorkspace(authed, {
      companyFolderId: String(req.body?.companyFolderId || "").trim(),
      sheetId: req.params.sheetId,
      auditFormsFolderId: String(req.body?.auditFormsFolderId || "").trim(),
      evidenceFolderId: String(req.body?.evidenceFolderId || "").trim(),
      exportsFolderId: String(req.body?.exportsFolderId || "").trim(),
      adminNotesFolderId: String(req.body?.adminNotesFolderId || "").trim(),
    });
    return res.json({ ok: true, repair, validation });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to repair the workspace.",
    });
  }
});

app.post("/api/onboarding/invite", async (req, res) => {
  const toEmail = String(req.body?.email || "").trim().toLowerCase();
  const inviteRole = String(req.body?.role || "").trim();
  const invitedBy = String(req.body?.invitedBy || "QMS Precast").trim();
  const onboardingFormId = String(req.body?.onboardingFormId || "").trim();

  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ ok: false, error: "A valid email address is required." });
  }
  if (!inviteRole) {
    return res.status(400).json({ ok: false, error: "Invite role is required." });
  }
  if (!onboardingFormId) {
    return res.status(400).json({ ok: false, error: "Onboarding form is not configured." });
  }

  try {
    const onboardingFormUrl = `https://docs.google.com/forms/d/${onboardingFormId}/viewform`;
    await sendOnboardingInviteEmail({
      toEmail,
      inviteRole,
      invitedBy,
      onboardingFormUrl,
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to send onboarding invite email.",
    });
  }
});

app.post("/api/manager/non-compliance-alert", async (req, res) => {
  const recipients = Array.isArray(req.body?.emails)
    ? req.body.emails.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
    : [];
  const auditName = String(req.body?.auditName || "").trim();
  const submittedBy = String(req.body?.submittedBy || "Unknown").trim();
  const nonComplianceCount = Number(req.body?.nonComplianceCount || 0);
  const queuedForSync = Boolean(req.body?.queuedForSync);

  if (recipients.length === 0) {
    return res.status(400).json({ ok: false, error: "At least one manager email is required." });
  }
  if (!auditName) {
    return res.status(400).json({ ok: false, error: "Audit name is required." });
  }
  if (!Number.isFinite(nonComplianceCount) || nonComplianceCount <= 0) {
    return res.status(400).json({ ok: false, error: "nonComplianceCount must be greater than zero." });
  }

  try {
    await sendManagerNonComplianceAlertEmail({
      recipients,
      auditName,
      submittedBy,
      nonComplianceCount,
      queuedForSync,
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to send manager alert email.",
    });
  }
});

app.post("/api/ncr/escalation-alert", async (req, res) => {
  const toEmail = String(req.body?.email || "").trim().toLowerCase();
  const ncrReference = String(req.body?.ncrReference || "").trim();
  const auditorName = String(req.body?.auditorName || "Unknown").trim();
  const site = String(req.body?.site || "Unknown").trim();
  const raisedAt = String(req.body?.raisedAt || "").trim();
  const auditQuestion = String(req.body?.auditQuestion || "").trim();
  const selectedAnswer = String(req.body?.selectedAnswer || "").trim();
  const investigationLink = String(req.body?.investigationLink || "").trim();

  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ ok: false, error: "A valid manager email is required." });
  }
  if (!ncrReference || !auditQuestion || !raisedAt || !investigationLink) {
    return res.status(400).json({ ok: false, error: "Missing required NCR escalation details." });
  }

  try {
    await sendNcrEscalationEmail({
      toEmail,
      ncrReference,
      auditorName,
      site,
      raisedAt,
      auditQuestion,
      selectedAnswer,
      investigationLink,
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to send NCR escalation email.",
    });
  }
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
    const localDevBypass =
      process.env.ALLOW_INSECURE_OAUTH_STATE === "true" ||
      process.env.NODE_ENV !== "production";

    if ((!signedState || signedState !== state) && !localDevBypass) {
      return sendCallbackPage(res, {
        title: "Google connection could not be completed",
        message: "The sign-in state could not be verified. Please start the connection again from QMS Precast.",
        success: false,
      });
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
    return sendCallbackPage(res, {
      title: "Google connection completed",
      message: "Your Google Drive root folder is now linked. Returning to QMS Precast now.",
      success: true,
      redirectUrl: "http://127.0.0.1:4173/?google=connected",
    });
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return sendCallbackPage(res, {
      title: "Google connection failed",
      message: error instanceof Error ? error.message : "Google OAuth callback failed.",
      success: false,
    });
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
