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
  FRONTEND_URL: process.env.FRONTEND_URL || "http://127.0.0.1:5180",
  SESSION_SECRET: process.env.SESSION_SECRET || "qms-local-dev-secret",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: process.env.SMTP_PORT || "",
  SMTP_SECURE: process.env.SMTP_SECURE || "false",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || "",
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || process.env.APP_BRAND_NAME || "BERT",
};
const APP_BRAND_NAME = (process.env.APP_BRAND_NAME || "BERT — Business Evaluation & Review Tool").trim();
const ONBOARDING_INVITE_TTL_MS = Math.max(
  60 * 60 * 1000,
  Number(process.env.ONBOARDING_INVITE_TTL_MS || String(7 * 24 * 60 * 60 * 1000)),
);
const INVITE_STORE_PATH = path.join(sessionDir, "app-onboarding-invites.json");

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
const REQUIRED_TABS = ["Config", "Onboarding", "Users", "Schedule", "Actions", "ActionComments", "AuditResults", "AuditFindings", "Evidence", "Incidents", "IncidentActions", "Reports", "SyncLog", "Notes"];
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
  Incidents: [
    "Incident Record ID",
    "Incident ID",
    "Company ID",
    "Status",
    "Priority",
    "Incident Type",
    "Severity",
    "Incident Date",
    "Incident Time",
    "Reporter Name",
    "Reporter Email",
    "Department / Area",
    "Location",
    "Description",
    "Immediate Action",
    "Injured",
    "Injury Details",
    "Contributing Factors",
    "Witnesses",
    "Evidence Links",
    "Assigned To",
    "Investigation Notes",
    "Root Cause",
    "Corrective Actions",
    "Preventive Actions",
    "Action Owner",
    "Due Date",
    "Completion Date",
    "RIDDOR Required",
    "Closed By",
    "Closed At",
    "Notification Status",
    "Status History",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Sync Status",
    "Sync Attempts",
    "Last Sync Error",
    "Remote Row ID",
    "Schema Version",
  ],
  IncidentActions: [
    "Action ID",
    "Incident Record ID",
    "Incident ID",
    "Company ID",
    "Description",
    "Owner",
    "Due Date",
    "Status",
    "Completed At",
    "Completed By",
    "Created At",
    "Created By",
    "Updated At",
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
  Incidents: "Incident Record ID",
  IncidentActions: "Action ID",
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
        background: ${success ? "rgba(29,78,216,0.18)" : "rgba(245,158,11,0.14)"};
        color: ${success ? "#93c5fd" : "#fcd34d"};
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
      <p style="margin-top:16px;"><a href="${redirectUrl}">Return to ${APP_BRAND_NAME}</a></p>
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

function buildOnboardingFormViewUrl(formId) {
  const clean = String(formId || "").trim();
  if (!clean) return "";
  if (clean.startsWith("1FAIpQL")) {
    return `https://docs.google.com/forms/d/e/${clean}/viewform`;
  }
  return `https://docs.google.com/forms/d/${clean}/viewform`;
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

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function smtpConfigSummary() {
  const port = Number(requiredEnv.SMTP_PORT || 0);
  const secure = parseBooleanEnv(requiredEnv.SMTP_SECURE, port === 465);
  return {
    host: requiredEnv.SMTP_HOST || "",
    port,
    secure,
    user: requiredEnv.SMTP_USER || "",
    from: requiredEnv.SMTP_FROM_EMAIL || "",
  };
}

function smtpCredentialDiagnostics() {
  const pass = String(requiredEnv.SMTP_PASS || "");
  return {
    passwordProvided: pass.length > 0,
    passwordLength: pass.length,
    userLooksEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requiredEnv.SMTP_USER || ""),
    fromLooksEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requiredEnv.SMTP_FROM_EMAIL || ""),
    userMatchesFrom:
      safeLower(requiredEnv.SMTP_USER || "") === safeLower(requiredEnv.SMTP_FROM_EMAIL || ""),
  };
}

function createSmtpTransport() {
  const config = smtpConfigSummary();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.port === 587,
    auth: {
      user: requiredEnv.SMTP_USER,
      pass: requiredEnv.SMTP_PASS,
    },
  });
}

let smtpVerificationState = {
  checkedAt: "",
  ok: false,
  error: "Not checked",
};

async function verifySmtpTransport() {
  if (!emailConfigured()) {
    smtpVerificationState = {
      checkedAt: new Date().toISOString(),
      ok: false,
      error: "SMTP is not configured.",
    };
    return smtpVerificationState;
  }
  try {
    const transporter = createSmtpTransport();
    await transporter.verify();
    smtpVerificationState = {
      checkedAt: new Date().toISOString(),
      ok: true,
      error: "",
    };
  } catch (error) {
    smtpVerificationState = {
      checkedAt: new Date().toISOString(),
      ok: false,
      error: error instanceof Error ? error.message : "SMTP verification failed.",
    };
  }
  return smtpVerificationState;
}

function buildOnboardingInviteMailto({ toEmail, inviteRole, invitedBy, onboardingFormUrl }) {
  const subject = `${APP_BRAND_NAME} ${inviteRole} onboarding`;
  const body = [
    `You have been invited to ${APP_BRAND_NAME} as ${inviteRole}.`,
    "",
    `Invited by: ${invitedBy}`,
    "",
    "Complete your onboarding form:",
    onboardingFormUrl,
  ].join("\n");
  return `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  const transporter = createSmtpTransport();

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
    `You have been invited to ${APP_BRAND_NAME} as ${inviteRole}.`,
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
    <p>You have been invited to ${APP_BRAND_NAME} as <strong>${inviteRole}</strong>.</p>
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
    subject: `${APP_BRAND_NAME} ${inviteRole} onboarding`,
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

  const transporter = createSmtpTransport();

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
  const transporter = createSmtpTransport();

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

async function sendIncidentReportEmail({
  incidentId,
  incidentType,
  severity,
  reporter,
  department,
  location,
  status,
  incidentDate,
  incidentTime,
  priority,
  escalated,
  viewLink,
}) {
  if (!emailConfigured()) {
    throw new Error("SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.");
  }
  const transporter = createSmtpTransport();
  const to = "andy@qmsprecast.co.uk";
  const subject = `New Incident Report - ${incidentId}${escalated ? " [ESCALATED]" : ""}`;
  const lines = [
    "A new accident / near miss report has been submitted.",
    "",
    `Incident Number: ${incidentId}`,
    `Incident Type: ${incidentType}`,
    `Severity: ${severity}`,
    `Reporter: ${reporter}`,
    `Department / Area: ${department}`,
    `Location: ${location}`,
    `Status: ${status}`,
    `Date and Time: ${incidentDate} ${incidentTime || ""}`.trim(),
    `Priority: ${priority}`,
    viewLink ? `View link: ${viewLink}` : "",
    "",
    escalated
      ? "Escalation: High severity incident. Immediate management review required."
      : "Escalation: Not required.",
  ].filter(Boolean);
  const textBody = lines.join("\n");
  const htmlBody = `
    <p>A new accident / near miss report has been submitted.</p>
    <p>
      <strong>Incident Number:</strong> ${incidentId}<br/>
      <strong>Incident Type:</strong> ${incidentType}<br/>
      <strong>Severity:</strong> ${severity}<br/>
      <strong>Reporter:</strong> ${reporter}<br/>
      <strong>Department / Area:</strong> ${department}<br/>
      <strong>Location:</strong> ${location}<br/>
      <strong>Status:</strong> ${status}<br/>
      <strong>Date and Time:</strong> ${incidentDate} ${incidentTime || ""}<br/>
      <strong>Priority:</strong> ${priority}
    </p>
    ${viewLink ? `<p><a href="${viewLink}">Open incident in app</a></p>` : ""}
    <p>${escalated ? "<strong>Escalation:</strong> High severity incident. Immediate management review required." : "Escalation: Not required."}</p>
  `;
  const from = requiredEnv.SMTP_FROM_NAME
    ? `"${requiredEnv.SMTP_FROM_NAME}" <${requiredEnv.SMTP_FROM_EMAIL}>`
    : requiredEnv.SMTP_FROM_EMAIL;
  await transporter.sendMail({
    from,
    to,
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
    const fallbackSearch = await drive.files.list({
      corpora: "drive",
      driveId: requiredEnv.GOOGLE_SHARED_DRIVE_ID,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: "trashed = false and (mimeType = 'application/vnd.google-apps.form' or mimeType = 'application/vnd.google-apps.spreadsheet')",
      fields: "files(id,name,mimeType)",
      pageSize: 200,
      orderBy: "name_natural",
    });
    const fallbackFiles = fallbackSearch.data.files || [];
    const onboardingForm = fallbackFiles.find(
      (file) =>
        file.mimeType === "application/vnd.google-apps.form" &&
        safeLower(file.name).includes("onboarding"),
    );
    const onboardingSheet = fallbackFiles.find(
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

function readInviteStore() {
  try {
    const raw = fs.readFileSync(INVITE_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeInviteStore(store) {
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  fs.writeFileSync(INVITE_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function createInviteRecord(payload) {
  const store = readInviteStore();
  const id = crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  const record = {
    ...payload,
    createdAt: now,
    expiresAt: now + ONBOARDING_INVITE_TTL_MS,
    consumedAt: null,
  };
  store[id] = record;
  writeInviteStore(store);
  return { id, record };
}

function getInviteRecord(id) {
  const store = readInviteStore();
  return store[id] || null;
}

function markInviteConsumed(id) {
  const store = readInviteStore();
  if (!store[id]) {
    return false;
  }
  store[id] = { ...store[id], consumedAt: Date.now() };
  writeInviteStore(store);
  return true;
}

function buildAppOnboardingUrl(tokenId) {
  const base = requiredEnv.FRONTEND_URL.replace(/\/$/, "");
  return `${base}/?invite=${encodeURIComponent(tokenId)}`;
}

function buildAppOnboardingInviteMailto({ toEmail, subjectLine, invitedBy, onboardingUrl }) {
  const body = [
    `You have been invited to complete ${APP_BRAND_NAME} onboarding.`,
    "",
    `Invited by: ${invitedBy}`,
    "",
    "Open this link to finish setup in the app:",
    onboardingUrl,
  ].join("\n");
  return `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
}

async function sendAppHostedOnboardingEmail({ toEmail, subjectLine, invitedBy, onboardingUrl, htmlIntro }) {
  if (!emailConfigured()) {
    throw new Error("SMTP is not configured.");
  }
  const transporter = createSmtpTransport();
  const from = requiredEnv.SMTP_FROM_NAME
    ? `"${requiredEnv.SMTP_FROM_NAME}" <${requiredEnv.SMTP_FROM_EMAIL}>`
    : requiredEnv.SMTP_FROM_EMAIL;
  const textBody = [
    `You have been invited to complete ${APP_BRAND_NAME} onboarding.`,
    "",
    `Invited by: ${invitedBy}`,
    "",
    "Open this link to finish setup in the app:",
    onboardingUrl,
  ].join("\n");
  const htmlBody = `
    <p>${htmlIntro}</p>
    <p><strong>Invited by:</strong> ${invitedBy}</p>
    <p><a href="${onboardingUrl}">Complete onboarding in ${APP_BRAND_NAME}</a></p>
    <p style="word-break:break-all;font-size:12px;color:#64748b;">${onboardingUrl}</p>
  `;
  await transporter.sendMail({
    from,
    to: toEmail,
    subject: subjectLine,
    text: textBody,
    html: htmlBody,
  });
}

async function createDriveFolder(auth, name, parentId) {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id,name",
  });
  return res.data;
}

async function createBlankSpreadsheet(auth, name, parentId) {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [parentId],
    },
    fields: "id,name",
  });
  return res.data;
}

async function provisionNewCompanyWorkspace(auth, { companyName, adminEmail, adminFullName, password }) {
  if (!requiredEnv.GOOGLE_SHARED_DRIVE_ID) {
    throw new Error("GOOGLE_SHARED_DRIVE_ID is not configured on the server.");
  }
  const safeName = String(companyName || "New company")
    .trim()
    .slice(0, 120);
  const root = await createDriveFolder(auth, safeName, requiredEnv.GOOGLE_SHARED_DRIVE_ID);
  const auditForms = await createDriveFolder(auth, "02 Audit Forms", root.id);
  const masterData = await createDriveFolder(auth, "03 Master Data Sheet", root.id);
  await createDriveFolder(auth, "04 Evidence", root.id);
  await createDriveFolder(auth, "05 Exports", root.id);
  await createDriveFolder(auth, "06 Admin Notes", root.id);
  const masterSheet = await createBlankSpreadsheet(auth, "Company Master Sheet", masterData.id);
  await ensureTabsAndColumns(auth, masterSheet.id, {
    companyId: root.id,
    companyName: safeName,
  });
  const userId = `app-${String(adminEmail || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")}`;
  await writeCompanyUsers(auth, masterSheet.id, root.id, [
    {
      id: userId,
      email: adminEmail,
      role: "Admin",
      name: adminFullName || adminEmail,
      invitedBy: APP_BRAND_NAME,
      senderEmail: "",
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "Synced",
    },
  ]);
  const authKey = `UserAuth.${String(adminEmail || "").toLowerCase()}`;
  await updateConfig(auth, masterSheet.id, {
    ...(await getConfig(auth, masterSheet.id)),
    [authKey]: password,
  });
  return {
    companyFolderId: root.id,
    companyFolderName: root.name,
    masterSheetId: masterSheet.id,
    auditFormsFolderId: auditForms.id,
    masterDataFolderId: masterData.id,
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

async function writeCompanyUsers(auth, spreadsheetId, companyFolderId, users) {
  await ensureTabsAndColumns(auth, spreadsheetId, { companyId: companyFolderId });
  const rows = toObjectArray(users);
  const timestamp = new Date().toISOString();
  let written = 0;

  for (const user of rows) {
    const email = String(user.email || user.Email || "").trim().toLowerCase();
    const role = String(user.role || user.Role || "").trim();
    if (!email || !role) {
      continue;
    }

    const userId =
      String(user.id || user["User ID"] || "").trim() ||
      `invite-${email.replace(/[^a-z0-9]+/gi, "-")}-${role.toLowerCase()}`;
    const fullName = String(user.name || user["Full Name"] || email).trim() || email;
    const createdBy = String(user.invitedBy || user["Created By"] || APP_BRAND_NAME).trim() || APP_BRAND_NAME;
    const senderEmail = String(user.senderEmail || user["Updated By"] || "").trim();
    const createdAt = String(user.sentAt || user["Created At"] || timestamp).trim() || timestamp;
    const updatedAt = String(user.updatedAt || user["Updated At"] || timestamp).trim() || timestamp;

    await updateRowById(auth, spreadsheetId, "Users", "User ID", userId, {
      "Company ID": companyFolderId,
      "Full Name": fullName,
      Email: email,
      Role: role,
      "Created At": createdAt,
      "Updated At": updatedAt,
      "Created By": createdBy,
      "Updated By": senderEmail || createdBy,
      "Sync Status": String(user.syncStatus || "Synced"),
      "Sync Attempts": Number(user.syncAttempts || 0),
      "Last Sync Error": String(user.lastSyncError || ""),
      "Remote Row ID": String(user.remoteRowId || ""),
      "Schema Version": String(user.schemaVersion || CURRENT_SCHEMA_VERSION),
    });
    written += 1;
  }

  return { ok: true, written };
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
    configured: Boolean(requiredEnv.GOOGLE_ONBOARDING_FORM_ID || requiredEnv.GOOGLE_ONBOARDING_SHEET_ID),
    formId: requiredEnv.GOOGLE_ONBOARDING_FORM_ID || "",
    formName: requiredEnv.GOOGLE_ONBOARDING_FORM_ID ? "QMS Company Onboarding Form" : "",
    sheetId: requiredEnv.GOOGLE_ONBOARDING_SHEET_ID || "",
    sheetName: requiredEnv.GOOGLE_ONBOARDING_SHEET_ID ? "QMS Company Onboarding Responses" : "",
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

app.post("/api/google-sheet-by-id/:sheetId/users", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving users.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const users = toObjectArray(req.body?.users);

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving users.",
    });
  }

  try {
    const payload = await writeCompanyUsers(authed, req.params.sheetId, companyFolderId, users);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save users to the company master sheet.",
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

app.post("/api/google-sheet-by-id/:sheetId/incidents", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving incidents.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const incidents = toObjectArray(req.body?.incidents);

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving incidents.",
    });
  }

  try {
    const payload = await appendRowObjects(authed, req.params.sheetId, "Incidents", incidents);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save incidents to the company master sheet.",
    });
  }
});

app.post("/api/google-sheet-by-id/:sheetId/incident-actions", async (req, res) => {
  const authed = getAuthedClient();

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required before saving incident actions.",
    });
  }

  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const incidentActions = toObjectArray(req.body?.incidentActions);

  if (!companyFolderId) {
    return res.status(400).json({
      ok: false,
      error: "Company folder ID is required before saving incident actions.",
    });
  }

  try {
    const payload = await appendRowObjects(authed, req.params.sheetId, "IncidentActions", incidentActions);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save incident actions to the company master sheet.",
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
  const invitedBy = String(req.body?.invitedBy || APP_BRAND_NAME).trim();
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
    const onboardingFormUrl = buildOnboardingFormViewUrl(onboardingFormId);
    const manualFallback = () => ({
      ok: true,
      delivery: "manual",
      senderEmail: requiredEnv.SMTP_FROM_EMAIL || "",
      onboardingUrl: onboardingFormUrl,
      mailtoUrl: buildOnboardingInviteMailto({
        toEmail,
        inviteRole,
        invitedBy,
        onboardingFormUrl,
      }),
    });
    if (!emailConfigured()) {
      return res.json(manualFallback());
    }
    await sendOnboardingInviteEmail({
      toEmail,
      inviteRole,
      invitedBy,
      onboardingFormUrl,
    });

    return res.json({ ok: true, delivery: "smtp", senderEmail: requiredEnv.SMTP_FROM_EMAIL || "" });
  } catch (error) {
    console.warn("[smtp] invite send failed; using manual fallback", {
      ...smtpConfigSummary(),
      ...smtpCredentialDiagnostics(),
      error: error instanceof Error ? error.message : "Unable to send onboarding invite email.",
    });
    const onboardingFormUrl = buildOnboardingFormViewUrl(onboardingFormId);
    return res.json({
      ok: true,
      delivery: "manual",
      senderEmail: requiredEnv.SMTP_FROM_EMAIL || "",
      onboardingUrl: onboardingFormUrl,
      mailtoUrl: buildOnboardingInviteMailto({
        toEmail,
        inviteRole,
        invitedBy,
        onboardingFormUrl,
      }),
    });
  }
});

app.post("/api/onboarding/app-invites/new-company", async (req, res) => {
  const toEmail = String(req.body?.email || "").trim().toLowerCase();
  const invitedBy = String(req.body?.invitedBy || APP_BRAND_NAME).trim();

  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ ok: false, error: "A valid email address is required." });
  }

  try {
    const { id } = createInviteRecord({
      kind: "new_company",
      email: toEmail,
      invitedBy,
    });
    const onboardingUrl = buildAppOnboardingUrl(id);
    const subjectLine = `${APP_BRAND_NAME} — set up your company workspace`;
    const manual = () =>
      res.json({
        ok: true,
        delivery: "manual",
        tokenId: id,
        onboardingUrl,
        mailtoUrl: buildAppOnboardingInviteMailto({
          toEmail,
          subjectLine,
          invitedBy,
          onboardingUrl,
        }),
      });
    if (!emailConfigured()) {
      return manual();
    }
    try {
      await sendAppHostedOnboardingEmail({
        toEmail,
        subjectLine,
        invitedBy,
        onboardingUrl,
        htmlIntro: `You have been invited to create a new company workspace in <strong>${APP_BRAND_NAME}</strong>.`,
      });
      return res.json({ ok: true, delivery: "smtp", tokenId: id, onboardingUrl });
    } catch (err) {
      console.warn("[smtp] app new-company invite failed; manual fallback", err);
      return manual();
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create onboarding invite.",
    });
  }
});

app.post("/api/onboarding/app-invites/company-user", async (req, res) => {
  const toEmail = String(req.body?.email || "").trim().toLowerCase();
  const inviteRole = String(req.body?.role || "").trim();
  const invitedBy = String(req.body?.invitedBy || APP_BRAND_NAME).trim();
  const companyFolderId = String(req.body?.companyFolderId || "").trim();
  const masterSheetId = String(req.body?.masterSheetId || "").trim();
  const companyName = String(req.body?.companyName || "").trim();

  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ ok: false, error: "A valid email address is required." });
  }
  if (!["Admin", "Manager", "Auditor"].includes(inviteRole)) {
    return res.status(400).json({ ok: false, error: "Role must be Admin, Manager, or Auditor." });
  }
  if (!companyFolderId || !masterSheetId) {
    return res.status(400).json({
      ok: false,
      error: "companyFolderId and masterSheetId are required.",
    });
  }

  try {
    const { id } = createInviteRecord({
      kind: "company_user",
      email: toEmail,
      role: inviteRole,
      invitedBy,
      companyFolderId,
      masterSheetId,
      companyName,
    });
    const onboardingUrl = buildAppOnboardingUrl(id);
    const subjectLine = `${APP_BRAND_NAME} — join ${companyName || "your company"}`;
    const manual = () =>
      res.json({
        ok: true,
        delivery: "manual",
        tokenId: id,
        onboardingUrl,
        mailtoUrl: buildAppOnboardingInviteMailto({
          toEmail,
          subjectLine,
          invitedBy,
          onboardingUrl,
        }),
      });
    if (!emailConfigured()) {
      return manual();
    }
    try {
      await sendAppHostedOnboardingEmail({
        toEmail,
        subjectLine,
        invitedBy,
        onboardingUrl,
        htmlIntro: `You have been invited to join <strong>${companyName || "your company"}</strong> in ${APP_BRAND_NAME} as <strong>${inviteRole}</strong>.`,
      });
      return res.json({ ok: true, delivery: "smtp", tokenId: id, onboardingUrl });
    } catch (err) {
      console.warn("[smtp] app company-user invite failed; manual fallback", err);
      return manual();
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create onboarding invite.",
    });
  }
});

app.get("/api/onboarding/app-invites/:tokenId", async (req, res) => {
  const tokenId = String(req.params.tokenId || "").trim();
  if (!tokenId) {
    return res.status(400).json({ ok: false, error: "Invite token is required." });
  }
  const record = getInviteRecord(tokenId);
  if (!record) {
    return res.status(404).json({ ok: false, error: "This invite link is not valid." });
  }
  if (record.consumedAt) {
    return res.status(410).json({ ok: false, error: "This invite has already been used." });
  }
  if (Date.now() > record.expiresAt) {
    return res.status(410).json({ ok: false, error: "This invite has expired." });
  }
  const payload =
    record.kind === "new_company"
      ? {
          ok: true,
          kind: "new_company",
          email: record.email,
          invitedBy: record.invitedBy || "",
        }
      : {
          ok: true,
          kind: "company_user",
          email: record.email,
          role: record.role,
          invitedBy: record.invitedBy || "",
          companyName: record.companyName || "",
        };
  return res.json(payload);
});

app.post("/api/onboarding/app-invites/:tokenId/complete", async (req, res) => {
  const authed = getAuthedClient();
  const tokenId = String(req.params.tokenId || "").trim();
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.fullName || "").trim();
  const companyName = String(req.body?.companyName || "").trim();
  const confirmPassword = String(req.body?.confirmPassword || "");

  if (!tokenId) {
    return res.status(400).json({ ok: false, error: "Invite token is required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
  }
  if (confirmPassword && confirmPassword !== password) {
    return res.status(400).json({ ok: false, error: "Password confirmation does not match." });
  }
  if (!fullName) {
    return res.status(400).json({ ok: false, error: "Full name is required." });
  }

  const record = getInviteRecord(tokenId);
  if (!record) {
    return res.status(404).json({ ok: false, error: "This invite link is not valid." });
  }
  if (record.consumedAt) {
    return res.status(410).json({ ok: false, error: "This invite has already been used." });
  }
  if (Date.now() > record.expiresAt) {
    return res.status(410).json({ ok: false, error: "This invite has expired." });
  }

  if (!envConfigured() || !authed) {
    return res.status(401).json({
      ok: false,
      error: "Google connection is required on the server to finish onboarding. Ask your administrator to stay signed in to Google on the backend, then try again.",
    });
  }

  try {
    if (record.kind === "new_company") {
      if (!companyName) {
        return res.status(400).json({ ok: false, error: "Company name is required." });
      }
      const result = await provisionNewCompanyWorkspace(authed, {
        companyName,
        adminEmail: record.email,
        adminFullName: fullName,
        password,
      });
      markInviteConsumed(tokenId);
      return res.json({
        ok: true,
        outcome: "new_company",
        companyFolderId: result.companyFolderId,
        masterSheetId: result.masterSheetId,
        folderUrl: `https://drive.google.com/drive/folders/${result.companyFolderId}`,
      });
    }

    if (record.kind === "company_user") {
      const userId = `app-${String(record.email || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")}-${String(record.role || "").toLowerCase()}`;
      await writeCompanyUsers(authed, record.masterSheetId, record.companyFolderId, [
        {
          id: userId,
          email: record.email,
          role: record.role,
          name: fullName,
          invitedBy: record.invitedBy || APP_BRAND_NAME,
          senderEmail: "",
          sentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: "Synced",
        },
      ]);
      const authKey = `UserAuth.${String(record.email || "").toLowerCase()}`;
      await updateConfig(authed, record.masterSheetId, {
        ...(await getConfig(authed, record.masterSheetId)),
        [authKey]: password,
      });
      markInviteConsumed(tokenId);
      return res.json({ ok: true, outcome: "company_user" });
    }

    return res.status(400).json({ ok: false, error: "Unknown invite type." });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to complete onboarding.",
    });
  }
});

app.get("/api/invites/smtp/status", async (_req, res) => {
  const config = smtpConfigSummary();
  const diagnostics = smtpCredentialDiagnostics();
  const verification = await verifySmtpTransport();
  return res.json({
    ok: verification.ok,
    host: config.host,
    port: config.port,
    user: config.user,
    from: config.from,
    secure: config.secure,
    verification,
    diagnostics,
  });
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

app.post("/api/incidents/notify", async (req, res) => {
  const incidentId = String(req.body?.incidentId || "").trim();
  const incidentType = String(req.body?.incidentType || "").trim();
  const severity = String(req.body?.severity || "").trim();
  const reporter = String(req.body?.reporter || "").trim();
  const department = String(req.body?.department || "").trim();
  const location = String(req.body?.location || "").trim();
  const status = String(req.body?.status || "Open").trim();
  const incidentDate = String(req.body?.incidentDate || "").trim();
  const incidentTime = String(req.body?.incidentTime || "").trim();
  const priority = String(req.body?.priority || "Normal").trim();
  const escalated = Boolean(req.body?.escalated);
  const viewLink = String(req.body?.viewLink || "").trim();

  if (!incidentId || !incidentType || !severity || !reporter || !department || !location || !incidentDate) {
    return res.status(400).json({ ok: false, error: "Missing required incident notification fields." });
  }

  try {
    await sendIncidentReportEmail({
      incidentId,
      incidentType,
      severity,
      reporter,
      department,
      location,
      status,
      incidentDate,
      incidentTime,
      priority,
      escalated,
      viewLink,
    });
    return res.json({ ok: true, escalated });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to send incident notification email.",
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
        message: `The sign-in state could not be verified. Please start the connection again from ${APP_BRAND_NAME}.`,
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
      message: `Your Google Drive root folder is now linked. Returning to ${APP_BRAND_NAME} now.`,
      success: true,
      redirectUrl: `${requiredEnv.FRONTEND_URL.replace(/\/$/, "")}/?google=connected`,
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
  console.log(`Backend listening on http://127.0.0.1:${port} (${APP_BRAND_NAME})`);
  const config = smtpConfigSummary();
  console.log("[smtp] config", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    from: config.from,
    ...smtpCredentialDiagnostics(),
  });
  void verifySmtpTransport().then((result) => {
    console.log("[smtp] verify", result);
  });
});
