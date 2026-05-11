import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BertLogo } from "./src/components/BertLogo";

type Role = "Master" | "Admin" | "Manager" | "Auditor";
type AuditStatus = "green" | "amber" | "red";
type Answer = "pass" | "nc" | "fail";
type Priority = "High" | "Medium" | "Low";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";
type RiskCategory = "Health & Safety" | "Quality" | "Environmental" | "Operational" | "Other";
type ActionStatus = "Open" | "In Progress" | "Awaiting Verification" | "Closed" | "Rejected";
type ScheduleFrequency =
  | "Daily"
  | "Weekly"
  | "Bi-Weekly"
  | "Monthly";
type ScheduleScope = "Company schedule" | "Personal schedule";
type OverdueAlertTiming = "At due time" | "30 minutes overdue" | "1 hour overdue" | "2 hours overdue";
type CompletionCheckTiming = "30 minutes after send" | "1 hour after send" | "At due time" | "2 hours after due";
type Screen = "dashboard" | "audits" | "actions" | "nonConformance" | "incidents" | "reports" | "sync" | "schedules" | "admin" | "onboarding" | "account" | "complete";
type NavItemId = Exclude<Screen, "complete">;
type ThemeMode = "light" | "dark";
type ReportTemplateType = "Executive summary" | "Overdue audit pack" | "Corrective action pack" | "Evidence pack" | "Full report";
type ScheduleDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
type ScheduleLifecycle = "Live" | "Archived";
type ScheduleListFilter = "Live" | "Archived" | "All schedules";
type ScheduleHealthState = "Healthy" | "Due Soon" | "Overdue" | "Failing" | "Paused";
type SyncItemType = "auditSubmission" | "actionUpdate" | "evidenceUpload" | "scheduleEdit" | "reportExport";
type SyncStatus = "Pending Sync" | "Syncing" | "Synced" | "Failed" | "Conflict";
type PreviewOrientation = "portrait" | "landscape";

type User = {
  username: string;
  password: string;
  role: Role;
  name: string;
};

type RoleNavVisibilityMatrix = Record<Role, Record<NavItemId, boolean>>;
type RoleSiteSelectorVisibility = Record<Role, boolean>;

type UserInvite = {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  senderEmail?: string;
  sentAt: string;
  status: "Invite sent";
  mailtoUrl?: string;
  appOnboardingUrl?: string;
};

type AuditQuestion = {
  id: string;
  text: string;
  fieldType?: "Traffic light" | "Text note" | "Photo evidence" | "Pass / Fail";
  riskLevel?: RiskLevel;
  riskCategory?: RiskCategory;
  autoActionRequired?: boolean;
  requiresPhotoEvidence?: boolean;
  requiresManagerReview?: boolean;
  answerPrompts?: Partial<Record<Answer, string[]>>;
};

type Audit = {
  id: string;
  name: string;
  category: string;
  siteArea: string;
  dueLabel: string;
  dueHours: number;
  priority: Priority;
  owner: string;
  templateVersion: string;
  status: AuditStatus;
  lastCompletedAt: string;
  questions: AuditQuestion[];
  totalRiskScore?: number;
  highestRiskLevel?: RiskLevel;
  numberOfCriticalFindings?: number;
  numberOfHighFindings?: number;
  scheduleHealthState?: ScheduleHealthState;
};

type HistoryEntry = {
  id: string;
  auditId: string;
  auditName: string;
  completedAt: string;
  completedBy: string;
  status: AuditStatus;
};

type AuditDraft = {
  responses: Record<string, Answer>;
  notes: Record<string, string>;
  evidence: Record<string, EvidenceItem[]>;
  updatedAt: string;
};

type EvidenceItem = {
  id: string;
  name: string;
  previewUrl: string;
  addedAt: string;
  uploaded?: boolean;
};

type ActionItem = {
  id: string;
  companyId: string;
  siteArea?: string;
  auditId: string;
  auditName: string;
  questionId: string;
  questionText: string;
  sourceAnswer: string;
  nonConformanceId?: string;
  severity: RiskLevel;
  owner: string;
  assignedToUserId: string;
  assignedToName: string;
  createdByUserId: string;
  createdAt: string;
  dueDate: string;
  closedAt: string;
  verifiedByUserId: string;
  verificationNotes: string;
  evidenceLinks: string[];
  localEvidenceRefs: string[];
  comments: string;
  recurrenceFlag: boolean;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  dueLabel: string;
  dueHours: number;
  status: ActionStatus;
  evidenceCount: number;
  noteIncluded: boolean;
  riskCategory: RiskCategory;
  escalated?: boolean;
  isStuck?: boolean;
  evidenceRequired?: boolean;
  requiresManagerReview?: boolean;
};

type CompanyFolder = {
  id: string;
  name: string;
  onboardingFormName: string;
  onboardingFormId?: string;
  auditFormCount: number;
  auditFormIds?: string[];
  responseSheetName: string;
  responseSheetId?: string;
  linkedAt: string;
  onboardingVerified: boolean;
  auditFormsVerified: boolean;
  responseSheetVerified: boolean;
};

type Site = {
  id: string;
  name: string;
  code: string;
  active: boolean;
};

/** Normalized user email -> site ids they may access. Empty or missing entry means no restriction (all sites). */
type UserSiteAssignments = Record<string, string[]>;

type OnboardingSource = {
  configured: boolean;
  formId: string;
  formName: string;
  sheetId: string;
  sheetName: string;
};

type OnboardingRecord = {
  id: string;
  submittedAt: string;
  companyName: string;
  siteName: string;
  mainContact: string;
  contactEmail: string;
  reportingContact: string;
  auditRecipients: string;
  overdueAlertRecipients: string;
  companyFolderReference: string;
  raw: Record<string, string>;
};

type DashboardPreferences = {
  trafficBoard: boolean;
  liveSummary: boolean;
  upcomingAudits: boolean;
  openActions: boolean;
  complianceSnapshot: boolean;
};

type DashboardSectionKey = keyof DashboardPreferences;

type ScheduleItem = {
  id: string;
  companyFolderId: string;
  auditId: string;
  auditName: string;
  siteArea: string;
  owner: string;
  scope: ScheduleScope;
  personalAssignee: string;
  frequency: ScheduleFrequency;
  sendTime: string;
  recipients: string[];
  overdueAlertRecipients: string[];
  reportTo: string;
  overdueAlertTiming: OverdueAlertTiming;
  completionCheckTiming: CompletionCheckTiming;
  nextDueHours: number;
  priority: Priority;
};

type ManagedScheduleAudit = {
  id: string;
  auditId: string;
  auditName: string;
  days: ScheduleDay[];
  frequency: ScheduleFrequency;
  liveTime: string;
  completionHours: number;
};

type ManagedSchedule = {
  id: string;
  rootId: string;
  parentScheduleId?: string;
  versionNumber: number;
  versionLabel: string;
  lifecycle: ScheduleLifecycle;
  companyFolderId: string;
  scheduleName: string;
  audits: ManagedScheduleAudit[];
  auditors: string[];
  startDate: string;
  endDate: string;
  updatedAt: string;
  archivedAt?: string;
  reactivatedAt?: string;
  escalationUserIds?: string[];
  triggerReauditOnFailure?: boolean;
  reauditDelayHours?: number;
  missedAuditCount?: number;
  lastCompletedAt?: string;
  nextDueAt?: string;
  healthState?: ScheduleHealthState;
};

type AuditScheduleMatrixInfo = {
  scheduleName: string;
  versionLabel: string;
  frequency: ScheduleFrequency;
  days: ScheduleDay[];
  liveTime: string;
  completionHours: number;
};

type GoogleBackendStatus = {
  ok: boolean;
  configured: boolean;
  connected: boolean;
  sharedDriveId: string;
  companies?: CompanyFolder[];
  onboardingSource?: OnboardingSource;
  error?: string;
};

type FolderInspection = {
  ok: boolean;
  folder: {
    id: string;
    name: string;
    createdTime: string;
  };
  checks: {
    auditFormsFolder: boolean;
    masterDataFolder: boolean;
    masterSheet: boolean;
    evidenceFolder: boolean;
    exportsFolder: boolean;
    adminNotesFolder: boolean;
  };
  auditFormsFolder: { id: string; name: string } | null;
  masterDataFolder: { id: string; name: string } | null;
  masterSheet: { id: string; name: string; tabs: string[] } | null;
  auditForms: { id: string; name: string }[];
  blockingItems: string[];
  recommendedItems: string[];
  missingItems: string[];
  error?: string;
};

type CompanySheetPayload = {
  ok: boolean;
  sheetId: string;
  sheetName: string;
  tabs: string[];
  data: Record<string, Record<string, string>[]>;
  error?: string;
};

type CompanySheetSyncStatus = {
  sheetId: string;
  sheetName: string;
  tabs: string[];
  usersCount: number;
  schedulesCount: number;
  onboardingCount: number;
  actionsCount: number;
  notesCount: number;
  findingsCount?: number;
  evidenceCount?: number;
  reportsCount?: number;
  configCount?: number;
  lastSyncedAt: string;
};

type SaveSchedulesResponse = {
  ok: boolean;
  error?: string;
};

type GoogleDriveFilePayload = {
  ok: boolean;
  file: {
    id: string;
    name: string;
    mimeType: string;
    createdTime?: string;
  };
  error?: string;
};

type GoogleFormsFolderPayload = {
  ok: boolean;
  folder: {
    id: string;
    name: string;
    mimeType: string;
    createdTime?: string;
  };
  forms: { id: string; name: string; mimeType: string }[];
  error?: string;
};

type AuditTemplate = {
  id: string;
  name: string;
  active: boolean;
  questions: AuditQuestion[];
  source: "Google Drive" | "Built in app";
};

type DraftTemplateQuestion = {
  id: string;
  text: string;
  fieldType: AuditQuestion["fieldType"];
  answerPrompts?: Partial<Record<Answer, string[]>>;
};

type NonConformanceEvidence = {
  id: string;
  name: string;
  previewUrl: string;
  addedAt: string;
  note?: string;
};

type NonConformanceRecord = {
  id: string;
  reference: string;
  auditId: string;
  auditName: string;
  auditQuestionId: string;
  auditQuestion: string;
  selectedAnswer: Answer;
  auditorName: string;
  auditorUserId: string;
  site: string;
  raisedAt: string;
  status: "Raised" | "In Progress" | "Completed";
  assignedLineManager: string;
  assignedLineManagerUserId: string;
  assignedLineManagerEmail: string;
  investigationIsoClause: string;
  investigationNotes: string;
  rootCause: string;
  correctiveAction: string;
  investigationExtraNotes: string;
  evidence: NonConformanceEvidence[];
  completionDateTime?: string;
  completedByName?: string;
  completedByUserId?: string;
};

type OfflineSubmission = {
  id: string;
  audit: Audit;
  responses: Record<string, Answer>;
  notes: Record<string, string>;
  evidence: Record<string, EvidenceItem[]>;
  signatureDataUrl: string;
  queuedAt: string;
  submittedBy: string;
};

type ReportItem = {
  id: string;
  title: string;
  type: "PDF report" | "Text audit pack";
  createdAt: string;
  createdBy: string;
  visibleTo: string[];
  template: ReportTemplateType;
};

type CompanyReportUser = {
  email: string;
  name: string;
  role: Role;
  username?: string;
};

type AuditAccessLevel = "Full access" | "Oversight" | "Complete" | "No access";

type AuditAccessMatrixCell = {
  auditId: string;
  auditName: string;
  access: AuditAccessLevel;
  detail: string;
  hasAccess: boolean;
};

type AuditAccessMatrixRow = {
  email: string;
  name: string;
  role: Role;
  accessibleCount: number;
  cells: AuditAccessMatrixCell[];
};

type AuditAccessOverrideMap = Record<string, AuditAccessLevel>;

type ReportSectionKey =
  | "compliance"
  | "overdueAudits"
  | "correctiveActions"
  | "overdueActions"
  | "criticalFindings"
  | "repeatFailures"
  | "evidence"
  | "auditHistory"
  | "verificationHistory"
  | "scheduleCompliance"
  | "auditCompletion"
  | "syncExceptions"
  | "templates"
  | "offlineQueue";

type SyncQueueItem = {
  id: string;
  itemType: SyncItemType;
  localId: string;
  status: SyncStatus;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError: string;
  payload: Record<string, unknown>;
};

type WorkspaceValidation = {
  ok: boolean;
  schemaVersion: string;
  currentSchemaVersion: string;
  folders: {
    companyFolder: boolean;
    auditFormsFolder: boolean;
    evidenceFolder: boolean;
    exportsFolder: boolean;
    adminNotesFolder: boolean;
  };
  tabs: Record<string, boolean>;
  missingTabs: string[];
  missingColumns: Record<string, string[]>;
  warnings: string[];
};

type OnboardingSubmissionsResponse = {
  ok: boolean;
  onboardingSource: OnboardingSource;
  headers: string[];
  records: OnboardingRecord[];
  error?: string;
};

type Toast = {
  id: number;
  title: string;
  message: string;
  tone: "neutral" | "success" | "warning";
};

type ManagerAlert = {
  id: string;
  auditId: string;
  auditName: string;
  submittedBy: string;
  nonComplianceCount: number;
  queuedForSync: boolean;
  createdAt: string;
  managerEmails: string[];
  managerNames: string[];
  readBy: string[];
};

type IncidentStatus = "Open" | "Under Investigation" | "Closed";
type IncidentPriority = "Normal" | "High";
type IncidentType = "Accident" | "Near Miss" | "Dangerous Occurrence" | "Property Damage" | "Environmental";
type IncidentSeverity =
  | "Minor"
  | "Medical Treatment"
  | "Lost Time Injury"
  | "Major Incident"
  | "Fatality";

type IncidentEvidenceItem = {
  id: string;
  name: string;
  mimeType: string;
  previewUrl: string;
  addedAt: string;
};

type IncidentRecord = {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  incidentDate: string;
  incidentTime: string;
  reporterName: string;
  reporterEmail: string;
  department: string;
  location: string;
  description: string;
  immediateAction: string;
  injured: boolean;
  injuryDetails: string;
  contributingFactors: string;
  witnesses: string;
  evidenceUrls: IncidentEvidenceItem[];
  assignedTo: string;
  investigationNotes: string;
  rootCause: string;
  correctiveActions: string;
  preventiveActions: string;
  actionOwner: string;
  dueDate: string;
  completionDate: string;
  riddorRequired: boolean;
  closedBy: string;
  closedAt: string;
  notificationStatus: string;
  statusHistory: { at: string; from: IncidentStatus | ""; to: IncidentStatus; by: string; note: string }[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

type IncidentCorrectiveAction = {
  id: string;
  incidentId: string;
  description: string;
  owner: string;
  dueDate: string;
  status: "Open" | "In Progress" | "Complete";
  completedAt: string;
  completedBy: string;
};

type IssuePromptState = {
  question: AuditQuestion;
  answer: Exclude<Answer, "pass">;
};

type AuditCompletionSummaryState = {
  auditId: string;
  auditName: string;
  questionsAnswered: number;
  issuesFound: number;
  actionsCreated: number;
  photosCaptured: number;
  syncTone: "green" | "amber" | "red";
  syncLabel: string;
};

const companyName = (import.meta.env.VITE_APP_NAME || "BERT").trim();
const PRODUCT_TAGLINE = "Business. Evaluation. Reporting. Tool.";
const PRODUCT_BRAND_FULL = `${companyName} — ${PRODUCT_TAGLINE}`;
function isDemoRoleSwitchEnabled() {
  const rawValue = String(import.meta.env.VITE_ENABLE_DEMO_ROLE_SWITCH || "").trim().toLowerCase();
  return rawValue === "true" || rawValue === "1" || rawValue === "yes" || rawValue === "on";
}
function canCreatePreviewProfile() {
  return isDemoRoleSwitchEnabled();
}
const demoRoleSwitchEnabled = isDemoRoleSwitchEnabled();
const CURRENT_SCHEMA_VERSION = "2.0.0";
const REQUIRED_WORKSPACE_TABS = ["Onboarding", "Users", "Schedule", "Actions", "Notes", "Config"] as const;
const ACTION_DUE_DAYS_BY_SEVERITY: Record<RiskLevel, number> = {
  Critical: 1,
  High: 3,
  Medium: 7,
  Low: 14,
};

const GOD_MODE_USERNAME = (import.meta.env.VITE_GODMODE_USERNAME || "master").trim().toLowerCase();
const GOD_MODE_PASSWORD = import.meta.env.VITE_GODMODE_PASSWORD || "demo";

const users: User[] = [
  { username: GOD_MODE_USERNAME, password: GOD_MODE_PASSWORD, role: "Master", name: "System Setup" },
  { username: "admin", password: "demo", role: "Admin", name: "Audit Control" },
  { username: "manager", password: "demo", role: "Manager", name: "James Preston" },
  { username: "tom", password: "demo", role: "Auditor", name: "Tom Hughes" },
];

const DEFAULT_MANAGER_NAME = users.find((user) => user.role === "Manager")?.name || "Unassigned";
const DEFAULT_AUDITOR_NAME = users.find((user) => user.role === "Auditor")?.name || "Unassigned";
const DEFAULT_ESCALATION_NAME = users.find((user) => user.role === "Master")?.name || "System Setup";

const initialAudits: Audit[] = [];

const initialHistory: HistoryEntry[] = [];

const initialActions: ActionItem[] = [];
const initialSyncQueue: SyncQueueItem[] = [];
const initialSchedules: ScheduleItem[] = [];
const initialTemplates: AuditTemplate[] = [];
const initialNonConformances: NonConformanceRecord[] = [];
const initialIncidents: IncidentRecord[] = [];
const initialIncidentActions: IncidentCorrectiveAction[] = [];
const amberThresholdHours = 2;
const scheduleDayOptions: ScheduleDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const scheduleFrequencyOptions: ScheduleFrequency[] = [
  "Daily",
  "Weekly",
  "Bi-Weekly",
  "Monthly",
];
const scheduleDurationOptions = [1, 2, 4, 8, 12, 24, 48];
const scheduleTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

const statusStyles: Record<
  AuditStatus,
  {
    label: string;
    dot: string;
    soft: string;
    ring: string;
    text: string;
  }
> = {
  green: {
    label: `More than ${amberThresholdHours} hours`,
    dot: "bg-blue-600",
    soft: "bg-blue-500/12",
    ring: "ring-blue-500/25",
    text: "text-blue-800",
  },
  amber: {
    label: `Less than ${amberThresholdHours} hours`,
    dot: "bg-amber-500",
    soft: "bg-amber-500/12",
    ring: "ring-amber-500/25",
    text: "text-amber-700",
  },
  red: {
    label: "Overdue",
    dot: "bg-rose-500",
    soft: "bg-rose-500/12",
    ring: "ring-rose-500/25",
    text: "text-rose-700",
  },
};

const navItems: { id: NavItemId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "audits", label: "Audits", icon: "clipboard" },
  { id: "actions", label: "Actions", icon: "warningTriangle" },
  { id: "nonConformance", label: "Non-Conformance", icon: "checklist" },
  { id: "incidents", label: "Incident reporting", icon: "camera" },
  { id: "schedules", label: "Schedules", icon: "clock" },
  { id: "reports", label: "Report creator", icon: "chart" },
  { id: "sync", label: "Sync Centre", icon: "sync" },
  { id: "admin", label: "Control", icon: "shield" },
  { id: "onboarding", label: "Onboarding", icon: "spark" },
  { id: "account", label: "Account settings", icon: "user" },
];

/** Transitions only — hover uses shell-wide 15% contrasting overlay (.qms-app-shell / .qms-login-shell). */
const slatePrimaryCtaInteract = "transition-colors duration-200 ease-in-out";

/** Accent-filled fields (signal orange) — schedule editor; avoids washed-out OS styling on pale backgrounds in dark theme. */
const brandAccentFormField =
  "border border-[rgba(249,115,22,0.5)] bg-[var(--bert-signal-orange)] text-[var(--qms-navy-950)] shadow-[0_10px_26px_rgba(249,115,22,0.22)] outline-none transition focus:border-[var(--qms-navy-850)]";

/** Slate surface + accent outline for dropdowns and secondary inputs on dark panels (filters, assignees, file inputs). */
const brandDarkFormControl =
  "border border-[rgba(249,115,22,0.45)] bg-slate-950 text-slate-100 outline-none focus:border-[var(--bert-signal-orange)]";
const qmsDarkShellGradient =
  "bg-[radial-gradient(circle_at_top,var(--qms-shell-dark-radial),_transparent_35%),linear-gradient(180deg,var(--qms-shell-dark-start)_0%,var(--qms-shell-dark-mid)_45%,var(--qms-shell-dark-end)_100%)]";
const qmsLightShellGradient =
  "bg-[radial-gradient(circle_at_top,var(--qms-shell-light-radial),_transparent_35%),linear-gradient(180deg,var(--qms-shell-light-start)_0%,var(--qms-shell-light-mid)_45%,var(--qms-shell-light-end)_100%)]";

const appMotionStyles = `
  @keyframes qmsFadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .qms-screen-stage {
    animation: qmsFadeSlideUp 220ms ease-out;
    padding-top: 0.75rem;
    padding-left: 0.85rem;
    padding-right: 0.85rem;
    padding-bottom: 1.5rem;
  }

  /* Compact fit pass: reduce chunky spacing while keeping readability. */
  .qms-screen-stage .space-y-4 > * + * {
    margin-top: 0.65rem;
  }

  .qms-screen-stage .space-y-3 > * + * {
    margin-top: 0.5rem;
  }

  .qms-screen-stage [class*="rounded-[1.75rem]"] {
    border-radius: 1.2rem !important;
  }

  .qms-screen-stage section[class*="rounded-[1.75rem]"] {
    padding: 0.82rem !important;
  }

  .qms-screen-stage section[class*="rounded-[1.6rem]"] {
    padding: 0.72rem !important;
  }

  /* Global aesthetic normalization (workflow-safe): cards, controls, and small actions. */
  .qms-app-shell[data-qms-theme="light"] .qms-screen-stage section {
    border-color: rgba(148, 163, 184, 0.28);
    box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
  }

  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage section {
    border-color: rgba(148, 163, 184, 0.2);
    box-shadow: 0 12px 30px rgba(2, 6, 23, 0.3);
  }

  .qms-screen-stage input,
  .qms-screen-stage select,
  .qms-screen-stage textarea {
    border-radius: 0.95rem;
  }

  .qms-app-shell[data-qms-theme="light"] .qms-screen-stage input,
  .qms-app-shell[data-qms-theme="light"] .qms-screen-stage select,
  .qms-app-shell[data-qms-theme="light"] .qms-screen-stage textarea {
    border-color: rgba(148, 163, 184, 0.35);
    background-color: rgba(255, 255, 255, 0.82);
  }

  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage input,
  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage select,
  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage textarea {
    border-color: rgba(148, 163, 184, 0.32);
    background-color: rgba(2, 6, 23, 0.72);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .qms-screen-stage button {
    border-radius: 0.9rem;
  }

  .qms-screen-stage .rounded-2xl {
    border-radius: 1rem;
  }

  .qms-screen-stage input,
  .qms-screen-stage select,
  .qms-screen-stage textarea,
  .qms-screen-stage button {
    min-height: 2.5rem;
  }

  .qms-screen-stage .h-14 {
    height: 3.15rem !important;
  }

  .qms-screen-stage .h-12 {
    height: 2.85rem !important;
  }

  .qms-screen-stage .h-11 {
    height: 2.65rem !important;
  }

  .qms-screen-stage .h-10 {
    height: 2.45rem !important;
  }

  .qms-screen-stage [class*="px-5"] {
    padding-left: 1.1rem !important;
    padding-right: 1.1rem !important;
  }

  .qms-screen-stage [class*="py-5"] {
    padding-top: 1.05rem !important;
    padding-bottom: 1.05rem !important;
  }

  .qms-app-shell[data-qms-theme="light"] .qms-screen-stage button {
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  }

  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage button {
    box-shadow: 0 8px 20px rgba(2, 6, 23, 0.28);
  }

  /* Typography rhythm pass (aesthetic only): clearer hierarchy, tighter enterprise feel. */
  .qms-screen-stage h1 {
    font-size: clamp(1.55rem, 2.1vw, 1.95rem);
    line-height: 1.15;
    letter-spacing: -0.015em;
  }

  .qms-screen-stage h2 {
    font-size: clamp(1.25rem, 1.65vw, 1.55rem);
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .qms-screen-stage h3 {
    font-size: clamp(1.06rem, 1.25vw, 1.24rem);
    line-height: 1.28;
    letter-spacing: -0.005em;
  }

  .qms-screen-stage p,
  .qms-screen-stage li {
    line-height: 1.5;
  }

  .qms-screen-stage p {
    font-size: clamp(0.88rem, 0.9vw, 0.96rem);
  }

  .qms-screen-stage label {
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .qms-screen-stage small,
  .qms-screen-stage .text-xs {
    letter-spacing: 0.025em;
  }

  .qms-app-shell[data-qms-theme="light"] .qms-screen-stage h1,
  .qms-app-shell[data-qms-theme="light"] .qms-screen-stage h2,
  .qms-app-shell[data-qms-theme="light"] .qms-screen-stage h3 {
    color: rgb(15 23 42);
  }

  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage h1,
  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage h2,
  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage h3 {
    color: rgb(241 245 249);
  }

  .qms-app-shell button:not(:disabled),
  .qms-login-shell button:not(:disabled) {
    transition:
      background-color 200ms ease-in-out,
      color 200ms ease-in-out,
      border-color 200ms ease-in-out,
      box-shadow 200ms ease-in-out,
      opacity 200ms ease-in-out;
  }

  /* 15% opposite-colour tint (readable: inset shadow sits beneath button content) */
  .qms-app-shell[data-qms-theme="light"] button:enabled:hover,
  .qms-login-shell[data-qms-theme="light"] button:enabled:hover {
    box-shadow: inset 0 0 0 9999px var(--qms-hover-overlay-light);
  }

  .qms-app-shell[data-qms-theme="dark"] button:enabled:hover,
  .qms-login-shell[data-qms-theme="dark"] button:enabled:hover {
    box-shadow: inset 0 0 0 9999px var(--qms-hover-overlay-dark);
  }

  /* Dark theme: slate rows must not hover to white (would clash with light body copy colours). */
  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage .hover\\:bg-white:hover {
    background-color: rgb(30 41 59) !important;
  }

  .qms-app-shell[data-qms-theme="dark"] .qms-screen-stage .hover\\:border-slate-300:hover {
    border-color: rgb(71 85 105) !important;
  }

  .qms-app-shell[data-qms-theme="light"] button:enabled:active,
  .qms-login-shell[data-qms-theme="light"] button:enabled:active {
    box-shadow: inset 0 0 0 9999px var(--qms-active-overlay-light);
  }

  .qms-app-shell[data-qms-theme="dark"] button:enabled:active,
  .qms-login-shell[data-qms-theme="dark"] button:enabled:active {
    box-shadow: inset 0 0 0 9999px var(--qms-active-overlay-dark);
  }

  .qms-app-shell button:disabled,
  .qms-login-shell button:disabled {
    cursor: not-allowed;
  }

  /* File-upload chips (label + rounded link CTAs mirror button hover) */
  .qms-app-shell label.inline-flex.cursor-pointer,
  .qms-login-shell label.inline-flex.cursor-pointer,
  .qms-app-shell a.inline-flex[class*="rounded"],
  .qms-login-shell a.inline-flex[class*="rounded"] {
    transition: box-shadow 200ms ease-in-out;
  }

  .qms-app-shell[data-qms-theme="light"] label.inline-flex.cursor-pointer:hover,
  .qms-login-shell[data-qms-theme="light"] label.inline-flex.cursor-pointer:hover {
    box-shadow: inset 0 0 0 9999px var(--qms-hover-overlay-light);
  }

  .qms-app-shell[data-qms-theme="dark"] label.inline-flex.cursor-pointer:hover,
  .qms-login-shell[data-qms-theme="dark"] label.inline-flex.cursor-pointer:hover {
    box-shadow: inset 0 0 0 9999px var(--qms-hover-overlay-dark);
  }

  .qms-app-shell[data-qms-theme="light"] a.inline-flex[class*="rounded"]:hover,
  .qms-login-shell[data-qms-theme="light"] a.inline-flex[class*="rounded"]:hover {
    box-shadow: inset 0 0 0 9999px var(--qms-hover-overlay-light);
  }

  .qms-app-shell[data-qms-theme="dark"] a.inline-flex[class*="rounded"]:hover,
  .qms-login-shell[data-qms-theme="dark"] a.inline-flex[class*="rounded"]:hover {
    box-shadow: inset 0 0 0 9999px var(--qms-hover-overlay-dark);
  }

  .qms-tablet-stage {
    display: flex;
    min-height: 100%;
    align-items: center;
    justify-content: center;
  }

  /* Sign-in: landscape frame so left/right columns fit without scrolling. */
  .qms-tablet-device.qms-tablet-device--signin {
    width: min(96vw, 52rem);
    aspect-ratio: 16 / 10;
    max-height: min(90dvh, 34rem);
    overflow: hidden;
  }

  @media (max-width: 639px) {
    .qms-tablet-device.qms-tablet-device--signin {
      width: min(92vw, 26rem);
      aspect-ratio: 10 / 13;
      max-height: min(86dvh, 38rem);
    }
  }

  .qms-tablet-device {
    position: relative;
    width: min(92vw, 41rem);
    aspect-ratio: 10 / 16;
    padding: 0.9rem;
    overflow: hidden;
    border-radius: 2.8rem;
    background:
      linear-gradient(145deg, var(--qms-navy-950), var(--qms-navy-900)),
      linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2));
    box-shadow:
      0 30px 90px rgba(2, 6, 23, 0.45),
      inset 0 1px 0 rgba(148,163,184,0.14),
      inset 0 -2px 0 rgba(0,0,0,0.45);
  }

  .qms-tablet-device::before {
    content: "";
    position: absolute;
    top: 0.5rem;
    left: 50%;
    z-index: 2;
    width: 5.2rem;
    height: 0.42rem;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.18);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
  }

  .qms-tablet-device::after {
    content: "";
    position: absolute;
    top: 0.56rem;
    left: calc(50% + 2rem);
    z-index: 3;
    width: 0.34rem;
    height: 0.34rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.38);
  }

  .qms-tablet-device .qms-app-shell,
  .qms-tablet-device .qms-login-shell {
    width: 100%;
    max-width: none;
    min-height: 100%;
    height: 100%;
  }

  .qms-force-landscape .qms-login-shell {
    min-height: 100%;
  }

  .qms-force-landscape .qms-tablet-device {
    width: min(94vw, 74rem);
    aspect-ratio: 16 / 10;
  }

  .qms-force-landscape .qms-app-shell {
    max-width: none;
  }

  .qms-force-landscape .qms-app-header-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
    gap: 1rem;
    align-items: start;
  }

  .qms-force-landscape .qms-app-session-bar {
    margin-top: 0;
    min-height: 100%;
  }

  .qms-force-landscape .qms-screen-stage {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
    padding-bottom: 2rem;
  }

  .qms-force-landscape .qms-bottom-nav {
    max-width: 78rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .qms-force-landscape .qms-bottom-nav-grid {
    gap: 0.75rem;
  }

  .qms-force-landscape .qms-nav-button {
    height: 3.4rem;
    font-size: 0.72rem;
  }

  .qms-force-landscape .qms-nav-label {
    max-width: 7rem;
  }

  .qms-force-landscape .qms-login-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 1.5rem;
    align-items: start;
  }

  .qms-force-landscape .qms-login-access {
    margin-top: 0;
  }

  @media (orientation: landscape) and (min-width: 900px) {
    .qms-tablet-device {
      width: min(94vw, 74rem);
      aspect-ratio: 16 / 10;
    }

    .qms-login-shell {
      min-height: 100%;
    }

    .qms-app-shell {
      max-width: none;
    }

    .qms-app-header-main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
      gap: 1rem;
      align-items: start;
    }

    .qms-app-session-bar {
      margin-top: 0;
      min-height: 100%;
    }

    .qms-screen-stage {
      padding-left: 1.25rem;
      padding-right: 1.25rem;
      padding-bottom: 2rem;
    }

    .qms-bottom-nav {
      max-width: 78rem;
      padding-left: 1rem;
      padding-right: 1rem;
    }

    .qms-bottom-nav-grid {
      gap: 0.75rem;
    }

    .qms-nav-button {
      height: 3.4rem;
      font-size: 0.72rem;
    }

    .qms-nav-label {
      max-width: 7rem;
    }
  }

  @media (orientation: landscape) and (min-width: 1100px) {
    .qms-login-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
      gap: 1.5rem;
      align-items: start;
    }

    .qms-login-access {
      margin-top: 0;
    }
  }
`;

/** Parse JSON from `fetch` responses — avoids `response.json()` throwing on empty/HTML proxy errors. */
async function parseJsonApiResponse<T = Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    const hint =
      "Start the API: from the project root run `npm run server` (default port 8787) while using `npm run dev`.";
    throw new Error(`No response body from server (${response.status}). ${hint}`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const snippet = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
    throw new Error(`Invalid response (${response.status}): ${snippet}`);
  }
}

const userStorageKey = "qms-precast-current-user";
/** When set, Master session is limited to company onboarding (no other nav or tools). Cleared on staff sign-in or logout. */
const masterCompanySetupSessionKey = "bert-master-company-setup-session";
const offlineQueueStorageKey = "qms-precast-offline-submissions";
const themeStorageKey = "qms-precast-theme";
const previewOrientationStorageKey = "qms-precast-preview-orientation";
const desktopSidebarCollapsedStorageKey = "qms-precast-desktop-sidebar-collapsed";
const dashboardPreferencesStorageKey = "qms-precast-dashboard-preferences";
const dashboardSectionOrderStorageKey = "qms-precast-dashboard-section-order";
const folderLinksStorageKey = "qms-precast-folder-links";
const workspaceStateStorageKey = "qms-precast-workspace-state";
const userProfilePhotosStorageKey = "qms-precast-user-profile-photos";
const userNicknamesStorageKey = "qms-precast-user-nicknames";
const scheduleTimeZone = "Europe/London";

function AppIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...shared}>
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...shared}>
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M9 4.5h6a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 9 4.5Z" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
        </svg>
      );
    case "checklist":
      return (
        <svg {...shared}>
          <path d="M9 7h10" />
          <path d="M9 12h10" />
          <path d="M9 17h10" />
          <path d="m4 7 1.5 1.5L7.5 6" />
          <path d="m4 12 1.5 1.5L7.5 11" />
          <path d="m4 17 1.5 1.5L7.5 16" />
        </svg>
      );
    case "warningTriangle":
      return (
        <svg {...shared}>
          <path d="M12 4.75 20.25 19.25H3.75L12 4.75z" />
          <path d="M12 9.5v4.5" />
          <circle cx="12" cy="16.35" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "chart":
      return (
        <svg {...shared}>
          <path d="M4 19h16" />
          <path d="M7 16V10" />
          <path d="M12 16V6" />
          <path d="M17 16v-4" />
        </svg>
      );
    case "sync":
      return (
        <svg {...shared}>
          <path d="M3 12a8 8 0 0 1 13.66-5.66L19 8" />
          <path d="M21 12a8 8 0 0 1-13.66 5.66L5 16" />
          <path d="M19 3v5h-5" />
          <path d="M5 21v-5h5" />
        </svg>
      );
    case "shield":
      return (
        <svg {...shared}>
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
          <path d="m9.5 12 1.8 1.8 3.2-3.6" />
        </svg>
      );
    case "user":
      return (
        <svg {...shared}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      );
    case "spark":
      return (
        <svg {...shared}>
          <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
    case "camera":
      return (
        <svg {...shared}>
          <path d="M4.5 8.5h3l1.5-2h6l1.5 2h3v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9Z" />
          <circle cx="12" cy="13" r="3.2" />
        </svg>
      );
    case "check":
      return (
        <svg {...shared}>
          <path d="m5 12 4 4 10-10" />
        </svg>
      );
    case "note":
      return (
        <svg {...shared}>
          <path d="M7 4h10a2 2 0 0 1 2 2v12l-4-3H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M9 8h6" />
          <path d="M9 11h6" />
        </svg>
      );
    default:
      return null;
  }
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p> : null}
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function MetaPill({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
      <AppIcon name={icon} className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}

function getUkTimeZoneLabel(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: scheduleTimeZone,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "UK time";
}

function formatScheduledTime(time: string) {
  return `${time} ${getUkTimeZoneLabel()}`;
}

function getWorkspaceInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildAuditAccessOverrideKey(email: string, auditId: string) {
  return `${email}::${auditId}`;
}

function buildOnboardingFormViewUrl(formId: string) {
  const clean = formId.trim();
  if (!clean) return "";
  if (clean.startsWith("1FAIpQL")) {
    return `https://docs.google.com/forms/d/e/${clean}/viewform`;
  }
  return `https://docs.google.com/forms/d/${clean}/viewform`;
}

const reportTemplates: {
  type: ReportTemplateType;
  title: string;
  subtitle: string;
}[] = [
  {
    type: "Executive summary",
    title: "Executive summary",
    subtitle: "High-level compliance, pressure areas, and readiness for managers or clients.",
  },
  {
    type: "Overdue audit pack",
    title: "Overdue audit pack",
    subtitle: "Focus on missed audits, due risk, and who owns the next action.",
  },
  {
    type: "Corrective action pack",
    title: "Corrective action pack",
    subtitle: "Open CAPA items, severity, evidence, and close-out ownership.",
  },
  {
    type: "Evidence pack",
    title: "Evidence pack",
    subtitle: "Evidence-heavy handover with proof items, completion trail, and audit context.",
  },
  {
    type: "Full report",
    title: "Full report",
    subtitle: "Complete compliance pack including schedule, risk, CAPA, evidence, and sync exceptions.",
  },
];

const reportSectionOptions: {
  key: ReportSectionKey;
  title: string;
  description: string;
  icon?: string;
}[] = [
  { key: "compliance", title: "Compliance summary", description: "Live compliance and daily completion metrics." },
  { key: "auditCompletion", title: "Audit completion summary", description: "Completion rate, finished audits, and coverage." },
  { key: "overdueAudits", title: "Overdue audits", description: "Audits that are currently overdue." },
  { key: "correctiveActions", title: "Corrective actions", description: "Open and overdue CAPA items.", icon: "warningTriangle" },
  { key: "overdueActions", title: "Overdue actions", description: "Corrective actions past due date.", icon: "warningTriangle" },
  { key: "criticalFindings", title: "Critical/high findings", description: "Highest-risk audit findings needing attention." },
  { key: "repeatFailures", title: "Repeat failures", description: "Questions or findings repeatedly failing over time." },
  { key: "evidence", title: "Evidence summary", description: "Captured evidence and proof counts." },
  { key: "auditHistory", title: "Audit history", description: "Recent completed audit records." },
  { key: "verificationHistory", title: "Verification history", description: "Action verification and close-out activity.", icon: "warningTriangle" },
  { key: "scheduleCompliance", title: "Schedule compliance", description: "Schedule health, missed audits, and due-soon items." },
  { key: "syncExceptions", title: "Offline sync exceptions", description: "Items failed or conflicted during sync." },
  { key: "templates", title: "Audit templates", description: "Active templates included in the workspace." },
  { key: "offlineQueue", title: "Offline queue", description: "Queued submissions still waiting to sync." },
];

const reportTemplateDefaults: Record<ReportTemplateType, ReportSectionKey[]> = {
  "Executive summary": ["compliance", "auditCompletion", "correctiveActions", "overdueAudits", "auditHistory"],
  "Overdue audit pack": ["overdueAudits", "overdueActions", "correctiveActions", "scheduleCompliance", "auditHistory"],
  "Corrective action pack": ["correctiveActions", "overdueActions", "verificationHistory", "evidence", "auditHistory"],
  "Evidence pack": ["evidence", "criticalFindings", "auditHistory", "templates"],
  "Full report": ["compliance", "auditCompletion", "overdueAudits", "correctiveActions", "overdueActions", "criticalFindings", "repeatFailures", "verificationHistory", "scheduleCompliance", "evidence", "syncExceptions", "auditHistory", "templates", "offlineQueue"],
};

function getAuditTrafficStatus(dueHours: number): AuditStatus {
  if (dueHours < 0) {
    return "red";
  }
  if (dueHours < amberThresholdHours) {
    return "amber";
  }
  return "green";
}

function getDueWarning(dueHours: number) {
  if (dueHours < 0) {
    return `Overdue by ${Math.abs(dueHours)} hour${Math.abs(dueHours) === 1 ? "" : "s"}`;
  }
  if (dueHours < amberThresholdHours) {
    return `Warning: less than ${amberThresholdHours} hours remaining`;
  }
  return `${dueHours} hours remaining`;
}

function getDueLabel(dueHours: number) {
  if (dueHours < 0) {
    return "Overdue";
  }
  if (dueHours < amberThresholdHours) {
    return "Due soon";
  }
  if (dueHours < 24) {
    return "Due today";
  }
  return "Due later";
}

function rankAuditorAudit(audit: Audit, hasDraft: boolean) {
  if (hasDraft) return 0;
  if (audit.dueHours < 0) return 1;
  if (getAuditTrafficStatus(audit.dueHours) === "amber") return 2;
  if (audit.dueHours <= 24) return 3;
  return 4;
}

function pickNextAuditorAudit(audits: Audit[], drafts: Record<string, AuditDraft>) {
  return [...audits].sort((a, b) => {
    const rankDiff = rankAuditorAudit(a, Boolean(drafts[a.id])) - rankAuditorAudit(b, Boolean(drafts[b.id]));
    if (rankDiff !== 0) return rankDiff;
    return a.dueHours - b.dueHours;
  })[0] ?? null;
}

function isActionOverdue(action: ActionItem) {
  return action.status !== "Closed" && action.dueHours < 0;
}

function isActionEscalated(action: ActionItem) {
  if (action.escalated !== undefined) {
    return action.escalated;
  }
  return isActionOverdue(action) && Math.abs(action.dueHours) > 24;
}

function isActionStuck(action: ActionItem) {
  if (action.isStuck !== undefined) {
    return action.isStuck;
  }
  return action.status === "Awaiting Verification" && action.dueHours < -24;
}

function isActionDueSoon(action: ActionItem) {
  return action.status !== "Closed" && action.dueHours >= 0 && action.dueHours <= 24;
}

function getActionUrgency(action: ActionItem): "Escalated" | "Overdue" | "Stuck" | "Due soon" | "Normal" {
  if (isActionEscalated(action)) return "Escalated";
  if (isActionOverdue(action)) return "Overdue";
  if (isActionStuck(action)) return "Stuck";
  if (isActionDueSoon(action)) return "Due soon";
  return "Normal";
}

function isOverdue(action: ActionItem) {
  return isActionOverdue(action);
}

function isEscalated(action: ActionItem) {
  return isActionEscalated(action);
}

function isStuck(action: ActionItem) {
  return isActionStuck(action);
}

function buildDefaultQuestions(auditName: string): AuditQuestion[] {
  return [
    {
      id: `${auditName}-q1`,
      text: "Work area is safe, clean, and prepared for the scheduled check.",
      riskLevel: "Medium",
      riskCategory: "Health & Safety",
      autoActionRequired: true,
      requiresPhotoEvidence: false,
      requiresManagerReview: false,
    },
    {
      id: `${auditName}-q2`,
      text: "Required controls, signage, and access arrangements are in place.",
      riskLevel: "High",
      riskCategory: "Operational",
      autoActionRequired: true,
      requiresPhotoEvidence: true,
      requiresManagerReview: true,
    },
    {
      id: `${auditName}-q3`,
      text: "Equipment, materials, and records meet the expected audit standard.",
      riskLevel: "Medium",
      riskCategory: "Quality",
      autoActionRequired: true,
      requiresPhotoEvidence: false,
      requiresManagerReview: false,
    },
    {
      id: `${auditName}-q4`,
      text: "Any issues have been identified, recorded, and communicated correctly.",
      riskLevel: "Critical",
      riskCategory: "Health & Safety",
      autoActionRequired: true,
      requiresPhotoEvidence: true,
      requiresManagerReview: true,
    },
  ];
}

/** Local-only precast HSE demo payloads for QA/review — never merges into Google-connected company sheets. */
function buildDemoPrecastWorkspace(): {
  audits: Audit[];
  actions: ActionItem[];
  drafts: Record<string, AuditDraft>;
  syncQueue: SyncQueueItem[];
  templates: AuditTemplate[];
  companySheetSync: CompanySheetSyncStatus;
} {
  const demoAudits: Audit[] = [
    {
      id: "audit-demo-yard-safety",
      name: "Daily Yard Safety Check",
      category: "Daily safety",
      siteArea: "Main Yard",
      dueLabel: "Overdue",
      dueHours: -2,
      priority: "High",
      owner: "Tom Blake",
      templateVersion: "Built in app",
      status: "red",
      lastCompletedAt: "Today 06:30",
      questions: buildDefaultQuestions("Daily Yard Safety Check"),
    },
    {
      id: "audit-demo-fire-bay2",
      name: "Bay 2 Fire Safety Inspection",
      category: "Fire safety",
      siteArea: "Bay 2",
      dueLabel: "Due soon",
      dueHours: 1,
      priority: "High",
      owner: "Sarah Evans",
      templateVersion: "Built in app",
      status: "amber",
      lastCompletedAt: "Yesterday 15:10",
      questions: buildDefaultQuestions("Bay 2 Fire Safety Inspection"),
    },
    {
      id: "audit-demo-ppe-weekly",
      name: "Weekly PPE Compliance Audit",
      category: "PPE compliance",
      siteArea: "Casting Hall",
      dueLabel: "Due later",
      dueHours: 48,
      priority: "Medium",
      owner: "Tom Blake",
      templateVersion: "Built in app",
      status: "green",
      lastCompletedAt: "Monday 08:45",
      questions: buildDefaultQuestions("Weekly PPE Compliance Audit"),
    },
    {
      id: "audit-demo-lifting",
      name: "Lifting Equipment Check",
      category: "Plant safety",
      siteArea: "Lifting Bay",
      dueLabel: "Due soon",
      dueHours: 2,
      priority: "High",
      owner: "Sarah Evans",
      templateVersion: "Built in app",
      status: "amber",
      lastCompletedAt: "Yesterday 10:20",
      questions: buildDefaultQuestions("Lifting Equipment Check"),
    },
    {
      id: "audit-demo-housekeeping",
      name: "Housekeeping Walkaround",
      category: "Housekeeping",
      siteArea: "Factory Floor",
      dueLabel: "Due later",
      dueHours: 36,
      priority: "Medium",
      owner: "Tom Blake",
      templateVersion: "Built in app",
      status: "green",
      lastCompletedAt: "Today 07:10",
      questions: buildDefaultQuestions("Housekeeping Walkaround"),
    },
  ];

  const demoActions: ActionItem[] = [
    {
      id: "action-demo-extinguisher",
      companyId: "demo-company",
      auditId: "audit-demo-fire-bay2",
      auditName: "Bay 2 Fire Safety Inspection",
      questionId: "fire-extinguisher",
      questionText: "Replace damaged fire extinguisher — Bay 2",
      sourceAnswer: "fail",
      severity: "High",
      owner: "Tom Blake",
      assignedToUserId: "tom",
      assignedToName: "Tom Blake",
      createdByUserId: "manager",
      createdAt: "Today 08:10",
      dueDate: "Today",
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: [],
      comments: "Casing dented, pressure gauge in red zone.",
      recurrenceFlag: false,
      rootCause: "Impact damage from FLT movement",
      correctiveAction: "Replace extinguisher and complete monthly inspection tag",
      preventiveAction: "Install protective hoop at forklift pinch points",
      dueLabel: "Due today",
      dueHours: 10,
      status: "Open",
      evidenceCount: 0,
      noteIncluded: true,
      riskCategory: "Health & Safety",
    },
    {
      id: "action-demo-exit",
      companyId: "demo-company",
      auditId: "audit-demo-yard-safety",
      auditName: "Daily Yard Safety Check",
      questionId: "blocked-exit",
      questionText: "Clear blocked emergency exit — Casting Hall",
      sourceAnswer: "fail",
      severity: "Critical",
      owner: "Sarah Evans",
      assignedToUserId: "sarah",
      assignedToName: "Sarah Evans",
      createdByUserId: "manager",
      createdAt: "Yesterday 16:00",
      dueDate: "Overdue",
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: [],
      comments: "Pallet stack narrowing exit width below required clearance.",
      recurrenceFlag: true,
      rootCause: "Poor material staging",
      correctiveAction: "Clear egress and mark yellow no-storage box",
      preventiveAction: "Supervisor aisle walk each shift change",
      dueLabel: "Overdue",
      dueHours: -30,
      status: "Open",
      evidenceCount: 0,
      noteIncluded: true,
      riskCategory: "Health & Safety",
    },
    {
      id: "action-demo-guardrail",
      companyId: "demo-company",
      auditId: "audit-demo-lifting",
      auditName: "Lifting Equipment Check",
      questionId: "guardrail-evidence",
      questionText: "Upload evidence for repaired guard rail",
      sourceAnswer: "nc",
      severity: "Medium",
      owner: "Tom Blake",
      assignedToUserId: "tom",
      assignedToName: "Tom Blake",
      createdByUserId: "manager",
      createdAt: "Today 07:00",
      dueDate: "Due tomorrow",
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: [],
      comments: "Welded repair signed off locally; awaiting photo upload and manager verification.",
      recurrenceFlag: false,
      rootCause: "Incomplete close-out packet",
      correctiveAction: "Upload date-stamped guard rail photos",
      preventiveAction: "Require evidence checklist before marking complete",
      dueLabel: "Due soon",
      dueHours: 18,
      status: "Awaiting Verification",
      evidenceCount: 0,
      noteIncluded: true,
      riskCategory: "Operational",
    },
    {
      id: "action-demo-ppe-review",
      companyId: "demo-company",
      auditId: "audit-demo-ppe-weekly",
      auditName: "Weekly PPE Compliance Audit",
      questionId: "ppe-review",
      questionText: "Review repeated PPE non-conformance",
      sourceAnswer: "fail",
      severity: "High",
      owner: "James Cole",
      assignedToUserId: "manager",
      assignedToName: "James Cole",
      createdByUserId: "admin",
      createdAt: "Today 09:20",
      dueDate: "Due tomorrow",
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: [],
      comments: "Repeat observations in bays 1 and 3 near steel-fixing pours.",
      recurrenceFlag: true,
      rootCause: "Variable supervisor enforcement near pour windows",
      correctiveAction: "Manager-led toolbox talk plus signed commitment",
      preventiveAction: "Random PPE checks at pouring deck access",
      dueLabel: "Due soon",
      dueHours: 18,
      status: "In Progress",
      evidenceCount: 1,
      noteIncluded: true,
      riskCategory: "Health & Safety",
    },
    ...Array.from({ length: 4 }).map((_, index) => ({
      id: `action-demo-ppe-repeat-${index + 1}`,
      companyId: "demo-company",
      auditId: "audit-demo-ppe-weekly",
      auditName: "Weekly PPE Compliance Audit",
      questionId: `ppe-repeat-${index + 1}`,
      questionText: "PPE not worn correctly",
      sourceAnswer: "fail",
      severity: "High" as RiskLevel,
      owner: index % 2 === 0 ? "Tom Blake" : "Sarah Evans",
      assignedToUserId: index % 2 === 0 ? "tom" : "sarah",
      assignedToName: index % 2 === 0 ? "Tom Blake" : "Sarah Evans",
      createdByUserId: "manager",
      createdAt: "This week",
      dueDate: "Due this week",
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: [],
      comments: "Hi-vis or safety glasses incomplete during yard pour.",
      recurrenceFlag: true,
      rootCause: "Comfort / habit skipping PPE near familiar tasks",
      correctiveAction: "On-the-spot coaching and documented warning",
      preventiveAction: "PPE ambassadors on each casting line",
      dueLabel: "Due later",
      dueHours: 20 + index,
      status: "Open" as ActionStatus,
      evidenceCount: 0,
      noteIncluded: true,
      riskCategory: "Health & Safety" as RiskCategory,
    })),
    {
      id: "action-demo-fire-obstructed-1",
      companyId: "demo-company",
      auditId: "audit-demo-fire-bay2",
      auditName: "Bay 2 Fire Safety Inspection",
      questionId: "fire-obstructed-1",
      questionText: "Fire exits obstructed",
      sourceAnswer: "fail",
      severity: "Critical",
      owner: "Sarah Evans",
      assignedToUserId: "sarah",
      assignedToName: "Sarah Evans",
      createdByUserId: "manager",
      createdAt: "This week",
      dueDate: "Overdue",
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: [],
      comments: "Stacked shuttering pallets narrow exit effective width.",
      recurrenceFlag: true,
      rootCause: "Poor layout control",
      correctiveAction: "Clear marking and barrier until resolved",
      preventiveAction: "End-of-shift housekeeping audit",
      dueLabel: "Overdue",
      dueHours: -10,
      status: "Open",
      evidenceCount: 0,
      noteIncluded: true,
      riskCategory: "Health & Safety",
    },
    {
      id: "action-demo-fire-obstructed-2",
      companyId: "demo-company",
      auditId: "audit-demo-yard-safety",
      auditName: "Daily Yard Safety Check",
      questionId: "fire-obstructed-2",
      questionText: "Fire exits obstructed",
      sourceAnswer: "fail",
      severity: "High",
      owner: "Tom Blake",
      assignedToUserId: "tom",
      assignedToName: "Tom Blake",
      createdByUserId: "manager",
      createdAt: "This week",
      dueDate: "Due today",
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: [],
      comments: "Temporary materials creeping into egress during bay strip-out.",
      recurrenceFlag: true,
      rootCause: "Temporary works storage creep",
      correctiveAction: "Remove obstruction and widen marked lane",
      preventiveAction: "Daily supervisor route photo",
      dueLabel: "Due today",
      dueHours: 5,
      status: "In Progress",
      evidenceCount: 1,
      noteIncluded: true,
      riskCategory: "Operational",
    },
    ...Array.from({ length: 3 }).map((_, index) => ({
      id: `action-demo-housekeeping-repeat-${index + 1}`,
      companyId: "demo-company",
      auditId: "audit-demo-housekeeping",
      auditName: "Housekeeping Walkaround",
      questionId: `housekeeping-repeat-${index + 1}`,
      questionText: "Missing housekeeping sign-off",
      sourceAnswer: "nc",
      severity: "Medium" as RiskLevel,
      owner: index % 2 === 0 ? "Tom Blake" : "Sarah Evans",
      assignedToUserId: index % 2 === 0 ? "tom" : "sarah",
      assignedToName: index % 2 === 0 ? "Tom Blake" : "Sarah Evans",
      createdByUserId: "manager",
      createdAt: "This week",
      dueDate: "Due this week",
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: [],
      comments: "Shift close-out checklist incomplete on casting record.",
      recurrenceFlag: true,
      rootCause: "Handover overlap between crews",
      correctiveAction: "Backfill supervisory sign-off with time stamp",
      preventiveAction: "Digital lock on shift close before FLT entry",
      dueLabel: "Due later",
      dueHours: 30 + index,
      status: "Open" as ActionStatus,
      evidenceCount: 0,
      noteIncluded: true,
      riskCategory: "Operational" as RiskCategory,
    })),
  ];

  const demoDrafts: Record<string, AuditDraft> = {
    "audit-demo-yard-safety": {
      responses: {
        "Daily Yard Safety Check-q1": "pass",
        "Daily Yard Safety Check-q2": "fail",
      },
      notes: {
        "Daily Yard Safety Check-q2": "Forklift route crossing without clear barrier — barrier tape displaced overnight.",
      },
      evidence: {},
      updatedAt: "Today 10:12 (45% complete)",
    },
  };

  const demoSyncQueue: SyncQueueItem[] = [
    {
      id: "sync-demo-1",
      itemType: "auditSubmission",
      localId: "audit-demo-yard-local-copy",
      status: "Pending Sync",
      createdAt: "Today 10:15",
      updatedAt: "Today 10:15",
      retryCount: 0,
      lastError: "",
      payload: { auditName: "Daily Yard Safety Check (field draft)" },
    },
    {
      id: "sync-demo-2",
      itemType: "actionUpdate",
      localId: "action-demo-ppe-review",
      status: "Pending Sync",
      createdAt: "Today 10:18",
      updatedAt: "Today 10:18",
      retryCount: 0,
      lastError: "",
      payload: {},
    },
    {
      id: "sync-demo-3",
      itemType: "evidenceUpload",
      localId: "action-demo-guardrail-evidence-pack",
      status: "Failed",
      createdAt: "Today 10:20",
      updatedAt: "Today 10:21",
      retryCount: 1,
      lastError: "Evidence upload failed: network timeout",
      payload: {},
    },
  ];

  const demoTemplates: AuditTemplate[] = demoAudits.map((audit, index) => ({
    id: `template-demo-${index + 1}`,
    name: audit.name,
    active: true,
    questions: audit.questions,
    source: "Built in app",
  }));

  const companySheetSync: CompanySheetSyncStatus = {
    sheetId: "demo-master-sheet",
    sheetName: `${companyName} Master Sheet`,
    tabs: ["Onboarding", "Users", "Schedule", "Actions", "Notes", "Config"],
    usersCount: 5,
    schedulesCount: 4,
    onboardingCount: 3,
    actionsCount: demoActions.length,
    notesCount: 6,
    findingsCount: 9,
    evidenceCount: 4,
    reportsCount: 2,
    configCount: 1,
    lastSyncedAt: "12 minutes ago",
  };

  return {
    audits: demoAudits,
    actions: demoActions,
    drafts: demoDrafts,
    syncQueue: demoSyncQueue,
    templates: demoTemplates,
    companySheetSync,
  };
}

function riskScore(level: RiskLevel = "Low") {
  if (level === "Critical") return 4;
  if (level === "High") return 3;
  if (level === "Medium") return 2;
  return 1;
}

function maxRiskLevel(levels: RiskLevel[]) {
  if (levels.includes("Critical")) return "Critical";
  if (levels.includes("High")) return "High";
  if (levels.includes("Medium")) return "Medium";
  return "Low";
}

function parsePeopleList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSiteName(value: string | null | undefined) {
  return String(value || "").trim();
}

function createSiteId(name: string) {
  const normalized = normalizeSiteName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalized || `site-${Date.now()}`;
}

function resolveUserSiteAssignmentKey(user: User, invitedUsers: UserInvite[]): string {
  const invite = invitedUsers.find(
    (inv) =>
      normalizeIdentity(inv.email.split("@")[0]) === normalizeIdentity(user.username) ||
      normalizeIdentity(inv.email) === normalizeIdentity(user.username),
  );
  if (invite) return normalizeIdentity(invite.email);
  if (user.name.includes("@")) return normalizeIdentity(user.name);
  return normalizeIdentity(`${user.username}@qmsprecast.co.uk`);
}

function getUserAssignedSiteIds(
  role: Role,
  user: User | null,
  invitedUsers: UserInvite[],
  userSiteAssignments: UserSiteAssignments,
): Set<string> | null {
  if (!user) return null;
  if (role === "Master" || role === "Admin") return null;
  const key = resolveUserSiteAssignmentKey(user, invitedUsers);
  const ids = userSiteAssignments[key];
  if (!ids || ids.length === 0) return null;
  return new Set(ids);
}

function filterByAssignedSites<T extends { siteArea?: string }>(
  items: T[],
  allowedSiteIds: Set<string> | null,
  sites: Site[],
): T[] {
  if (!allowedSiteIds) return items;
  const allowedNames = new Set(
    sites.filter((s) => allowedSiteIds.has(s.id) && s.active).map((s) => normalizeIdentity(s.name)),
  );
  if (allowedNames.size === 0) return [];
  return items.filter((item) => {
    const area = normalizeIdentity(item.siteArea || "");
    return area && allowedNames.has(area);
  });
}

function filterNonConformancesByAssignedSites(
  records: NonConformanceRecord[],
  allowedSiteIds: Set<string> | null,
  sites: Site[],
): NonConformanceRecord[] {
  if (!allowedSiteIds) return records;
  const allowedNames = new Set(
    sites.filter((s) => allowedSiteIds.has(s.id) && s.active).map((s) => normalizeIdentity(s.name)),
  );
  if (allowedNames.size === 0) return [];
  return records.filter((r) => allowedNames.has(normalizeIdentity(r.site)));
}

function deriveSitesFromWorkspace(audits: Audit[], schedules: ScheduleItem[], managedSchedules: ManagedSchedule[]) {
  const names = new Set<string>();
  audits.forEach((audit) => {
    const site = normalizeSiteName(audit.siteArea);
    if (site) names.add(site);
  });
  schedules.forEach((schedule) => {
    const site = normalizeSiteName(schedule.siteArea);
    if (site) names.add(site);
  });
  void managedSchedules;
  if (names.size === 0) {
    names.add("Main site");
  }
  return Array.from(names).map((name) => ({
    id: createSiteId(name),
    name,
    code: name.slice(0, 3).toUpperCase(),
    active: true,
  }));
}

function safeLower(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function normalizeIdentity(value: string | null | undefined) {
  const normalized = safeLower(value);
  return normalized.replace(/\s+/g, " ").trim();
}

function buildIdentityTokens(user: CompanyReportUser) {
  const tokens = new Set<string>();
  [user.name, user.email, user.username, user.email.split("@")[0]].forEach((value) => {
    const normalized = normalizeIdentity(value);
    if (normalized) {
      tokens.add(normalized);
    }
  });
  return tokens;
}

function matchesIdentity(tokens: Set<string>, value: string | null | undefined) {
  const normalized = normalizeIdentity(value);
  return normalized ? tokens.has(normalized) : false;
}

function normalizeFolderName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.toLowerCase().startsWith("qms - ") ? trimmed : `QMS - ${trimmed}`;
}

function canAccessAdmin(role: Role) {
  return role === "Master" || role === "Admin";
}

/** Control (admin) workspace tab — company Admin only; God Mode uses Onboarding only. */
function canAccessControlScreen(role: Role) {
  return role === "Admin";
}

function getHomeScreenForRole(role: Role): Screen {
  if (role === "Master") {
    return "onboarding";
  }
  return "dashboard";
}

function canAccessSchedules(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager";
}

/** Master or Admin may use the in-app onboarding workspace tab (folder linking, user invites). */
function canAccessAdminOnboardingWorkspace(role: Role) {
  return role === "Master" || role === "Admin";
}

/** Dedicated Onboarding menu — company Admin and God Mode (platform setup). */
function canAccessOnboardingNav(role: Role) {
  return role === "Admin" || role === "Master";
}

function canAccessReports(role: Role) {
  return role !== "Auditor";
}

function canAccessActions(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager" || role === "Auditor";
}

function canAccessCompletedNcrReports(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager";
}

function canAccessAuditsCentre(role: Role) {
  return role !== "Auditor";
}

function canSubmitIncidents(_role: Role) {
  return true;
}

function canInvestigateIncidents(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager";
}

function canEditLegalName(role: Role) {
  return role === "Master" || role === "Admin";
}

function canRoleAccessNavItem(role: Role, itemId: NavItemId) {
  if (role === "Master") {
    return itemId === "onboarding" || itemId === "account";
  }
  if (itemId === "admin") return canAccessControlScreen(role);
  if (itemId === "onboarding") return canAccessOnboardingNav(role);
  if (itemId === "schedules") return canAccessSchedules(role);
  if (itemId === "reports") return canAccessReports(role);
  if (itemId === "incidents") return canSubmitIncidents(role);
  if (itemId === "actions" || itemId === "nonConformance") return canAccessActions(role);
  if (itemId === "audits") return canAccessAuditsCentre(role);
  return true;
}

function buildDefaultRoleNavVisibilityMatrix(): RoleNavVisibilityMatrix {
  const roles: Role[] = ["Master", "Admin", "Manager", "Auditor"];
  return roles.reduce((matrix, role) => {
    const visibility = navItems.reduce(
      (entry, item) => ({ ...entry, [item.id]: canRoleAccessNavItem(role, item.id) }),
      {} as Record<NavItemId, boolean>,
    );
    return { ...matrix, [role]: visibility };
  }, {} as RoleNavVisibilityMatrix);
}

function buildDefaultRoleSiteSelectorVisibility(): RoleSiteSelectorVisibility {
  return {
    Master: true,
    Admin: true,
    Manager: true,
    Auditor: true,
  };
}

function getRolePermissions(role: Role) {
  return {
    canManageUsers: role === "Master" || role === "Admin",
    canManageSchedules: role === "Master" || role === "Admin" || role === "Manager",
    canManageTemplates: role === "Master" || role === "Admin",
    canAssignActions: role === "Master" || role === "Admin" || role === "Manager",
    canVerifyActions: role === "Master" || role === "Admin" || role === "Manager",
    canExportReports: role !== "Auditor",
    canRepairWorkspace: role === "Master",
    canViewAllReports: role !== "Auditor",
  };
}

function getRoleDisplayName(role: Role) {
  return role === "Master" ? "God Mode" : role;
}

function normalizeScheduleFrequency(value: string): ScheduleFrequency {
  const normalized = value.trim().toLowerCase();
  if (normalized === "daily") return "Daily";
  if (normalized === "bi-weekly" || normalized === "biweekly" || normalized === "bi weekly") return "Bi-Weekly";
  if (normalized === "monthly" || normalized === "bi-monthly" || normalized === "3 monthly" || normalized === "6 monthly" || normalized === "12 monthly") {
    return "Monthly";
  }
  return "Weekly";
}

function getCreatableRoles(role: Role) {
  if (role === "Master" || role === "Admin") {
    return ["Admin", "Manager", "Auditor"] as Role[];
  }
  if (role === "Manager") {
    return ["Manager", "Auditor"] as Role[];
  }
  return [] as Role[];
}

function extractByKeys(record: Record<string, string>, candidates: string[]) {
  const entries = Object.entries(record || {});
  for (const [key, value] of entries) {
    const normalizedKey = key.trim().toLowerCase();
    if (candidates.some((candidate) => normalizedKey.includes(candidate)) && value) {
      return value.trim();
    }
  }
  return "";
}

function parseRole(value: string): Role | null {
  const lowered = value.trim().toLowerCase();
  if (lowered === "master" || lowered === "god mode") {
    return "Master";
  }
  if (lowered === "admin") {
    return "Admin";
  }
  if (lowered === "manager") {
    return "Manager";
  }
  if (lowered === "auditor") {
    return "Auditor";
  }
  return null;
}

function parseCompanyConfigPasswords(records: Record<string, string>[]) {
  const out: Record<string, string> = {};
  for (const row of records) {
    const key = String(row.Key || row.key || "").trim();
    const val = String(row.Value || row.value || "").trim();
    if (!key.toLowerCase().startsWith("userauth.") || !val) {
      continue;
    }
    const emailKey = key.slice("UserAuth.".length).trim();
    if (emailKey) {
      out[normalizeIdentity(emailKey)] = val;
    }
  }
  return out;
}

function parseCompanySheetUsers(records: Record<string, string>[]) {
  return records
    .map((record, index) => {
      const role = parseRole(extractByKeys(record, ["role"]));
      const email = extractByKeys(record, ["email"]);
      if (!role || !email) {
        return null;
      }

      return {
        id: `sheet-user-${index + 1}`,
        email,
        role,
        invitedBy: extractByKeys(record, ["owner", "created by", "invited by"]) || "Company sheet",
        sentAt: extractByKeys(record, ["created", "submitted", "updated"]) || "Imported",
        status: "Invite sent" as const,
      };
    })
    .filter(Boolean) as UserInvite[];
}

function parseCompanySheetSchedules(records: Record<string, string>[], companyFolderId: string) {
  return records
    .map((record, index) => {
      const auditName = extractByKeys(record, ["audit", "template", "name"]);
      if (!auditName) {
        return null;
      }

      return {
        id: `sheet-schedule-${companyFolderId}-${index + 1}`,
        companyFolderId,
        auditId: `sheet-audit-${companyFolderId}-${index + 1}`,
        auditName,
        siteArea: extractByKeys(record, ["area", "site"]) || "Main site",
        owner: extractByKeys(record, ["owner", "assignee"]) || "Unassigned",
        scope:
          extractByKeys(record, ["scope"]).toLowerCase().includes("personal")
            ? ("Personal schedule" as ScheduleScope)
            : ("Company schedule" as ScheduleScope),
        personalAssignee: extractByKeys(record, ["personal assignee", "assignee"]),
        frequency: normalizeScheduleFrequency(extractByKeys(record, ["frequency"])),
        sendTime: extractByKeys(record, ["send time", "time"]) || "08:00",
        recipients: parsePeopleList(extractByKeys(record, ["recipient"])),
        overdueAlertRecipients: parsePeopleList(extractByKeys(record, ["overdue", "alert"])),
        reportTo: extractByKeys(record, ["report to", "manager", "reports to"]),
        overdueAlertTiming:
          (extractByKeys(record, ["overdue timing", "overdue alert timing"]) as OverdueAlertTiming) || "At due time",
        completionCheckTiming:
          (extractByKeys(record, ["completion check", "completion timing"]) as CompletionCheckTiming) || "At due time",
        nextDueHours: Number(extractByKeys(record, ["due hours", "hours"])) || 24,
        priority: (extractByKeys(record, ["priority"]) as Priority) || "Medium",
      };
    })
    .filter(Boolean) as ScheduleItem[];
}

function parseManagedSchedules(records: Record<string, string>[], companyFolderId: string) {
  const grouped = new Map<string, ManagedSchedule>();

  records.forEach((record, index) => {
    const rowCompanyFolderId =
      extractByKeys(record, ["company folder id", "company folder", "folder id"]) || companyFolderId;
    if (rowCompanyFolderId !== companyFolderId) {
      return;
    }

    const scheduleId = extractByKeys(record, ["schedule id"]) || `schedule-row-${index + 1}`;
    const existing = grouped.get(scheduleId);
    const auditId = extractByKeys(record, ["audit id"]) || `audit-row-${index + 1}`;
    const auditName = extractByKeys(record, ["audit name", "audit", "template"]) || "Unnamed audit";

    const audit: ManagedScheduleAudit = {
      id: `${scheduleId}-${auditId}`,
      auditId,
      auditName,
      days: extractByKeys(record, ["days"])
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean) as ScheduleDay[],
      frequency: normalizeScheduleFrequency(extractByKeys(record, ["frequency"])),
      liveTime: extractByKeys(record, ["live time", "send time", "time"]) || "08:00",
      completionHours: Number(extractByKeys(record, ["completion hours", "due hours", "hours"])) || 24,
    };

    if (existing) {
      existing.audits.push(audit);
      return;
    }

    grouped.set(scheduleId, {
      id: scheduleId,
      rootId: extractByKeys(record, ["root id"]) || scheduleId,
      parentScheduleId: extractByKeys(record, ["parent schedule id"]) || undefined,
      versionNumber: Number(extractByKeys(record, ["version number"])) || 1,
      versionLabel: extractByKeys(record, ["version label"]) || "a",
      lifecycle: (extractByKeys(record, ["lifecycle"]) as ScheduleLifecycle) || "Live",
      companyFolderId: rowCompanyFolderId,
      scheduleName: extractByKeys(record, ["schedule name", "name"]) || "Unnamed schedule",
      audits: [audit],
      auditors: extractByKeys(record, ["auditors", "auditor"])
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      startDate: extractByKeys(record, ["start date"]),
      endDate: extractByKeys(record, ["end date"]),
      updatedAt: extractByKeys(record, ["updated at", "updated"]),
      archivedAt: extractByKeys(record, ["archived at"]) || undefined,
      reactivatedAt: extractByKeys(record, ["reactivated at"]) || undefined,
      escalationUserIds: parsePeopleList(extractByKeys(record, ["escalation user ids", "escalation users"])),
      triggerReauditOnFailure: safeLower(extractByKeys(record, ["trigger reaudit on failure"])) === "true",
      reauditDelayHours: Number(extractByKeys(record, ["reaudit delay hours"])) || undefined,
      missedAuditCount: Number(extractByKeys(record, ["missed audit count"])) || 0,
      lastCompletedAt: extractByKeys(record, ["last completed at"]) || undefined,
      nextDueAt: extractByKeys(record, ["next due at"]) || undefined,
      healthState: (extractByKeys(record, ["health state"]) as ScheduleHealthState) || undefined,
    });
  });

  return Array.from(grouped.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function parseCompanySheetActions(records: Record<string, string>[], companyFolderId: string) {
  return records
    .map((record, index) => {
      const rowCompanyId = extractByKeys(record, ["company id", "company folder id", "company"]);
      if (rowCompanyId && rowCompanyId !== companyFolderId) {
        return null;
      }
      const actionId = extractByKeys(record, ["action id"]) || `action-row-${index + 1}`;
      const auditId = extractByKeys(record, ["source audit id", "audit id"]);
      const auditName = extractByKeys(record, ["source audit name", "audit name"]);
      const questionText = extractByKeys(record, ["source question text", "question text"]);
      if (!actionId || !auditName) {
        return null;
      }
      const severity = (extractByKeys(record, ["severity"]) as RiskLevel) || "Medium";
      const createdAt = extractByKeys(record, ["created at"]) || "";
      const dueDate = extractByKeys(record, ["due date"]) || "";
      return {
        id: actionId,
        companyId: rowCompanyId || companyFolderId,
        siteArea: extractByKeys(record, ["site area", "site", "area"]),
        auditId,
        auditName,
        questionId: extractByKeys(record, ["source question id", "question id"]),
        questionText,
        sourceAnswer: extractByKeys(record, ["source answer", "answer"]),
        nonConformanceId: extractByKeys(record, ["non conformance id", "non-conformance id", "nc id"]),
        severity,
        owner: extractByKeys(record, ["assigned to name", "owner"]) || "Unassigned",
        assignedToUserId: extractByKeys(record, ["assigned to user id", "assigned user id"]),
        assignedToName: extractByKeys(record, ["assigned to name", "assigned to"]) || "Unassigned",
        createdByUserId: extractByKeys(record, ["created by user id", "created by"]),
        createdAt,
        dueDate,
        closedAt: extractByKeys(record, ["closed at"]),
        verifiedByUserId: extractByKeys(record, ["verified by user id", "verified by"]),
        verificationNotes: extractByKeys(record, ["verification notes"]),
        evidenceLinks: parsePeopleList(extractByKeys(record, ["evidence links"])),
        localEvidenceRefs: parsePeopleList(extractByKeys(record, ["local evidence refs", "local evidence"])),
        comments: extractByKeys(record, ["comments"]),
        recurrenceFlag: safeLower(extractByKeys(record, ["recurrence flag", "repeat flag"])) === "true",
        rootCause: extractByKeys(record, ["root cause"]),
        correctiveAction: extractByKeys(record, ["corrective action"]),
        preventiveAction: extractByKeys(record, ["preventive action"]),
        dueLabel: dueDate || getDueLabel(ACTION_DUE_DAYS_BY_SEVERITY[severity] * 24),
        dueHours: dueDate ? Math.round((new Date(dueDate).getTime() - Date.now()) / 36e5) : ACTION_DUE_DAYS_BY_SEVERITY[severity] * 24,
        status: (extractByKeys(record, ["status"]) as ActionStatus) || "Open",
        evidenceCount: Number(extractByKeys(record, ["evidence count"])) || parsePeopleList(extractByKeys(record, ["local evidence refs", "local evidence"])).length,
        noteIncluded: Boolean(extractByKeys(record, ["comments", "notes"])),
        riskCategory: (extractByKeys(record, ["risk category", "category"]) as RiskCategory) || "Other",
        evidenceRequired: safeLower(extractByKeys(record, ["requires photo evidence", "evidence required"])) === "true",
        requiresManagerReview: safeLower(extractByKeys(record, ["requires manager review"])) === "true",
      } satisfies ActionItem;
    })
    .filter(Boolean) as ActionItem[];
}

function addDaysIso(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function parseNonConformanceSequence(nonConformanceId?: string) {
  if (!nonConformanceId) return null;
  const match = nonConformanceId.match(/^NC-(\d+)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function getNextNonConformanceSequence(items: ActionItem[]) {
  const maxValue = items.reduce((max, item) => {
    const parsed = parseNonConformanceSequence(item.nonConformanceId);
    if (parsed === null) return max;
    return Math.max(max, parsed);
  }, 0);
  return maxValue + 1;
}

function formatNonConformanceId(sequence: number) {
  return `NC-${String(sequence).padStart(5, "0")}`;
}

function parseNcrSequence(reference: string) {
  const match = reference.match(/^NCR-(\d+)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function getNextNcrSequence(items: NonConformanceRecord[]) {
  const maxValue = items.reduce((max, item) => {
    const parsed = parseNcrSequence(item.reference);
    if (parsed === null) return max;
    return Math.max(max, parsed);
  }, 0);
  return maxValue + 1;
}

function formatNcrReference(sequence: number) {
  return `NCR-${String(sequence).padStart(4, "0")}`;
}

function computeScheduleHealthState(schedule: ManagedSchedule): ScheduleHealthState {
  if (schedule.lifecycle === "Archived") {
    return "Paused";
  }
  if (schedule.healthState === "Paused") {
    if (schedule.nextDueAt) {
      const resumeAt = new Date(schedule.nextDueAt).getTime();
      if (Number.isFinite(resumeAt) && resumeAt > Date.now()) {
        return "Paused";
      }
    } else {
      return "Paused";
    }
  }
  if ((schedule.missedAuditCount || 0) > 0) {
    return "Failing";
  }
  if (schedule.nextDueAt) {
    const diffHours = Math.round((new Date(schedule.nextDueAt).getTime() - Date.now()) / 36e5);
    if (diffHours < 0) return "Overdue";
    if (diffHours < amberThresholdHours) return "Due Soon";
  }
  return "Healthy";
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function extractGoogleResourceId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  const directIdMatch = trimmed.match(/^[A-Za-z0-9_-]{20,}$/);
  if (directIdMatch) {
    return directIdMatch[0];
  }

  const pathMatch = trimmed.match(/\/d\/([A-Za-z0-9_-]+)/);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  const folderMatch = trimmed.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (folderMatch?.[1]) {
    return folderMatch[1];
  }

  const queryMatch = trimmed.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  return trimmed;
}

function isAuditCompleted(audit: Audit) {
  return !["Not yet completed", "Not completed yet"].includes(audit.lastCompletedAt);
}

function formatScheduleVersionLabel(versionNumber: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return alphabet[versionNumber - 1] || `v${versionNumber}`;
}

function openPrintableReport(title: string, bodyHtml: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
  if (!printWindow) {
    return false;
  }

  printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      h2 { margin: 24px 0 10px; font-size: 18px; }
      p { margin: 0 0 8px; line-height: 1.5; }
      ul { margin: 8px 0 16px 18px; padding: 0; }
      li { margin: 0 0 6px; }
      .meta { color: #475569; font-size: 12px; margin-bottom: 18px; }
      .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin: 0 0 16px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media print { body { margin: 16px; } }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}

function readStoredFolderLinks() {
  try {
    const raw = window.localStorage.getItem(folderLinksStorageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as {
      folderNameInput?: string;
      folderIdInput?: string;
      auditFormsFolderInput?: string;
      masterSheetInput?: string;
      evidenceFolderInput?: string;
      healthSafetyFolderInput?: string;
      exportsFolderInput?: string;
      adminNotesFolderInput?: string;
    };
  } catch {
    return null;
  }
}

function readStoredWorkspaceState() {
  try {
    const raw = window.localStorage.getItem(workspaceStateStorageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as {
      audits?: Audit[];
      history?: HistoryEntry[];
      actions?: ActionItem[];
      nonConformances?: NonConformanceRecord[];
      schedules?: ScheduleItem[];
      templates?: AuditTemplate[];
      drafts?: Record<string, AuditDraft>;
      managedSchedules?: ManagedSchedule[];
      folders?: CompanyFolder[];
      selectedFolderId?: string;
      syncState?: string;
      invitedUsers?: UserInvite[];
      sites?: Site[];
      selectedSiteId?: string;
      companySheetSync?: CompanySheetSyncStatus | null;
      reportInbox?: ReportItem[];
      syncQueue?: SyncQueueItem[];
      incidents?: IncidentRecord[];
      incidentActions?: IncidentCorrectiveAction[];
      auditAccessOverrides?: AuditAccessOverrideMap;
      managerAlerts?: ManagerAlert[];
      roleNavVisibility?: RoleNavVisibilityMatrix;
      roleSiteSelectorVisibility?: RoleSiteSelectorVisibility;
      userSiteAssignments?: UserSiteAssignments;
    };
  } catch {
    return null;
  }
}

function readStoredUserProfilePhotos() {
  try {
    const raw = window.localStorage.getItem(userProfilePhotosStorageKey);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function readStoredUserNicknames() {
  try {
    const raw = window.localStorage.getItem(userNicknamesStorageKey);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/** First-ever visit (no persisted workspace blob) loads isolated local demo payloads; clears when real workspace data replaces localStorage. */
function getWorkspaceBootstrap() {
  const rawKey = window.localStorage.getItem(workspaceStateStorageKey);
  const stored = readStoredWorkspaceState();
  if (rawKey === null) {
    const demo = buildDemoPrecastWorkspace();
    return {
      audits: demo.audits,
      history: initialHistory,
      actions: demo.actions,
      schedules: initialSchedules,
      templates: demo.templates,
      nonConformances: initialNonConformances,
      drafts: demo.drafts,
      managedSchedules: [] as ManagedSchedule[],
      folders: [] as CompanyFolder[],
      selectedFolderId: "",
      syncState: "Synced",
      invitedUsers: [] as UserInvite[],
      sites: deriveSitesFromWorkspace(demo.audits, initialSchedules, []),
      selectedSiteId: "",
      companySheetSync: demo.companySheetSync,
      reportInbox: [] as ReportItem[],
      syncQueue: demo.syncQueue,
      incidents: [] as IncidentRecord[],
      incidentActions: [] as IncidentCorrectiveAction[],
      auditAccessOverrides: {} as AuditAccessOverrideMap,
      managerAlerts: [] as ManagerAlert[],
      roleNavVisibility: buildDefaultRoleNavVisibilityMatrix(),
      roleSiteSelectorVisibility: buildDefaultRoleSiteSelectorVisibility(),
      userSiteAssignments: {} as UserSiteAssignments,
    };
  }

  return {
    audits: stored?.audits ?? initialAudits,
    history: stored?.history ?? initialHistory,
    actions: stored?.actions ?? initialActions,
    nonConformances: stored?.nonConformances ?? initialNonConformances,
    schedules: stored?.schedules ?? initialSchedules,
    templates: stored?.templates ?? initialTemplates,
    drafts: stored?.drafts ?? {},
    managedSchedules: stored?.managedSchedules ?? [],
    folders: stored?.folders ?? [],
    selectedFolderId: stored?.selectedFolderId ?? "",
    syncState: stored?.syncState ?? "Not synced",
    invitedUsers: stored?.invitedUsers ?? [],
    sites: stored?.sites ?? deriveSitesFromWorkspace(stored?.audits ?? initialAudits, stored?.schedules ?? initialSchedules, stored?.managedSchedules ?? []),
    selectedSiteId: stored?.selectedSiteId ?? "",
    companySheetSync: stored?.companySheetSync ?? null,
    reportInbox: stored?.reportInbox ?? [],
    syncQueue: stored?.syncQueue ?? initialSyncQueue,
    incidents: stored?.incidents ?? initialIncidents,
    incidentActions: stored?.incidentActions ?? initialIncidentActions,
    auditAccessOverrides: stored?.auditAccessOverrides ?? {},
    managerAlerts: stored?.managerAlerts ?? [],
    roleNavVisibility: stored?.roleNavVisibility ?? buildDefaultRoleNavVisibilityMatrix(),
    roleSiteSelectorVisibility: stored?.roleSiteSelectorVisibility ?? buildDefaultRoleSiteSelectorVisibility(),
    userSiteAssignments: stored?.userSiteAssignments ?? {},
  };
}

function readStoredPreviewOrientation(): PreviewOrientation {
  try {
    const raw = window.localStorage.getItem(previewOrientationStorageKey);
    return raw === "landscape" ? "landscape" : "portrait";
  } catch {
    return "portrait";
  }
}

function defaultDashboardPreferences(): DashboardPreferences {
  return {
    trafficBoard: true,
    liveSummary: true,
    upcomingAudits: true,
    openActions: true,
    complianceSnapshot: true,
  };
}

function defaultDashboardSectionOrder(): DashboardSectionKey[] {
  return ["trafficBoard", "liveSummary", "upcomingAudits", "openActions", "complianceSnapshot"];
}

function readStoredDashboardPreferences(): DashboardPreferences {
  const defaults = defaultDashboardPreferences();
  try {
    const raw = window.localStorage.getItem(dashboardPreferencesStorageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<DashboardPreferences>;
    return {
      trafficBoard: parsed.trafficBoard ?? defaults.trafficBoard,
      liveSummary: parsed.liveSummary ?? defaults.liveSummary,
      upcomingAudits: parsed.upcomingAudits ?? defaults.upcomingAudits,
      openActions: parsed.openActions ?? defaults.openActions,
      complianceSnapshot: parsed.complianceSnapshot ?? defaults.complianceSnapshot,
    };
  } catch {
    return defaults;
  }
}

function readStoredDashboardSectionOrder(): DashboardSectionKey[] {
  const defaults = defaultDashboardSectionOrder();
  try {
    const raw = window.localStorage.getItem(dashboardSectionOrderStorageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as DashboardSectionKey[];
    const valid = parsed.filter((item): item is DashboardSectionKey => defaults.includes(item));
    const missing = defaults.filter((item) => !valid.includes(item));
    return [...valid, ...missing];
  } catch {
    return defaults;
  }
}

function useDashboardSectionLayout(storageKey: string, defaultOrder: string[]) {
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaultOrder;
      const parsed = JSON.parse(raw) as { order?: string[] };
      const safeOrder = (parsed.order || []).filter((item) => defaultOrder.includes(item));
      const missing = defaultOrder.filter((item) => !safeOrder.includes(item));
      return [...safeOrder, ...missing];
    } catch {
      return defaultOrder;
    }
  });
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(defaultOrder.map((key) => [key, true])) as Record<string, boolean>;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as { visibility?: Record<string, boolean> };
      const visibility = { ...defaults };
      Object.entries(parsed.visibility || {}).forEach(([key, value]) => {
        if (key in visibility) visibility[key] = Boolean(value);
      });
      return visibility;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        order: sectionOrder,
        visibility: sectionVisibility,
      }),
    );
  }, [storageKey, sectionOrder, sectionVisibility]);

  const visibleSectionOrder = sectionOrder.filter((key) => sectionVisibility[key]);

  const toggleSection = (section: string) => {
    setSectionVisibility((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const moveSection = (section: string, direction: "up" | "down") => {
    setSectionOrder((current) => {
      const index = current.indexOf(section);
      if (index < 0) return current;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return {
    showLayoutOptions,
    setShowLayoutOptions,
    sectionOrder,
    sectionVisibility,
    visibleSectionOrder,
    toggleSection,
    moveSection,
  };
}

function DataFlowBackground({ className = "", showBase = true }: { className?: string; showBase?: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${showBase ? "bg-[#020817]" : ""} ${className}`.trim()}>
      {showBase && <div className="absolute inset-0 bg-[#020617]" />}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_42%,rgba(59,130,246,0.14),transparent_14%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_48%,rgba(249,115,22,0.07),transparent_30%)]" />
      <svg
        className="absolute left-1/2 top-1/3 h-full w-[120%] -translate-x-1/2 opacity-50"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="heroStrand" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="18%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#dbeafe" stopOpacity="1" />
            <stop offset="76%" stopColor="#2563eb" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="coreLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#eff6ff" stopOpacity="1" />
            <stop offset="35%" stopColor="#93c5fd" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse
          cx="980"
          cy="350"
          rx="230"
          ry="48"
          fill="url(#coreLight)"
          opacity="0.95"
          stroke="#f97316"
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />

        {Array.from({ length: 210 }).map((_, index) => {
          const t = index / 209;
          const startY = 20 + t * 650 + Math.sin(index * 0.3) * 22;
          const gatherY = 350 + (t - 0.5) * 18;
          const endY = 110 + t * 470;
          const swingA = Math.sin(index * 0.16) * 220;
          const swingB = Math.cos(index * 0.21) * 120;
          const width = index % 18 === 0 ? 1.5 : index % 3 === 0 ? 0.95 : 0.55;
          const opacity = index % 7 === 0 ? 0.85 : 0.34;

          return (
            <path
              key={`strand-${index}`}
              d={`M-80 ${startY}
                  C 180 ${startY + swingA},
                    460 ${gatherY + swingB},
                    820 ${gatherY}
                  S 1120 ${gatherY + (t - 0.5) * 10},
                    1480 ${endY}`}
              stroke="url(#heroStrand)"
              strokeWidth={width}
              fill="none"
              opacity={opacity}
            />
          );
        })}

        {Array.from({ length: 1400 }).map((_, index) => {
          const cluster = index % 4 === 0;
          const x = cluster ? 10 + (index % 80) * 14 : 1130 + (index % 34) * 14;
          const y = cluster
            ? 20 + Math.floor(index / 80) * 22 + Math.sin(index * 0.6) * 10
            : 25 + Math.floor(index / 34) * 16;

          if (cluster) {
            return (
              <text
                key={`particle-${index}`}
                x={x}
                y={y}
                fill="#93c5fd"
                opacity={0.04 + (index % 8) * 0.012}
                fontSize={index % 20 === 0 ? "10" : "7"}
                fontFamily="monospace"
              >
                {index % 2 === 0 ? "1" : "0"}
              </text>
            );
          }

          return (
            <circle
              key={`particle-${index}`}
              cx={x}
              cy={y}
              r={0.45}
              fill="#93c5fd"
              opacity="0.07"
              stroke="#fb923c"
              strokeOpacity="0.4"
              strokeWidth="0.35"
            />
          );
        })}

        {Array.from({ length: 1600 }).map((_, index) => {
          const col = index % 50;
          const row = Math.floor(index / 50);
          const x = 1080 + col * 11;
          const y = 20 + row * 14;

          return (
            <text
              key={`binary-${index}`}
              x={x}
              y={y}
              fill="#60a5fa"
              opacity={Math.max(0.03, 0.46 - col * 0.008)}
              fontSize="8"
              fontFamily="monospace"
            >
              {index % 4 === 0 ? "01" : index % 4 === 1 ? "10" : index % 4 === 2 ? "11" : "00"}
            </text>
          );
        })}

        {Array.from({ length: 90 }).map((_, index) => {
          const y = 120 + index * 6;
          return (
            <path
              key={`output-${index}`}
              d={`M1000 ${y} C 1120 ${y}, 1260 ${y + Math.sin(index) * 12}, 1480 ${y}`}
              stroke="#3b82f6"
              strokeWidth="0.5"
              fill="none"
              opacity="0.22"
            />
          );
        })}
      </svg>
    </div>
  );
}

type AppInviteDetails =
  | { ok: true; kind: "new_company"; email: string; invitedBy: string }
  | { ok: true; kind: "company_user"; email: string; role: Role; invitedBy: string; companyName: string };

function AppHostedOnboardingCompletion({ inviteToken }: { inviteToken: string }) {
  const [details, setDetails] = useState<AppInviteDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ title: string; message: string } | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/onboarding/app-invites/${encodeURIComponent(inviteToken)}`);
        const payload = (await parseJsonApiResponse(response)) as AppInviteDetails & { ok?: boolean; error?: string };
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setLoadError(payload.error || "This invite link is not valid.");
          return;
        }
        setDetails(payload as AppInviteDetails);
      } catch {
        if (!cancelled) {
          setLoadError("Unable to load invite details. Check your connection and try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    if (!fullName.trim()) {
      setSubmitError("Full name is required.");
      return;
    }
    if (details?.kind === "new_company" && !companyName.trim()) {
      setSubmitError("Company name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/onboarding/app-invites/${encodeURIComponent(inviteToken)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          companyName: details?.kind === "new_company" ? companyName.trim() : undefined,
          password,
          confirmPassword,
        }),
      });
      const payload = (await parseJsonApiResponse(response)) as { ok?: boolean; error?: string; folderUrl?: string; outcome?: string };
      if (!response.ok || !payload.ok) {
        setSubmitError(payload.error || "Unable to complete onboarding.");
        return;
      }
      if (payload.outcome === "new_company") {
        setDone({
          title: "Company workspace created",
          message: payload.folderUrl
            ? `Your company folder is ready. You can sign in with your email and the password you chose. Drive folder: ${payload.folderUrl}`
            : "You can sign in with your email and the password you chose.",
        });
      } else {
        setDone({
          title: "Account ready",
          message: "You can sign in with your email address and the password you chose.",
        });
      }
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={[
        "min-h-[100dvh] px-4 py-8",
        "bg-[radial-gradient(circle_at_top,#0f172a,transparent_40%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]",
        "text-slate-100",
      ].join(" ")}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
          <BertLogo variant="full" tone="onDark" size="md" className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400/90">Onboarding</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {!details
                ? "Complete onboarding"
                : details.kind === "company_user"
                  ? `Join ${details.companyName || "your company"}`
                  : "New company setup"}
            </h1>
          </div>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-100">{loadError}</div>
        )}

        {done && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-5 text-sm leading-6 text-blue-50">
            <p className="text-base font-semibold text-white">{done.title}</p>
            <p className="mt-2">{done.message}</p>
            <a
              href="/"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-orange-400 px-4 text-sm font-semibold text-slate-950 no-underline"
            >
              Go to sign in
            </a>
          </div>
        )}

        {!loadError && !done && details && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <p className="text-sm text-slate-300">
              {details.kind === "new_company"
                ? `Create your company workspace and administrator account for ${details.email}.`
                : `Join ${details.companyName || "your company"} as ${details.role}. You will sign in with ${details.email}.`}
            </p>
            {details.invitedBy && (
              <p className="text-xs text-slate-500">
                Invited by {details.invitedBy}
              </p>
            )}
            {details.kind === "new_company" && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Company name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-sm text-white outline-none focus:border-orange-400/60"
                  placeholder="Acme Precast Ltd"
                  autoComplete="organization"
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Your full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-sm text-white outline-none focus:border-orange-400/60"
                placeholder="Jane Smith"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Choose password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-sm text-white outline-none focus:border-orange-400/60"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-sm text-white outline-none focus:border-orange-400/60"
                autoComplete="new-password"
              />
            </div>
            {submitError && <p className="text-sm text-rose-300">{submitError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-2xl bg-orange-400 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Complete onboarding"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function App() {
  const actionsPersistReadyRef = useRef(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>(() => readStoredPreviewOrientation());
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(desktopSidebarCollapsedStorageKey) === "true";
    } catch {
      return false;
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [companySetupLoginPortal, setCompanySetupLoginPortal] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("setup") === "master";
    } catch {
      return false;
    }
  });
  const [godCompanySetupSession, setGodCompanySetupSession] = useState(() => {
    try {
      return window.localStorage.getItem(masterCompanySetupSessionKey) === "1";
    } catch {
      return false;
    }
  });
  const workspaceBootstrapRef = useRef<ReturnType<typeof getWorkspaceBootstrap> | null>(null);
  if (!workspaceBootstrapRef.current) {
    workspaceBootstrapRef.current = getWorkspaceBootstrap();
  }
  const storedWorkspaceState = workspaceBootstrapRef.current;
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(() =>
    readStoredDashboardPreferences(),
  );
  const [dashboardSectionOrder, setDashboardSectionOrder] = useState<DashboardSectionKey[]>(() =>
    readStoredDashboardSectionOrder(),
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountNameInput, setAccountNameInput] = useState("");
  const [accountNicknameInput, setAccountNicknameInput] = useState("");
  const [accountPhotoUrl, setAccountPhotoUrl] = useState("");
  const [userProfilePhotos, setUserProfilePhotos] = useState<Record<string, string>>(() => readStoredUserProfilePhotos());
  const [userNicknames, setUserNicknames] = useState<Record<string, string>>(() => readStoredUserNicknames());
  const [audits, setAudits] = useState<Audit[]>(storedWorkspaceState?.audits || initialAudits);
  const [history, setHistory] = useState<HistoryEntry[]>(storedWorkspaceState?.history || initialHistory);
  const [actions, setActions] = useState<ActionItem[]>(storedWorkspaceState?.actions || initialActions);
  const [nonConformances, setNonConformances] = useState<NonConformanceRecord[]>(storedWorkspaceState?.nonConformances || initialNonConformances);
  const [incidents, setIncidents] = useState<IncidentRecord[]>(storedWorkspaceState?.incidents || initialIncidents);
  const [incidentActions, setIncidentActions] = useState<IncidentCorrectiveAction[]>(storedWorkspaceState?.incidentActions || initialIncidentActions);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(storedWorkspaceState?.schedules || initialSchedules);
  const [sites, setSites] = useState<Site[]>(storedWorkspaceState?.sites || deriveSitesFromWorkspace(storedWorkspaceState?.audits || initialAudits, storedWorkspaceState?.schedules || initialSchedules, storedWorkspaceState?.managedSchedules || []));
  const [selectedSiteId, setSelectedSiteId] = useState<string>(storedWorkspaceState?.selectedSiteId || "");
  const [templates, setTemplates] = useState<AuditTemplate[]>(storedWorkspaceState?.templates || initialTemplates);
  const [drafts, setDrafts] = useState<Record<string, AuditDraft>>(storedWorkspaceState?.drafts || {});
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, Answer>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, EvidenceItem[]>>({});
  const [evidenceDebugLabel, setEvidenceDebugLabel] = useState("");
  const [auditModeQuestionIndex, setAuditModeQuestionIndex] = useState(0);
  const [issuePrompt, setIssuePrompt] = useState<IssuePromptState | null>(null);
  const [auditCompletionSummary, setAuditCompletionSummary] = useState<AuditCompletionSummaryState | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [signatureSignedAt, setSignatureSignedAt] = useState("");
  const [offlineMode, setOfflineMode] = useState(!window.navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineSubmission[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(storedWorkspaceState?.syncQueue || initialSyncQueue);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [backendConfigured, setBackendConfigured] = useState(false);
  const [sharedDriveId, setSharedDriveId] = useState("");
  const [onboardingSource, setOnboardingSource] = useState<OnboardingSource | null>(null);
  const [onboardingRecords, setOnboardingRecords] = useState<OnboardingRecord[]>([]);
  const [onboardingRecordsLoading, setOnboardingRecordsLoading] = useState(false);
  const [selectedOnboardingRecordId, setSelectedOnboardingRecordId] = useState("");
  const [googleStatusLoading, setGoogleStatusLoading] = useState(false);
  const [folderInspection, setFolderInspection] = useState<FolderInspection | null>(null);
  const [folderInspectionLoading, setFolderInspectionLoading] = useState(false);
  const [workspaceValidation, setWorkspaceValidation] = useState<WorkspaceValidation | null>(null);
  const [workspaceValidationLoading, setWorkspaceValidationLoading] = useState(false);
  const storedFolderLinks = readStoredFolderLinks();
  const [folderNameInput, setFolderNameInput] = useState(storedFolderLinks?.folderNameInput || "");
  const [folderIdInput, setFolderIdInput] = useState(storedFolderLinks?.folderIdInput || "");
  const [auditFormsFolderInput, setAuditFormsFolderInput] = useState(storedFolderLinks?.auditFormsFolderInput || "");
  const [masterSheetInput, setMasterSheetInput] = useState(storedFolderLinks?.masterSheetInput || "");
  const [evidenceFolderInput, setEvidenceFolderInput] = useState(storedFolderLinks?.evidenceFolderInput || "");
  const [healthSafetyFolderInput, setHealthSafetyFolderInput] = useState(storedFolderLinks?.healthSafetyFolderInput || "");
  const [exportsFolderInput, setExportsFolderInput] = useState(storedFolderLinks?.exportsFolderInput || "");
  const [adminNotesFolderInput, setAdminNotesFolderInput] = useState(storedFolderLinks?.adminNotesFolderInput || "");
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateQuestionInput, setTemplateQuestionInput] = useState("");
  const [templateQuestionTypeInput, setTemplateQuestionTypeInput] = useState<AuditQuestion["fieldType"]>("Traffic light");
  const [templateDraftQuestions, setTemplateDraftQuestions] = useState<DraftTemplateQuestion[]>([]);
  const [scheduleNameInput, setScheduleNameInput] = useState("");
  const [scheduleAreaInput, setScheduleAreaInput] = useState("");
  const [scheduleOwnerInput, setScheduleOwnerInput] = useState(DEFAULT_MANAGER_NAME);
  const [scheduleScopeInput, setScheduleScopeInput] = useState<ScheduleScope>("Company schedule");
  const [schedulePersonalAssigneeInput, setSchedulePersonalAssigneeInput] = useState(DEFAULT_AUDITOR_NAME);
  const [scheduleFrequencyInput, setScheduleFrequencyInput] = useState<ScheduleFrequency>("Weekly");
  const [scheduleSendTimeInput, setScheduleSendTimeInput] = useState("08:00");
  const [scheduleRecipientsInput, setScheduleRecipientsInput] = useState(DEFAULT_AUDITOR_NAME);
  const [scheduleOverdueAlertRecipientsInput, setScheduleOverdueAlertRecipientsInput] = useState(DEFAULT_MANAGER_NAME);
  const [scheduleEscalationContactInput, setScheduleEscalationContactInput] = useState(DEFAULT_ESCALATION_NAME);
  const [scheduleOverdueAlertTimingInput, setScheduleOverdueAlertTimingInput] =
    useState<OverdueAlertTiming>("At due time");
  const [scheduleCompletionCheckTimingInput, setScheduleCompletionCheckTimingInput] =
    useState<CompletionCheckTiming>("At due time");
  const [scheduleNextDueHoursInput, setScheduleNextDueHoursInput] = useState("24");
  const [schedulePriorityInput, setSchedulePriorityInput] = useState<Priority>("Medium");
  const [managedSchedules, setManagedSchedules] = useState<ManagedSchedule[]>(storedWorkspaceState?.managedSchedules || []);
  const [scheduleListFilter, setScheduleListFilter] = useState<ScheduleListFilter>("Live");
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleDraftName, setScheduleDraftName] = useState("");
  const [scheduleDraftSelectedAuditIds, setScheduleDraftSelectedAuditIds] = useState<string[]>([]);
  const [scheduleDraftAudits, setScheduleDraftAudits] = useState<ManagedScheduleAudit[]>([]);
  const [scheduleDraftStartDate, setScheduleDraftStartDate] = useState("");
  const [scheduleDraftEndDate, setScheduleDraftEndDate] = useState("");
  const [scheduleDraftContinuous, setScheduleDraftContinuous] = useState(true);
  const [scheduleDraftAuditors, setScheduleDraftAuditors] = useState<string[]>([]);
  const [scheduleValidationAttempted, setScheduleValidationAttempted] = useState(false);
  const [folders, setFolders] = useState<CompanyFolder[]>(storedWorkspaceState?.folders || []);
  const [selectedFolderId, setSelectedFolderId] = useState(storedWorkspaceState?.selectedFolderId || "");
  const [syncState, setSyncState] = useState(storedWorkspaceState?.syncState || "Not synced");
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteRoleInput, setInviteRoleInput] = useState<Role>("Manager");
  const [invitedUsers, setInvitedUsers] = useState<UserInvite[]>(storedWorkspaceState?.invitedUsers || []);
  const [godModeAppInviteEmail, setGodModeAppInviteEmail] = useState("");
  const [companyAuthPasswords, setCompanyAuthPasswords] = useState<Record<string, string>>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [companySheetSync, setCompanySheetSync] = useState<CompanySheetSyncStatus | null>(storedWorkspaceState?.companySheetSync || null);
  const [selectedReportTemplate, setSelectedReportTemplate] = useState<ReportTemplateType>("Executive summary");
  const [reportTitleInput, setReportTitleInput] = useState(`${companyName} Executive Summary`);
  const [reportRecipients, setReportRecipients] = useState<string[]>([]);
  const [selectedReportSections, setSelectedReportSections] = useState<ReportSectionKey[]>(
    reportTemplateDefaults["Executive summary"],
  );
  const [reportInbox, setReportInbox] = useState<ReportItem[]>(storedWorkspaceState?.reportInbox || []);
  const [auditAccessOverrides, setAuditAccessOverrides] = useState<AuditAccessOverrideMap>(
    storedWorkspaceState?.auditAccessOverrides || {},
  );
  const [managerAlerts, setManagerAlerts] = useState<ManagerAlert[]>(storedWorkspaceState?.managerAlerts || []);
  const [roleNavVisibility, setRoleNavVisibility] = useState<RoleNavVisibilityMatrix>(
    storedWorkspaceState?.roleNavVisibility || buildDefaultRoleNavVisibilityMatrix(),
  );
  const [roleSiteSelectorVisibility, setRoleSiteSelectorVisibility] = useState<RoleSiteSelectorVisibility>(
    storedWorkspaceState?.roleSiteSelectorVisibility || buildDefaultRoleSiteSelectorVisibility(),
  );
  const [userSiteAssignments, setUserSiteAssignments] = useState<UserSiteAssignments>(
    storedWorkspaceState?.userSiteAssignments ?? {},
  );
  const [actionFilter, setActionFilter] = useState<"Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity">("Open");
  const [actionSeverityFilter, setActionSeverityFilter] = useState<RiskLevel | "All">("All");
  const [actionNcFilter, setActionNcFilter] = useState<string>("All");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const activeAudit = useMemo(
    () => audits.find((audit) => audit.id === activeAuditId) ?? null,
    [audits, activeAuditId],
  );

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? null,
    [sites, selectedSiteId],
  );

  const currentUserAssignedSiteIds = useMemo(() => {
    if (!currentUser) return null;
    return getUserAssignedSiteIds(currentUser.role, currentUser, invitedUsers, userSiteAssignments);
  }, [currentUser, invitedUsers, userSiteAssignments]);

  const assignmentFilteredAudits = useMemo(
    () => filterByAssignedSites(audits, currentUserAssignedSiteIds, sites),
    [audits, currentUserAssignedSiteIds, sites],
  );
  const assignmentFilteredActions = useMemo(
    () => filterByAssignedSites(actions, currentUserAssignedSiteIds, sites),
    [actions, currentUserAssignedSiteIds, sites],
  );
  const assignmentFilteredSchedules = useMemo(
    () => filterByAssignedSites(schedules, currentUserAssignedSiteIds, sites),
    [schedules, currentUserAssignedSiteIds, sites],
  );
  const assignmentFilteredNonConformances = useMemo(
    () => filterNonConformancesByAssignedSites(nonConformances, currentUserAssignedSiteIds, sites),
    [nonConformances, currentUserAssignedSiteIds, sites],
  );
  const assignmentFilteredHistory = useMemo(() => {
    if (!currentUserAssignedSiteIds) return history;
    const allowedNames = new Set(
      sites.filter((s) => currentUserAssignedSiteIds.has(s.id) && s.active).map((s) => normalizeIdentity(s.name)),
    );
    if (allowedNames.size === 0) return [];
    return history.filter((entry) => {
      const audit = audits.find((a) => a.id === entry.auditId);
      if (!audit) return true;
      return allowedNames.has(normalizeIdentity(audit.siteArea));
    });
  }, [history, audits, currentUserAssignedSiteIds, sites]);

  const headerSelectableSites = useMemo(() => {
    const active = sites.filter((site) => site.active);
    if (!currentUserAssignedSiteIds) return active;
    return active.filter((site) => currentUserAssignedSiteIds.has(site.id));
  }, [sites, currentUserAssignedSiteIds]);

  const siteScopedAudits = useMemo(() => {
    if (!selectedSite) return assignmentFilteredAudits;
    const selectedName = normalizeIdentity(selectedSite.name);
    return assignmentFilteredAudits.filter((audit) => normalizeIdentity(audit.siteArea) === selectedName);
  }, [assignmentFilteredAudits, selectedSite]);

  const siteScopedActions = useMemo(() => {
    if (!selectedSite) return assignmentFilteredActions;
    const selectedName = normalizeIdentity(selectedSite.name);
    return assignmentFilteredActions.filter((action) => !action.siteArea || normalizeIdentity(action.siteArea) === selectedName);
  }, [assignmentFilteredActions, selectedSite]);

  const siteScopedSchedules = useMemo(() => {
    if (!selectedSite) return assignmentFilteredSchedules;
    const selectedName = normalizeIdentity(selectedSite.name);
    return assignmentFilteredSchedules.filter((schedule) => normalizeIdentity(schedule.siteArea) === selectedName);
  }, [assignmentFilteredSchedules, selectedSite]);

  const getStoredProfilePhoto = (user: User | null) => {
    if (!user) return "";
    return userProfilePhotos[user.username] || userProfilePhotos[user.name.toLowerCase()] || "";
  };

  const workspaceName = selectedFolder?.name || companyName;

  const activeOnboardingRecord = useMemo(
    () => onboardingRecords.find((record) => record.id === selectedOnboardingRecordId) ?? null,
    [onboardingRecords, selectedOnboardingRecordId],
  );

  const selectedFolderSchedules = useMemo(
    () => siteScopedSchedules.filter((schedule) => schedule.companyFolderId === selectedFolderId),
    [siteScopedSchedules, selectedFolderId],
  );

  const groupedAudits = useMemo(
    () => ({
      green: siteScopedAudits.filter((audit) => !isAuditCompleted(audit) && getAuditTrafficStatus(audit.dueHours) === "green"),
      amber: siteScopedAudits.filter((audit) => !isAuditCompleted(audit) && getAuditTrafficStatus(audit.dueHours) === "amber"),
      red: siteScopedAudits.filter((audit) => !isAuditCompleted(audit) && getAuditTrafficStatus(audit.dueHours) === "red"),
    }),
    [siteScopedAudits],
  );

  const compliance = useMemo(() => {
    if (siteScopedAudits.length === 0) {
      return 0;
    }
    const safeCount = siteScopedAudits.filter((audit) => getAuditTrafficStatus(audit.dueHours) === "green").length;
    return Math.round((safeCount / siteScopedAudits.length) * 100);
  }, [siteScopedAudits]);

  const priorCompliance = useMemo(() => {
    const recent = history.slice(0, 6);
    const greenCount = recent.filter((item) => item.status === "green").length;
    return recent.length > 0 ? Math.round((greenCount / recent.length) * 100) : compliance;
  }, [history, compliance]);

  const complianceDelta = compliance - priorCompliance;

  const openActions = useMemo(() => actions.filter((action) => action.status !== "Closed"), [actions]);
  const overdueActions = useMemo(() => openActions.filter((action) => action.dueHours < 0), [openActions]);
  const criticalActions = useMemo(() => openActions.filter((action) => action.severity === "Critical" || action.severity === "High"), [openActions]);
  const awaitingVerificationActions = useMemo(() => openActions.filter((action) => action.status === "Awaiting Verification"), [openActions]);
  const overdueAudits = useMemo(
    () => siteScopedAudits.filter((audit) => !isAuditCompleted(audit) && getAuditTrafficStatus(audit.dueHours) === "red"),
    [siteScopedAudits],
  );
  const evidenceCount = useMemo(
    () => Object.values(evidence).reduce((total, items) => total + items.length, 0),
    [evidence],
  );
  const completedToday = useMemo(
    () =>
      history.filter((entry) => {
        const today = new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: scheduleTimeZone,
        }).format(new Date());
        return entry.completedAt.includes(today);
      }).length,
    [history],
  );
  const auditCompletionRate = useMemo(() => {
    const total = siteScopedAudits.length + history.length;
    if (total === 0) return 0;
    return Math.round((history.length / total) * 100);
  }, [siteScopedAudits.length, history.length]);
  const actionClosureRate = useMemo(() => {
    if (siteScopedActions.length === 0) return 0;
    return Math.round((siteScopedActions.filter((item) => item.status === "Closed").length / siteScopedActions.length) * 100);
  }, [siteScopedActions]);
  const pendingSyncCount = useMemo(
    () => syncQueue.filter((item) => item.status === "Pending Sync" || item.status === "Syncing").length,
    [syncQueue],
  );
  const failedSyncCount = useMemo(
    () => syncQueue.filter((item) => item.status === "Failed" || item.status === "Conflict").length,
    [syncQueue],
  );
  const unsyncedSubmittedAuditIds = useMemo(
    () =>
      new Set(
        syncQueue
          .filter(
            (item) =>
              item.itemType === "auditSubmission" &&
              (item.status === "Pending Sync" ||
                item.status === "Syncing" ||
                item.status === "Failed" ||
                item.status === "Conflict"),
          )
          .map((item) => item.localId),
      ),
    [syncQueue],
  );
  const averageActionClosureDays = useMemo(() => {
    const closed = siteScopedActions.filter((item) => item.closedAt && item.createdAt);
    if (closed.length === 0) return 0;
    const totalDays = closed.reduce((sum, item) => {
      const diff = new Date(item.closedAt).getTime() - new Date(item.createdAt).getTime();
      return sum + Math.max(1, Math.round(diff / 86400000));
    }, 0);
    return Math.round(totalDays / closed.length);
  }, [siteScopedActions]);
  const recurringFailedQuestions = useMemo(() => {
    const map = new Map<string, number>();
    siteScopedActions.forEach((action) => {
      map.set(action.questionText, (map.get(action.questionText) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [siteScopedActions]);
  const topOverdueSchedules = useMemo(() => {
    return managedSchedules
      .filter((item) => computeScheduleHealthState(item) === "Overdue" || computeScheduleHealthState(item) === "Failing")
      .sort((a, b) => (b.missedAuditCount || 0) - (a.missedAuditCount || 0))
      .slice(0, 5);
  }, [managedSchedules]);
  const riskSummary = useMemo(() => {
    const levels: RiskLevel[] = [];
    let total = 0;
    let critical = 0;
    let high = 0;
    siteScopedAudits.forEach((audit) => {
      levels.push(audit.highestRiskLevel || "Low");
      total += audit.totalRiskScore || 0;
      critical += audit.numberOfCriticalFindings || 0;
      high += audit.numberOfHighFindings || 0;
    });
    return {
      totalRiskScore: total,
      highestRiskLevel: levels.length ? maxRiskLevel(levels) : ("Low" as RiskLevel),
      criticalFindings: critical,
      highFindings: high,
    };
  }, [siteScopedAudits]);
  const visibleActions = useMemo(() => {
    const withEscalation = (items: ActionItem[]) =>
      items.map((action) => ({
        ...action,
        escalated: isEscalated(action),
        isStuck: isStuck(action),
      }));
    if (!currentUser) return withEscalation(siteScopedActions);
    const permissions = getRolePermissions(currentUser.role);
    if (permissions.canAssignActions) return withEscalation(siteScopedActions);
    return withEscalation(siteScopedActions.filter((action) => action.assignedToName === currentUser.name || action.assignedToUserId === currentUser.username));
  }, [siteScopedActions, currentUser]);
  const filteredActions = useMemo(() => {
    let next = [...visibleActions];
    if (actionFilter === "Open") {
      next = next.filter((item) => item.status === "Open" || item.status === "In Progress");
    } else if (actionFilter === "Overdue") {
      next = next.filter((item) => isOverdue(item));
    } else if (actionFilter === "Awaiting Verification") {
      next = next.filter((item) => item.status === "Awaiting Verification");
    } else if (actionFilter === "Closed") {
      next = next.filter((item) => item.status === "Closed");
    }
    if (actionSeverityFilter !== "All") {
      next = next.filter((item) => item.severity === actionSeverityFilter);
    }
    if (actionNcFilter !== "All") {
      next = next.filter((item) => item.nonConformanceId === actionNcFilter);
    }
    return next;
  }, [visibleActions, actionFilter, actionSeverityFilter, actionNcFilter]);
  const availableNonConformanceIds = useMemo(
    () =>
      Array.from(new Set(visibleActions.map((item) => item.nonConformanceId).filter((value): value is string => Boolean(value)))).sort(
        (left, right) => left.localeCompare(right, undefined, { numeric: true }),
      ),
    [visibleActions],
  );

  const demoModeActive = useMemo(
    () =>
      siteScopedAudits.some((audit) => audit.id.startsWith("audit-demo-")) ||
      siteScopedActions.some((action) => action.id.startsWith("action-demo-")) ||
      syncQueue.some((item) => item.id.startsWith("sync-demo-")),
    [siteScopedAudits, siteScopedActions, syncQueue],
  );

  const godCompanySetupOnlyShell = Boolean(currentUser?.role === "Master" && godCompanySetupSession);

  const roleLabel = useMemo(() => {
    if (!currentUser) {
      return "";
    }
    if (currentUser.role === "Master" && godCompanySetupSession) {
      return "Company workspace onboarding only — sign out when finished";
    }
    if (currentUser.role === "Master") {
      return "Onboarding — connect Google, link the company workspace, and go live";
    }
    if (currentUser.role === "Admin") {
      return "Platform configuration and template control";
    }
    if (currentUser.role === "Manager") {
      return "Review actions, overdue items, and compliance risk";
    }
    return "Complete assigned audits and capture site outcomes";
  }, [currentUser]);
  const currentUserAppName = useMemo(() => {
    if (!currentUser) {
      return "";
    }
    return userNicknames[currentUser.username]?.trim() || currentUser.name;
  }, [currentUser, userNicknames, godCompanySetupSession]);

  const visibleNavItems = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (currentUser.role === "Master" && godCompanySetupSession) {
      const onboardingOnly = navItems.find((item) => item.id === "onboarding");
      return onboardingOnly ? [onboardingOnly] : [];
    }
    const filtered = navItems.filter((item) => {
      const baselineVisible = canRoleAccessNavItem(currentUser.role, item.id);
      if (item.id === "incidents") {
        return baselineVisible;
      }
      const matrixVisible = roleNavVisibility[currentUser.role]?.[item.id] ?? baselineVisible;
      return baselineVisible && matrixVisible;
    });

    // Safety net: always surface onboarding when role has onboarding access.
    if (
      canAccessOnboardingNav(currentUser.role) &&
      (roleNavVisibility[currentUser.role]?.["onboarding"] ?? true) &&
      !filtered.some((item) => item.id === "onboarding")
    ) {
      const onboardingItem = navItems.find((item) => item.id === "onboarding");
      if (onboardingItem) {
        const accountIndex = filtered.findIndex((item) => item.id === "account");
        if (accountIndex >= 0) {
          filtered.splice(accountIndex, 0, onboardingItem);
        } else {
          filtered.push(onboardingItem);
        }
      }
    }

    return filtered;
  }, [currentUser, roleNavVisibility, godCompanySetupSession]);
  const showSiteSelectorForRole = currentUser ? (roleSiteSelectorVisibility[currentUser.role] ?? true) : true;

  const creatableRoles = useMemo(
    () => (currentUser ? getCreatableRoles(currentUser.role) : []),
    [currentUser],
  );

  const companyReportUsers = useMemo(() => {
    const seededUsers = users
      .filter((user) => user.role !== "Master")
      .map((user) => ({
        username: user.username,
        email:
          user.username === "admin"
            ? "andy@qmsprecast.co.uk"
            : user.username === "manager"
              ? "james@qmsprecast.co.uk"
              : user.username === "tom"
                ? "tom@qmsprecast.co.uk"
                : "sarah@qmsprecast.co.uk",
        name: user.name,
        role: user.role,
      }));
    const invited = invitedUsers.map((invite) => ({
      username: invite.email.toLowerCase(),
      email: invite.email,
      name: invite.email,
      role: invite.role,
    }));
    const merged = [...seededUsers, ...invited];
    return merged.filter((user, index, list) => list.findIndex((item) => item.email === user.email) === index);
  }, [invitedUsers]);

  const onboardingPasswordByEmail = useMemo(() => {
    const lookup = new Map<string, string>();
    onboardingRecords.forEach((record) => {
      const email = normalizeIdentity(record.contactEmail);
      const password = extractByKeys(record.raw, ["password", "passcode", "pin", "login"]);
      if (email && password) {
        lookup.set(email, password);
      }
    });
    return lookup;
  }, [onboardingRecords]);

  const loginUsers = useMemo(() => {
    const invitedLoginUsers = invitedUsers.map((invite) => ({
      username: invite.email.toLowerCase(),
      password:
        companyAuthPasswords[normalizeIdentity(invite.email)] ||
        onboardingPasswordByEmail.get(normalizeIdentity(invite.email)) ||
        "demo",
      role: invite.role,
      name: invite.email,
    }));
    const merged = [...users, ...invitedLoginUsers];
    return merged.filter(
      (user, index, list) =>
        list.findIndex((item) => item.username === user.username && item.role === user.role) === index,
    );
  }, [invitedUsers, onboardingPasswordByEmail, companyAuthPasswords]);

  const availableScheduleAudits = useMemo(() => {
    const templateOptions = templates
      .filter((template) => template.active)
      .map((template) => ({ id: template.id, name: template.name }));
    const auditOptions = audits.map((audit) => ({ id: audit.id, name: audit.name }));
    const merged = [...templateOptions, ...auditOptions];
    return merged.filter((item, index, list) => list.findIndex((entry) => entry.name === item.name) === index);
  }, [templates, audits]);

  const currentUserAuditAccess = useMemo(() => {
    if (!currentUser) {
      return { allowedAuditIds: new Set<string>(), allowedAuditNames: new Set<string>() };
    }
    const normalizedName = normalizeIdentity(currentUser.name);
    const normalizedUsername = normalizeIdentity(currentUser.username);
    const normalizedDefaultEmail = normalizeIdentity(`${currentUser.username}@qmsprecast.co.uk`);
    const matchingEmails = new Set(
      companyReportUsers
        .filter((user) => {
          const userName = normalizeIdentity(user.name);
          const userEmail = normalizeIdentity(user.email);
          const userEmailLocalPart = normalizeIdentity(user.email.split("@")[0]);
          const userUsername = normalizeIdentity(user.username || "");
          return (
            userName === normalizedName ||
            userEmail === normalizedDefaultEmail ||
            userEmailLocalPart === normalizedUsername ||
            userUsername === normalizedUsername
          );
        })
        .map((user) => normalizeIdentity(user.email)),
    );
    matchingEmails.add(normalizedDefaultEmail);

    const allowedAuditIds = new Set<string>();
    Object.entries(auditAccessOverrides).forEach(([key, access]) => {
      const [email, auditId] = key.split("::");
      if (!email || !auditId) return;
      if (access === "No access") return;
      if (!matchingEmails.has(normalizeIdentity(email))) return;
      allowedAuditIds.add(auditId);
    });

    const allowedAuditNames = new Set<string>();
    availableScheduleAudits.forEach((option) => {
      if (allowedAuditIds.has(option.id)) {
        allowedAuditNames.add(option.name);
      }
    });
    return { allowedAuditIds, allowedAuditNames };
  }, [currentUser, companyReportUsers, auditAccessOverrides, availableScheduleAudits]);

  const assignedAudits = useMemo(() => {
    if (!currentUser) {
      return siteScopedAudits.filter((audit) => !isAuditCompleted(audit));
    }
    if (canAccessAdmin(currentUser.role) || currentUser.role === "Manager") {
      return siteScopedAudits.filter((audit) => !isAuditCompleted(audit));
    }
    return siteScopedAudits.filter((audit) => {
      if (isAuditCompleted(audit)) return false;
      if (audit.owner === currentUser.name) return true;
      if (currentUserAuditAccess.allowedAuditIds.has(audit.id)) return true;
      if (currentUserAuditAccess.allowedAuditNames.has(audit.name)) return true;
      return false;
    });
  }, [siteScopedAudits, currentUser, currentUserAuditAccess]);

  const availableScheduleAuditors = useMemo(() => {
    const seeded = users.filter((user) => user.role === "Auditor").map((user) => user.name);
    const invited = invitedUsers.filter((invite) => invite.role === "Auditor").map((invite) => invite.email);
    return [...seeded, ...invited].filter((item, index, list) => list.indexOf(item) === index);
  }, [invitedUsers]);
  const currentManagerAlerts = useMemo(() => {
    if (!currentUser || currentUser.role !== "Manager") {
      return [];
    }
    const usernameEmail = `${currentUser.username}@qmsprecast.co.uk`.toLowerCase();
    const normalizedName = currentUser.name.toLowerCase();
    return managerAlerts.filter(
      (alert) =>
        (alert.managerNames.some((name) => name.toLowerCase() === normalizedName) ||
          alert.managerEmails.some((email) => email.toLowerCase() === usernameEmail)) &&
        !alert.readBy.includes(currentUser.username),
    );
  }, [currentUser, managerAlerts]);

  const visibleSchedules = useMemo(() => {
    if (!selectedFolderId) {
      return managedSchedules;
    }

    const companySchedules = managedSchedules.filter((schedule) => schedule.companyFolderId === selectedFolderId);
    if (scheduleListFilter === "All schedules") {
      return companySchedules;
    }
    return companySchedules.filter((schedule) => schedule.lifecycle === scheduleListFilter);
  }, [managedSchedules, scheduleListFilter, selectedFolderId]);

  const auditScheduleMatrix = useMemo<Record<string, AuditScheduleMatrixInfo>>(() => {
    const byAuditId: Record<string, AuditScheduleMatrixInfo> = {};
    const sortedLive = managedSchedules
      .filter((schedule) => schedule.lifecycle === "Live" && (!selectedFolderId || schedule.companyFolderId === selectedFolderId))
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || ""));

    for (const schedule of sortedLive) {
      for (const audit of schedule.audits) {
        if (byAuditId[audit.auditId]) {
          continue;
        }
        byAuditId[audit.auditId] = {
          scheduleName: schedule.scheduleName,
          versionLabel: schedule.versionLabel,
          frequency: audit.frequency,
          days: audit.days,
          liveTime: audit.liveTime,
          completionHours: audit.completionHours,
        };
      }
    }

    return byAuditId;
  }, [managedSchedules, selectedFolderId]);

  const auditAccessMatrix = useMemo<AuditAccessMatrixRow[]>(() => {
    const liveSchedules = managedSchedules.filter(
      (schedule) =>
        schedule.lifecycle === "Live" &&
        (!selectedFolderId || schedule.companyFolderId === selectedFolderId),
    );

    return companyReportUsers.map((user) => {
      const identityTokens = buildIdentityTokens(user);
      const cells = availableScheduleAudits.map((auditOption) => {
        const matchingSchedules = liveSchedules.filter((schedule) =>
          schedule.audits.some(
            (scheduleAudit) =>
              scheduleAudit.auditId === auditOption.id || scheduleAudit.auditName === auditOption.name,
          ),
        );
        const scheduledAssignments = matchingSchedules.filter((schedule) =>
          schedule.auditors.some((auditor) => matchesIdentity(identityTokens, auditor)),
        );
        const directAuditAssignments = audits.filter(
          (audit) =>
            (audit.id === auditOption.id || audit.name === auditOption.name) &&
            matchesIdentity(identityTokens, audit.owner),
        );

        let access: AuditAccessLevel = "No access";
        let detail = "No live assignment";

        if (user.role === "Admin") {
          access = "Full access";
          detail = "Manage, assign, verify, export";
        } else if (user.role === "Manager") {
          access = "Oversight";
          detail = "View, assign, verify";
        } else if (scheduledAssignments.length > 0 || directAuditAssignments.length > 0) {
          access = "Complete";
          detail =
            scheduledAssignments.length > 0
              ? `${scheduledAssignments.length} live schedule${scheduledAssignments.length === 1 ? "" : "s"}`
              : "Direct audit assignment";
        }

        const override = auditAccessOverrides[buildAuditAccessOverrideKey(user.email, auditOption.id)];
        if (override) {
          access = override;
          detail = `Manual override: ${override}`;
        }

        return {
          auditId: auditOption.id,
          auditName: auditOption.name,
          access,
          detail,
          hasAccess: access !== "No access",
        };
      });

      return {
        email: user.email,
        name: user.name,
        role: user.role,
        accessibleCount: cells.filter((cell) => cell.hasAccess).length,
        cells,
      };
    });
  }, [companyReportUsers, availableScheduleAudits, managedSchedules, selectedFolderId, audits, auditAccessOverrides]);

  const handleToggleAuditAccess = (email: string, auditId: string, currentAccess: AuditAccessLevel) => {
    const cycleOrder: AuditAccessLevel[] = ["No access", "Complete", "Oversight", "Full access"];
    const currentIndex = cycleOrder.indexOf(currentAccess);
    const nextAccess = cycleOrder[(currentIndex + 1) % cycleOrder.length];
    setAuditAccessOverrides((current) => ({
      ...current,
      [buildAuditAccessOverrideKey(email, auditId)]: nextAccess,
    }));
  };

  const getSelectedManagersForAudit = (auditId: string) => {
    return auditAccessMatrix
      .filter((row) => row.role === "Manager")
      .filter((row) => row.cells.some((cell) => cell.auditId === auditId && cell.access !== "No access"))
      .map((row) => ({ name: row.name, email: row.email }));
  };

  const notifySelectedManagersForNonCompliance = (
    audit: Audit,
    submittedBy: string,
    nonComplianceCount: number,
    queuedForSync: boolean,
  ) => {
    if (nonComplianceCount <= 0) {
      return;
    }

    const selectedManagers = getSelectedManagersForAudit(audit.id);
    if (selectedManagers.length === 0) {
      return;
    }

    const managerEmails = selectedManagers.map((item) => item.email).filter(Boolean);
    const managerNames = selectedManagers.map((item) => item.name).filter(Boolean);
    const managerLabel = managerNames.length > 0 ? managerNames.join(", ") : managerEmails.join(", ");

    setManagerAlerts((current) => [
      {
        id: `manager-alert-${audit.id}-${Date.now()}`,
        auditId: audit.id,
        auditName: audit.name,
        submittedBy,
        nonComplianceCount,
        queuedForSync,
        createdAt: formatStamp(),
        managerEmails,
        managerNames,
        readBy: [],
      },
      ...current,
    ]);

    pushToast(
      "Manager informed",
      queuedForSync
        ? `Non-compliance found. ${managerLabel} will be alerted when sync completes.`
        : `Non-compliance found. ${managerLabel} have been alerted.`,
      "warning",
    );
    triggerNotification(
      "Manager informed",
      `${audit.name} has ${nonComplianceCount} non-compliance item${nonComplianceCount === 1 ? "" : "s"}.`,
    );

    if (managerEmails.length > 0) {
      void fetch("/api/manager/non-compliance-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: managerEmails,
          auditName: audit.name,
          submittedBy,
          nonComplianceCount,
          queuedForSync,
        }),
      }).catch(() => undefined);
    }
  };

  const markManagerAlertRead = (alertId: string) => {
    if (!currentUser || currentUser.role !== "Manager") {
      return;
    }
    setManagerAlerts((current) =>
      current.map((alert) =>
        alert.id === alertId && !alert.readBy.includes(currentUser.username)
          ? { ...alert, readBy: [...alert.readBy, currentUser.username] }
          : alert,
      ),
    );
  };

  const canSubmitAudit = useMemo(() => {
    if (!activeAudit) {
      return false;
    }
    return activeAudit.questions.every((question) => responses[question.id]);
  }, [activeAudit, responses]);

  const deviceTimeLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: scheduleTimeZone,
      }).format(new Date()),
    [screen, offlineMode, currentUser?.role],
  );
  const shellPreviewClass = previewOrientation === "landscape" ? "qms-force-landscape" : "";

  useEffect(() => {
    const storedUser = window.localStorage.getItem(userStorageKey);
    if (!storedUser) {
      return;
    }

    try {
      const parsed = JSON.parse(storedUser) as User;
      const matchedUser = loginUsers.find(
        (user) =>
          user.username === parsed.username &&
          user.role === parsed.role &&
          user.name === parsed.name,
      );

      if (matchedUser) {
        setCurrentUser(matchedUser);
        setAccountNameInput(matchedUser.name);
        setAccountPhotoUrl(getStoredProfilePhoto(matchedUser));
        try {
          if (matchedUser.role === "Master" && window.localStorage.getItem(masterCompanySetupSessionKey) === "1") {
            setGodCompanySetupSession(true);
          } else {
            if (matchedUser.role !== "Master") {
              window.localStorage.removeItem(masterCompanySetupSessionKey);
            }
            setGodCompanySetupSession(false);
          }
        } catch {
          setGodCompanySetupSession(false);
        }
      } else {
        window.localStorage.removeItem(userStorageKey);
      }
    } catch {
      window.localStorage.removeItem(userStorageKey);
    }
  }, [loginUsers]);

  useEffect(() => {
    const syncSetupPortalFromUrl = () => {
      try {
        setCompanySetupLoginPortal(new URLSearchParams(window.location.search).get("setup") === "master");
      } catch {
        setCompanySetupLoginPortal(false);
      }
    };
    window.addEventListener("popstate", syncSetupPortalFromUrl);
    return () => window.removeEventListener("popstate", syncSetupPortalFromUrl);
  }, []);

  useEffect(() => {
    const storedQueue = window.localStorage.getItem(offlineQueueStorageKey);
    if (!storedQueue) {
      return;
    }

    try {
      setOfflineQueue(JSON.parse(storedQueue) as OfflineSubmission[]);
    } catch {
      window.localStorage.removeItem(offlineQueueStorageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(offlineQueueStorageKey, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    window.localStorage.setItem(userProfilePhotosStorageKey, JSON.stringify(userProfilePhotos));
  }, [userProfilePhotos]);

  useEffect(() => {
    window.localStorage.setItem(
      folderLinksStorageKey,
      JSON.stringify({
        folderNameInput,
        folderIdInput,
        auditFormsFolderInput,
        masterSheetInput,
        evidenceFolderInput,
        healthSafetyFolderInput,
        exportsFolderInput,
        adminNotesFolderInput,
      }),
    );
  }, [
    folderNameInput,
    folderIdInput,
    auditFormsFolderInput,
    masterSheetInput,
    evidenceFolderInput,
    healthSafetyFolderInput,
    exportsFolderInput,
    adminNotesFolderInput,
  ]);

  useEffect(() => {
    window.localStorage.setItem(
      workspaceStateStorageKey,
      JSON.stringify({
        audits,
        history,
        actions,
        nonConformances,
        incidents,
        incidentActions,
        schedules,
        templates,
        drafts,
        managedSchedules,
        folders,
        sites,
        selectedSiteId,
        selectedFolderId,
        syncState,
        invitedUsers,
        companySheetSync,
        reportInbox,
        syncQueue,
        auditAccessOverrides,
        managerAlerts,
        roleNavVisibility,
        roleSiteSelectorVisibility,
        userSiteAssignments,
      }),
    );
  }, [
    audits,
    history,
    actions,
    nonConformances,
    incidents,
    incidentActions,
    schedules,
    templates,
    drafts,
    managedSchedules,
    folders,
    sites,
    selectedSiteId,
    selectedFolderId,
    syncState,
    invitedUsers,
    companySheetSync,
    reportInbox,
    syncQueue,
    auditAccessOverrides,
    managerAlerts,
    roleNavVisibility,
    roleSiteSelectorVisibility,
    userSiteAssignments,
  ]);

  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    const derivedSites = deriveSitesFromWorkspace(audits, schedules, managedSchedules);
    setSites((current) => {
      const merged = [...current];
      derivedSites.forEach((site) => {
        if (!merged.some((item) => normalizeIdentity(item.name) === normalizeIdentity(site.name))) {
          merged.push(site);
        }
      });
      return merged;
    });
  }, [audits, schedules, managedSchedules]);

  useEffect(() => {
    if (!selectedSiteId) return;
    const allowedIds = new Set(headerSelectableSites.map((site) => site.id));
    if (!allowedIds.has(selectedSiteId)) {
      setSelectedSiteId(headerSelectableSites[0]?.id ?? "");
    }
  }, [selectedSiteId, headerSelectableSites]);

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  const incidentEscalationSeverities: IncidentSeverity[] = ["Lost Time Injury", "Major Incident", "Fatality"];

  const generateIncidentNumber = (incidentDate: string) => {
    const year = (incidentDate || new Date().toISOString().slice(0, 10)).slice(0, 4) || String(new Date().getFullYear());
    const existingNumbers = incidents
      .map((item) => item.incidentId)
      .filter((value) => value.startsWith(`INC-${year}-`))
      .map((value) => Number(value.split("-")[2] || 0))
      .filter((value) => Number.isFinite(value));
    const next = (existingNumbers.length ? Math.max(...existingNumbers) : 0) + 1;
    return `INC-${year}-${String(next).padStart(3, "0")}`;
  };

  const sendIncidentNotification = async (incident: IncidentRecord) => {
    const response = await fetch("/api/incidents/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentId: incident.incidentId,
        incidentType: incident.incidentType,
        severity: incident.severity,
        reporter: incident.reporterName,
        department: incident.department,
        location: incident.location,
        status: incident.status,
        incidentDate: incident.incidentDate,
        incidentTime: incident.incidentTime,
        priority: incident.priority,
        escalated: incident.priority === "High",
        viewLink: `${window.location.origin}/?screen=incidents&id=${encodeURIComponent(incident.id)}`,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || "Incident notification could not be sent.");
    }
  };

  const submitIncidentReport = async (payload: {
    incidentType: IncidentType;
    severity: IncidentSeverity;
    incidentDate: string;
    incidentTime: string;
    reporterName: string;
    reporterEmail: string;
    department: string;
    location: string;
    description: string;
    immediateAction: string;
    injured: boolean;
    injuryDetails: string;
    contributingFactors: string;
    witnesses: string;
    evidenceUrls: IncidentEvidenceItem[];
  }) => {
    if (!currentUser) {
      throw new Error("You must be signed in to submit incidents.");
    }
    if (!payload.incidentType || !payload.severity || !payload.incidentDate || !payload.reporterName || !payload.department || !payload.location || !payload.description) {
      throw new Error("Complete all required incident fields before submitting.");
    }
    if (payload.injured && !payload.injuryDetails.trim()) {
      throw new Error("Injury details are required when an injury is reported.");
    }

    const now = new Date().toISOString();
    const incidentId = generateIncidentNumber(payload.incidentDate);
    const highPriority = incidentEscalationSeverities.includes(payload.severity);
    const assignedTo = highPriority
      ? users.find((user) => user.role === "Master")?.name || "System Setup"
      : users.find((user) => user.role === "Manager")?.name || "Unassigned";

    const incident: IncidentRecord = {
      id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      incidentId,
      status: "Open",
      priority: highPriority ? "High" : "Normal",
      incidentType: payload.incidentType,
      severity: payload.severity,
      incidentDate: payload.incidentDate,
      incidentTime: payload.incidentTime,
      reporterName: payload.reporterName,
      reporterEmail: payload.reporterEmail,
      department: payload.department,
      location: payload.location,
      description: payload.description,
      immediateAction: payload.immediateAction,
      injured: payload.injured,
      injuryDetails: payload.injuryDetails,
      contributingFactors: payload.contributingFactors,
      witnesses: payload.witnesses,
      evidenceUrls: payload.evidenceUrls,
      assignedTo,
      investigationNotes: "",
      rootCause: "",
      correctiveActions: "",
      preventiveActions: "",
      actionOwner: "",
      dueDate: "",
      completionDate: "",
      riddorRequired: false,
      closedBy: "",
      closedAt: "",
      notificationStatus: "Pending",
      statusHistory: [{ at: now, from: "", to: "Open", by: currentUser.name, note: "Incident submitted" }],
      createdAt: now,
      createdBy: currentUser.name,
      updatedAt: now,
      updatedBy: currentUser.name,
    };

    setIncidents((current) => [incident, ...current]);

    try {
      await sendIncidentNotification(incident);
      setIncidents((current) => current.map((item) => (item.id === incident.id ? { ...item, notificationStatus: highPriority ? "Escalated notification sent" : "Notification sent" } : item)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Notification failed.";
      setIncidents((current) => current.map((item) => (item.id === incident.id ? { ...item, notificationStatus: `Failed: ${message}` } : item)));
      pushToast("Notification failed", message, "warning");
    }

    return incident;
  };

  const updateIncidentRecord = (incidentId: string, patch: Partial<IncidentRecord>, options?: { statusNote?: string }) => {
    if (!currentUser) return;
    const at = new Date().toISOString();
    setIncidents((current) =>
      current.map((item) => {
        if (item.id !== incidentId) return item;
        const nextStatus = (patch.status || item.status) as IncidentStatus;
        const statusChanged = nextStatus !== item.status;
        const nextHistory = statusChanged
          ? [...item.statusHistory, { at, from: item.status, to: nextStatus, by: currentUser.name, note: options?.statusNote || `Status changed to ${nextStatus}` }]
          : item.statusHistory;
        return { ...item, ...patch, statusHistory: nextHistory, updatedAt: at, updatedBy: currentUser.name };
      }),
    );
  };

  const addIncidentCorrectiveAction = (incidentId: string, payload: { description: string; owner: string; dueDate: string }) => {
    if (!currentUser) return;
    if (!payload.description.trim() || !payload.owner.trim()) {
      throw new Error("Corrective action description and owner are required.");
    }
    setIncidentActions((current) => [
      {
        id: `incident-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        incidentId,
        description: payload.description.trim(),
        owner: payload.owner.trim(),
        dueDate: payload.dueDate,
        status: "Open",
        completedAt: "",
        completedBy: "",
      },
      ...current,
    ]);
  };

  const updateIncidentCorrectiveAction = (actionId: string, patch: Partial<IncidentCorrectiveAction>) => {
    if (!currentUser) return;
    setIncidentActions((current) =>
      current.map((item) => {
        if (item.id !== actionId) return item;
        const next = { ...item, ...patch };
        if (next.status === "Complete" && !next.completedAt) {
          next.completedAt = new Date().toISOString();
          next.completedBy = currentUser.name;
        }
        return next;
      }),
    );
  };

  useEffect(() => {
    window.localStorage.setItem(previewOrientationStorageKey, previewOrientation);
  }, [previewOrientation]);

  useEffect(() => {
    try {
      window.localStorage.setItem(desktopSidebarCollapsedStorageKey, String(desktopSidebarCollapsed));
    } catch {
      // Ignore storage write failures.
    }
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(dashboardPreferencesStorageKey, JSON.stringify(dashboardPreferences));
    } catch {
      // Ignore storage write failures.
    }
  }, [dashboardPreferences]);

  useEffect(() => {
    try {
      window.localStorage.setItem(dashboardSectionOrderStorageKey, JSON.stringify(dashboardSectionOrder));
    } catch {
      // Ignore storage write failures.
    }
  }, [dashboardSectionOrder]);

  useEffect(() => {
    if (offlineMode || offlineQueue.length === 0) {
      return;
    }

    const queued = [...offlineQueue];
    queued
      .slice()
      .reverse()
      .forEach((submission) => {
        applyAuditSubmission({
          audit: submission.audit,
          responseMap: submission.responses,
          noteMap: submission.notes,
          evidenceMap: submission.evidence,
          submittedBy: submission.submittedBy,
          submittedByUser: users.find((item) => item.name === submission.submittedBy) || users[0],
          completedAt: submission.queuedAt,
        });
        updateSyncItemStatus(submission.audit.id, "Synced");
      });

    setOfflineQueue([]);
    pushToast("Offline sync complete", `${queued.length} queued audit submission${queued.length === 1 ? "" : "s"} synced successfully.`, "success");
    triggerNotification("Offline sync complete", `${queued.length} queued audit submission${queued.length === 1 ? "" : "s"} synced.`);
  }, [offlineMode, offlineQueue]);

  useEffect(() => {
    if (!notificationsEnabled || overdueActions.length === 0) {
      return;
    }
    triggerNotification("Overdue actions need attention", `${overdueActions.length} corrective action${overdueActions.length === 1 ? "" : "s"} are overdue.`);
  }, [notificationsEnabled, overdueActions.length]);

  useEffect(() => {
    if (!selectedFolderId || syncState !== "Synced") {
      return;
    }
    if (!actionsPersistReadyRef.current) {
      actionsPersistReadyRef.current = true;
      return;
    }
    const nextActions = actions.filter((item) => item.companyId === selectedFolderId);
    queueSyncItem({
      itemType: "actionUpdate",
      localId: `actions-batch-${selectedFolderId}`,
      status: googleConnected && !offlineMode ? "Syncing" : "Pending Sync",
      createdAt: formatStamp(),
      retryCount: 0,
      lastError: "",
      payload: { companyFolderId: selectedFolderId, count: nextActions.length },
    });
    if (!googleConnected || offlineMode) {
      return;
    }
    void persistActions(selectedFolderId, nextActions)
      .then(() => updateSyncItemStatus(`actions-batch-${selectedFolderId}`, "Synced"))
      .catch((error) => updateSyncItemStatus(`actions-batch-${selectedFolderId}`, "Failed", error instanceof Error ? error.message : "Unable to save actions."));
  }, [actions, selectedFolderId, syncState, googleConnected, offlineMode]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    if (creatableRoles.length === 0) {
      return;
    }
    if (!creatableRoles.includes(inviteRoleInput)) {
      setInviteRoleInput(creatableRoles[0]);
    }
  }, [creatableRoles, inviteRoleInput]);

  useEffect(() => {
    if (!googleConnected || !selectedFolderId) {
      return;
    }
    if (
      folderIdInput.trim() ||
      auditFormsFolderInput.trim() ||
      masterSheetInput.trim() ||
      evidenceFolderInput.trim() ||
      healthSafetyFolderInput.trim() ||
      exportsFolderInput.trim() ||
      adminNotesFolderInput.trim()
    ) {
      return;
    }
    if (folderInspection?.folder.id === selectedFolderId) {
      return;
    }
    void inspectFolderById(selectedFolderId, { silent: true });
  }, [
    googleConnected,
    selectedFolderId,
    folderIdInput,
    auditFormsFolderInput,
    masterSheetInput,
    evidenceFolderInput,
    healthSafetyFolderInput,
    exportsFolderInput,
    adminNotesFolderInput,
  ]);

  const pushToast = (title: string, message: string, tone: Toast["tone"] = "neutral") => {
    setToasts((current) => [
      ...current,
      { id: Date.now() + Math.floor(Math.random() * 1000), title, message, tone },
    ]);
  };

  const queueSyncItem = (item: Omit<SyncQueueItem, "id" | "updatedAt">) => {
    setSyncQueue((current) => [
      {
        ...item,
        id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        updatedAt: formatStamp(),
      },
      ...current,
    ]);
  };

  const updateSyncItemStatus = (localId: string, status: SyncStatus, lastError = "") => {
    setSyncQueue((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              status,
              lastError,
              retryCount: status === "Failed" ? item.retryCount + 1 : item.retryCount,
              updatedAt: formatStamp(),
            }
          : item,
      ),
    );
  };

  const loadGoogleStatus = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setGoogleStatusLoading(true);
    }

    try {
      const response = await fetch("/api/google/status");
      const payload = (await response.json()) as GoogleBackendStatus;

      setBackendConfigured(Boolean(payload.configured));
      setGoogleConnected(Boolean(payload.connected));
      setSharedDriveId(payload.sharedDriveId || "");
      setOnboardingSource(payload.onboardingSource ?? null);

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to load Google status.");
      }

      if (payload.connected && payload.companies) {
        setFolders(payload.companies);
        if (!selectedFolderId && payload.companies[0]) {
          setSelectedFolderId(payload.companies[0].id);
        }
      }
    } catch (error) {
      if (!options?.silent) {
        pushToast(
          "Backend unavailable",
          error instanceof Error ? error.message : "Unable to reach the Google integration server.",
          "warning",
        );
      }
    } finally {
      if (!options?.silent) {
        setGoogleStatusLoading(false);
      }
    }
  };

  const loadOnboardingRecords = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setOnboardingRecordsLoading(true);
    }

    try {
      const response = await fetch("/api/onboarding/submissions");
      const payload = (await response.json()) as OnboardingSubmissionsResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to load onboarding submissions.");
      }

      setOnboardingSource(payload.onboardingSource ?? null);
      setOnboardingRecords(payload.records ?? []);
      if (!selectedOnboardingRecordId && payload.records?.[0]) {
        setSelectedOnboardingRecordId(payload.records[0].id);
      }
    } catch (error) {
      if (!options?.silent) {
        pushToast(
          "Onboarding source unavailable",
          error instanceof Error ? error.message : "Unable to load onboarding submissions.",
          "warning",
        );
      }
    } finally {
      if (!options?.silent) {
        setOnboardingRecordsLoading(false);
      }
    }
  };

  const loadCompanySheet = async (folderId: string, options?: { silent?: boolean }) => {
    try {
      const response = await fetch(`/api/company-sheet/${encodeURIComponent(folderId)}`);
      const payload = (await response.json()) as CompanySheetPayload;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to load the company master sheet.");
      }

      const nextInvites = parseCompanySheetUsers(payload.data.Users ?? []);
      const nextSchedules = parseCompanySheetSchedules(payload.data.Schedule ?? [], folderId);
      setCompanySheetSync({
        sheetId: payload.sheetId,
        sheetName: payload.sheetName,
        tabs: payload.tabs,
        usersCount: payload.data.Users?.length ?? 0,
        schedulesCount: payload.data.Schedule?.length ?? 0,
        onboardingCount: payload.data.Onboarding?.length ?? 0,
        actionsCount: payload.data.Actions?.length ?? 0,
        notesCount: payload.data.Notes?.length ?? 0,
        findingsCount: payload.data.AuditFindings?.length ?? 0,
        evidenceCount: payload.data.Evidence?.length ?? 0,
        reportsCount: payload.data.Reports?.length ?? 0,
        configCount: payload.data.Config?.length ?? 0,
        lastSyncedAt: formatStamp(),
      });

      setInvitedUsers((current) => {
        const existingIds = new Set(current.map((item) => `${item.email}-${item.role}`));
        const merged = [...current];
        nextInvites.forEach((invite) => {
          const key = `${invite.email}-${invite.role}`;
          if (!existingIds.has(key)) {
            merged.push(invite);
          }
        });
        return merged;
      });

      setSchedules((current) => {
        const remaining = current.filter((item) => item.companyFolderId !== folderId);
        return [...remaining, ...nextSchedules];
      });
      setManagedSchedules((current) => {
        const remaining = current.filter((item) => item.companyFolderId !== folderId);
        return [...remaining, ...parseManagedSchedules(payload.data.Schedule ?? [], folderId).map((item) => ({ ...item, healthState: computeScheduleHealthState(item) }))];
      });
      setActions((current) => {
        const remaining = current.filter((item) => item.companyId !== folderId);
        return [...remaining, ...parseCompanySheetActions(payload.data.Actions ?? [], folderId)];
      });

      setCompanyAuthPasswords((current) => ({
        ...current,
        ...parseCompanyConfigPasswords(payload.data.Config ?? []),
      }));

      return payload;
    } catch (error) {
      setCompanySheetSync(null);
      if (!options?.silent) {
        pushToast(
          "Company sheet unavailable",
          error instanceof Error ? error.message : "Unable to load company master sheet data.",
          "warning",
        );
      }
      return null;
    }
  };

  const loadCompanySheetById = async (
    sheetId: string,
    companyFolderId: string,
    options?: { silent?: boolean },
  ) => {
    try {
      const response = await fetch(`/api/google-sheet-by-id/${encodeURIComponent(sheetId)}`);
      const payload = (await response.json()) as CompanySheetPayload;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to load the company master sheet.");
      }

      const nextInvites = parseCompanySheetUsers(payload.data.Users ?? []);
      const nextSchedules = parseCompanySheetSchedules(payload.data.Schedule ?? [], companyFolderId);
      setCompanySheetSync({
        sheetId: payload.sheetId,
        sheetName: payload.sheetName,
        tabs: payload.tabs,
        usersCount: payload.data.Users?.length ?? 0,
        schedulesCount: payload.data.Schedule?.length ?? 0,
        onboardingCount: payload.data.Onboarding?.length ?? 0,
        actionsCount: payload.data.Actions?.length ?? 0,
        notesCount: payload.data.Notes?.length ?? 0,
        findingsCount: payload.data.AuditFindings?.length ?? 0,
        evidenceCount: payload.data.Evidence?.length ?? 0,
        reportsCount: payload.data.Reports?.length ?? 0,
        configCount: payload.data.Config?.length ?? 0,
        lastSyncedAt: formatStamp(),
      });

      setInvitedUsers((current) => {
        const existingIds = new Set(current.map((item) => `${item.email}-${item.role}`));
        const merged = [...current];
        nextInvites.forEach((invite) => {
          const key = `${invite.email}-${invite.role}`;
          if (!existingIds.has(key)) {
            merged.push(invite);
          }
        });
        return merged;
      });

      setSchedules((current) => {
        const remaining = current.filter((item) => item.companyFolderId !== companyFolderId);
        return [...remaining, ...nextSchedules];
      });
      setManagedSchedules((current) => {
        const remaining = current.filter((item) => item.companyFolderId !== companyFolderId);
        return [...remaining, ...parseManagedSchedules(payload.data.Schedule ?? [], companyFolderId).map((item) => ({ ...item, healthState: computeScheduleHealthState(item) }))];
      });
      setActions((current) => {
        const remaining = current.filter((item) => item.companyId !== companyFolderId);
        return [...remaining, ...parseCompanySheetActions(payload.data.Actions ?? [], companyFolderId)];
      });

      setCompanyAuthPasswords((current) => ({
        ...current,
        ...parseCompanyConfigPasswords(payload.data.Config ?? []),
      }));

      return payload;
    } catch (error) {
      if (!options?.silent) {
        pushToast(
          "Company sheet unavailable",
          error instanceof Error ? error.message : "Unable to load the company master sheet.",
          "warning",
        );
      }
      return null;
    }
  };

  const triggerNotification = (title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    new Notification(title, { body });
  };

  const requestNotificationAccess = async () => {
    if (!("Notification" in window)) {
      pushToast("Notifications unavailable", "This browser does not support system notifications.", "warning");
      return;
    }

    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    setNotificationsEnabled(granted);
    pushToast(
      granted ? "Notifications enabled" : "Notifications blocked",
      granted ? `${companyName} can now send live browser alerts.` : "Enable browser notifications to receive live alerts.",
      granted ? "success" : "warning",
    );
  };

  const inspectFolderById = async (folderId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setFolderInspectionLoading(true);
    }

    try {
      const response = await fetch(`/api/company-folder/${encodeURIComponent(folderId)}`);
      const payload = (await response.json()) as FolderInspection;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to inspect the company folder.");
      }

      setFolderInspection(payload);
      return payload;
    } catch (error) {
      setFolderInspection(null);
      if (!options?.silent) {
        pushToast(
          "Folder check failed",
          error instanceof Error ? error.message : "Unable to inspect the company folder.",
          "warning",
        );
      }
      return null;
    } finally {
      if (!options?.silent) {
        setFolderInspectionLoading(false);
      }
    }
  };

  const validateWorkspace = async (options?: { silent?: boolean }) => {
    const sheetId = extractGoogleResourceId(masterSheetInput) || companySheetSync?.sheetId || selectedFolder?.responseSheetId || "";
    const companyFolderId = extractGoogleResourceId(folderIdInput) || selectedFolder?.id || "";
    if (!sheetId || !companyFolderId) {
      return null;
    }
    if (!options?.silent) {
      setWorkspaceValidationLoading(true);
    }
    try {
      const response = await fetch(`/api/google-sheet-by-id/${encodeURIComponent(sheetId)}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyFolderId,
          auditFormsFolderId: extractGoogleResourceId(auditFormsFolderInput),
          evidenceFolderId: extractGoogleResourceId(evidenceFolderInput),
          healthSafetyFolderId: extractGoogleResourceId(healthSafetyFolderInput),
          exportsFolderId: extractGoogleResourceId(exportsFolderInput),
          adminNotesFolderId: extractGoogleResourceId(adminNotesFolderInput),
        }),
      });
      const payload = (await response.json()) as WorkspaceValidation & { error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to validate the workspace.");
      }
      setWorkspaceValidation(payload);
      return payload;
    } catch (error) {
      if (!options?.silent) {
        pushToast("Workspace validation failed", error instanceof Error ? error.message : "Unable to validate the workspace.", "warning");
      }
      return null;
    } finally {
      if (!options?.silent) {
        setWorkspaceValidationLoading(false);
      }
    }
  };

  const repairWorkspace = async () => {
    const sheetId = extractGoogleResourceId(masterSheetInput) || companySheetSync?.sheetId || selectedFolder?.responseSheetId || "";
    const companyFolderId = extractGoogleResourceId(folderIdInput) || selectedFolder?.id || "";
    if (!sheetId || !companyFolderId) {
      pushToast("Workspace link required", "A company folder and Company Master Sheet must be linked before repair.", "warning");
      return;
    }
    setWorkspaceValidationLoading(true);
    try {
      const response = await fetch(`/api/google-sheet-by-id/${encodeURIComponent(sheetId)}/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyFolderId,
          auditFormsFolderId: extractGoogleResourceId(auditFormsFolderInput),
          evidenceFolderId: extractGoogleResourceId(evidenceFolderInput),
          healthSafetyFolderId: extractGoogleResourceId(healthSafetyFolderInput),
          exportsFolderId: extractGoogleResourceId(exportsFolderInput),
          adminNotesFolderId: extractGoogleResourceId(adminNotesFolderInput),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; validation: WorkspaceValidation; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to repair the workspace.");
      }
      setWorkspaceValidation(payload.validation);
      pushToast("Workspace repaired", "Missing tabs and columns were added safely with a backup copy created first.", "success");
    } catch (error) {
      pushToast("Workspace repair failed", error instanceof Error ? error.message : "Unable to repair the workspace.", "warning");
    } finally {
      setWorkspaceValidationLoading(false);
    }
  };

  const loadGoogleFile = async (fileId: string) => {
    const response = await fetch(`/api/google-file/${encodeURIComponent(fileId)}`);
    const payload = (await response.json()) as GoogleDriveFilePayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Unable to load the Google Drive item.");
    }
    return payload.file;
  };

  const loadFormsFolder = async (folderId: string) => {
    const response = await fetch(`/api/google-forms-folder/${encodeURIComponent(folderId)}`);
    const payload = (await response.json()) as GoogleFormsFolderPayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Unable to load the audit forms folder.");
    }
    return payload;
  };

  const formatStamp = () =>
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: scheduleTimeZone,
    }).format(new Date());

  const handleLogin = () => {
    const loginIdentity = username.trim().toLowerCase();
    const match = loginUsers.find((user) => {
      if (user.password !== password) {
        return false;
      }
      if (user.username === loginIdentity) {
        return true;
      }
      if (normalizeIdentity(user.username) === normalizeIdentity(loginIdentity)) {
        return true;
      }
      if (`${user.username}@qmsprecast.co.uk` === loginIdentity) {
        return true;
      }
      return false;
    });
    if (!match) {
      pushToast("Sign in failed", "Please check your username and password.", "warning");
      return;
    }
    if (companySetupLoginPortal && match.role !== "Master") {
      pushToast("Master only", "Company setup sign-in is only for the platform Master account.", "warning");
      return;
    }
    try {
      if (match.role === "Master") {
        if (companySetupLoginPortal) {
          window.localStorage.setItem(masterCompanySetupSessionKey, "1");
          setGodCompanySetupSession(true);
        } else {
          window.localStorage.removeItem(masterCompanySetupSessionKey);
          setGodCompanySetupSession(false);
        }
      } else {
        window.localStorage.removeItem(masterCompanySetupSessionKey);
        setGodCompanySetupSession(false);
      }
    } catch {
      setGodCompanySetupSession(false);
    }
    setCurrentUser(match);
    setAccountNameInput(match.name);
    setAccountPhotoUrl(getStoredProfilePhoto(match));
    window.localStorage.setItem(userStorageKey, JSON.stringify(match));
    setScreen(getHomeScreenForRole(match.role));
    setUsername("");
    setPassword("");
    setCompanySetupLoginPortal(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("setup");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
    } catch {
      window.history.replaceState({}, "", window.location.pathname);
    }
    pushToast("Welcome back", `Signed in as ${getRoleDisplayName(match.role)}.`, "success");
  };

  const switchUserSession = (user: User) => {
    if (user.role !== "Master") {
      try {
        window.localStorage.removeItem(masterCompanySetupSessionKey);
      } catch {
        /* ignore */
      }
      setGodCompanySetupSession(false);
    }
    setCurrentUser(user);
    setAccountNameInput(user.name);
    setAccountPhotoUrl(getStoredProfilePhoto(user));
    window.localStorage.setItem(userStorageKey, JSON.stringify(user));
    setScreen(getHomeScreenForRole(user.role));
    pushToast("Profile switched", `Now viewing as ${getRoleDisplayName(user.role)}.`, "success");
  };

  const createRoleFallbackUser = (role: Role): User => {
    const suffix = role.toLowerCase();
    return {
      username: `quick-${suffix}`,
      password: "demo",
      role,
      name:
        role === "Master"
          ? "System Setup"
          : role === "Admin"
            ? "Audit Control"
            : role === "Manager"
              ? "Manager View"
              : "Auditor View",
    };
  };

  const handleQuickRoleSwitch = (role: Role, fallbackLabel: string) => {
    const existingUser = loginUsers.find((user) => user.role === role);
    if (existingUser) {
      switchUserSession(existingUser);
      return;
    }
    if (!canCreatePreviewProfile()) {
      pushToast("Profile missing", `No ${fallbackLabel} profile is available yet.`, "warning");
      return;
    }
    const fallbackUser = createRoleFallbackUser(role);
    if (demoRoleSwitchEnabled) {
      pushToast("Using preview profile", `${fallbackLabel} view opened with a temporary profile.`, "success");
    }
    switchUserSession(fallbackUser);
  };

  const handleToggleRoleNavVisibility = (role: Role, navItemId: NavItemId) => {
    if (navItemId === "dashboard" || navItemId === "account" || navItemId === "incidents") {
      return;
    }
    if (!canRoleAccessNavItem(role, navItemId)) {
      return;
    }
    setRoleNavVisibility((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [navItemId]: !(current[role]?.[navItemId] ?? true),
      },
    }));
  };

  const handleToggleRoleSiteSelectorVisibility = (role: Role) => {
    setRoleSiteSelectorVisibility((current) => ({
      ...current,
      [role]: !(current[role] ?? true),
    }));
  };

  const handleSendGodModeAppCompanyInvite = async () => {
    if (!currentUser || currentUser.role !== "Master") {
      return;
    }
    const trimmed = godModeAppInviteEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      pushToast("Email required", "Enter a valid email address for the new company administrator.", "warning");
      return;
    }
    try {
      const response = await fetch("/api/onboarding/app-invites/new-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, invitedBy: currentUser.name }),
      });
      const payload = (await parseJsonApiResponse(response)) as {
        ok?: boolean;
        error?: string;
        delivery?: "smtp" | "manual";
        onboardingUrl?: string;
        mailtoUrl?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to send invite.");
      }
      setGodModeAppInviteEmail("");
      pushToast(
        payload.delivery === "manual" ? "Invite draft ready" : "Invite sent",
        payload.delivery === "manual"
          ? "SMTP is not configured. Use the generated mail draft or share the onboarding link manually."
          : `App onboarding link sent to ${trimmed}.`,
        "success",
      );
    } catch (error) {
      pushToast(
        "Invite failed",
        error instanceof Error ? error.message : "Unable to send new company invite.",
        "warning",
      );
    }
  };

  const handleInviteUser = async () => {
    if (!currentUser) {
      return;
    }

    const allowedRoles = getCreatableRoles(currentUser.role);
    if (allowedRoles.length === 0) {
      pushToast("Access restricted", "Auditors cannot create other users.", "warning");
      return;
    }

    if (!allowedRoles.includes(inviteRoleInput)) {
      pushToast("Role restricted", `A ${currentUser.role.toLowerCase()} cannot create an ${inviteRoleInput.toLowerCase()}.`, "warning");
      return;
    }

    const isGodModeFirstUserInvite =
      currentUser.role === "Master" &&
      (companySheetSync?.usersCount ?? 0) === 0 &&
      invitedUsers.length === 0;
    const inviteRole = isGodModeFirstUserInvite ? "Admin" : inviteRoleInput;

    const trimmedEmail = inviteEmailInput.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      pushToast("Email required", "Enter a valid email address to send the onboarding link.", "warning");
      return;
    }

    if (invitedUsers.some((invite) => invite.email === trimmedEmail && invite.role === inviteRole)) {
      pushToast("Invite already sent", "That user and role already has an active onboarding invite.", "warning");
      return;
    }

    const sheetId = companySheetSync?.sheetId || extractGoogleResourceId(masterSheetInput);
    const companyFolderId = selectedFolder?.id || extractGoogleResourceId(folderIdInput);
    if (!googleConnected) {
      pushToast("Google not connected", "Connect Google on the server before sending app onboarding invites.", "warning");
      return;
    }
    if (!sheetId || !companyFolderId) {
      pushToast(
        "Workspace required",
        "Select a company folder and ensure the master sheet is loaded before sending invites.",
        "warning",
      );
      return;
    }

    let inviteDelivery: "smtp" | "manual" = "smtp";
    let inviteMailtoUrl = "";
    let inviteSenderEmail = "";
    let appOnboardingUrl = "";
    try {
      const response = await fetch("/api/onboarding/app-invites/company-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          role: inviteRole,
          invitedBy: currentUser.name,
          companyFolderId,
          masterSheetId: sheetId,
          companyName: selectedFolder?.name || "",
        }),
      });
      const payload = (await parseJsonApiResponse(response)) as {
        ok?: boolean;
        error?: string;
        delivery?: "smtp" | "manual";
        mailtoUrl?: string;
        senderEmail?: string;
        onboardingUrl?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to send onboarding invite email.");
      }
      inviteDelivery = payload.delivery || "smtp";
      inviteMailtoUrl = payload.mailtoUrl || "";
      inviteSenderEmail = payload.senderEmail || "";
      appOnboardingUrl = payload.onboardingUrl || "";
    } catch (error) {
      pushToast(
        "Invite send failed",
        error instanceof Error ? error.message : "Unable to send onboarding invite email.",
        "warning",
      );
      return;
    }

    const createdInvite: UserInvite = {
      id: `invite-${Date.now()}`,
      email: trimmedEmail,
      role: inviteRole,
      invitedBy: currentUser.name,
      senderEmail: inviteSenderEmail || undefined,
      sentAt: formatStamp(),
      status: "Invite sent",
      mailtoUrl: inviteMailtoUrl || undefined,
      appOnboardingUrl: appOnboardingUrl || undefined,
    };
    const nextInvitedUsers = [createdInvite, ...invitedUsers];
    setInvitedUsers(nextInvitedUsers);
    if (selectedFolder?.id) {
      try {
        await persistUsers(selectedFolder.id, nextInvitedUsers);
      } catch (error) {
        pushToast(
          "Users tab not updated",
          error instanceof Error ? error.message : "Invite sent, but the Users tab could not be updated yet.",
          "warning",
        );
      }
    }
    setInviteEmailInput("");
    pushToast(
      inviteDelivery === "manual" ? "Invite draft ready" : "Onboarding link sent",
      inviteDelivery === "manual"
        ? `SMTP is not configured. Open email draft for ${trimmedEmail}.`
        : `${inviteRole} invite sent to ${trimmedEmail}.`,
      "success",
    );
    triggerNotification("User onboarding invite", `${trimmedEmail} has been invited as ${inviteRole}.`);
  };

  const handleResendInvite = async (invite: UserInvite) => {
    if (!currentUser) return;
    const sheetId = companySheetSync?.sheetId || extractGoogleResourceId(masterSheetInput);
    const companyFolderId = selectedFolder?.id || extractGoogleResourceId(folderIdInput);
    if (!googleConnected || !sheetId || !companyFolderId) {
      pushToast("Workspace required", "Connect Google and select a company folder before resending invites.", "warning");
      return;
    }

    let inviteDelivery: "smtp" | "manual" = "smtp";
    let inviteMailtoUrl = invite.mailtoUrl || "";
    let inviteSenderEmail = invite.senderEmail || "";
    let appOnboardingUrl = invite.appOnboardingUrl || "";
    try {
      const response = await fetch("/api/onboarding/app-invites/company-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: invite.email,
          role: invite.role,
          invitedBy: currentUser.name,
          companyFolderId,
          masterSheetId: sheetId,
          companyName: selectedFolder?.name || "",
        }),
      });
      const payload = (await parseJsonApiResponse(response)) as {
        ok?: boolean;
        error?: string;
        delivery?: "smtp" | "manual";
        mailtoUrl?: string;
        senderEmail?: string;
        onboardingUrl?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to resend onboarding invite email.");
      }
      inviteDelivery = payload.delivery || "smtp";
      inviteMailtoUrl = payload.mailtoUrl || inviteMailtoUrl;
      inviteSenderEmail = payload.senderEmail || inviteSenderEmail;
      appOnboardingUrl = payload.onboardingUrl || appOnboardingUrl;
    } catch (error) {
      pushToast(
        "Resend failed",
        error instanceof Error ? error.message : "Unable to resend onboarding invite email.",
        "warning",
      );
      return;
    }

    const resentAt = formatStamp();
    const nextInvitedUsers = invitedUsers.map((item) =>
      item.id === invite.id
        ? {
            ...item,
            sentAt: resentAt,
            invitedBy: currentUser.name,
            senderEmail: inviteSenderEmail || undefined,
            mailtoUrl: inviteMailtoUrl || undefined,
            appOnboardingUrl: appOnboardingUrl || undefined,
          }
        : item,
    );
    setInvitedUsers(nextInvitedUsers);
    if (selectedFolder?.id) {
      try {
        await persistUsers(selectedFolder.id, nextInvitedUsers);
      } catch (error) {
        pushToast(
          "Users tab not updated",
          error instanceof Error ? error.message : "Invite resent, but the Users tab could not be updated yet.",
          "warning",
        );
      }
    }
    pushToast(
      inviteDelivery === "manual" ? "Invite draft ready" : "Invite resent",
      inviteDelivery === "manual"
        ? `SMTP is not configured. Open email draft for ${invite.email}.`
        : `Onboarding link resent to ${invite.email}.`,
      "success",
    );
  };

  const handleDeleteInvite = (invite: UserInvite) => {
    setInvitedUsers((current) => current.filter((item) => item.id !== invite.id));
    pushToast("Invite removed", `${invite.email} has been removed from sent invites.`, "success");
  };

  const handleResyncUsers = async () => {
    if (!googleConnected) {
      pushToast("Google not connected", "Connect Google before re-syncing users.", "warning");
      return;
    }

    const companyFolderId = selectedFolder?.id || extractGoogleResourceId(folderIdInput);
    if (!companyFolderId) {
      pushToast("Company folder required", "Select a company folder before re-syncing users.", "warning");
      return;
    }

    try {
      const manualMasterSheetId = extractGoogleResourceId(masterSheetInput) || companySheetSync?.sheetId || "";
      const payload = manualMasterSheetId
        ? await loadCompanySheetById(manualMasterSheetId, companyFolderId, { silent: true })
        : await loadCompanySheet(companyFolderId, { silent: true });

      if (!payload) {
        throw new Error("Unable to load the company sheet.");
      }

      const syncedUsers = payload.data.Users?.length ?? 0;
      pushToast("Users re-synced", `${syncedUsers} user row${syncedUsers === 1 ? "" : "s"} pulled from the company sheet.`, "success");
    } catch (error) {
      pushToast(
        "Resync failed",
        error instanceof Error ? error.message : "Unable to re-sync users from the company sheet.",
        "warning",
      );
    }
  };

  const persistUsers = async (companyFolderId: string, nextUsers: UserInvite[]) => {
    const sheetId = companySheetSync?.sheetId || extractGoogleResourceId(masterSheetInput);
    if (!sheetId) {
      throw new Error("Company master sheet link is required before saving users.");
    }

    const response = await fetch(`/api/google-sheet-by-id/${encodeURIComponent(sheetId)}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyFolderId,
        users: nextUsers,
      }),
    });

    const payload = (await response.json()) as SaveSchedulesResponse;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Unable to save users.");
    }
  };

  const persistActions = async (companyFolderId: string, nextActions: ActionItem[]) => {
    const sheetId = companySheetSync?.sheetId || extractGoogleResourceId(masterSheetInput);
    if (!sheetId) {
      throw new Error("Company master sheet link is required before saving actions.");
    }

    const response = await fetch(`/api/google-sheet-by-id/${encodeURIComponent(sheetId)}/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyFolderId,
        actions: nextActions,
      }),
    });

    const payload = (await response.json()) as SaveSchedulesResponse;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Unable to save actions.");
    }
  };

  const handleLogout = () => {
    fetch("/auth/google/logout", { method: "POST" }).catch(() => undefined);
    try {
      window.localStorage.removeItem(masterCompanySetupSessionKey);
    } catch {
      /* ignore */
    }
    setGodCompanySetupSession(false);
    setCompanySetupLoginPortal(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("setup");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
    } catch {
      window.history.replaceState({}, "", window.location.pathname);
    }
    window.localStorage.removeItem(userStorageKey);
    setCurrentUser(null);
    setAccountNameInput("");
    setAccountPhotoUrl("");
    setScreen("dashboard");
    setActiveAuditId(null);
    setResponses({});
    setNotes({});
    setEvidence({});
    setAuditModeQuestionIndex(0);
    setIssuePrompt(null);
    setAuditCompletionSummary(null);
    pushToast("Signed out", "Your session has been closed.", "neutral");
  };

  const handleAccountPhotoChange = (file: File) => {
    if (!currentUser) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextPhoto = typeof reader.result === "string" ? reader.result : "";
      if (!nextPhoto) return;
      setAccountPhotoUrl(nextPhoto);
      setUserProfilePhotos((current) => ({
        ...current,
        [currentUser.username]: nextPhoto,
        [currentUser.name.toLowerCase()]: nextPhoto,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAccountSettings = () => {
    const trimmedName = accountNameInput.trim();
    if (!currentUser || !trimmedName) {
      pushToast("Name required", "Enter your name before saving account settings.", "warning");
      return;
    }

    const updatedUser = { ...currentUser, name: trimmedName };
    setCurrentUser(updatedUser);
    window.localStorage.setItem(userStorageKey, JSON.stringify(updatedUser));
    pushToast("Account updated", "Your account settings have been saved on this device.", "success");
  };

  const startAudit = (auditId: string) => {
    const audit = audits.find((item) => item.id === auditId);
    if (!audit) {
      return;
    }
    if (isAuditCompleted(audit) && !drafts[auditId]) {
      pushToast("Audit already completed", `${audit.name} has already been submitted and moved to history.`, "warning");
      return;
    }

    const draft = drafts[auditId];
    setActiveAuditId(auditId);
    setResponses(draft?.responses ?? {});
    setNotes(draft?.notes ?? {});
    setEvidence(draft?.evidence ?? {});
    setAuditModeQuestionIndex(0);
    setIssuePrompt(null);
    setAuditCompletionSummary(null);
    setScreen("complete");
    if (draft) {
      pushToast("Audit in progress loaded", "Saved progress has been restored.", "neutral");
    }
  };

  const saveDraft = () => {
    if (!activeAudit) {
      return;
    }
    setDrafts((current) => ({
      ...current,
      [activeAudit.id]: {
        responses,
        notes,
        evidence,
        updatedAt: formatStamp(),
      },
    }));
    pushToast("Progress saved", `${activeAudit.name} has been saved for later.`, "success");
  };

  const createActionsFromAudit = (
    audit: Audit,
    responseMap: Record<string, Answer>,
    noteMap: Record<string, string>,
    evidenceMap: Record<string, EvidenceItem[]>,
    submittedBy: User,
    completedAt: string,
  ) => {
    let nonConformanceSequence = getNextNonConformanceSequence(actions);
    const actionItems = audit.questions
      .map((question) => ({
        question,
        answer: responseMap[question.id],
      }))
      .filter(
        (item): item is { question: AuditQuestion; answer: Exclude<Answer, "pass"> } =>
          item.answer === "nc" ||
          item.answer === "fail" ||
          (!!item.question.autoActionRequired && Boolean(item.answer)),
      )
      .map((item, index) => ({
        id: `${audit.id}-action-${Date.now()}-${index}`,
        companyId: selectedFolderId || selectedFolder?.id || "local-company",
        auditId: audit.id,
        auditName: audit.name,
        questionId: item.question.id,
        questionText: item.question.text,
        sourceAnswer: item.answer,
        nonConformanceId:
          item.answer === "fail" || item.answer === "nc" ? formatNonConformanceId(nonConformanceSequence++) : undefined,
        severity:
          item.question.riskLevel ||
          (item.answer === "fail" ? "Critical" : item.answer === "nc" ? "High" : "Medium"),
        owner: audit.owner,
        assignedToUserId: audit.owner.toLowerCase().replace(/\s+/g, "-"),
        assignedToName: audit.owner,
        createdByUserId: submittedBy.username,
        createdAt: completedAt,
        dueDate: addDaysIso(
          ACTION_DUE_DAYS_BY_SEVERITY[
            item.question.riskLevel ||
              (item.answer === "fail" ? "Critical" : item.answer === "nc" ? "High" : "Medium")
          ],
        ),
        closedAt: "",
        verifiedByUserId: "",
        verificationNotes: "",
        evidenceLinks: [],
        localEvidenceRefs: (evidenceMap[item.question.id] || []).map((evidenceItem) => evidenceItem.id),
        comments: noteMap[item.question.id] || "",
        recurrenceFlag: false,
        rootCause: "",
        correctiveAction: "",
        preventiveAction: "",
        dueLabel:
          item.answer === "fail"
            ? "Immediate attention"
            : item.answer === "nc"
              ? "Due within 3 days"
              : "Due within 7 days",
        dueHours:
          ACTION_DUE_DAYS_BY_SEVERITY[
            item.question.riskLevel ||
              (item.answer === "fail" ? "Critical" : item.answer === "nc" ? "High" : "Medium")
          ] * 24,
        status: item.question.requiresManagerReview ? ("Awaiting Verification" as ActionStatus) : ("Open" as ActionStatus),
        evidenceCount: evidenceMap[item.question.id]?.length ?? 0,
        noteIncluded: Boolean(noteMap[item.question.id]?.trim()),
        riskCategory: item.question.riskCategory || "Other",
        evidenceRequired: item.question.requiresPhotoEvidence,
        requiresManagerReview: item.question.requiresManagerReview,
      } satisfies ActionItem));

    if (actionItems.length > 0) {
      const existingKeys = new Set(
        actions
          .filter((item) => item.auditId === audit.id && item.status !== "Closed")
          .map((item) => `${item.auditId}::${item.questionId}`),
      );
      const uniqueActionItems = actionItems.filter((item) => !existingKeys.has(`${item.auditId}::${item.questionId}`));
      if (uniqueActionItems.length === 0) {
        return [];
      }
      setActions((current) => [...uniqueActionItems, ...current]);
      queueSyncItem({
        itemType: "actionUpdate",
        localId: `actions-${audit.id}-${Date.now()}`,
        status: googleConnected && !offlineMode ? "Pending Sync" : "Pending Sync",
        createdAt: completedAt,
        retryCount: 0,
        lastError: "",
        payload: { companyFolderId: selectedFolderId, actions: uniqueActionItems },
      });
      return uniqueActionItems;
    }

    return [];
  };

  const createCorrectiveActionFromIssue = ({
    audit,
    question,
    answer,
    findingNote,
  }: {
    audit: Audit;
    question: AuditQuestion;
    answer: Exclude<Answer, "pass">;
    findingNote: string;
  }) => {
    if (!currentUser) return 0;
    const severity =
      question.riskLevel ||
      (answer === "fail" ? "Critical" : answer === "nc" ? "High" : "Medium");
    const existingAction = actions.find((item) => item.auditId === audit.id && item.questionId === question.id && item.status !== "Closed");
    if (existingAction) return 0;
    const stamp = formatStamp();
    const actionItem: ActionItem = {
      id: `${audit.id}-issue-${question.id}-${Date.now()}`,
      companyId: selectedFolderId || selectedFolder?.id || "local-company",
      siteArea: audit.siteArea,
      auditId: audit.id,
      auditName: audit.name,
      questionId: question.id,
      questionText: `Resolve failed check: ${question.text}`,
      sourceAnswer: answer,
      nonConformanceId: answer === "fail" || answer === "nc" ? formatNonConformanceId(getNextNonConformanceSequence(actions)) : undefined,
      severity,
      owner: audit.owner,
      assignedToUserId: audit.owner.toLowerCase().replace(/\s+/g, "-"),
      assignedToName: audit.owner,
      createdByUserId: currentUser.username,
      createdAt: stamp,
      dueDate: addDaysIso(ACTION_DUE_DAYS_BY_SEVERITY[severity]),
      closedAt: "",
      verifiedByUserId: "",
      verificationNotes: "",
      evidenceLinks: [],
      localEvidenceRefs: (evidence[question.id] || []).map((item) => item.id),
      comments: findingNote,
      recurrenceFlag: false,
      rootCause: "",
      correctiveAction: "",
      preventiveAction: "",
      dueLabel: getDueLabel(ACTION_DUE_DAYS_BY_SEVERITY[severity] * 24),
      dueHours: ACTION_DUE_DAYS_BY_SEVERITY[severity] * 24,
      status: "Open",
      evidenceCount: evidence[question.id]?.length ?? 0,
      noteIncluded: Boolean(findingNote.trim()),
      riskCategory: question.riskCategory || "Other",
      evidenceRequired: question.requiresPhotoEvidence,
      requiresManagerReview: question.requiresManagerReview,
    };
    setActions((current) => [actionItem, ...current]);
    queueSyncItem({
      itemType: "actionUpdate",
      localId: actionItem.id,
      status: "Pending Sync",
      createdAt: stamp,
      retryCount: 0,
      lastError: "",
      payload: { companyFolderId: selectedFolderId, actions: [actionItem] },
    });
    return 1;
  };

  const createNonConformanceFromIssue = ({
    audit,
    question,
    answer,
    note,
  }: {
    audit: Audit;
    question: AuditQuestion;
    answer: Exclude<Answer, "pass">;
    note: string;
  }) => {
    if (!currentUser) return null;
    const selectedManagers = getSelectedManagersForAudit(audit.id);
    const assignedManager = selectedManagers[0] || { name: audit.owner || "Unassigned manager", email: "" };
    const managerUser = users.find((user) => user.name === assignedManager.name && user.role === "Manager");
    const raisedAt = formatStamp();
    const nextReference = formatNcrReference(getNextNcrSequence(nonConformances));
    const createdRecord: NonConformanceRecord = {
      id: `ncr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      reference: nextReference,
      auditId: audit.id,
      auditName: audit.name,
      auditQuestionId: question.id,
      auditQuestion: question.text,
      selectedAnswer: answer,
      auditorName: currentUser.name,
      auditorUserId: currentUser.username,
      site: audit.siteArea,
      raisedAt,
      status: "Raised",
      assignedLineManager: assignedManager.name,
      assignedLineManagerUserId: managerUser?.username || assignedManager.name.toLowerCase().replace(/\s+/g, "-"),
      assignedLineManagerEmail: assignedManager.email || "",
      investigationIsoClause: "",
      investigationNotes: note,
      rootCause: "",
      correctiveAction: "",
      investigationExtraNotes: "",
      evidence: [],
    };
    setNonConformances((current) => [createdRecord, ...current]);

    if (createdRecord?.assignedLineManagerEmail) {
      const investigationLink = `${window.location.origin}?ncr=${encodeURIComponent(createdRecord.reference)}`;
      void fetch("/api/ncr/escalation-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createdRecord.assignedLineManagerEmail,
          ncrReference: createdRecord.reference,
          auditorName: createdRecord.auditorName,
          site: createdRecord.site,
          raisedAt: createdRecord.raisedAt,
          auditQuestion: createdRecord.auditQuestion,
          selectedAnswer: createdRecord.selectedAnswer,
          investigationLink,
        }),
      });
    }

    return createdRecord;
  };

  const applyAuditSubmission = ({
    audit,
    responseMap,
    noteMap,
    evidenceMap,
    submittedBy,
    submittedByUser,
    completedAt,
  }: {
    audit: Audit;
    responseMap: Record<string, Answer>;
    noteMap: Record<string, string>;
    evidenceMap: Record<string, EvidenceItem[]>;
    submittedBy: string;
    submittedByUser: User;
    completedAt: string;
  }) => {
    const answers = Object.values(responseMap);
    const outcomeStatus: AuditStatus = answers.includes("fail")
      ? "red"
      : answers.includes("nc")
        ? "amber"
        : "green";
    const failedQuestions = audit.questions.filter((question) => responseMap[question.id] === "fail" || responseMap[question.id] === "nc");
    const levels = failedQuestions.map((question) => question.riskLevel || (responseMap[question.id] === "fail" ? "Critical" : "High"));
    const totalRiskScore = levels.reduce((sum, level) => sum + riskScore(level), 0);
    const highestRiskLevel = levels.length ? maxRiskLevel(levels) : "Low";
    const numberOfCriticalFindings = levels.filter((level) => level === "Critical").length;
    const numberOfHighFindings = levels.filter((level) => level === "High").length;

    setAudits((current) =>
      current.map((item) =>
        item.id === audit.id
          ? {
              ...item,
              status: outcomeStatus,
              dueLabel:
                outcomeStatus === "red"
                  ? "Immediate attention"
                  : outcomeStatus === "amber"
                    ? "Action required"
                    : "Updated today",
              dueHours: outcomeStatus === "red" ? -1 : outcomeStatus === "amber" ? 1 : 24,
              lastCompletedAt: completedAt,
              totalRiskScore,
              highestRiskLevel,
              numberOfCriticalFindings,
              numberOfHighFindings,
            }
          : item,
      ),
    );

    setHistory((current) => [
      {
        id: `${audit.id}-${Date.now()}`,
        auditId: audit.id,
        auditName: audit.name,
        completedAt,
        completedBy: submittedBy,
        status: outcomeStatus,
      },
      ...current,
    ]);

    setActions((current) => current.filter((action) => action.auditId !== audit.id || action.status === "Closed"));
    const createdActions = createActionsFromAudit(audit, responseMap, noteMap, evidenceMap, submittedByUser, completedAt);

    return { outcomeStatus, createdActions };
  };

  const submitAudit = () => {
    if (!activeAudit || !currentUser) {
      return;
    }

    const stamp = formatStamp();

    if (!signatureDataUrl) {
      pushToast("Signature required", "Add an inspector signature before submitting the audit.", "warning");
      return;
    }

    const nonComplianceCount = activeAudit.questions.filter(
      (question) => responses[question.id] === "fail" || responses[question.id] === "nc",
    ).length;

    if (offlineMode) {
      setOfflineQueue((current) => [
        {
          id: `offline-${activeAudit.id}-${Date.now()}`,
          audit: activeAudit,
          responses,
          notes,
          evidence,
          signatureDataUrl,
          queuedAt: stamp,
          submittedBy: currentUser.name,
        },
        ...current,
      ]);
      queueSyncItem({
        itemType: "auditSubmission",
        localId: activeAudit.id,
        status: "Pending Sync",
        createdAt: stamp,
        retryCount: 0,
        lastError: "",
        payload: { auditId: activeAudit.id, auditName: activeAudit.name, companyFolderId: selectedFolderId },
      });
      setDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[activeAudit.id];
        return nextDrafts;
      });
      setActiveAuditId(null);
      setResponses({});
      setNotes({});
      setEvidence({});
      setSignatureDataUrl("");
      setSignatureSignedAt("");
      setScreen("dashboard");
      pushToast("Queued offline", `${activeAudit.name} has been saved and will sync when the tablet reconnects.`, "warning");
      triggerNotification(companyName, `${activeAudit.name} has been queued offline for sync.`);
      notifySelectedManagersForNonCompliance(activeAudit, currentUser.name, nonComplianceCount, true);
      return;
    }

    const { outcomeStatus, createdActions } = applyAuditSubmission({
      audit: activeAudit,
      responseMap: responses,
      noteMap: notes,
      evidenceMap: evidence,
      submittedBy: currentUser.name,
      submittedByUser: currentUser,
      completedAt: stamp,
    });
    queueSyncItem({
      itemType: "auditSubmission",
      localId: activeAudit.id,
      status: googleConnected ? "Pending Sync" : "Pending Sync",
      createdAt: stamp,
      retryCount: 0,
      lastError: "",
      payload: { auditId: activeAudit.id, auditName: activeAudit.name, companyFolderId: selectedFolderId },
    });
    setDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[activeAudit.id];
      return nextDrafts;
    });

    setActiveAuditId(null);
    setResponses({});
    setNotes({});
    setEvidence({});
    setSignatureDataUrl("");
    setSignatureSignedAt("");
    setScreen("dashboard");

    pushToast(
      "Audit submitted",
      `${activeAudit.name} is now marked ${statusStyles[outcomeStatus].label.toLowerCase()}. ${createdActions.length} corrective action${createdActions.length === 1 ? "" : "s"} created.`,
      outcomeStatus === "green" ? "success" : "warning",
    );
    triggerNotification("Audit submitted", `${activeAudit.name} has been submitted by ${currentUser.name}.`);
    notifySelectedManagersForNonCompliance(activeAudit, currentUser.name, nonComplianceCount, false);
  };

  const completeAuditModeFlow = () => {
    if (!activeAudit || !currentUser) return;
    const stamp = formatStamp();
    const issuesFound = activeAudit.questions.filter((question) => responses[question.id] === "fail" || responses[question.id] === "nc").length;
    const photosCaptured = Object.values(evidence).reduce((count, items) => count + items.length, 0);
    let actionsCreated = 0;

    if (offlineMode) {
      setOfflineQueue((current) => [
        {
          id: `offline-${activeAudit.id}-${Date.now()}`,
          audit: activeAudit,
          responses,
          notes,
          evidence,
          signatureDataUrl: "audit-mode-signature-not-required",
          queuedAt: stamp,
          submittedBy: currentUser.name,
        },
        ...current,
      ]);
      queueSyncItem({
        itemType: "auditSubmission",
        localId: activeAudit.id,
        status: "Pending Sync",
        createdAt: stamp,
        retryCount: 0,
        lastError: "",
        payload: { auditId: activeAudit.id, auditName: activeAudit.name, companyFolderId: selectedFolderId },
      });
      setDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[activeAudit.id];
        return nextDrafts;
      });
      setAuditCompletionSummary({
        auditId: activeAudit.id,
        auditName: activeAudit.name,
        questionsAnswered: Object.keys(responses).length,
        issuesFound,
        actionsCreated,
        photosCaptured,
        syncTone: "amber",
        syncLabel: "Audit complete / not synced",
      });
      notifySelectedManagersForNonCompliance(activeAudit, currentUser.name, issuesFound, true);
      setActiveAuditId(null);
      return;
    }

    const applied = applyAuditSubmission({
      audit: activeAudit,
      responseMap: responses,
      noteMap: notes,
      evidenceMap: evidence,
      submittedBy: currentUser.name,
      submittedByUser: currentUser,
      completedAt: stamp,
    });
    actionsCreated = applied.createdActions.length;
    queueSyncItem({
      itemType: "auditSubmission",
      localId: activeAudit.id,
      status: "Pending Sync",
      createdAt: stamp,
      retryCount: 0,
      lastError: "",
      payload: { auditId: activeAudit.id, auditName: activeAudit.name, companyFolderId: selectedFolderId },
    });
    setDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[activeAudit.id];
      return nextDrafts;
    });
    setAuditCompletionSummary({
      auditId: activeAudit.id,
      auditName: activeAudit.name,
      questionsAnswered: Object.keys(responses).length,
      issuesFound,
      actionsCreated,
      photosCaptured,
      syncTone: "green",
      syncLabel: "Synced",
    });
    notifySelectedManagersForNonCompliance(activeAudit, currentUser.name, issuesFound, false);
    setActiveAuditId(null);
  };

  const handleAuditModeAnswer = (question: AuditQuestion, answer: Answer) => {
    if (!activeAudit) return;
    setResponses((current) => ({
      ...current,
      [question.id]: answer,
    }));
    if (answer === "pass") {
      const canAutoAdvance =
        !question.requiresPhotoEvidence &&
        !question.autoActionRequired &&
        !question.requiresManagerReview &&
        (question.answerPrompts?.pass?.length ?? 0) === 0;
      if (canAutoAdvance) {
        setAuditModeQuestionIndex((current) => Math.min(current + 1, activeAudit.questions.length - 1));
      }
      return;
    }
    setIssuePrompt({
      question,
      answer,
    });
  };

  const handleAuditModeSaveIssue = ({ noteValue }: { noteValue: string; escalate?: boolean }) => {
    if (!activeAudit || !issuePrompt) return;
    if (!noteValue.trim()) {
      pushToast("Note required", "Describe what was found before continuing.", "warning");
      return;
    }
    if (issuePrompt.question.requiresPhotoEvidence && (evidence[issuePrompt.question.id]?.length ?? 0) === 0) {
      pushToast("Photo required", "Capture photo evidence for this finding before continuing.", "warning");
      return;
    }
    setNotes((current) => ({
      ...current,
      [issuePrompt.question.id]: noteValue,
    }));
    const mustCreateAction =
      issuePrompt.question.autoActionRequired ||
      issuePrompt.question.riskLevel === "Critical" ||
      issuePrompt.question.riskLevel === "High" ||
      issuePrompt.answer === "fail";
    if (mustCreateAction) {
      createCorrectiveActionFromIssue({
        audit: activeAudit,
        question: issuePrompt.question,
        answer: issuePrompt.answer,
        findingNote: noteValue,
      });
    }
    setIssuePrompt(null);
    setAuditModeQuestionIndex((current) => Math.min(current + 1, activeAudit.questions.length - 1));
  };

  const handleAuditModeSaveAndExit = () => {
    saveDraft();
    setActiveAuditId(null);
    setIssuePrompt(null);
    setAuditModeQuestionIndex(0);
    setScreen("dashboard");
  };

  const updateActionStatus = (actionId: string, nextStatus?: ActionStatus) => {
    if (!currentUser) {
      return;
    }
    const permissions = getRolePermissions(currentUser.role);
    setActions((current) =>
      current.map((action) => {
        if (action.id !== actionId) {
          return action;
        }
        const resolvedStatus =
          nextStatus ||
          (action.status === "Open"
            ? "In Progress"
            : action.status === "In Progress"
              ? "Awaiting Verification"
              : action.status === "Awaiting Verification"
                ? "Closed"
                : "Closed");
        if ((resolvedStatus === "Closed" || resolvedStatus === "Awaiting Verification" || resolvedStatus === "Rejected") && !permissions.canVerifyActions) {
          return action;
        }
        return {
          ...action,
          status: resolvedStatus,
          verifiedByUserId: resolvedStatus === "Closed" ? currentUser.username : action.verifiedByUserId,
          closedAt: resolvedStatus === "Closed" ? formatStamp() : action.closedAt,
          dueHours: resolvedStatus === "Closed" ? 0 : action.dueHours,
        };
      }),
    );
  };

  const assignAction = (actionId: string, assignee: string) => {
    setActions((current) =>
      current.map((action) =>
        action.id === actionId
          ? {
              ...action,
              owner: assignee,
              assignedToName: assignee,
              assignedToUserId: assignee.toLowerCase().replace(/\s+/g, "-"),
            }
          : action,
      ),
    );
  };

  const attachEvidenceToAction = (actionId: string, files: FileList) => {
    const fileCount = files.length;
    if (fileCount === 0) return;
    const stamp = formatStamp();
    const newRefs = Array.from(files).map((file) => `action-evidence-${actionId}-${Date.now()}-${file.name}`);
    setActions((current) =>
      current.map((action) =>
        action.id === actionId
          ? {
              ...action,
              evidenceCount: (action.evidenceCount || 0) + fileCount,
              localEvidenceRefs: [...(action.localEvidenceRefs || []), ...newRefs],
              status: action.status === "Open" ? ("In Progress" as ActionStatus) : action.status,
            }
          : action,
      ),
    );
    queueSyncItem({
      itemType: "evidenceUpload",
      localId: `action-evidence-${actionId}-${Date.now()}`,
      status: "Pending Sync",
      createdAt: stamp,
      retryCount: 0,
      lastError: "",
      payload: { actionId, fileCount },
    });
    pushToast("Evidence attached", `${fileCount} file${fileCount === 1 ? "" : "s"} added.`, "success");
  };

  const handleGoogleConnect = () => {
    if (!backendConfigured) {
      pushToast(
        "Backend setup required",
        "Add your Google OAuth credentials to the backend before connecting the Google Drive root folder.",
        "warning",
      );
      return;
    }

    window.location.href = "/auth/google/login";
  };

  const handleGoogleDisconnect = async () => {
    try {
      await fetch("/auth/google/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      pushToast("Disconnect issue", "Google sign-out could not be confirmed, but the local link has been cleared.", "warning");
    }

    setGoogleConnected(false);
    setSelectedFolderId("");
    setFolders([]);
    setFolderInspection(null);
    setAuditFormsFolderInput("");
    setMasterSheetInput("");
    setEvidenceFolderInput("");
    setHealthSafetyFolderInput("");
    setExportsFolderInput("");
    setAdminNotesFolderInput("");
    setOnboardingSource(null);
    setOnboardingRecords([]);
    setSelectedOnboardingRecordId("");
    setSyncState("Not synced");
    pushToast("Google disconnected", "The Google Drive connection has been removed from this tablet.", "neutral");
  };

  const handleAddFolder = async () => {
    if (!googleConnected) {
      pushToast("Connect required", "Connect Google before linking the company folder from the root folder.", "warning");
      return;
    }

    const companyFolderId = extractGoogleResourceId(folderIdInput);
    const auditFormsFolderId = extractGoogleResourceId(auditFormsFolderInput);
    const masterSheetId = extractGoogleResourceId(masterSheetInput);
    const evidenceFolderId = extractGoogleResourceId(evidenceFolderInput);
    const healthSafetyFolderId = extractGoogleResourceId(healthSafetyFolderInput);
    const exportsFolderId = extractGoogleResourceId(exportsFolderInput);
    const adminNotesFolderId = extractGoogleResourceId(adminNotesFolderInput);
    const existingFolder = folders.find((folder) => folder.id === companyFolderId);

    if (!companyFolderId) {
      pushToast("Company folder required", "Paste the company folder link or ID.", "warning");
      return;
    }

    if (!masterSheetId) {
      pushToast("Master sheet required", "Paste the company master sheet link or ID.", "warning");
      return;
    }

    setFolderInspectionLoading(true);
    try {
      const [companyFolder, masterSheetPayload, auditFormsPayload] = await Promise.all([
        loadGoogleFile(companyFolderId),
        loadCompanySheetById(masterSheetId, companyFolderId, { silent: true }),
        auditFormsFolderId ? loadFormsFolder(auditFormsFolderId) : Promise.resolve(null),
      ]);

      if (!masterSheetPayload) {
        throw new Error("The company master sheet could not be loaded.");
      }

      const inspection: FolderInspection = {
        ok: true,
        folder: {
          id: companyFolder.id,
          name: companyFolder.name,
          createdTime: companyFolder.createdTime || "",
        },
        checks: {
          auditFormsFolder: Boolean(auditFormsFolderId),
          masterDataFolder: true,
          masterSheet: true,
          evidenceFolder: Boolean(evidenceFolderId),
          exportsFolder: Boolean(exportsFolderId),
          adminNotesFolder: Boolean(adminNotesFolderId),
        },
        auditFormsFolder: auditFormsPayload
          ? { id: auditFormsPayload.folder.id, name: auditFormsPayload.folder.name }
          : null,
        masterDataFolder: { id: masterSheetId, name: "Manual master sheet link" },
        masterSheet: {
          id: masterSheetPayload.sheetId,
          name: masterSheetPayload.sheetName,
          tabs: masterSheetPayload.tabs,
        },
        auditForms: (auditFormsPayload?.forms || []).map((form) => ({ id: form.id, name: form.name })),
        blockingItems: [],
        recommendedItems: [
          ...(!auditFormsFolderId ? ["Audit forms folder link"] : []),
          ...(!evidenceFolderId ? ["Evidence folder link"] : []),
          ...(!exportsFolderId ? ["Exports folder link"] : []),
          ...(!adminNotesFolderId ? ["Admin notes folder link"] : []),
        ],
        missingItems: [
          ...(!auditFormsFolderId ? ["Audit forms folder link"] : []),
          ...(!evidenceFolderId ? ["Evidence folder link"] : []),
          ...(!exportsFolderId ? ["Exports folder link"] : []),
          ...(!adminNotesFolderId ? ["Admin notes folder link"] : []),
        ],
      };

      setFolderInspection(inspection);

      const nextFolder: CompanyFolder = {
        id: inspection.folder.id,
        name: inspection.folder.name,
        onboardingFormName: existingFolder?.onboardingFormName || `${inspection.folder.name} Onboarding`,
        auditFormCount: inspection.auditForms.length,
        auditFormIds: inspection.auditForms.map((item) => item.id),
        responseSheetName: inspection.masterSheet?.name || "Company Master Sheet",
        responseSheetId: inspection.masterSheet?.id || "",
        linkedAt: inspection.folder.createdTime || existingFolder?.linkedAt || formatStamp(),
        onboardingVerified: existingFolder?.onboardingVerified ?? true,
        auditFormsVerified: Boolean(auditFormsFolderId),
        responseSheetVerified: true,
      };

      setFolders((current) => {
        const remaining = current.filter((folder) => folder.id !== nextFolder.id);
        return [nextFolder, ...remaining];
      });
      setSelectedFolderId(nextFolder.id);
      setFolderIdInput(companyFolderId);
      setAuditFormsFolderInput(auditFormsFolderId);
      setMasterSheetInput(masterSheetId);
      setEvidenceFolderInput(evidenceFolderId);
      setHealthSafetyFolderInput(healthSafetyFolderId);
      setExportsFolderInput(exportsFolderId);
      setAdminNotesFolderInput(adminNotesFolderId);
      setSyncState("Linked");
      setWorkspaceValidation(null);
      pushToast(
        "Company workspace linked",
        `${nextFolder.name} is ready to populate using the pasted Google links.`,
        "success",
      );
      void validateWorkspace({ silent: true });
    } catch (error) {
      setFolderInspection(null);
      pushToast(
        "Workspace link failed",
        error instanceof Error ? error.message : "Unable to link the company workspace from the provided Google links.",
        "warning",
      );
      return;
    } finally {
      setFolderInspectionLoading(false);
    }
  };

  const handleSelectFolder = async (folderId: string) => {
    if (!googleConnected) {
      pushToast("Connect required", "Connect Google before selecting the company folder.", "warning");
      return;
    }

    const folder = folders.find((item) => item.id === folderId);
    if (!folder) {
      pushToast("Folder missing", "Add a company folder before selecting it.", "warning");
      return;
    }

    setSelectedFolderId(folderId);
    setSyncState("Linked");
    void inspectFolderById(folderId, { silent: true });
    pushToast("Folder selected", `${folder.name} is now the active company source.`, "success");
  };

  const handleAddSite = () => {
    if (!canAccessAdmin(currentUser?.role || "Auditor")) {
      pushToast("Access restricted", "Only company administrators with full workspace rights can add sites.", "warning");
      return;
    }
    const input = window.prompt("New site name");
    const nextName = String(input || "").trim();
    if (!nextName) return;
    const exists = sites.some((site) => normalizeIdentity(site.name) === normalizeIdentity(nextName));
    if (exists) {
      pushToast("Site exists", `${nextName} already exists.`, "warning");
      return;
    }
    const newSite: Site = {
      id: createSiteId(nextName),
      name: nextName,
      code: nextName.slice(0, 3).toUpperCase(),
      active: true,
    };
    setSites((current) => [newSite, ...current]);
    setSelectedSiteId(newSite.id);
    pushToast("Site added", `${nextName} is now available for schedules and audits.`, "success");
  };

  const handleArchiveSite = (siteId: string) => {
    const site = sites.find((item) => item.id === siteId);
    if (!site) return;
    if (!window.confirm(`Archive ${site.name}?`)) return;
    setSites((current) => current.map((item) => (item.id === siteId ? { ...item, active: false } : item)));
    if (selectedSiteId === siteId) {
      setSelectedSiteId("");
    }
    pushToast("Site archived", `${site.name} has been archived.`, "success");
  };

  const handleToggleUserSiteAssignment = (email: string, siteId: string) => {
    if (!canAccessAdmin(currentUser?.role || "Auditor")) {
      pushToast("Access restricted", "Only company administrators with full workspace rights can change site assignments.", "warning");
      return;
    }
    const key = normalizeIdentity(email);
    setUserSiteAssignments((current) => {
      const prev = current[key] ?? [];
      const has = prev.includes(siteId);
      const nextIds = has ? prev.filter((id) => id !== siteId) : [...prev, siteId];
      const next = { ...current };
      if (nextIds.length === 0) {
        delete next[key];
      } else {
        next[key] = nextIds;
      }
      return next;
    });
    pushToast("Site assignment updated", "Workspace site access for that user was saved on this device.", "neutral");
  };

  const handleVerifyOnboarding = () => {
    if (!selectedFolder) {
      pushToast("Link required", "Link a company folder before verifying onboarding.", "warning");
      return;
    }

    setFolders((current) =>
      current.map((folder) =>
        folder.id === selectedFolder.id ? { ...folder, onboardingVerified: true } : folder,
      ),
    );
    pushToast("Onboarding verified", `${selectedFolder.onboardingFormName} is available in the company folder.`, "success");
  };

  const handleVerifyAudits = () => {
    if (!selectedFolder) {
      pushToast("Link required", "Link a company folder before verifying audit forms.", "warning");
      return;
    }

    setFolders((current) =>
      current.map((folder) =>
        folder.id === selectedFolder.id ? { ...folder, auditFormsVerified: true } : folder,
      ),
    );
    pushToast("Audit forms verified", `${selectedFolder.auditFormCount} audit forms are ready to sync.`, "success");
  };

  const handleVerifyResponseSheet = () => {
    if (!selectedFolder) {
      pushToast("Link required", "Link a company folder before verifying the response sheet.", "warning");
      return;
    }

    setFolders((current) =>
      current.map((folder) =>
        folder.id === selectedFolder.id ? { ...folder, responseSheetVerified: true } : folder,
      ),
    );
    pushToast("Response sheet verified", `${selectedFolder.responseSheetName} is ready to capture company data.`, "success");
  };

  const handleSyncForms = async () => {
    if (!selectedFolder) {
      pushToast("Setup incomplete", "Link a company folder before syncing.", "warning");
      return;
    }

    if (!folderInspection || folderInspection.folder.id !== selectedFolder.id) {
      pushToast("Folder check required", "Check the company folder before populating the app.", "warning");
      return;
    }

    const manualMasterSheetId = extractGoogleResourceId(masterSheetInput);
    if (!folderInspection.checks.masterSheet && !manualMasterSheetId) {
      pushToast("Master sheet missing", "Paste the company master sheet link before populating the app.", "warning");
      return;
    }

    const companySheet = manualMasterSheetId
      ? await loadCompanySheetById(manualMasterSheetId, selectedFolder.id, { silent: true })
      : await loadCompanySheet(selectedFolder.id, { silent: true });
    await validateWorkspace({ silent: true });

    setFolders((current) =>
      current.map((folder) =>
        folder.id === selectedFolder.id
          ? { ...folder, auditFormsVerified: true, responseSheetVerified: true }
          : folder,
      ),
    );
    const nextTemplates = folderInspection.auditForms.map((form) => ({
      id: `template-${selectedFolder.id}-${form.id}`,
      name: form.name,
      active: true,
      questions: buildDefaultQuestions(form.name),
      source: "Google Drive" as const,
    }));
    setTemplates((current) => {
      const remaining = current.filter((item) => !item.id.startsWith(`template-${selectedFolder.id}-`));
      return [...remaining, ...nextTemplates];
    });
    setAudits(
      nextTemplates.filter((template) => template.active).map((template, index) => ({
        id: `audit-${selectedFolder.id}-${template.id}`,
        name: template.name,
        category: "Google Form audit",
        siteArea: selectedFolder.name,
        dueLabel: getDueLabel(index === 0 ? 1 : 24),
        dueHours: index === 0 ? 1 : 24,
        priority: index === 0 ? "High" : "Medium",
        owner: scheduleOwnerInput || DEFAULT_MANAGER_NAME,
        templateVersion: template.source,
        status: getAuditTrafficStatus(index === 0 ? 1 : 24),
        lastCompletedAt: "Not yet completed",
        questions: template.questions,
      })),
    );
    setSyncState("Synced");
    pushToast(
      "App populated",
      folderInspection.auditForms.length > 0
        ? `${selectedFolder.name} is now live with ${folderInspection.auditForms.length} audit form${folderInspection.auditForms.length === 1 ? "" : "s"}${companySheet ? ", schedules, and users" : ""}.`
        : `${selectedFolder.name} is now live. No audit forms have been added yet.`,
      "success",
    );
  };

  const handleStartCompanyOnboarding = () => {
    setSelectedFolderId("");
    setFolderNameInput("");
    setFolderIdInput("");
    setAuditFormsFolderInput("");
    setMasterSheetInput("");
    setEvidenceFolderInput("");
    setHealthSafetyFolderInput("");
    setExportsFolderInput("");
    setAdminNotesFolderInput("");
    setSelectedOnboardingRecordId("");
    setSyncState("Onboarding new company");
    pushToast(
      "New company onboarding",
      "Enter the company folder details below or refresh the Google Drive root folder to choose a live company source.",
      "neutral",
    );
  };

  const handleOpenOnboardingForm = () => {
    if (!onboardingSource?.formId) {
      pushToast(
        "Onboarding form unavailable",
        googleConnected
          ? "The onboarding form has not been discovered yet. Refresh the onboarding source or reconnect Google."
          : `Reconnect Google first so ${companyName} can find the onboarding form link.`,
        "warning",
      );
      return;
    }

    window.location.href = buildOnboardingFormViewUrl(onboardingSource.formId);
  };

  const handleApplyOnboardingRecord = () => {
    if (!activeOnboardingRecord) {
      pushToast("Submission required", "Select an onboarding submission before applying it.", "warning");
      return;
    }

    setFolderNameInput(
      normalizeFolderName(activeOnboardingRecord.companyName || activeOnboardingRecord.companyFolderReference),
    );
    setScheduleRecipientsInput(activeOnboardingRecord.auditRecipients || DEFAULT_AUDITOR_NAME);
    setScheduleOverdueAlertRecipientsInput(
      activeOnboardingRecord.overdueAlertRecipients || activeOnboardingRecord.reportingContact || DEFAULT_MANAGER_NAME,
    );
    setScheduleEscalationContactInput(activeOnboardingRecord.reportingContact || DEFAULT_ESCALATION_NAME);
    setScheduleOwnerInput(activeOnboardingRecord.mainContact || DEFAULT_MANAGER_NAME);
    setSchedulePersonalAssigneeInput(activeOnboardingRecord.mainContact || DEFAULT_AUDITOR_NAME);
    setSyncState("Onboarding submission applied");
    pushToast(
      "Submission applied",
      `${activeOnboardingRecord.companyName} details have been loaded into the onboarding setup.`,
      "success",
    );
  };

  const handleLoadDemoData = () => {
    const demo = buildDemoPrecastWorkspace();
    setAudits(demo.audits);
    setActions(demo.actions);
    setDrafts(demo.drafts);
    setSyncQueue(demo.syncQueue);
    setTemplates(demo.templates);
    setCompanySheetSync(demo.companySheetSync);
    setSyncState("Synced");
    setScreen(getHomeScreenForRole(currentUser?.role || "Admin"));
    pushToast("Demo data loaded", "Realistic precast demo data is now active for review.", "success");
  };

  const handleClearDemoData = () => {
    setAudits((current) => current.filter((audit) => !audit.id.startsWith("audit-demo-")));
    setActions((current) => current.filter((action) => !action.id.startsWith("action-demo-") && action.companyId !== "demo-company"));
    setDrafts((current) => {
      const nextDrafts: Record<string, AuditDraft> = {};
      Object.entries(current).forEach(([auditId, draft]) => {
        if (!auditId.startsWith("audit-demo-")) {
          nextDrafts[auditId] = draft;
        }
      });
      return nextDrafts;
    });
    setSyncQueue((current) => current.filter((item) => !item.id.startsWith("sync-demo-") && !item.localId.includes("demo")));
    setTemplates((current) => current.filter((template) => !template.id.startsWith("template-demo-")));
    setCompanySheetSync((current) => (current?.sheetId === "demo-master-sheet" ? null : current));
    setScreen(getHomeScreenForRole(currentUser?.role || "Admin"));
    pushToast("Demo data cleared", "Demo-only records were removed from this tablet.", "neutral");
  };

  const handleOneClickGoogleOnboarding = async () => {
    if (!googleConnected) {
      handleGoogleConnect();
      return;
    }

    if (!folderIdInput || !masterSheetInput) {
      pushToast(
        "Missing links",
        "Paste the company folder and master sheet links first, then run one-click onboarding.",
        "warning",
      );
      return;
    }

    await handleAddFolder();
    handleVerifyOnboarding();
    handleVerifyAudits();
    handleVerifyResponseSheet();
    await handleSyncForms();
  };

  const handleApplyDashboardPreset = (preset: "minimal" | "operations" | "executive") => {
    if (preset === "minimal") {
      setDashboardPreferences({
        trafficBoard: true,
        liveSummary: true,
        upcomingAudits: false,
        openActions: true,
        complianceSnapshot: false,
      });
      setDashboardSectionOrder(["trafficBoard", "liveSummary", "openActions", "upcomingAudits", "complianceSnapshot"]);
      return;
    }
    if (preset === "operations") {
      setDashboardPreferences({
        trafficBoard: true,
        liveSummary: true,
        upcomingAudits: true,
        openActions: true,
        complianceSnapshot: true,
      });
      setDashboardSectionOrder(defaultDashboardSectionOrder());
      return;
    }
    setDashboardPreferences({
      trafficBoard: false,
      liveSummary: true,
      upcomingAudits: true,
      openActions: true,
      complianceSnapshot: true,
    });
    setDashboardSectionOrder(["liveSummary", "complianceSnapshot", "openActions", "upcomingAudits", "trafficBoard"]);
  };

  const handleToggleDashboardSection = (section: DashboardSectionKey) => {
    setDashboardPreferences((current) => ({ ...current, [section]: !current[section] }));
  };

  const handleMoveDashboardSection = (section: DashboardSectionKey, direction: "up" | "down") => {
    setDashboardSectionOrder((current) => {
      const index = current.indexOf(section);
      if (index < 0) return current;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleAddTemplate = () => {
    const trimmedName = templateNameInput.trim();

    if (!trimmedName) {
      pushToast("Template name required", "Enter a template name before adding it.", "warning");
      return;
    }

    const templateQuestions =
      templateDraftQuestions.length > 0
        ? templateDraftQuestions.map((question, index) => ({
            id: `${trimmedName}-custom-${index + 1}`,
            text: question.text,
            fieldType: question.fieldType,
            answerPrompts: question.answerPrompts,
          }))
        : buildDefaultQuestions(trimmedName);

    setTemplates((current) => [
      {
        id: `template-local-${Date.now()}`,
        name: trimmedName,
        active: true,
        questions: templateQuestions,
        source: "Built in app",
      },
      ...current,
    ]);
    if (syncState === "Synced") {
      setAudits((current) => [
        {
          id: `audit-local-${Date.now()}`,
          name: trimmedName,
          category: "Built in app",
          siteArea: selectedFolder?.name || "Main site",
          dueLabel: getDueLabel(24),
          dueHours: 24,
          priority: "Medium",
          owner: scheduleOwnerInput || DEFAULT_MANAGER_NAME,
          templateVersion: "Built in app",
          status: getAuditTrafficStatus(24),
          lastCompletedAt: "Not yet completed",
          questions: templateQuestions,
        },
        ...current,
      ]);
    }
    setTemplateNameInput("");
    setTemplateQuestionInput("");
    setTemplateDraftQuestions([]);
    pushToast("Template added", `${trimmedName} is now available in the audit template builder.`, "success");
  };

  const handleAddTemplateQuestion = () => {
    const trimmedQuestion = templateQuestionInput.trim();
    if (!trimmedQuestion) {
      pushToast("Question required", "Enter a question before adding it to the template builder.", "warning");
      return;
    }

    setTemplateDraftQuestions((current) => [
      ...current,
      {
        id: `draft-question-${Date.now()}`,
        text: trimmedQuestion,
        fieldType: templateQuestionTypeInput,
        answerPrompts: {},
      },
    ]);
    setTemplateQuestionInput("");
  };

  const handleAddAnswerPromptToDraftQuestion = (questionId: string, answer: Answer) => {
    if (!currentUser || !canAccessAdmin(currentUser.role)) {
      pushToast("Access restricted", "Only company administrators with full workspace rights can configure answer prompts.", "warning");
      return;
    }
    const promptText = window.prompt("Add action prompt for this answer");
    if (!promptText?.trim()) {
      return;
    }
    setTemplateDraftQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;
        const existing = question.answerPrompts?.[answer] || [];
        return {
          ...question,
          answerPrompts: {
            ...(question.answerPrompts || {}),
            [answer]: [...existing, promptText.trim()],
          },
        };
      }),
    );
  };

  const handleRemoveAnswerPromptFromDraftQuestion = (questionId: string, answer: Answer, promptIndex: number) => {
    setTemplateDraftQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;
        const existing = question.answerPrompts?.[answer] || [];
        return {
          ...question,
          answerPrompts: {
            ...(question.answerPrompts || {}),
            [answer]: existing.filter((_, index) => index !== promptIndex),
          },
        };
      }),
    );
  };

  const handleRemoveTemplateQuestion = (questionId: string) => {
    setTemplateDraftQuestions((current) => current.filter((question) => question.id !== questionId));
  };

  const handleToggleTemplate = (templateId: string) => {
    const existingTemplate = templates.find((template) => template.id === templateId);
    if (!existingTemplate) {
      return;
    }
    const toggledTemplate: AuditTemplate = { ...existingTemplate, active: !existingTemplate.active };
    setTemplates((current) =>
      current.map((template) => (template.id === templateId ? toggledTemplate : template)),
    );

    if (syncState !== "Synced") {
      return;
    }

    if (!toggledTemplate.active) {
      setAudits((current) => current.filter((audit) => audit.name !== toggledTemplate?.name));
      return;
    }

    setAudits((current) => [
      {
        id: `audit-toggle-${Date.now()}`,
        name: toggledTemplate.name,
        category: toggledTemplate.source,
        siteArea: selectedFolder?.name || "Main site",
        dueLabel: getDueLabel(24),
        dueHours: 24,
        priority: "Medium",
        owner: scheduleOwnerInput || DEFAULT_MANAGER_NAME,
        templateVersion: toggledTemplate.source,
        status: getAuditTrafficStatus(24),
        lastCompletedAt: "Not yet completed",
        questions: toggledTemplate.questions,
      },
      ...current,
    ]);
  };

  const handleSelectReportTemplate = (value: ReportTemplateType) => {
    setSelectedReportTemplate(value);
    setSelectedReportSections(reportTemplateDefaults[value]);
  };

  const handleToggleReportSection = (section: ReportSectionKey) => {
    setSelectedReportSections((current) => {
      if (current.includes(section)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== section);
      }
      return [...current, section];
    });
  };

  const buildReportSections = (): {
    title: string;
    intro: string;
    sections: [string, string[]][];
  } => {
    const title =
      reportTitleInput.trim() ||
      (selectedReportTemplate === "Overdue audit pack"
        ? "Overdue Audit Pack"
        : selectedReportTemplate === "Corrective action pack"
          ? "Corrective Action Pack"
          : selectedReportTemplate === "Evidence pack"
            ? "Evidence Pack"
            : selectedReportTemplate === "Full report"
              ? "Full Compliance Report"
            : "Executive Summary");

    const intro =
      selectedReportTemplate === "Overdue audit pack"
        ? `${workspaceName} overdue audit position with escalations and queue pressure.`
        : selectedReportTemplate === "Corrective action pack"
          ? `${workspaceName} corrective action view covering severity, ownership, and evidence.`
          : selectedReportTemplate === "Evidence pack"
            ? `${workspaceName} evidence-led pack showing captured proof items and related audit activity.`
            : selectedReportTemplate === "Full report"
              ? `${workspaceName} full compliance intelligence pack covering audits, actions, risks, schedules, and sync exceptions.`
            : `${workspaceName} executive audit overview covering compliance, actions, and readiness.`;

    const sectionMap: Record<ReportSectionKey, [string, string[]]> = {
      compliance: [
        "Live compliance",
        [
          `- Compliance: ${compliance}%`,
          `- Open actions: ${openActions.length}`,
          `- Overdue audits: ${overdueAudits.length}`,
          `- Completed today: ${completedToday}`,
        ],
      ],
      overdueAudits: [
        "Overdue audits",
        overdueAudits.length > 0
          ? overdueAudits.slice(0, 10).map((item) => `- ${item.name} | ${item.siteArea} | ${item.owner} | ${getDueWarning(item.dueHours)}`)
          : ["- No overdue audits"],
      ],
      correctiveActions: [
        "Corrective actions",
        actions.length > 0
          ? actions.slice(0, 12).map((item) => `- ${item.auditName} | ${item.severity} | ${item.owner} | ${item.status} | evidence ${item.evidenceCount}`)
          : ["- No corrective actions"],
      ],
      overdueActions: [
        "Overdue actions",
        overdueActions.length > 0
          ? overdueActions.slice(0, 12).map((item) => `- ${item.auditName} | ${item.severity} | ${item.assignedToName} | due ${item.dueDate || item.dueLabel}`)
          : ["- No overdue actions"],
      ],
      criticalFindings: [
        "Critical and high findings",
        actions.filter((item) => item.severity === "Critical" || item.severity === "High").length > 0
          ? actions
              .filter((item) => item.severity === "Critical" || item.severity === "High")
              .slice(0, 12)
              .map((item) => `- ${item.auditName} | ${item.questionText} | ${item.severity} | ${item.riskCategory}`)
          : ["- No critical or high findings"],
      ],
      repeatFailures: [
        "Repeat failures",
        recurringFailedQuestions.length > 0
          ? recurringFailedQuestions.map(([question, count]) => `- ${question} | repeated ${count} times`)
          : ["- No repeat failures"],
      ],
      evidence: [
        "Evidence summary",
        [
          `- Evidence captured: ${evidenceCount}`,
          `- Actions with evidence: ${actions.filter((item) => item.evidenceCount > 0).length}`,
        ],
      ],
      auditHistory: [
        "Audit history",
        history.length > 0
          ? history.slice(0, 10).map((item) => `- ${item.auditName} | ${item.status} | ${item.completedBy} | ${item.completedAt}`)
          : ["- No audit history yet"],
      ],
      verificationHistory: [
        "Verification history",
        actions.filter((item) => item.verifiedByUserId || item.status === "Closed").length > 0
          ? actions
              .filter((item) => item.verifiedByUserId || item.status === "Closed")
              .slice(0, 12)
              .map((item) => `- ${item.auditName} | ${item.status} | ${item.verifiedByUserId || "Not recorded"} | ${item.closedAt || item.verificationNotes || "Awaiting note"}`)
          : ["- No verification history yet"],
      ],
      scheduleCompliance: [
        "Schedule compliance",
        managedSchedules.length > 0
          ? managedSchedules.slice(0, 12).map((schedule) => `- ${schedule.scheduleName} | ${schedule.healthState || computeScheduleHealthState(schedule)} | missed ${schedule.missedAuditCount || 0} | next due ${schedule.nextDueAt || "Not set"}`)
          : ["- No schedules available"],
      ],
      auditCompletion: [
        "Audit completion summary",
        [
          `- Completed today: ${completedToday}`,
          `- Total history records: ${history.length}`,
          `- Completion rate: ${auditCompletionRate}%`,
        ],
      ],
      syncExceptions: [
        "Offline sync exceptions",
        syncQueue.length > 0
          ? syncQueue
              .filter((item) => item.status === "Failed" || item.status === "Conflict")
              .slice(0, 12)
              .map((item) => `- ${item.itemType} | ${item.status} | retries ${item.retryCount} | ${item.lastError || "No error message"}`)
          : ["- No sync exceptions"],
      ],
      templates: [
        "Templates",
        templates.length > 0
          ? templates.map((template) => `- ${template.name} | ${template.source} | ${template.active ? "Active" : "Inactive"}`)
          : ["- No templates available"],
      ],
      offlineQueue: [
        "Offline queue",
        [`- Offline queue: ${offlineQueue.length}`],
      ],
    };

    return {
      title,
      intro,
      sections: selectedReportSections.map((key) => sectionMap[key]),
    };
  };

  const handleExportAuditPack = () => {
    if (reportRecipients.length === 0) {
      pushToast("Recipients required", "Select who can see this report before exporting it.", "warning");
      return;
    }

    const timestamp = formatStamp();
    const reportDefinition = buildReportSections();
    const report = [
      reportDefinition.title,
      `Generated: ${timestamp}`,
      `Workspace: ${workspaceName}`,
      `Report type: ${selectedReportTemplate}`,
      "",
      reportDefinition.intro,
      "",
      ...reportDefinition.sections.flatMap(([heading, lines]) => [heading, ...lines, ""]),
    ].join("\n");

    downloadTextFile(`${reportDefinition.title.toLowerCase().replace(/\s+/g, "-")}.txt`, report);
    setReportInbox((current) => [
      {
        id: `report-text-${Date.now()}`,
        title: reportDefinition.title,
        type: "Text audit pack",
        createdAt: timestamp,
        createdBy: currentUser?.name || companyName,
        visibleTo: reportRecipients,
        template: selectedReportTemplate,
      },
      ...current,
    ]);
    pushToast("Audit pack exported", "A downloadable audit pack has been created for this workspace.", "success");
  };

  const handleExportAuditPackPdf = () => {
    if (reportRecipients.length === 0) {
      pushToast("Recipients required", "Select who can see this report before exporting it.", "warning");
      return;
    }

    const timestamp = formatStamp();
    const reportDefinition = buildReportSections();
    const html = `
      <h1>${reportDefinition.title}</h1>
      <p class="meta">Generated ${timestamp} for ${workspaceName}</p>
      <p>${reportDefinition.intro}</p>
      <div class="grid">
        <div class="card"><strong>Compliance</strong><p>${compliance}% live compliance</p></div>
        <div class="card"><strong>Open actions</strong><p>${openActions.length} open, ${overdueActions.length} overdue</p></div>
        <div class="card"><strong>Live audits</strong><p>${audits.length} active audits</p></div>
        <div class="card"><strong>Evidence</strong><p>${evidenceCount} captured evidence items</p></div>
      </div>
      ${reportDefinition.sections
        .map(
          ([heading, lines]) => `<h2>${heading}</h2><ul>${lines.map((line: string) => `<li>${line.replace(/^- /, "")}</li>`).join("")}</ul>`,
        )
        .join("")}
    `;

    const opened = openPrintableReport(reportDefinition.title, html);
    if (!opened) {
      pushToast("PDF export blocked", "Allow pop-ups on this device to open the printable PDF report view.", "warning");
      return;
    }

    setReportInbox((current) => [
      {
        id: `report-pdf-${Date.now()}`,
        title: reportDefinition.title,
        type: "PDF report",
        createdAt: timestamp,
        createdBy: currentUser?.name || companyName,
        visibleTo: reportRecipients,
        template: selectedReportTemplate,
      },
      ...current,
    ]);
    pushToast("PDF report opened", "The printable audit report view is ready to save as PDF.", "success");
  };

  const handleToggleReportRecipient = (email: string) => {
    setReportRecipients((current) =>
      current.includes(email) ? current.filter((item) => item !== email) : [...current, email],
    );
  };

  const handleAddSchedule = () => {
    if (!selectedFolder) {
      pushToast("Company required", "Select a company folder before creating a schedule.", "warning");
      return;
    }

    const trimmedName = scheduleNameInput.trim();
    const trimmedArea = scheduleAreaInput.trim();
    const trimmedOwner = scheduleOwnerInput.trim();
    const trimmedPersonalAssignee = schedulePersonalAssigneeInput.trim();
    const trimmedSendTime = scheduleSendTimeInput.trim();
    const recipients =
      scheduleScopeInput === "Personal schedule"
        ? [trimmedPersonalAssignee]
        : parsePeopleList(scheduleRecipientsInput);
    const overdueAlertRecipients = parsePeopleList(scheduleOverdueAlertRecipientsInput);
    const trimmedEscalationContact = scheduleEscalationContactInput.trim();
    const nextDueHours = Number(scheduleNextDueHoursInput);

    if (
      !trimmedName ||
      !trimmedArea ||
      !trimmedOwner ||
      (scheduleScopeInput === "Personal schedule" && !trimmedPersonalAssignee) ||
      !trimmedSendTime ||
      !trimmedEscalationContact ||
      recipients.length === 0 ||
      overdueAlertRecipients.length === 0 ||
      Number.isNaN(nextDueHours)
    ) {
      pushToast(
        "Details required",
        "Enter the audit details, send time, recipients, overdue alerts, and next due time before saving the schedule.",
        "warning",
      );
      return;
    }

    const auditId = `audit-${Date.now()}`;
    const newAudit: Audit = {
      id: auditId,
      name: trimmedName,
      category: "Scheduled Audit",
      siteArea: trimmedArea,
      dueLabel: getDueLabel(nextDueHours),
      dueHours: nextDueHours,
      priority: schedulePriorityInput,
      owner: scheduleScopeInput === "Personal schedule" ? trimmedPersonalAssignee : trimmedOwner,
      templateVersion: "v1.0",
      status: getAuditTrafficStatus(nextDueHours),
      lastCompletedAt: "Not completed yet",
      questions: buildDefaultQuestions(trimmedName),
    };

    const newSchedule: ScheduleItem = {
      id: `schedule-${Date.now()}`,
      companyFolderId: selectedFolder.id,
      auditId,
      auditName: trimmedName,
      siteArea: trimmedArea,
      owner: trimmedOwner,
      scope: scheduleScopeInput,
      personalAssignee: scheduleScopeInput === "Personal schedule" ? trimmedPersonalAssignee : "",
      frequency: scheduleFrequencyInput,
      sendTime: trimmedSendTime,
      recipients,
      overdueAlertRecipients,
      reportTo: trimmedEscalationContact,
      overdueAlertTiming: scheduleOverdueAlertTimingInput,
      completionCheckTiming: scheduleCompletionCheckTimingInput,
      nextDueHours,
      priority: schedulePriorityInput,
    };

    setAudits((current) => [newAudit, ...current]);
    setSchedules((current) => [newSchedule, ...current]);
    setScheduleNameInput("");
    setScheduleAreaInput("");
    setScheduleOwnerInput(DEFAULT_MANAGER_NAME);
    setScheduleScopeInput("Company schedule");
    setSchedulePersonalAssigneeInput(DEFAULT_AUDITOR_NAME);
    setScheduleFrequencyInput("Weekly");
    setScheduleSendTimeInput("08:00");
    setScheduleRecipientsInput(DEFAULT_AUDITOR_NAME);
    setScheduleOverdueAlertRecipientsInput(DEFAULT_MANAGER_NAME);
    setScheduleEscalationContactInput(DEFAULT_ESCALATION_NAME);
    setScheduleOverdueAlertTimingInput("At due time");
    setScheduleCompletionCheckTimingInput("At due time");
    setScheduleNextDueHoursInput("24");
    setSchedulePriorityInput("Medium");
    pushToast(
      "Schedule created",
      `${trimmedName} is now scheduled for ${selectedFolder.name} as a ${scheduleScopeInput.toLowerCase()}.`,
      "success",
    );
  };

  const resetManagedScheduleDraft = () => {
    setEditingScheduleId(null);
    setScheduleDraftName("");
    setScheduleDraftSelectedAuditIds([]);
    setScheduleDraftAudits([]);
    setScheduleDraftStartDate("");
    setScheduleDraftEndDate("");
    setScheduleDraftContinuous(true);
    setScheduleDraftAuditors([]);
    setScheduleValidationAttempted(false);
    setScheduleEditorOpen(false);
  };

  const handleOpenNewSchedule = () => {
    setEditingScheduleId(null);
    setScheduleDraftName("");
    setScheduleDraftSelectedAuditIds([]);
    setScheduleDraftAudits([]);
    setScheduleDraftStartDate(new Date().toISOString().slice(0, 10));
    setScheduleDraftEndDate("");
    setScheduleDraftContinuous(true);
    setScheduleDraftAuditors([]);
    setScheduleValidationAttempted(false);
    setScheduleEditorOpen(true);
  };

  const handleOpenSchedule = (scheduleId: string) => {
    const schedule = managedSchedules.find((item) => item.id === scheduleId);
    if (!schedule) {
      return;
    }

    setEditingScheduleId(scheduleId);
    setScheduleDraftName(schedule.scheduleName);
    setScheduleDraftSelectedAuditIds(schedule.audits.map((audit) => audit.auditId));
    setScheduleDraftAudits(schedule.audits);
    setScheduleDraftStartDate(schedule.startDate);
    setScheduleDraftEndDate(schedule.endDate);
    setScheduleDraftContinuous(!schedule.endDate);
    setScheduleDraftAuditors(schedule.auditors);
    setScheduleValidationAttempted(false);
    setScheduleEditorOpen(true);
  };

  const handleToggleScheduleAudit = (auditId: string, auditName: string) => {
    setScheduleDraftSelectedAuditIds((current) =>
      current.includes(auditId) ? current.filter((item) => item !== auditId) : [...current, auditId],
    );

    setScheduleDraftAudits((current) => {
      const existing = current.find((item) => item.auditId === auditId);
      if (existing) {
        return current.filter((item) => item.auditId !== auditId);
      }
      return [
        ...current,
        {
          id: `schedule-audit-${Date.now()}-${auditId}`,
          auditId,
          auditName,
          days: [],
          frequency: "Weekly",
          liveTime: "08:00",
          completionHours: 24,
        },
      ];
    });
  };

  const handleToggleScheduleAuditDay = (auditId: string, day: ScheduleDay) => {
    setScheduleDraftAudits((current) =>
      current.map((audit) =>
        audit.auditId === auditId
          ? {
              ...audit,
              days: audit.days.includes(day) ? audit.days.filter((item) => item !== day) : [...audit.days, day],
            }
          : audit,
      ),
    );
  };

  const handleUpdateScheduleAuditField = (
    auditId: string,
    field: "frequency" | "liveTime" | "completionHours",
    value: string,
  ) => {
    setScheduleDraftAudits((current) =>
      current.map((audit) =>
        audit.auditId === auditId
          ? {
              ...audit,
              [field]: field === "completionHours" ? Number(value) : value,
            }
          : audit,
      ),
    );
  };

  const handleToggleScheduleAuditor = (name: string) => {
    setScheduleDraftAuditors((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const handleSaveManagedSchedule = async () => {
    if (!selectedFolder) {
      pushToast("Company required", "Link a company before creating schedules.", "warning");
      return;
    }

    setScheduleValidationAttempted(true);

    const trimmedName = scheduleDraftName.trim();
    const invalidAuditConfig = scheduleDraftAudits.some(
      (audit) =>
        audit.days.length === 0 ||
        !audit.frequency ||
        !audit.liveTime ||
        !audit.completionHours,
    );

    if (
      !trimmedName ||
      scheduleDraftAudits.length === 0 ||
      !scheduleDraftStartDate ||
      scheduleDraftAuditors.length === 0 ||
      invalidAuditConfig
    ) {
      pushToast("Schedule details missing", "Complete all required schedule fields before saving.", "warning");
      return;
    }

    const editingSchedule = editingScheduleId
      ? managedSchedules.find((item) => item.id === editingScheduleId) || null
      : null;
    const rootId = editingSchedule?.rootId || `schedule-root-${Date.now()}`;
    const nextVersion = editingSchedule ? editingSchedule.versionNumber + 1 : 1;
    const resolvedEndDate = scheduleDraftContinuous ? "" : scheduleDraftEndDate;
    const lifecycle: ScheduleLifecycle = resolvedEndDate ? "Archived" : "Live";

    const nextSchedule: ManagedSchedule = {
      id: `schedule-${Date.now()}`,
      rootId,
      versionNumber: nextVersion,
      versionLabel: formatScheduleVersionLabel(nextVersion),
      lifecycle,
      companyFolderId: selectedFolder.id,
      scheduleName: trimmedName,
      audits: scheduleDraftAudits,
      auditors: scheduleDraftAuditors,
      startDate: scheduleDraftStartDate,
      endDate: resolvedEndDate,
      updatedAt: formatStamp(),
    };

    const nextManagedSchedules = !editingSchedule
      ? [nextSchedule, ...managedSchedules]
      : [
          {
            ...editingSchedule,
            lifecycle: "Archived" as ScheduleLifecycle,
          },
          nextSchedule,
          ...managedSchedules.filter((item) => item.id !== editingSchedule.id),
        ];

    try {
      await persistManagedSchedules(
        selectedFolder.id,
        nextManagedSchedules.filter((schedule) => schedule.companyFolderId === selectedFolder.id),
      );
      setManagedSchedules(nextManagedSchedules);
    } catch (error) {
      pushToast(
        "Schedule save failed",
        error instanceof Error ? error.message : "Unable to save the schedule to the company master sheet.",
        "warning",
      );
      return;
    }

    pushToast(
      lifecycle === "Archived" ? "Schedule archived" : editingSchedule ? "Schedule updated" : "Schedule created",
      lifecycle === "Archived"
        ? `${trimmedName} has been archived as revision ${nextSchedule.versionLabel}.`
        : `${trimmedName} is now saved as revision ${nextSchedule.versionLabel}.`,
      "success",
    );

    resetManagedScheduleDraft();
  };

  const handleReactivateSchedule = (scheduleId: string) => {
    const schedule = managedSchedules.find((item) => item.id === scheduleId);
    if (!schedule) {
      return;
    }

    setEditingScheduleId(scheduleId);
    setScheduleDraftName(schedule.scheduleName);
    setScheduleDraftSelectedAuditIds(schedule.audits.map((audit) => audit.auditId));
    setScheduleDraftAudits(schedule.audits);
    setScheduleDraftStartDate(new Date().toISOString().slice(0, 10));
    setScheduleDraftEndDate("");
    setScheduleDraftContinuous(true);
    setScheduleDraftAuditors(schedule.auditors);
    setScheduleValidationAttempted(false);
    setScheduleEditorOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const schedule = managedSchedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    const confirmed = window.confirm(`Delete "${schedule.scheduleName}" (${schedule.versionLabel})? This cannot be undone.`);
    if (!confirmed) return;

    const nextManagedSchedules = managedSchedules.filter((item) => item.id !== scheduleId);
    try {
      if (selectedFolder?.id) {
        await persistManagedSchedules(selectedFolder.id, nextManagedSchedules);
      }
      setManagedSchedules(nextManagedSchedules);
      if (editingScheduleId === scheduleId) {
        resetManagedScheduleDraft();
      }
      pushToast("Schedule deleted", `${schedule.scheduleName} has been removed.`, "success");
    } catch (error) {
      pushToast(
        "Delete failed",
        error instanceof Error ? error.message : "Unable to delete the schedule from the company master sheet.",
        "warning",
      );
    }
  };

  const handlePauseSchedule = async (scheduleId: string) => {
    const schedule = managedSchedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    const input = window.prompt(`Pause "${schedule.scheduleName}" for how many days?`, "7");
    if (input === null) return;
    const days = Number(input.trim());
    if (!Number.isFinite(days) || days <= 0) {
      pushToast("Invalid duration", "Enter a number of days greater than 0.", "warning");
      return;
    }
    const pausedUntil = addDaysIso(Math.round(days));
    const nextManagedSchedules = managedSchedules.map((item) =>
      item.id === scheduleId
        ? {
            ...item,
            healthState: "Paused" as ScheduleHealthState,
            nextDueAt: pausedUntil,
            updatedAt: formatStamp(),
          }
        : item,
    );
    try {
      if (selectedFolder?.id) {
        await persistManagedSchedules(selectedFolder.id, nextManagedSchedules);
      }
      setManagedSchedules(nextManagedSchedules);
      pushToast("Schedule paused", `${schedule.scheduleName} paused until ${pausedUntil}.`, "success");
    } catch (error) {
      pushToast(
        "Pause failed",
        error instanceof Error ? error.message : "Unable to pause the schedule in the company master sheet.",
        "warning",
      );
    }
  };

  const handleResumeSchedule = async (scheduleId: string) => {
    const schedule = managedSchedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    const nextManagedSchedules = managedSchedules.map((item) =>
      item.id === scheduleId
        ? {
            ...item,
            healthState: undefined,
            nextDueAt: "",
            updatedAt: formatStamp(),
          }
        : item,
    );
    try {
      if (selectedFolder?.id) {
        await persistManagedSchedules(selectedFolder.id, nextManagedSchedules);
      }
      setManagedSchedules(nextManagedSchedules);
      pushToast("Schedule resumed", `${schedule.scheduleName} is active again.`, "success");
    } catch (error) {
      pushToast(
        "Resume failed",
        error instanceof Error ? error.message : "Unable to resume the schedule in the company master sheet.",
        "warning",
      );
    }
  };

  const persistManagedSchedules = async (companyFolderId: string, nextSchedules: ManagedSchedule[]) => {
    const sheetId = companySheetSync?.sheetId || extractGoogleResourceId(masterSheetInput);
    if (!sheetId) {
      throw new Error("Company master sheet link is required before saving schedules.");
    }

    const response = await fetch(`/api/google-sheet-by-id/${encodeURIComponent(sheetId)}/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyFolderId,
        schedules: nextSchedules,
      }),
    });

    const payload = (await response.json()) as SaveSchedulesResponse;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Unable to save schedules.");
    }
  };

  useEffect(() => {
    loadGoogleStatus({ silent: true });
  }, []);

  useEffect(() => {
    document.title = companyName;
  }, [companyName]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      loadGoogleStatus();
      loadOnboardingRecords({ silent: true });
      pushToast("Google connected", "Shared Google Drive access is now active.", "success");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const params = new URLSearchParams(window.location.search);
    const requestedScreen = params.get("screen");
    if (requestedScreen === "incidents" && canSubmitIncidents(currentUser.role)) {
      setScreen("incidents");
    }
  }, [currentUser]);

  useEffect(() => {
    if (googleConnected) {
      loadOnboardingRecords({ silent: true });
    } else {
      setOnboardingRecords([]);
      setSelectedOnboardingRecordId("");
    }
  }, [googleConnected]);

  useEffect(() => {
    if (currentUser && !canAccessControlScreen(currentUser.role) && screen === "admin") {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
    if (currentUser && !canAccessOnboardingNav(currentUser.role) && screen === "onboarding") {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
    if (currentUser && !canAccessSchedules(currentUser.role) && screen === "schedules") {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
    if (currentUser && !canAccessReports(currentUser.role) && screen === "reports") {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
    if (currentUser && !canAccessActions(currentUser.role) && screen === "actions") {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
    if (currentUser && !canAccessActions(currentUser.role) && screen === "nonConformance") {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
    if (currentUser && !canSubmitIncidents(currentUser.role) && screen === "incidents") {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
    if (currentUser && !canAccessAuditsCentre(currentUser.role) && screen === "audits") {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
    if (currentUser && screen !== "complete" && !visibleNavItems.some((item) => item.id === screen)) {
      setScreen(getHomeScreenForRole(currentUser.role));
    }
  }, [currentUser, screen, visibleNavItems]);

  if (!currentUser) {
    const inviteTok = new URLSearchParams(window.location.search).get("invite");
    if (inviteTok?.trim()) {
      return <AppHostedOnboardingCompletion inviteToken={inviteTok.trim()} />;
    }

    const signInOuterClass = [
      shellPreviewClass,
      "flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center overflow-hidden px-3 py-4 sm:px-4 sm:py-5",
      themeMode === "dark" ? `${qmsDarkShellGradient} text-slate-100` : `${qmsLightShellGradient} text-slate-900`,
    ].join(" ");

    const signInShellClass = [
      "qms-login-shell qms-login-card relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2.2rem] border p-3 backdrop-blur sm:p-4",
      themeMode === "dark"
        ? "border-slate-800/80 bg-slate-950/80 shadow-[0_32px_90px_rgba(2,6,23,0.58)] text-white"
        : "border-slate-200/85 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.14)] text-slate-900",
    ].join(" ");

    if (companySetupLoginPortal) {
      return (
        <div className={signInOuterClass}>
          <style>{appMotionStyles}</style>
          <div className="qms-tablet-stage">
            <div className="qms-tablet-device qms-tablet-device--signin">
              <div data-qms-theme={themeMode} className={signInShellClass}>
                <DataFlowBackground />
                <div className="relative z-10 grid h-full min-h-0 w-full grid-cols-1 items-center gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="flex flex-col justify-center gap-3 px-1 py-0 sm:px-2">
                    <BertLogo variant="full" tone={themeMode === "dark" ? "onDark" : "onLight"} size="lg" className="w-full" />
                    <p className="text-xs font-medium text-slate-500 sm:text-sm sm:text-slate-400">
                      Platform Master — company workspace onboarding only
                    </p>
                  </div>
                  <div className="flex min-h-0 items-center">
                    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-[0_16px_40px_rgba(2,6,23,0.4)] backdrop-blur-xl sm:rounded-[1.5rem] sm:p-4">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const url = new URL(window.location.href);
                            url.searchParams.delete("setup");
                            window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
                          } catch {
                            window.history.replaceState({}, "", window.location.pathname);
                          }
                          setCompanySetupLoginPortal(false);
                        }}
                        className="mb-3 text-left text-xs font-semibold text-blue-400 transition hover:text-orange-200 sm:text-sm"
                      >
                        ← Staff sign-in
                      </button>
                      <h2 className="text-center text-base font-semibold text-white sm:text-lg">Company setup (Master)</h2>
                      <p className="mt-2 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs leading-snug text-slate-300 sm:text-sm">
                        Sign in with the platform Master account only. You will stay in{" "}
                        <span className="font-semibold text-white">Onboarding</span> until you sign out — no other areas of the app
                        are available from here.
                      </p>
                      <p className="mt-2 text-center text-[11px] text-slate-400 sm:text-xs">
                        Username: <span className="font-semibold text-white">{GOD_MODE_USERNAME}</span> — use the password configured for
                        Master (default <span className="font-semibold text-white">demo</span> unless changed in environment).
                      </p>
                      <form className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3" onSubmit={(event) => { event.preventDefault(); handleLogin(); }}>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-100 sm:text-sm">Username or email</label>
                          <div className="relative">
                            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 sm:left-3.5 sm:h-5 sm:w-5" strokeWidth="2">
                              <path d="M20 21a8 8 0 0 0-16 0" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            <input
                              value={username}
                              onChange={(event) => setUsername(event.target.value)}
                              placeholder="Master username"
                              className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 sm:h-12 sm:rounded-2xl sm:pl-11 sm:pr-4 sm:text-base"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-100 sm:text-sm">Password</label>
                          <div className="relative">
                            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 sm:left-3.5 sm:h-5 sm:w-5" strokeWidth="2">
                              <rect x="4" y="11" width="16" height="10" rx="2" />
                              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                            </svg>
                            <input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  handleLogin();
                                }
                              }}
                              placeholder="Master password"
                              className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 sm:h-12 sm:rounded-2xl sm:pl-11 sm:pr-12 sm:text-base"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((current) => !current)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-400 sm:right-3.5"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                                  <path d="M3 3l18 18" />
                                  <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
                                  <path d="M9.9 4.2A10.2 10.2 0 0 1 21 12a10.9 10.9 0 0 1-4.1 5.2" />
                                  <path d="M6.5 6.5A11.3 11.3 0 0 0 3 12a10.9 10.9 0 0 0 9 6 9.8 9.8 0 0 0 3.2-.5" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                                  <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        <button
                          type="submit"
                          className={`h-11 w-full rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-sm font-semibold text-slate-950 shadow-[0_10px_22px_rgba(249,115,22,0.22)] active:scale-[0.99] sm:h-12 sm:rounded-2xl sm:text-base ${slatePrimaryCtaInteract}`}
                        >
                          Sign in for company setup
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ToastStack toasts={toasts} />
        </div>
      );
    }

    return (
      <div className={signInOuterClass}>
        <style>{appMotionStyles}</style>
        <div className="qms-tablet-stage">
          <div className="qms-tablet-device qms-tablet-device--signin">
            <div
              data-qms-theme={themeMode}
              className={signInShellClass}
            >
              <DataFlowBackground />
              <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 sm:right-6 sm:top-6">
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-900/75 p-2 text-slate-300 transition hover:border-orange-400/60 hover:text-blue-400"
                  aria-label="Help"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.7 1.2-1.7 2.2" />
                    <circle cx="12" cy="16.8" r="0.8" fill="currentColor" stroke="none" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Company setup (Master only)"
                  aria-label="Company setup sign-in for platform Master"
                  onClick={() => {
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set("setup", "master");
                      window.history.pushState({}, "", url.toString());
                    } catch {
                      window.history.pushState({}, "", "?setup=master");
                    }
                    setCompanySetupLoginPortal(true);
                  }}
                  className="rounded-full border border-slate-700/90 bg-slate-900/60 p-1.5 text-slate-400 transition hover:border-orange-400/55 hover:text-orange-300"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M12 3l7 4v5c0 4-2.5 7.5-7 8.5-4.5-1-7-4.5-7-8.5V7z" />
                    <path d="M12 11v3M12 8h.01" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-900/75 p-2 text-slate-300 transition hover:border-orange-400/60 hover:text-blue-400"
                  aria-label="Settings"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                    <path d="M12 3.5l1 2.1 2.4.4-.9 2.2 1.7 1.8-1.7 1.8.9 2.2-2.4.4-1 2.1-1-2.1-2.4-.4.9-2.2-1.7-1.8 1.7-1.8-.9-2.2 2.4-.4z" />
                    <circle cx="12" cy="12" r="2.4" />
                  </svg>
                </button>
              </div>

              <div className="relative z-10 grid h-full min-h-0 w-full grid-cols-1 items-center gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="flex flex-col justify-center gap-3 px-1 py-0 sm:px-2">
                  <BertLogo
                    variant="full"
                    tone={themeMode === "dark" ? "onDark" : "onLight"}
                    size="lg"
                    className="w-full"
                  />
                  <p className="text-xs font-medium text-slate-500 sm:text-sm sm:text-slate-400">Secure • Reliable • Compliant</p>
                </div>

                <div className="flex min-h-0 items-center">
                  <div className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-[0_16px_40px_rgba(2,6,23,0.4)] backdrop-blur-xl sm:rounded-[1.5rem] sm:p-4">
                    <h2 className="text-center text-base font-semibold text-white sm:text-lg">Sign in to your account</h2>
                    <p className="mt-2 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-300 sm:text-sm">
                      Demo accounts: <span className="font-semibold text-white">admin</span>, <span className="font-semibold text-white">manager</span>, <span className="font-semibold text-white">tom</span>, <span className="font-semibold text-white">{GOD_MODE_USERNAME}</span> (password: <span className="font-semibold text-white">demo</span> unless overridden).
                    </p>
                    <form className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3" onSubmit={(event) => { event.preventDefault(); handleLogin(); }}>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-100 sm:text-sm">Username or email</label>
                        <div className="relative">
                          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 sm:left-3.5 sm:h-5 sm:w-5" strokeWidth="2">
                            <path d="M20 21a8 8 0 0 0-16 0" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <input
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            placeholder="Enter username or email"
                            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 sm:h-12 sm:rounded-2xl sm:pl-11 sm:pr-4 sm:text-base"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-100 sm:text-sm">Password</label>
                        <div className="relative">
                          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 sm:left-3.5 sm:h-5 sm:w-5" strokeWidth="2">
                            <rect x="4" y="11" width="16" height="10" rx="2" />
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                          </svg>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                handleLogin();
                              }
                            }}
                            placeholder="Enter password"
                            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 sm:h-12 sm:rounded-2xl sm:pl-11 sm:pr-12 sm:text-base"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-400 sm:right-3.5"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                                <path d="M3 3l18 18" />
                                <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
                                <path d="M9.9 4.2A10.2 10.2 0 0 1 21 12a10.9 10.9 0 0 1-4.1 5.2" />
                                <path d="M6.5 6.5A11.3 11.3 0 0 0 3 12a10.9 10.9 0 0 0 9 6 9.8 9.8 0 0 0 3.2-.5" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                                <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button type="button" className="text-xs font-medium text-blue-400 transition hover:text-orange-200 sm:text-sm">
                          Forgot password?
                        </button>
                      </div>

                      <button
                        type="submit"
                        className={`h-11 w-full rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-sm font-semibold text-slate-950 shadow-[0_10px_22px_rgba(249,115,22,0.22)] active:scale-[0.99] sm:h-12 sm:rounded-2xl sm:text-base ${slatePrimaryCtaInteract}`}
                      >
                        Sign in
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ToastStack toasts={toasts} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        shellPreviewClass,
        "h-[100dvh] overflow-hidden px-2 py-2 sm:px-3 sm:py-3",
        themeMode === "dark"
          ? `${qmsDarkShellGradient} text-slate-100`
          : `${qmsLightShellGradient} text-slate-900`,
        ].join(" ")}
    >
      <style>{appMotionStyles}</style>
      <div className="qms-tablet-stage">
        <div className="qms-tablet-device">
          <div
            data-qms-theme={themeMode}
            className={[
              "qms-app-shell relative isolate mx-auto flex h-full w-full flex-col overflow-hidden rounded-[2.25rem] border backdrop-blur",
              themeMode === "dark"
                ? "border-white/10 bg-slate-950/72 shadow-[0_28px_90px_rgba(2,6,23,0.55)]"
                : "border-slate-200/90 bg-white/86 shadow-[0_28px_90px_rgba(15,23,42,0.12)]",
            ].join(" ")}
          >
        <DataFlowBackground className="z-20 opacity-10" showBase={false} />
        <header className={["qms-app-header relative z-10 border-b px-3 pb-1 pt-1 backdrop-blur", themeMode === "dark" ? "border-white/10 bg-slate-950/58" : "border-slate-200/80 bg-white/72"].join(" ")}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[9px] font-semibold uppercase tracking-[0.16em]">
            <div className={["rounded-full px-2.5 py-0.5", themeMode === "dark" ? "bg-slate-900 text-slate-400" : "border border-[var(--bert-signal-orange)] bg-white font-semibold text-[var(--qms-navy-900)]"].join(" ")}>
              {godCompanySetupOnlyShell ? "Company setup (Master)" : "Tablet workspace"}
            </div>
            <div className="flex items-center gap-1">
              {demoRoleSwitchEnabled && !godCompanySetupOnlyShell && <div className="hidden items-center gap-1 lg:flex">
                {currentUser.role !== "Admin" && (
                <button
                  type="button"
                  onClick={() => handleQuickRoleSwitch("Master", "God Mode")}
                  className={["rounded-full border px-2 py-0.5 text-[8px] font-semibold", themeMode === "dark" ? "border-[var(--bert-signal-orange)]/50 bg-slate-900 text-[var(--bert-chrome-accent)]" : "border-[var(--bert-signal-orange)] bg-white text-[var(--qms-navy-900)] hover:bg-orange-50"].join(" ")}
                >
                  GOD
                </button>
                )}
                <button
                  type="button"
                  onClick={() => handleQuickRoleSwitch("Admin", "Admin")}
                  className={["rounded-full border px-2 py-0.5 text-[8px] font-semibold", themeMode === "dark" ? "border-[var(--bert-signal-orange)]/50 bg-slate-900 text-[var(--bert-chrome-accent)]" : "border-[var(--bert-signal-orange)] bg-white text-[var(--qms-navy-900)] hover:bg-orange-50"].join(" ")}
                >
                  ADMIN
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRoleSwitch("Manager", "Manager")}
                  className={["rounded-full border px-2 py-0.5 text-[8px] font-semibold", themeMode === "dark" ? "border-[var(--bert-signal-orange)]/50 bg-slate-900 text-[var(--bert-chrome-accent)]" : "border-[var(--bert-signal-orange)] bg-white text-[var(--qms-navy-900)] hover:bg-orange-50"].join(" ")}
                >
                  MANAGER
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRoleSwitch("Auditor", "Auditor")}
                  className={["rounded-full border px-2 py-0.5 text-[8px] font-semibold", themeMode === "dark" ? "border-[var(--bert-signal-orange)]/50 bg-slate-900 text-[var(--bert-chrome-accent)]" : "border-[var(--bert-signal-orange)] bg-white text-[var(--qms-navy-900)] hover:bg-orange-50"].join(" ")}
                >
                  AUDITOR
                </button>
              </div>}
              {!godCompanySetupOnlyShell && (
              <button
                type="button"
                onClick={() => setScreen(getHomeScreenForRole(currentUser.role))}
                className={["rounded-full border px-1.5 py-0 text-[8px]", themeMode === "dark" ? `border-slate-700 bg-slate-900 text-slate-300 ${slatePrimaryCtaInteract}` : "border-[var(--bert-signal-orange)] bg-white text-[var(--qms-navy-900)] transition-colors hover:bg-orange-50"].join(" ")}
              >
                Layout options
              </button>
              )}
              {!godCompanySetupOnlyShell && (
              <button
                onClick={() => setPreviewOrientation(previewOrientation === "landscape" ? "portrait" : "landscape")}
                className={["rounded-full border px-2 py-0.5 text-[8px]", themeMode === "dark" ? `border-slate-700 bg-slate-900 text-slate-300 ${slatePrimaryCtaInteract}` : "border-[var(--bert-signal-orange)] bg-white text-[var(--qms-navy-900)] transition-colors hover:bg-orange-50"].join(" ")}
              >
                {previewOrientation === "landscape" ? "Portrait preview" : "Landscape preview"}
              </button>
              )}
              <div className={["rounded-full px-2 py-0.5", offlineMode ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/12 text-blue-800"].join(" ")}>
                {offlineMode ? "Offline" : "Online"}
              </div>
              <div className={["rounded-full border px-2 py-0.5 text-[8px]", themeMode === "dark" ? "border-slate-700 bg-slate-900 text-slate-300" : "border-[var(--bert-signal-orange)] bg-white text-[var(--qms-navy-900)]"].join(" ")}>
                {deviceTimeLabel}
              </div>
            </div>
          </div>
          <div className="qms-app-header-main">
            <div className="flex items-center gap-2">
              <div className="hidden shrink-0 pr-0.5 sm:block">
                <BertLogo
                  variant="wordmark"
                  tone={themeMode === "dark" ? "onDark" : "onLight"}
                  size="sm"
                />
              </div>
              <button
                onClick={handleLogout}
                className={`h-6 shrink-0 rounded-md bg-[var(--bert-signal-orange)] px-2 text-[9px] font-semibold text-[var(--qms-navy-950)] shadow-sm ${slatePrimaryCtaInteract}`}
              >
                Logout
              </button>
              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--bert-signal-orange)] text-[9px] font-semibold tracking-[0.08em] text-[var(--qms-navy-950)]">
                {accountPhotoUrl ? (
                  <img src={accountPhotoUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                ) : (
                  getWorkspaceInitials(currentUser.name)
                )}
                {selectedFolder && (
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-blue-500 px-1 py-0 text-[8px] font-bold uppercase tracking-[0.08em] text-white">
                    Live
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={["truncate text-[11px] font-semibold leading-4 tracking-tight", themeMode === "dark" ? "text-white" : "text-slate-900"].join(" ")}>{workspaceName}</p>
                <p className={["truncate text-[8px] leading-3 tracking-[0.08em]", themeMode === "dark" ? "text-slate-400" : "text-slate-500"].join(" ")}>
                  {selectedFolder ? `Live company workspace · ${PRODUCT_TAGLINE}` : PRODUCT_BRAND_FULL}
                </p>
                {showSiteSelectorForRole && !godCompanySetupOnlyShell && (
                <div className="mt-1">
                  <select
                    value={selectedSiteId}
                    onChange={(event) => setSelectedSiteId(event.target.value)}
                    className={["h-6 max-w-[12rem] rounded-md border-2 px-2 text-[9px] font-semibold", themeMode === "dark" ? "border-slate-700 bg-slate-900 text-slate-200" : "border-[var(--bert-signal-orange)] bg-white text-[var(--qms-navy-900)]"].join(" ")}
                  >
                    <option value="">All sites</option>
                    {headerSelectableSites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
                )}
              </div>
            </div>

            <div className={["qms-app-session-bar mt-0.5 hidden items-center justify-between gap-2 rounded-lg border px-2 py-0.5 lg:flex", themeMode === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-300 bg-white"].join(" ")}>
              <div className="flex min-w-0 max-w-full flex-1 items-center gap-1.5 text-[10px] leading-4">
                <p className={["shrink-0 font-semibold", themeMode === "dark" ? "text-slate-100" : "text-slate-900"].join(" ")}>{currentUser.name}</p>
                <span className={themeMode === "dark" ? "text-slate-500" : "text-slate-400"}>•</span>
                <p className={["shrink-0", themeMode === "dark" ? "text-slate-300" : "text-slate-600"].join(" ")}>
                  {getRoleDisplayName(currentUser.role)}
                </p>
                <span className={themeMode === "dark" ? "text-slate-500" : "text-slate-400"}>•</span>
                <p className={["truncate", themeMode === "dark" ? "text-slate-400" : "text-slate-500"].join(" ")}>
                  {roleLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {demoModeActive && (
                  <div className="rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                    Demo mode active
                  </div>
                )}
                <div className="rounded-full bg-blue-500/12 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  {selectedFolder ? "Live workspace" : "Live session"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
          <aside className={["flex shrink-0 flex-col border-r px-3 py-4 backdrop-blur", desktopSidebarCollapsed ? "w-[4.75rem]" : "w-[15.5rem]", themeMode === "dark" ? "border-white/10 bg-slate-950/58 text-slate-200" : "border-slate-200/85 bg-slate-50/82 text-slate-700"].join(" ")}>
            <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
              {visibleNavItems.map((item) => {
                const selected = screen === item.id || (screen === "complete" && item.id === "audits");
                return (
                  <button
                    key={`desktop-${item.id}`}
                    onClick={() => setScreen(item.id)}
                    className={[
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-in-out",
                      selected
                        ? themeMode === "dark"
                          ? "border border-[var(--bert-signal-orange)]/40 bg-[rgba(249,115,22,0.12)] text-[var(--bert-chrome-accent)] hover:bg-[rgba(249,115,22,0.18)]"
                          : `bg-[var(--bert-signal-orange)] text-[var(--qms-navy-950)] ${slatePrimaryCtaInteract}`
                        : themeMode === "dark"
                          ? "text-slate-300 hover:border hover:border-[var(--bert-signal-orange)]/25 hover:bg-slate-800/80"
                          : "text-slate-700 hover:bg-orange-50 hover:text-slate-900",
                      desktopSidebarCollapsed ? "justify-center" : "",
                    ].join(" ")}
                    title={item.label}
                  >
                    <AppIcon name={item.icon} className="h-4 w-4 shrink-0" />
                    {!desktopSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto pt-2">
              <button
                onClick={() => setDesktopSidebarCollapsed((current) => !current)}
                className={["flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition", desktopSidebarCollapsed ? "border-[var(--bert-signal-orange)]/50 bg-[rgba(249,115,22,0.12)] text-[var(--bert-chrome-accent)] hover:bg-[rgba(249,115,22,0.18)]" : "border-[var(--bert-signal-orange)]/45 bg-slate-700 text-white hover:bg-slate-600"].join(" ")}
                aria-label={desktopSidebarCollapsed ? "Expand menu" : "Collapse menu"}
                title={desktopSidebarCollapsed ? "Expand menu" : "Collapse menu"}
              >
                <span>{desktopSidebarCollapsed ? ">>" : "<<"}</span>
              </button>
            </div>
          </aside>
          <div className={["qms-screen-stage h-full min-w-0 flex-1 overflow-y-auto px-4 pb-10 pt-4", themeMode === "dark" ? "[&_section.border]:border-slate-800 [&_section.bg-white]:bg-slate-900 [&_section.bg-slate-50]:bg-slate-900 [&_section_.text-slate-900]:text-slate-100 [&_section_.text-slate-800]:text-slate-200 [&_section_.text-slate-700]:text-slate-300 [&_section_.text-slate-600]:text-slate-400 [&_section_.text-slate-500]:text-slate-400 [&_section_.text-slate-400]:text-slate-500 [&_section_input]:border-slate-700 [&_section_input]:bg-slate-950 [&_section_input]:text-slate-100 [&_section_input:focus]:border-[var(--bert-signal-orange)] [&_section_input:focus]:bg-slate-950 [&_section_textarea]:border-slate-700 [&_section_textarea]:bg-slate-950 [&_section_textarea]:text-slate-100 [&_section_textarea:focus]:border-[var(--bert-signal-orange)] [&_section_select]:border-slate-700 [&_section_select]:bg-slate-950 [&_section_select]:text-slate-100 [&_section_select:focus]:border-[var(--bert-signal-orange)] [&_section_select:focus]:bg-slate-950 [&_.bg-gradient-to-b]:from-slate-900 [&_.bg-gradient-to-b]:to-slate-950 [&_.bg-slate-100]:bg-slate-800 [&_.bg-slate-200]:bg-slate-800 [&_.bg-white]:bg-slate-900 [&_.text-slate-900]:text-slate-100 [&_.text-slate-800]:text-slate-200 [&_.text-slate-700]:text-slate-300 [&_.text-slate-600]:text-slate-400 [&_.text-slate-500]:text-slate-400 [&_input[type=file]]:border-[rgba(249,115,22,0.45)] [&_input[type=file]]:bg-slate-950 [&_input[type=file]]:text-slate-300 [&_input[type=file]]:file:text-slate-200" : "bg-slate-100/72"].join(" ")}>
            {currentUser.role === "Manager" && currentManagerAlerts.length > 0 && (
              <section className="mb-4 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-rose-900">Manager alerts</p>
                  <button
                    type="button"
                    onClick={() => currentManagerAlerts.forEach((alert) => markManagerAlertRead(alert.id))}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
                  >
                    Mark all as read
                  </button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {currentManagerAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between gap-3 rounded-lg bg-white/70 px-3 py-2">
                      <p className="text-sm text-rose-800">
                        {alert.auditName}: {alert.nonComplianceCount} non-compliance item
                        {alert.nonComplianceCount === 1 ? "" : "s"} submitted by {alert.submittedBy}
                        {alert.queuedForSync ? " (queued offline)." : "."}
                      </p>
                      <button
                        type="button"
                        onClick={() => markManagerAlertRead(alert.id)}
                        className="shrink-0 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700"
                      >
                        Mark read
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {(offlineMode || offlineQueue.length > 0) && (
              <section className="mb-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-900">
                  {offlineMode ? "Offline mode active" : "Queued submissions waiting to sync"}
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  {offlineMode
                    ? "Audits can still be completed on this tablet. Submissions will queue locally until the connection returns."
                    : `${offlineQueue.length} queued submission${offlineQueue.length === 1 ? "" : "s"} will sync automatically.`}
                </p>
              </section>
            )}
            {screen === "dashboard" && (
              <DashboardScreen
                currentUser={currentUser}
                workspaceName={workspaceName}
                compliance={compliance}
                complianceDelta={complianceDelta}
                groupedAudits={groupedAudits}
                actions={visibleActions}
                openActions={openActions}
                overdueActions={overdueActions}
                criticalActions={criticalActions}
                awaitingVerificationActions={awaitingVerificationActions}
                overdueAudits={overdueAudits}
                evidenceCount={evidenceCount}
                completedToday={completedToday}
                offlineQueueCount={offlineQueue.length}
                pendingSyncCount={pendingSyncCount}
                failedSyncCount={failedSyncCount}
                assignedAudits={assignedAudits}
                history={assignmentFilteredHistory}
                drafts={drafts}
                companySheetSync={companySheetSync}
                auditCompletionRate={auditCompletionRate}
                actionClosureRate={actionClosureRate}
                averageActionClosureDays={averageActionClosureDays}
                recurringFailedQuestions={recurringFailedQuestions}
                topOverdueSchedules={topOverdueSchedules}
                riskSummary={riskSummary}
                themeMode={themeMode}
                dashboardPreferences={dashboardPreferences}
                dashboardSectionOrder={dashboardSectionOrder}
                onOpenAudit={startAudit}
                onAdvanceAction={updateActionStatus}
                onApplyDashboardPreset={handleApplyDashboardPreset}
                onToggleDashboardSection={handleToggleDashboardSection}
                onMoveDashboardSection={handleMoveDashboardSection}
                reportUsersCount={companyReportUsers.length}
                activeSchedulesCount={managedSchedules.filter((item) => item.lifecycle !== "Archived").length}
                templatesCount={templates.filter((template) => template.active).length}
                workspaceValidation={workspaceValidation}
                selectedFolder={selectedFolder}
                onValidateWorkspace={() => void validateWorkspace()}
                onRepairWorkspace={repairWorkspace}
                onLoadDemoData={handleLoadDemoData}
                onClearDemoData={handleClearDemoData}
              />
            )}

            {screen === "audits" && canAccessAuditsCentre(currentUser.role) && (
              <AuditsScreen
                currentUser={currentUser}
                audits={siteScopedAudits}
                groupedAudits={groupedAudits}
                drafts={drafts}
                unsyncedAuditIds={unsyncedSubmittedAuditIds}
                userProfilePhotos={userProfilePhotos}
                onOpenAudit={startAudit}
                auditAccessMatrix={auditAccessMatrix}
                auditScheduleMatrix={auditScheduleMatrix}
                onToggleAuditAccess={handleToggleAuditAccess}
              />
            )}

            {screen === "actions" && canAccessActions(currentUser.role) && (
              <ActionsScreen
                currentUser={currentUser}
                actions={filteredActions}
                actionFilter={actionFilter}
                actionSeverityFilter={actionSeverityFilter}
                actionNcFilter={actionNcFilter}
                availableNonConformanceIds={availableNonConformanceIds}
                availableAuditors={availableScheduleAuditors}
                onFilterChange={setActionFilter}
                onSeverityFilterChange={setActionSeverityFilter}
                onNcFilterChange={setActionNcFilter}
                onAdvanceAction={updateActionStatus}
                onAssignAction={assignAction}
                onAddEvidence={attachEvidenceToAction}
              />
            )}

            {screen === "nonConformance" && canAccessActions(currentUser.role) && (
              <NonConformanceScreen
                currentUser={currentUser}
                nonConformances={assignmentFilteredNonConformances}
                canViewCompletedReports={canAccessCompletedNcrReports(currentUser.role)}
                onSaveProgress={(ncrId, payload) => {
                  setNonConformances((current) =>
                    current.map((item) => (item.id === ncrId ? { ...item, ...payload, status: "In Progress" } : item)),
                  );
                  pushToast("Progress saved", "Investigation updates were saved.", "success");
                }}
                onComplete={(ncrId, payload) => {
                  if (!currentUser) return false;
                  let completed = false;
                  setNonConformances((current) =>
                    current.map((item) => {
                      if (item.id !== ncrId) return item;
                      completed = true;
                      return {
                        ...item,
                        ...payload,
                        status: "Completed",
                        completionDateTime: formatStamp(),
                        completedByName: currentUser.name,
                        completedByUserId: currentUser.username,
                      };
                    }),
                  );
                  if (completed) {
                    pushToast("NCR complete", "Non-conformance report marked as completed.", "success");
                  }
                  return completed;
                }}
                onAddEvidence={(ncrId, files) => {
                  const nextItems = Array.from(files).map((file) => ({
                    id: `${ncrId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: file.name,
                    previewUrl: URL.createObjectURL(file),
                    addedAt: formatStamp(),
                  }));
                  setNonConformances((current) =>
                    current.map((item) => (item.id === ncrId ? { ...item, evidence: [...item.evidence, ...nextItems] } : item)),
                  );
                }}
                onExportReport={(ncr) => {
                  const opened = openPrintableReport(
                    `[${ncr.reference}] Non-Conformance Report`,
                    `
                    <h1>${ncr.reference} Non-Conformance Report</h1>
                    <p class="meta">Status: ${ncr.status} | Raised: ${ncr.raisedAt}</p>
                    <h2>Core details</h2>
                    <ul>
                      <li>Audit: ${ncr.auditName}</li>
                      <li>Question: ${ncr.auditQuestion}</li>
                      <li>Selected answer: ${ncr.selectedAnswer.toUpperCase()}</li>
                      <li>Site: ${ncr.site}</li>
                      <li>Auditor: ${ncr.auditorName}</li>
                      <li>Assigned line manager: ${ncr.assignedLineManager}</li>
                    </ul>
                    <h2>Investigation</h2>
                    <ul>
                      <li>ISO clause: ${ncr.investigationIsoClause || "-"}</li>
                      <li>Investigation notes: ${ncr.investigationNotes || "-"}</li>
                      <li>Root cause: ${ncr.rootCause || "-"}</li>
                      <li>Corrective action: ${ncr.correctiveAction || "-"}</li>
                      <li>Extra notes: ${ncr.investigationExtraNotes || "-"}</li>
                    </ul>
                    <h2>Evidence references</h2>
                    <ul>
                      ${
                        ncr.evidence.length
                          ? ncr.evidence.map((item) => `<li>${item.name} (${item.addedAt})</li>`).join("")
                          : "<li>No evidence uploaded.</li>"
                      }
                    </ul>
                    <h2>Completion</h2>
                    <ul>
                      <li>Completed at: ${ncr.completionDateTime || "-"}</li>
                      <li>Completed by: ${ncr.completedByName || "-"}</li>
                    </ul>
                  `,
                  );
                  if (!opened) {
                    pushToast("PDF export blocked", "Allow pop-ups to open NCR report print view.", "warning");
                    return;
                  }
                  pushToast("NCR report opened", `${ncr.reference} print view is ready to save as PDF.`, "success");
                }}
              />
            )}

            {screen === "incidents" && canSubmitIncidents(currentUser.role) && (
              <IncidentReportingScreen
                currentUser={currentUser}
                incidents={incidents}
                incidentActions={incidentActions}
                onSubmitIncident={submitIncidentReport}
                onUpdateIncident={updateIncidentRecord}
                onAddIncidentAction={addIncidentCorrectiveAction}
                onUpdateIncidentAction={updateIncidentCorrectiveAction}
              />
            )}

            {screen === "reports" && (
              <ReportsScreen
                compliance={compliance}
                openActions={openActions}
                overdueActions={overdueActions}
                overdueAudits={overdueAudits}
                actions={visibleActions}
                managedSchedules={managedSchedules}
                syncQueue={syncQueue}
                riskSummary={riskSummary}
                recurringFailedQuestions={recurringFailedQuestions}
                auditCompletionRate={auditCompletionRate}
                evidenceCount={evidenceCount}
                completedToday={completedToday}
                offlineQueueCount={offlineQueue.length}
                reportUsers={companyReportUsers}
                reportRecipients={reportRecipients}
                reportInbox={reportInbox}
                history={history}
                templates={templates}
                selectedReportTemplate={selectedReportTemplate}
                reportTitleInput={reportTitleInput}
                selectedReportSections={selectedReportSections}
                workspaceName={workspaceName}
                onToggleReportRecipient={handleToggleReportRecipient}
                onSelectReportTemplate={handleSelectReportTemplate}
                onReportTitleChange={setReportTitleInput}
                onToggleReportSection={handleToggleReportSection}
                onExportAuditPack={handleExportAuditPack}
                onExportAuditPackPdf={handleExportAuditPackPdf}
              />
            )}

            {screen === "sync" && (
              <SyncCentreScreen
                currentUser={currentUser}
                syncQueue={syncQueue}
                offlineQueueCount={offlineQueue.length}
                onRetryItem={(id) => updateSyncItemStatus(id, "Pending Sync")}
                onForceSyncItem={(id) => updateSyncItemStatus(id, googleConnected && !offlineMode ? "Syncing" : "Pending Sync")}
              />
            )}

            {screen === "schedules" && canAccessSchedules(currentUser.role) && (
              <SchedulesScreen
                selectedFolder={selectedFolder}
                schedules={visibleSchedules}
                filter={scheduleListFilter}
                availableAudits={availableScheduleAudits}
                availableAuditors={availableScheduleAuditors}
                editorOpen={scheduleEditorOpen}
                editingSchedule={editingScheduleId ? managedSchedules.find((item) => item.id === editingScheduleId) || null : null}
                scheduleName={scheduleDraftName}
                selectedAuditIds={scheduleDraftSelectedAuditIds}
                scheduleAudits={scheduleDraftAudits}
                startDate={scheduleDraftStartDate}
                endDate={scheduleDraftEndDate}
                continuous={scheduleDraftContinuous}
                selectedAuditors={scheduleDraftAuditors}
                validationAttempted={scheduleValidationAttempted}
                onFilterChange={setScheduleListFilter}
                onOpenNew={handleOpenNewSchedule}
                onOpenSchedule={handleOpenSchedule}
                onToggleAudit={handleToggleScheduleAudit}
                onToggleAuditDay={handleToggleScheduleAuditDay}
                onAuditFieldChange={handleUpdateScheduleAuditField}
                onScheduleNameChange={setScheduleDraftName}
                onStartDateChange={setScheduleDraftStartDate}
                onEndDateChange={setScheduleDraftEndDate}
                onContinuousChange={setScheduleDraftContinuous}
                onToggleAuditor={handleToggleScheduleAuditor}
                onSave={handleSaveManagedSchedule}
                onCancel={resetManagedScheduleDraft}
                onReactivate={handleReactivateSchedule}
                onDelete={handleDeleteSchedule}
                onPause={handlePauseSchedule}
                onResume={handleResumeSchedule}
              />
            )}

            {((screen === "admin" && canAccessControlScreen(currentUser.role)) ||
              (screen === "onboarding" && canAccessAdminOnboardingWorkspace(currentUser.role))) && (
              <AdminScreen
                currentUser={currentUser}
                googleConnected={googleConnected}
                folders={folders}
                selectedFolder={selectedFolder}
                folderNameInput={folderNameInput}
                folderIdInput={folderIdInput}
                auditFormsFolderInput={auditFormsFolderInput}
                masterSheetInput={masterSheetInput}
                evidenceFolderInput={evidenceFolderInput}
                healthSafetyFolderInput={healthSafetyFolderInput}
                exportsFolderInput={exportsFolderInput}
                adminNotesFolderInput={adminNotesFolderInput}
                syncState={syncState}
                backendConfigured={backendConfigured}
                sharedDriveId={sharedDriveId}
                googleStatusLoading={googleStatusLoading}
                folderInspection={folderInspection}
                folderInspectionLoading={folderInspectionLoading}
                onboardingSource={onboardingSource}
                onboardingRecords={onboardingRecords}
                onboardingRecordsLoading={onboardingRecordsLoading}
                selectedOnboardingRecordId={selectedOnboardingRecordId}
                schedules={selectedFolderSchedules}
                inviteEmailInput={inviteEmailInput}
                inviteRoleInput={inviteRoleInput}
                invitedUsers={invitedUsers}
                sites={sites}
                selectedSiteId={selectedSiteId}
                reportUsers={companyReportUsers}
                userSiteAssignments={userSiteAssignments}
                onToggleUserSiteAssignment={handleToggleUserSiteAssignment}
                creatableRoles={creatableRoles}
                onGoogleConnect={handleGoogleConnect}
                onGoogleDisconnect={handleGoogleDisconnect}
                notificationsEnabled={notificationsEnabled}
                companySheetSync={companySheetSync}
                workspaceValidation={workspaceValidation}
                workspaceValidationLoading={workspaceValidationLoading}
                templates={templates}
                templateNameInput={templateNameInput}
                templateQuestionInput={templateQuestionInput}
                templateQuestionTypeInput={templateQuestionTypeInput}
                templateDraftQuestions={templateDraftQuestions}
                onRefreshGoogleStatus={() => loadGoogleStatus()}
                onRefreshOnboardingRecords={() => loadOnboardingRecords()}
                onSelectOnboardingRecord={setSelectedOnboardingRecordId}
                onApplyOnboardingRecord={handleApplyOnboardingRecord}
                onFolderNameChange={setFolderNameInput}
                onFolderIdChange={setFolderIdInput}
                onAuditFormsFolderChange={setAuditFormsFolderInput}
                onMasterSheetChange={setMasterSheetInput}
                onEvidenceFolderChange={setEvidenceFolderInput}
                onHealthSafetyFolderChange={setHealthSafetyFolderInput}
                onExportsFolderChange={setExportsFolderInput}
                onAdminNotesFolderChange={setAdminNotesFolderInput}
                onScheduleNameChange={setScheduleNameInput}
                onScheduleAreaChange={setScheduleAreaInput}
                onScheduleOwnerChange={setScheduleOwnerInput}
                onScheduleScopeChange={setScheduleScopeInput}
                onSchedulePersonalAssigneeChange={setSchedulePersonalAssigneeInput}
                onScheduleFrequencyChange={setScheduleFrequencyInput}
                onScheduleSendTimeChange={setScheduleSendTimeInput}
                onScheduleRecipientsChange={setScheduleRecipientsInput}
                onScheduleOverdueAlertRecipientsChange={setScheduleOverdueAlertRecipientsInput}
                onScheduleEscalationContactChange={setScheduleEscalationContactInput}
                onScheduleOverdueAlertTimingChange={setScheduleOverdueAlertTimingInput}
                onScheduleCompletionCheckTimingChange={setScheduleCompletionCheckTimingInput}
                onScheduleNextDueHoursChange={setScheduleNextDueHoursInput}
                onSchedulePriorityChange={setSchedulePriorityInput}
                onOpenOnboardingForm={handleOpenOnboardingForm}
                onStartCompanyOnboarding={handleStartCompanyOnboarding}
                onAddFolder={handleAddFolder}
                onOneClickGoogleOnboarding={handleOneClickGoogleOnboarding}
                onRequestNotifications={requestNotificationAccess}
                onValidateWorkspace={() => void validateWorkspace()}
                onRepairWorkspace={repairWorkspace}
                onTemplateNameChange={setTemplateNameInput}
                onTemplateQuestionChange={setTemplateQuestionInput}
                onTemplateQuestionTypeChange={setTemplateQuestionTypeInput}
                onAddTemplateQuestion={handleAddTemplateQuestion}
                onRemoveTemplateQuestion={handleRemoveTemplateQuestion}
                onAddAnswerPromptToDraftQuestion={handleAddAnswerPromptToDraftQuestion}
                onRemoveAnswerPromptFromDraftQuestion={handleRemoveAnswerPromptFromDraftQuestion}
                onAddTemplate={handleAddTemplate}
                onToggleTemplate={handleToggleTemplate}
                onAddSchedule={handleAddSchedule}
                onSelectFolder={handleSelectFolder}
                onVerifyOnboarding={handleVerifyOnboarding}
                onVerifyAudits={handleVerifyAudits}
                onVerifyResponseSheet={handleVerifyResponseSheet}
                onSyncForms={handleSyncForms}
                onLoadDemoData={handleLoadDemoData}
                onClearDemoData={handleClearDemoData}
                onInviteEmailChange={setInviteEmailInput}
                onInviteRoleChange={setInviteRoleInput}
                onInviteUser={handleInviteUser}
                onResendInvite={handleResendInvite}
                onDeleteInvite={handleDeleteInvite}
                onResyncUsers={handleResyncUsers}
                onSelectSite={setSelectedSiteId}
                onAddSite={handleAddSite}
                onArchiveSite={handleArchiveSite}
                standaloneOnboarding={screen === "onboarding"}
                hideMasterLocalDemoTools={godCompanySetupOnlyShell}
                godModeAppInviteEmail={godModeAppInviteEmail}
                onGodModeAppInviteEmailChange={setGodModeAppInviteEmail}
                onSendGodModeAppCompanyInvite={handleSendGodModeAppCompanyInvite}
                scheduleNameInput={scheduleNameInput}
                scheduleAreaInput={scheduleAreaInput}
                scheduleOwnerInput={scheduleOwnerInput}
                scheduleScopeInput={scheduleScopeInput}
                schedulePersonalAssigneeInput={schedulePersonalAssigneeInput}
                scheduleFrequencyInput={scheduleFrequencyInput}
                scheduleSendTimeInput={scheduleSendTimeInput}
                scheduleRecipientsInput={scheduleRecipientsInput}
                scheduleOverdueAlertRecipientsInput={scheduleOverdueAlertRecipientsInput}
                scheduleEscalationContactInput={scheduleEscalationContactInput}
                scheduleOverdueAlertTimingInput={scheduleOverdueAlertTimingInput}
                scheduleCompletionCheckTimingInput={scheduleCompletionCheckTimingInput}
                scheduleNextDueHoursInput={scheduleNextDueHoursInput}
                schedulePriorityInput={schedulePriorityInput}
              />
            )}

            {screen === "account" && (
              <AccountSettingsScreen
                currentUser={currentUser}
                accountNameInput={accountNameInput}
                accountPhotoUrl={accountPhotoUrl}
                themeMode={themeMode}
                onAccountNameChange={setAccountNameInput}
                onAccountPhotoChange={handleAccountPhotoChange}
                onThemeModeChange={setThemeMode}
                onSave={handleSaveAccountSettings}
              />
            )}

            {screen === "complete" && currentUser.role === "Auditor" && auditCompletionSummary && (
              <AuditCompletionSummary
                summary={auditCompletionSummary}
                hasMoreAudits={Boolean(pickNextAuditorAudit(assignedAudits, drafts))}
                onStartNext={() => {
                  const next = pickNextAuditorAudit(assignedAudits, drafts);
                  setAuditCompletionSummary(null);
                  setResponses({});
                  setNotes({});
                  setEvidence({});
                  setIssuePrompt(null);
                  setAuditModeQuestionIndex(0);
                  if (next) {
                    startAudit(next.id);
                  } else {
                    setScreen("dashboard");
                  }
                }}
                onReturnDashboard={() => {
                  setAuditCompletionSummary(null);
                  setResponses({});
                  setNotes({});
                  setEvidence({});
                  setIssuePrompt(null);
                  setAuditModeQuestionIndex(0);
                  setScreen("dashboard");
                }}
              />
            )}

            {screen === "complete" && activeAudit && currentUser.role === "Auditor" && !auditCompletionSummary && (
              <>
                <AuditModeScreen
                  audit={activeAudit}
                  responses={responses}
                  notes={notes}
                  evidence={evidence}
                  evidenceDebugLabel={evidenceDebugLabel}
                  questionIndex={auditModeQuestionIndex}
                  offlineMode={offlineMode}
                  pendingSyncCount={pendingSyncCount}
                  failedSyncCount={failedSyncCount}
                  onAnswerSelect={handleAuditModeAnswer}
                  onJumpToQuestion={setAuditModeQuestionIndex}
                  onNoteChange={(questionId, value) =>
                    setNotes((current) => ({
                      ...current,
                      [questionId]: value,
                    }))
                  }
                  onAddEvidence={(questionId, files) => {
                    const fileCount = files.length;
                    setEvidenceDebugLabel(`Selected: ${Array.from(files).map((file) => file.name).join(", ")}`);
                    const nextItems = Array.from(files).map((file) => ({
                      id: `${questionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      name: file.name,
                      previewUrl: URL.createObjectURL(file),
                      addedAt: formatStamp(),
                    }));
                    setEvidence((current) => ({
                      ...current,
                      [questionId]: [...(current[questionId] ?? []), ...nextItems],
                    }));
                    pushToast(
                      "Evidence attached",
                      `${fileCount} file${fileCount === 1 ? "" : "s"} added to this question.`,
                      "success",
                    );
                  }}
                  onComplete={completeAuditModeFlow}
                  onSaveAndExit={handleAuditModeSaveAndExit}
                />
                {issuePrompt && (
                  <IssueFoundPrompt
                    issue={issuePrompt}
                    existingNote={notes[issuePrompt.question.id] || ""}
                    evidenceCount={evidence[issuePrompt.question.id]?.length ?? 0}
                    assignedToName={activeAudit.owner}
                    offlineMode={offlineMode}
                    onAddPhoto={(files) => {
                      const fileCount = files.length;
                      if (!fileCount) return;
                      const questionId = issuePrompt.question.id;
                      setEvidenceDebugLabel(`Selected: ${Array.from(files).map((file) => file.name).join(", ")}`);
                      const nextItems = Array.from(files).map((file) => ({
                        id: `${questionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        name: file.name,
                        previewUrl: URL.createObjectURL(file),
                        addedAt: formatStamp(),
                      }));
                      setEvidence((current) => ({
                        ...current,
                        [questionId]: [...(current[questionId] ?? []), ...nextItems],
                      }));
                      pushToast(
                        "Evidence attached",
                        `${fileCount} file${fileCount === 1 ? "" : "s"} added to this finding.`,
                        "success",
                      );
                    }}
                    onSave={handleAuditModeSaveIssue}
                    onCancel={() => setIssuePrompt(null)}
                  />
                )}
              </>
            )}

            {screen === "complete" && activeAudit && currentUser.role !== "Auditor" && (
              <CompleteAuditScreen
                audit={activeAudit}
                responses={responses}
                notes={notes}
                evidence={evidence}
                signatureDataUrl={signatureDataUrl}
                signatureSignedAt={signatureSignedAt}
                offlineMode={offlineMode}
                savedAt={drafts[activeAudit.id]?.updatedAt ?? null}
                canSubmit={canSubmitAudit}
                onSelect={(questionId, answer) =>
                  setResponses((current) => ({
                    ...current,
                    [questionId]: answer,
                  }))
                }
                onNoteChange={(questionId, value) =>
                  setNotes((current) => ({
                    ...current,
                    [questionId]: value,
                  }))
                }
                onAddEvidence={(questionId, files) => {
                  const fileCount = files.length;
                  setEvidenceDebugLabel(`Selected: ${Array.from(files).map((file) => file.name).join(", ")}`);
                  const nextItems = Array.from(files).map((file) => ({
                    id: `${questionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: file.name,
                    previewUrl: URL.createObjectURL(file),
                    addedAt: formatStamp(),
                  }));
                  setEvidence((current) => ({
                    ...current,
                    [questionId]: [...(current[questionId] ?? []), ...nextItems],
                  }));
                  pushToast(
                    "Evidence attached",
                    `${fileCount} file${fileCount === 1 ? "" : "s"} added to this question.`,
                    "success",
                  );
                }}
                onRemoveEvidence={(questionId, evidenceId) =>
                  setEvidence((current) => ({
                    ...current,
                    [questionId]: (current[questionId] ?? []).filter((item) => item.id !== evidenceId),
                  }))
                }
                onSignatureChange={(dataUrl) => {
                  setSignatureDataUrl(dataUrl);
                  setSignatureSignedAt(dataUrl ? formatStamp() : "");
                }}
                onSaveDraft={saveDraft}
                onSubmit={submitAudit}
                onCancel={() => {
                  setActiveAuditId(null);
                  setResponses({});
                  setNotes({});
                  setEvidence({});
                  setSignatureDataUrl("");
                  setSignatureSignedAt("");
                  setScreen("audits");
                }}
              />
            )}
          </div>
        </main>

        </div>
      </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}

function DashboardScreen({
  currentUser,
  workspaceName,
  compliance,
  complianceDelta,
  groupedAudits,
  actions,
  openActions,
  overdueActions,
  criticalActions,
  awaitingVerificationActions,
  overdueAudits,
  evidenceCount,
  completedToday,
  offlineQueueCount,
  pendingSyncCount,
  failedSyncCount,
  assignedAudits,
  history,
  drafts,
  companySheetSync,
  auditCompletionRate,
  actionClosureRate,
  averageActionClosureDays,
  recurringFailedQuestions,
  topOverdueSchedules,
  riskSummary,
  themeMode,
  dashboardPreferences,
  dashboardSectionOrder,
  onOpenAudit,
  onAdvanceAction,
  onApplyDashboardPreset,
  onToggleDashboardSection,
  onMoveDashboardSection,
  reportUsersCount,
  activeSchedulesCount,
  templatesCount,
  workspaceValidation,
  selectedFolder,
  onValidateWorkspace,
  onRepairWorkspace,
  onLoadDemoData,
  onClearDemoData,
}: {
  currentUser: User;
  workspaceName: string;
  compliance: number;
  complianceDelta: number;
  groupedAudits: Record<AuditStatus, Audit[]>;
  actions: ActionItem[];
  openActions: ActionItem[];
  overdueActions: ActionItem[];
  criticalActions: ActionItem[];
  awaitingVerificationActions: ActionItem[];
  overdueAudits: Audit[];
  evidenceCount: number;
  completedToday: number;
  offlineQueueCount: number;
  pendingSyncCount: number;
  failedSyncCount: number;
  assignedAudits: Audit[];
  history: HistoryEntry[];
  drafts: Record<string, AuditDraft>;
  companySheetSync: CompanySheetSyncStatus | null;
  auditCompletionRate: number;
  actionClosureRate: number;
  averageActionClosureDays: number;
  recurringFailedQuestions: [string, number][];
  topOverdueSchedules: ManagedSchedule[];
  riskSummary: {
    totalRiskScore: number;
    highestRiskLevel: RiskLevel;
    criticalFindings: number;
    highFindings: number;
  };
  themeMode: ThemeMode;
  dashboardPreferences: DashboardPreferences;
  dashboardSectionOrder: DashboardSectionKey[];
  onOpenAudit: (auditId: string) => void;
  onAdvanceAction: (actionId: string) => void;
  onApplyDashboardPreset: (preset: "minimal" | "operations" | "executive") => void;
  onToggleDashboardSection: (section: DashboardSectionKey) => void;
  onMoveDashboardSection: (section: DashboardSectionKey, direction: "up" | "down") => void;
  reportUsersCount: number;
  activeSchedulesCount: number;
  templatesCount: number;
  workspaceValidation: WorkspaceValidation | null;
  selectedFolder: CompanyFolder | null;
  onValidateWorkspace: () => void;
  onRepairWorkspace: () => void;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
}) {
  if (currentUser.role === "Auditor") {
    return (
      <AuditorTaskDashboard
        currentUser={currentUser}
        groupedAudits={groupedAudits}
        assignedAudits={assignedAudits}
        drafts={drafts}
        actions={actions}
        pendingSyncCount={pendingSyncCount}
        failedSyncCount={failedSyncCount}
        onOpenAudit={onOpenAudit}
      />
    );
  }

  if (currentUser.role === "Manager") {
    return (
      <ManagerDashboard
        groupedAudits={groupedAudits}
        assignedAudits={assignedAudits}
        actions={actions}
        onOpenAudit={onOpenAudit}
        onAdvanceAction={onAdvanceAction}
        recurringFailedQuestions={recurringFailedQuestions}
      />
    );
  }

  if (currentUser.role === "Admin") {
    return (
      <AdminDashboard
        groupedAudits={groupedAudits}
        assignedAudits={assignedAudits}
        actions={actions}
        pendingSyncCount={pendingSyncCount}
        failedSyncCount={failedSyncCount}
        reportUsersCount={reportUsersCount}
        activeSchedulesCount={activeSchedulesCount}
        templatesCount={templatesCount}
        onOpenAudit={onOpenAudit}
        onAdvanceAction={onAdvanceAction}
      />
    );
  }

  if (currentUser.role === "Master") {
    return null;
  }

  return null;
  
  const [showDashboardOptions, setShowDashboardOptions] = useState(false);
  const visibleSectionOrder = dashboardSectionOrder.filter((key) => dashboardPreferences[key]);

  const renderSection = (section: DashboardSectionKey) => {
    if (section === "trafficBoard") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="dashboard" eyebrow="Live status" title="Traffic light audit board" subtitle="First-look status across live audits." />
          <div className="mt-2 grid gap-2">
            <TrafficLane title="Red" subtitle="Overdue" audits={groupedAudits.red.slice(0, 1)} status="red" onOpenAudit={onOpenAudit} />
            <TrafficLane title="Amber" subtitle={`<${amberThresholdHours}h remaining`} audits={groupedAudits.amber.slice(0, 1)} status="amber" onOpenAudit={onOpenAudit} />
            <TrafficLane title="Green" subtitle={`>${amberThresholdHours}h remaining`} audits={groupedAudits.green.slice(0, 1)} status="green" onOpenAudit={onOpenAudit} />
          </div>
        </section>
      );
    }
    if (section === "liveSummary") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="chart" eyebrow="Live summary" title="Operations snapshot" subtitle="Quick KPI pulse for field and admin teams." />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <KpiCard title="Open actions" value={String(openActions.length)} tone={openActions.length ? "amber" : "green"} subtitle={`${overdueActions.length} overdue`} dark={themeMode === "dark"} />
            <KpiCard title="Compliance" value={`${compliance}%`} tone="green" subtitle={complianceDelta >= 0 ? `Up ${complianceDelta}%` : `Down ${Math.abs(complianceDelta)}%`} dark={themeMode === "dark"} />
            <KpiCard title="Completion" value={`${auditCompletionRate}%`} tone={auditCompletionRate > 79 ? "green" : "amber"} subtitle={`${completedToday} today`} dark={themeMode === "dark"} />
            <KpiCard title="Queue" value={String(offlineQueueCount)} tone={offlineQueueCount ? "amber" : "green"} subtitle={`${evidenceCount} evidence`} dark={themeMode === "dark"} />
          </div>
        </section>
      );
    }
    if (section === "upcomingAudits") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="clipboard" eyebrow="Upcoming" title="Upcoming audits" subtitle="Prioritized from your assigned workload." />
          <div className="mt-2 space-y-2">
            {assignedAudits.slice(0, 4).map((audit) => (
              <button key={audit.id} onClick={() => onOpenAudit(audit.id)} className="w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left transition hover:bg-white">
                <p className="text-sm font-semibold text-slate-900">{audit.name}</p>
                <p className="mt-1 text-xs text-slate-500">{audit.siteArea} - {getDueWarning(audit.dueHours)}</p>
              </button>
            ))}
            {assignedAudits.length === 0 && <EmptyPanel title="No upcoming audits" text="Linked and assigned audits will appear here." />}
          </div>
        </section>
      );
    }
    if (section === "openActions") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="warningTriangle" eyebrow="Actions" title="Open actions" subtitle="Items needing progress or verification." />
          <div className="mt-2 space-y-2">
            {actions.slice(0, 4).map((action) => (
              <button key={action.id} onClick={() => onAdvanceAction(action.id)} className="w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left transition hover:bg-white">
                <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                <p className="mt-1 text-xs text-slate-500">{action.owner} - {action.status}</p>
              </button>
            ))}
          </div>
        </section>
      );
    }
    return (
      <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <SectionHeader icon="shield" eyebrow="Compliance" title="Compliance snapshot" subtitle="Risk, closure, and recurring findings." />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <KpiCard title="Critical/high" value={String(criticalActions.length)} tone={criticalActions.length ? "red" : "green"} subtitle={`${riskSummary.criticalFindings} critical`} dark={themeMode === "dark"} />
          <KpiCard title="Closure rate" value={`${actionClosureRate}%`} tone={actionClosureRate > 79 ? "green" : "amber"} subtitle={`${averageActionClosureDays || 0} days avg`} dark={themeMode === "dark"} />
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[1.4rem] bg-slate-950 p-3.5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Live overview</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{workspaceName}</h2>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-300">Dashboard controls and traffic status in one view.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDashboardOptions((current) => !current)} className="h-8 rounded-lg bg-white/12 px-3 text-xs font-semibold text-white">
              Customize
            </button>
            <div className="rounded-xl bg-white/10 px-3 py-1.5 text-right">
              <p className="text-[11px] text-slate-300">Overdue</p>
              <p className="text-lg font-semibold">{overdueAudits.length}</p>
            </div>
          </div>
        </div>
      </section>
      {showDashboardOptions && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dashboard options</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => onApplyDashboardPreset("minimal")} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">Minimal</button>
            <button onClick={() => onApplyDashboardPreset("operations")} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">Operations</button>
            <button onClick={() => onApplyDashboardPreset("executive")} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">Executive</button>
          </div>
          <div className="mt-3 space-y-2">
            {dashboardSectionOrder.map((section, index) => (
              <div key={section} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <input type="checkbox" checked={dashboardPreferences[section]} onChange={() => onToggleDashboardSection(section)} />
                <span className="min-w-0 flex-1 text-sm text-slate-700">{section}</span>
                <button onClick={() => onMoveDashboardSection(section, "up")} disabled={index === 0} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↑</button>
                <button onClick={() => onMoveDashboardSection(section, "down")} disabled={index === dashboardSectionOrder.length - 1} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↓</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {visibleSectionOrder.map((section) => renderSection(section))}
      </div>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="chart"
          eyebrow="Performance"
          title="Trend dashboard"
          subtitle="Live audit health across traffic-light status, completion, and action pressure."
        />
        <div className="space-y-3">
          <TrendBar label="Green audits" value={groupedAudits.green.length} total={Math.max(1, groupedAudits.green.length + groupedAudits.amber.length + groupedAudits.red.length)} tone="green" />
          <TrendBar label="Amber audits" value={groupedAudits.amber.length} total={Math.max(1, groupedAudits.green.length + groupedAudits.amber.length + groupedAudits.red.length)} tone="amber" />
          <TrendBar label="Red audits" value={groupedAudits.red.length} total={Math.max(1, groupedAudits.green.length + groupedAudits.amber.length + groupedAudits.red.length)} tone="red" />
          <TrendBar label="Actions in progress" value={actions.filter((item) => item.status === "In Progress").length} total={Math.max(1, actions.length || 1)} tone="amber" />
          <TrendBar label="Actions closed" value={actions.filter((item) => item.status === "Closed").length} total={Math.max(1, actions.length || 1)} tone="green" />
          <TrendBar label="Critical/high actions" value={criticalActions.length} total={Math.max(1, actions.length || 1)} tone="red" />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="warningTriangle"
          eyebrow="Recurring issues"
          title="Top recurring failures"
          subtitle="Patterns in repeated failed questions and schedules needing intervention."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.4rem] border border-slate-200/70 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-900">Top 5 failed questions</p>
            <div className="mt-3 space-y-2">
              {recurringFailedQuestions.length === 0 ? <p className="text-sm text-slate-500">No repeat failures yet.</p> : recurringFailedQuestions.map(([question, count]) => <div key={question} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="mr-3 text-sm text-slate-700">{question}</span><span className="text-xs font-semibold text-slate-500">{count}</span></div>)}
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200/70 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-900">Top 5 overdue schedules</p>
            <div className="mt-3 space-y-2">
              {topOverdueSchedules.length === 0 ? <p className="text-sm text-slate-500">No overdue schedules.</p> : topOverdueSchedules.map((schedule) => <div key={schedule.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="mr-3 text-sm text-slate-700">{schedule.scheduleName}</span><span className="text-xs font-semibold text-rose-600">{schedule.healthState || computeScheduleHealthState(schedule)}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="clipboard"
          eyebrow="Work queue"
          title="Active audit workload"
          subtitle={
            canAccessAdmin(currentUser.role)
              ? "All open audits across the business"
              : currentUser.role === "Manager"
                ? "Assigned audits and actions needing review"
                : "Your assigned audits and saved progress"
          }
        />

        {assignedAudits.length === 0 ? (
          <EmptyPanel
            title="No audits live yet"
            text="Connect your Google Drive root folder in Admin, refresh the company folders, and sync the verified audit forms to populate this workspace."
          />
        ) : (
          <div className="space-y-3">
            {assignedAudits.slice(0, 4).map((audit) => (
              <button
                key={audit.id}
                onClick={() => onOpenAudit(audit.id)}
                className="w-full rounded-[1.4rem] border border-slate-200/70 bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900">{audit.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <MetaPill icon="clipboard" label={audit.siteArea} />
                      <MetaPill icon="user" label={audit.owner} />
                      <MetaPill icon="spark" label={audit.priority} />
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-600">{getDueWarning(audit.dueHours)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {drafts[audit.id] ? `In progress ${drafts[audit.id].updatedAt}` : `Last completed ${audit.lastCompletedAt}`}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-2 text-right">
                    <StatusBadge status={getAuditTrafficStatus(audit.dueHours)} />
                    {drafts[audit.id] && (
                      <div className="rounded-full bg-sky-500/12 px-3 py-1 text-xs font-semibold text-sky-700">
                        In progress
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="chart"
          eyebrow="History"
          title="Completed audit history"
          subtitle="Most recent completions and outcomes"
        />
        {history.length === 0 ? (
          <EmptyPanel
            title="No completion history yet"
            text="Completed audits will appear here once your first company folder is synced and inspections are submitted."
          />
        ) : (
          <div className="space-y-3">
            {history.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-[1.4rem] border border-slate-200/70 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-slate-900">{entry.auditName}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <MetaPill icon="user" label={entry.completedBy} />
                    <MetaPill icon="clock" label={entry.completedAt} />
                  </div>
                </div>
                <StatusBadge status={entry.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AuditorTaskDashboard({
  currentUser,
  groupedAudits,
  assignedAudits,
  drafts,
  actions,
  pendingSyncCount,
  failedSyncCount,
  onOpenAudit,
}: {
  currentUser: User;
  groupedAudits: Record<AuditStatus, Audit[]>;
  assignedAudits: Audit[];
  drafts: Record<string, AuditDraft>;
  actions: ActionItem[];
  pendingSyncCount: number;
  failedSyncCount: number;
  onOpenAudit: (auditId: string) => void;
}) {
  const sortedAudits = useMemo(
    () =>
      [...assignedAudits].sort((a, b) => {
        const rankDiff = rankAuditorAudit(a, Boolean(drafts[a.id])) - rankAuditorAudit(b, Boolean(drafts[b.id]));
        if (rankDiff !== 0) return rankDiff;
        return a.dueHours - b.dueHours;
      }),
    [assignedAudits, drafts],
  );
  const draftAudits = useMemo(() => sortedAudits.filter((audit) => Boolean(drafts[audit.id])), [sortedAudits, drafts]);
  const dueTodayAudits = useMemo(() => sortedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours <= 24), [sortedAudits]);
  const orphanDraftCount = useMemo(() => {
    const assignedAuditIds = new Set(assignedAudits.map((audit) => audit.id));
    return Object.keys(drafts).filter((auditId) => !assignedAuditIds.has(auditId)).length;
  }, [assignedAudits, drafts]);
  const overdueCount = useMemo(() => sortedAudits.filter((audit) => audit.dueHours < 0).length, [sortedAudits]);
  const dueTodayCount = useMemo(() => sortedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours <= 24).length, [sortedAudits]);
  const dueSoonCount = useMemo(
    () => sortedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours < amberThresholdHours).length,
    [sortedAudits],
  );
  const onTrackCount = useMemo(
    () => sortedAudits.filter((audit) => audit.dueHours >= amberThresholdHours).length,
    [sortedAudits],
  );
  const draftCount = useMemo(() => sortedAudits.filter((audit) => Boolean(drafts[audit.id])).length, [sortedAudits, drafts]);
  const evidenceNeededCount = useMemo(
    () =>
      actions.filter(
        (action) =>
          (action.assignedToUserId === currentUser.username || action.assignedToName === currentUser.name) &&
          action.status !== "Closed" &&
          action.evidenceRequired &&
          action.evidenceCount === 0,
      ).length,
    [actions, currentUser.name, currentUser.username],
  );
  const nextAudit = useMemo(() => pickNextAuditorAudit(sortedAudits, drafts), [sortedAudits, drafts]);
  const primaryLabel = useMemo(() => {
    if (!nextAudit) return "No Audits Due";
    if (drafts[nextAudit.id]) return "Resume Audit";
    if (nextAudit.dueHours < 0) return "Start Overdue Audit";
    if (getAuditTrafficStatus(nextAudit.dueHours) === "amber") return "Start Due Soon Audit";
    if (nextAudit.dueHours <= 24) return "Start Today’s Audits";
    return "Start Next Audit";
  }, [nextAudit, drafts]);
  const primarySubtitle = useMemo(() => {
    if (!nextAudit) return "All clear - no audits due right now.";
    if (drafts[nextAudit.id]) return `Resume ${nextAudit.name}`;
    if (nextAudit.dueHours < 0) return `Overdue now: ${nextAudit.name}`;
    if (getAuditTrafficStatus(nextAudit.dueHours) === "amber") return `Due soon: ${nextAudit.name}`;
    if (nextAudit.dueHours <= 24) return `Due today: ${nextAudit.name}`;
    return nextAudit.name;
  }, [nextAudit, drafts]);
  const evidenceActions = useMemo(
    () =>
      actions.filter(
        (action) =>
          (action.assignedToUserId === currentUser.username || action.assignedToName === currentUser.name) &&
          action.status !== "Closed" &&
          action.evidenceRequired &&
          action.evidenceCount === 0,
      ),
    [actions, currentUser.name, currentUser.username],
  );
  const syncLabel =
    failedSyncCount > 0 ? `${failedSyncCount} sync failed` : pendingSyncCount > 0 ? `${pendingSyncCount} pending sync` : "Synced";

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Today&apos;s tasks</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Morning {currentUser.name.split(" ")[0]}</h2>
        <p className="mt-1 text-sm text-slate-500">What do you need to do now?</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MiniMetric label="Outstanding" value={String(overdueCount)} tone="red" />
          <MiniMetric label="Due now" value={String(dueSoonCount)} tone="amber" />
          <MiniMetric label="On track" value={String(onTrackCount)} tone="green" />
          <MiniMetric label="Due today" value={String(dueTodayCount)} tone="slate" />
          <MiniMetric label="In progress" value={String(draftCount)} tone="sky" />
          <MiniMetric label="Evidence missing" value={String(evidenceNeededCount)} tone="amber" />
        </div>
        <button
          type="button"
          onClick={() => nextAudit && onOpenAudit(nextAudit.id)}
          disabled={!nextAudit}
          className={`mt-4 h-16 w-full rounded-2xl text-lg font-semibold ${nextAudit ? `bg-slate-900 text-white ${slatePrimaryCtaInteract}` : "cursor-not-allowed bg-slate-200 text-slate-700"}`}
        >
          {nextAudit ? `Audit Mode: ${primaryLabel}` : "Audit Mode: No Audits Due"}
        </button>
        <p className="mt-2 text-sm text-slate-500">{primarySubtitle}</p>
        {orphanDraftCount > 0 && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {orphanDraftCount} in-progress audit{orphanDraftCount === 1 ? "" : "s"} could not be matched to a live audit template.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Task list</p>
          <div
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              failedSyncCount > 0 ? "bg-rose-100 text-rose-700" : pendingSyncCount > 0 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-800",
            ].join(" ")}
          >
            {syncLabel}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Today&apos;s audits</p>
            <div className="space-y-2">
              {dueTodayAudits.slice(0, 3).map((audit) => (
                <button key={audit.id} type="button" onClick={() => onOpenAudit(audit.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left">
                  <StatusBadge status={getAuditTrafficStatus(audit.dueHours)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{audit.name}</p>
                    <p className="text-xs text-slate-500">{getDueWarning(audit.dueHours)}</p>
                  </div>
                </button>
              ))}
              {dueTodayAudits.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No audits due today.</p>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Draft audits</p>
            <div className="space-y-2">
              {draftAudits.slice(0, 2).map((audit) => (
                <button key={audit.id} type="button" onClick={() => onOpenAudit(audit.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{audit.name}</p>
                    <p className="text-xs text-slate-500">{drafts[audit.id]?.updatedAt || "In progress"}</p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Resume</span>
                </button>
              ))}
              {draftAudits.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No audits in progress.</p>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actions needing evidence</p>
            <div className="space-y-2">
              {evidenceActions.slice(0, 2).map((action) => (
                <div key={action.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                  <p className="text-xs text-slate-500">{action.auditName}</p>
                </div>
              ))}
              {evidenceActions.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No assigned actions waiting for evidence.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ManagerDashboard({
  groupedAudits,
  assignedAudits,
  actions,
  onOpenAudit,
  onAdvanceAction,
  recurringFailedQuestions,
}: {
  groupedAudits: Record<AuditStatus, Audit[]>;
  assignedAudits: Audit[];
  actions: ActionItem[];
  onOpenAudit: (auditId: string) => void;
  onAdvanceAction: (actionId: string, nextStatus?: ActionStatus) => void;
  recurringFailedQuestions: [string, number][];
}) {
  const overdueAudits = useMemo(
    () => assignedAudits.filter((audit) => getAuditTrafficStatus(audit.dueHours) === "red"),
    [assignedAudits],
  );
  const overdueActions = useMemo(
    () => actions.filter((action) => isOverdue(action)),
    [actions],
  );
  const escalatedActions = useMemo(
    () => actions.filter((action) => isEscalated(action)),
    [actions],
  );
  const stuckActions = useMemo(
    () => actions.filter((action) => isStuck(action)),
    [actions],
  );
  const auditsDueToday = useMemo(
    () => assignedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours <= 24),
    [assignedAudits],
  );
  const actionsDueToday = useMemo(
    () => actions.filter((action) => action.dueHours >= 0 && action.dueHours <= 24 && action.status !== "Closed"),
    [actions],
  );
  const repeatedTop3 = useMemo(() => recurringFailedQuestions.slice(0, 3), [recurringFailedQuestions]);
  const allClear = overdueAudits.length === 0 && overdueActions.length === 0 && escalatedActions.length === 0 && stuckActions.length === 0;
  const totalLiveAudits = Math.max(1, groupedAudits.red.length + groupedAudits.amber.length + groupedAudits.green.length);
  const openActionsCount = actions.filter((item) => item.status === "Open").length;
  const inProgressActionsCount = actions.filter((item) => item.status === "In Progress").length;
  const awaitingVerificationCount = actions.filter((item) => item.status === "Awaiting Verification").length;
  const closedActionsCount = actions.filter((item) => item.status === "Closed").length;
  const totalActionsCount = Math.max(1, actions.length);
  const [selectedLiveGraph, setSelectedLiveGraph] = useState<"auditTraffic" | "actionStatus" | "riskFocus">("auditTraffic");
  const [selectedGraphType, setSelectedGraphType] = useState<"column" | "line" | "area" | "bar">("column");

  const {
    showLayoutOptions,
    setShowLayoutOptions,
    sectionOrder,
    sectionVisibility,
    visibleSectionOrder,
    toggleSection,
    moveSection,
  } = useDashboardSectionLayout("qms-precast-layout-manager", ["immediateAttention", "todaysWork", "liveBoard", "liveGraphs", "repeatIssues"]);

  const renderSection = (section: string) => {
    if (section === "immediateAttention") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="shield" eyebrow="Immediate attention" title="Immediate attention" subtitle="Items that need action now." />
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Overdue actions {overdueActions.length}</div>
            <div className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-900">Escalated {escalatedActions.length}</div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Stuck {stuckActions.length}</div>
            <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Overdue audits {overdueAudits.length}</div>
          </div>
          {allClear ? (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-900">
              All clear - No overdue audits, actions, or critical issues.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {[...escalatedActions.slice(0, 2), ...stuckActions.slice(0, 2), ...overdueActions.slice(0, 2)].slice(0, 4).map((action) => (
                <div key={`attention-${action.id}`} className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                  <p className="mt-1 text-xs text-slate-500">{action.auditName} - {action.assignedToName}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }
    if (section === "todaysWork") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="clock" eyebrow="Today's work" title="Today's work" subtitle="Audits and actions due today." />
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Audits due today</p>
              {auditsDueToday.length === 0 ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No audits due today.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {auditsDueToday.slice(0, 4).map((audit) => (
                    <button key={audit.id} onClick={() => onOpenAudit(audit.id)} className="w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left">
                      <p className="text-sm font-semibold text-slate-900">{audit.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{getDueWarning(audit.dueHours)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Actions due today</p>
              {actionsDueToday.length === 0 ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No actions due today.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {actionsDueToday.slice(0, 4).map((action) => (
                    <button key={action.id} onClick={() => onAdvanceAction(action.id)} className="w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left">
                      <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.assignedToName} - {action.dueLabel}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }
    if (section === "liveBoard") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="dashboard" eyebrow="Live audit board" title="Live audit board" subtitle="Red, amber, green grouped audits." />
          <div className="mt-2 grid gap-2">
            <TrafficLane title="Red" subtitle="Overdue" audits={groupedAudits.red.slice(0, 1)} status="red" onOpenAudit={onOpenAudit} />
            <TrafficLane title="Amber" subtitle={`<${amberThresholdHours}h remaining`} audits={groupedAudits.amber.slice(0, 1)} status="amber" onOpenAudit={onOpenAudit} />
            <TrafficLane title="Green" subtitle={`>${amberThresholdHours}h remaining`} audits={groupedAudits.green.slice(0, 1)} status="green" onOpenAudit={onOpenAudit} />
          </div>
        </section>
      );
    }
    if (section === "liveGraphs") {
      const graphSeries =
        selectedLiveGraph === "auditTraffic"
          ? [
              { label: "Red", value: groupedAudits.red.length, tone: "red" as const },
              { label: "Amber", value: groupedAudits.amber.length, tone: "amber" as const },
              { label: "Green", value: groupedAudits.green.length, tone: "green" as const },
            ]
          : selectedLiveGraph === "actionStatus"
            ? [
                { label: "Open", value: openActionsCount, tone: "red" as const },
                { label: "In progress", value: inProgressActionsCount, tone: "amber" as const },
                { label: "Awaiting verification", value: awaitingVerificationCount, tone: "amber" as const },
                { label: "Closed", value: closedActionsCount, tone: "green" as const },
              ]
            : [
                { label: "Overdue audits", value: overdueAudits.length, tone: "red" as const },
                { label: "Overdue actions", value: overdueActions.length, tone: "red" as const },
                { label: "Escalated", value: escalatedActions.length, tone: "amber" as const },
                { label: "Stuck", value: stuckActions.length, tone: "amber" as const },
              ];
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="chart" eyebrow="Live graphs" title="Live performance graphs" subtitle="Real-time compliance and action movement." />
          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Graph view</p>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <div className="relative w-full sm:w-[16rem]">
                  <select
                    value={selectedLiveGraph}
                    onChange={(event) => setSelectedLiveGraph(event.target.value as "auditTraffic" | "actionStatus" | "riskFocus")}
                    className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="auditTraffic">Audit traffic mix</option>
                    <option value="actionStatus">Action status mix</option>
                    <option value="riskFocus">Risk focus and pressure points</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">▾</span>
                </div>
                <div className="relative w-full sm:w-[10rem]">
                  <select
                    value={selectedGraphType}
                    onChange={(event) => setSelectedGraphType(event.target.value as "column" | "line" | "area" | "bar")}
                    className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="column">Column</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                    <option value="bar">Bar</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">▾</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <LiveGraphChart data={graphSeries} chartType={selectedGraphType} />
            {selectedLiveGraph === "auditTraffic" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Audit traffic mix</p>
                <TrendBar label="Red" value={groupedAudits.red.length} total={totalLiveAudits} tone="red" />
                <TrendBar label="Amber" value={groupedAudits.amber.length} total={totalLiveAudits} tone="amber" />
                <TrendBar label="Green" value={groupedAudits.green.length} total={totalLiveAudits} tone="green" />
              </div>
            )}
            {selectedLiveGraph === "actionStatus" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Action status mix</p>
                <TrendBar label="Open" value={openActionsCount} total={totalActionsCount} tone="red" />
                <TrendBar label="In progress" value={inProgressActionsCount} total={totalActionsCount} tone="amber" />
                <TrendBar label="Awaiting verification" value={awaitingVerificationCount} total={totalActionsCount} tone="amber" />
                <TrendBar label="Closed" value={closedActionsCount} total={totalActionsCount} tone="green" />
              </div>
            )}
            {selectedLiveGraph === "riskFocus" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Risk focus</p>
                <TrendBar label="Overdue audits" value={overdueAudits.length} total={Math.max(1, assignedAudits.length)} tone="red" />
                <TrendBar label="Overdue actions" value={overdueActions.length} total={totalActionsCount} tone="red" />
                <TrendBar label="Escalated actions" value={escalatedActions.length} total={totalActionsCount} tone="amber" />
                <TrendBar label="Stuck actions" value={stuckActions.length} total={totalActionsCount} tone="amber" />
              </div>
            )}
          </div>
        </section>
      );
    }
    return (
      <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <SectionHeader icon="warningTriangle" eyebrow="Repeat issues" title="Top repeated failures" subtitle="Most frequent failed findings this week." />
        {repeatedTop3.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">All clear - no repeated failures.</div>
        ) : (
          <div className="space-y-2">
            {repeatedTop3.map(([question, count]) => (
              <div key={`repeat-${question}`} className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {question} failed {count} time{count === 1 ? "" : "s"} this week
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const hasImmediateAttention = visibleSectionOrder.includes("immediateAttention");
  const hasTodaysWork = visibleSectionOrder.includes("todaysWork");
  const remainingSections = visibleSectionOrder.filter((section) => section !== "immediateAttention" && section !== "todaysWork");

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Dashboard</p>
          <button onClick={() => setShowLayoutOptions((current) => !current)} className="h-8 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-medium text-slate-600">
            Layout options
          </button>
        </div>
        {showLayoutOptions && (
          <div className="mt-2 space-y-2">
            {sectionOrder.map((section, index) => (
              <div key={section} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={sectionVisibility[section]} onChange={() => toggleSection(section)} />
                <span className="min-w-0 flex-1 text-sm text-slate-700">{section}</span>
                <button onClick={() => moveSection(section, "up")} disabled={index === 0} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↑</button>
                <button onClick={() => moveSection(section, "down")} disabled={index === sectionOrder.length - 1} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↓</button>
              </div>
            ))}
          </div>
        )}
      </section>
      {(hasImmediateAttention || hasTodaysWork) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {hasTodaysWork && (
            <div className="lg:h-[21rem] [&>section]:h-full [&>section]:overflow-y-auto">
              {renderSection("todaysWork")}
            </div>
          )}
          {hasImmediateAttention && (
            <div className="lg:h-[21rem] [&>section]:h-full [&>section]:overflow-y-auto">
              {renderSection("immediateAttention")}
            </div>
          )}
        </div>
      )}
      {remainingSections.map((section) => renderSection(section))}
    </div>
  );
}

function AdminDashboard({
  groupedAudits,
  assignedAudits,
  actions,
  pendingSyncCount,
  failedSyncCount,
  reportUsersCount,
  activeSchedulesCount,
  templatesCount,
  onOpenAudit,
  onAdvanceAction,
}: {
  groupedAudits: Record<AuditStatus, Audit[]>;
  assignedAudits: Audit[];
  actions: ActionItem[];
  pendingSyncCount: number;
  failedSyncCount: number;
  reportUsersCount: number;
  activeSchedulesCount: number;
  templatesCount: number;
  onOpenAudit: (auditId: string) => void;
  onAdvanceAction: (actionId: string, nextStatus?: ActionStatus) => void;
}) {
  const overdueAudits = useMemo(() => assignedAudits.filter((audit) => getAuditTrafficStatus(audit.dueHours) === "red"), [assignedAudits]);
  const overdueActions = useMemo(() => actions.filter((action) => isOverdue(action)), [actions]);
  const escalatedActions = useMemo(() => actions.filter((action) => isEscalated(action)), [actions]);
  const stuckActions = useMemo(() => actions.filter((action) => isStuck(action)), [actions]);
  const auditsDueToday = useMemo(() => assignedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours <= 24), [assignedAudits]);
  const actionsDueToday = useMemo(() => actions.filter((action) => action.dueHours >= 0 && action.dueHours <= 24 && action.status !== "Closed"), [actions]);
  const allClear = overdueAudits.length === 0 && overdueActions.length === 0 && escalatedActions.length === 0 && stuckActions.length === 0;

  const {
    showLayoutOptions,
    setShowLayoutOptions,
    sectionOrder,
    sectionVisibility,
    visibleSectionOrder,
    toggleSection,
    moveSection,
  } = useDashboardSectionLayout("qms-precast-layout-admin", ["immediateAttention", "todaysWork", "systemOverview"]);

  const renderSection = (section: string) => {
    if (section === "immediateAttention") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="shield" eyebrow="Immediate attention" title="Immediate attention" subtitle="Operational issues needing action." />
          {allClear ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-900">All clear - No overdue audits, actions, or critical issues.</div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Overdue actions {overdueActions.length}</div>
              <div className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-900">Escalated {escalatedActions.length}</div>
              <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Stuck {stuckActions.length}</div>
              <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Overdue audits {overdueAudits.length}</div>
            </div>
          )}
        </section>
      );
    }
    if (section === "todaysWork") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="clock" eyebrow="Today's work" title="Today's work" subtitle="What must be completed today." />
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Audits due today</p>
              {auditsDueToday.length === 0 ? <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No audits due today.</div> : auditsDueToday.slice(0, 4).map((audit) => (
                <button key={audit.id} onClick={() => onOpenAudit(audit.id)} className="mt-2 w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left">
                  <p className="text-sm font-semibold text-slate-900">{audit.name}</p>
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Actions due today</p>
              {actionsDueToday.length === 0 ? <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No actions due today.</div> : actionsDueToday.slice(0, 4).map((action) => (
                <button key={action.id} onClick={() => onAdvanceAction(action.id)} className="mt-2 w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left">
                  <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    }
    return (
      <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <SectionHeader icon="chart" eyebrow="System overview" title="System overview" subtitle="Running state and sync health." />
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">Total users</p><p className="text-lg font-semibold text-slate-900">{reportUsersCount}</p></div>
          <div className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">Active schedules</p><p className="text-lg font-semibold text-slate-900">{activeSchedulesCount}</p></div>
          <div className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">Audit templates</p><p className="text-lg font-semibold text-slate-900">{templatesCount}</p></div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Pending sync {pendingSyncCount}</div>
          <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Failed sync {failedSyncCount}</div>
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Conflicts {failedSyncCount}</div>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Dashboard</p>
          <button onClick={() => setShowLayoutOptions((current) => !current)} className="h-8 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-medium text-slate-600">
            Layout options
          </button>
        </div>
        {showLayoutOptions && (
          <div className="mt-2 space-y-2">
            {sectionOrder.map((section, index) => (
              <div key={section} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={sectionVisibility[section]} onChange={() => toggleSection(section)} />
                <span className="min-w-0 flex-1 text-sm text-slate-700">{section}</span>
                <button onClick={() => moveSection(section, "up")} disabled={index === 0} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↑</button>
                <button onClick={() => moveSection(section, "down")} disabled={index === sectionOrder.length - 1} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↓</button>
              </div>
            ))}
          </div>
        )}
      </section>
      {visibleSectionOrder.map((section) => renderSection(section))}
    </div>
  );
}

function NonConformanceScreen({
  currentUser,
  nonConformances,
  canViewCompletedReports,
  onSaveProgress,
  onComplete,
  onAddEvidence,
  onExportReport,
}: {
  currentUser: User;
  nonConformances: NonConformanceRecord[];
  canViewCompletedReports: boolean;
  onSaveProgress: (
    ncrId: string,
    payload: Pick<NonConformanceRecord, "investigationIsoClause" | "investigationNotes" | "rootCause" | "correctiveAction" | "investigationExtraNotes">,
  ) => void;
  onComplete: (
    ncrId: string,
    payload: Pick<NonConformanceRecord, "investigationIsoClause" | "investigationNotes" | "rootCause" | "correctiveAction" | "investigationExtraNotes">,
  ) => boolean;
  onAddEvidence: (ncrId: string, files: FileList) => void;
  onExportReport: (record: NonConformanceRecord) => void;
}) {
  const visible = useMemo(() => {
    const byRef = [...nonConformances].sort((a, b) => {
      const left = parseNcrSequence(a.reference) || 0;
      const right = parseNcrSequence(b.reference) || 0;
      return left - right;
    });
    if (currentUser.role === "Auditor") {
      return byRef.filter((item) => item.auditorUserId === currentUser.username);
    }
    return byRef;
  }, [nonConformances, currentUser]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isoClause, setIsoClause] = useState("");
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  const selected = visible.find((item) => item.id === selectedId) || null;
  useEffect(() => {
    if (!selected && visible.length) {
      setSelectedId(visible[0].id);
      return;
    }
    if (!selected) return;
    setIsoClause(selected.investigationIsoClause || "");
    setInvestigationNotes(selected.investigationNotes || "");
    setRootCause(selected.rootCause || "");
    setCorrectiveAction(selected.correctiveAction || "");
    setExtraNotes(selected.investigationExtraNotes || "");
  }, [selectedId, selected, visible]);

  const completed = visible.filter((item) => item.status === "Completed");

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Non-conformance register</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Escalation and investigation</h2>
      </section>
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2">
          {visible.length === 0 ? (
            <p className="text-sm text-slate-500">No NCR records yet.</p>
          ) : (
            visible.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`grid grid-cols-6 gap-2 rounded-xl border px-3 py-2 text-left ${selectedId === item.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}>
                <p className="text-xs font-semibold text-slate-900">{item.reference}</p>
                <p className="text-xs text-slate-600">{item.site}</p>
                <p className="text-xs text-slate-600">{item.auditorName}</p>
                <p className="text-xs text-slate-600">{item.raisedAt}</p>
                <p className="text-xs text-slate-600">{item.status}</p>
                <p className="text-xs text-slate-600">{item.assignedLineManager}</p>
              </button>
            ))
          )}
        </div>
      </section>
      {selected && (
        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Investigation form - {selected.reference}</h3>
          <p className="mt-1 text-xs text-slate-500">{selected.auditQuestion}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={isoClause} onChange={(event) => setIsoClause(event.target.value)} placeholder="ISO clause" className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
            <textarea value={investigationNotes} onChange={(event) => setInvestigationNotes(event.target.value)} placeholder="Investigation notes" className="min-h-[6rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            <textarea value={rootCause} onChange={(event) => setRootCause(event.target.value)} placeholder="Root cause" className="min-h-[6rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            <textarea value={correctiveAction} onChange={(event) => setCorrectiveAction(event.target.value)} placeholder="Corrective action" className="min-h-[6rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          </div>
          <textarea value={extraNotes} onChange={(event) => setExtraNotes(event.target.value)} placeholder="Extra notes" className="mt-2 min-h-[5rem] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <div className="mt-2">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="h-11 max-w-[22rem] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
              onChange={(event) => {
                if (event.target.files?.length) onAddEvidence(selected.id, event.target.files);
                event.target.value = "";
              }}
            />
            <p className="mt-1 text-xs text-slate-500">{selected.evidence.length} evidence file(s)</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onSaveProgress(selected.id, {
                  investigationIsoClause: isoClause,
                  investigationNotes,
                  rootCause,
                  correctiveAction,
                  investigationExtraNotes: extraNotes,
                })
              }
              className={`h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 ${slatePrimaryCtaInteract}`}
            >
              Save progress
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isoClause.trim() || !investigationNotes.trim() || !rootCause.trim() || !correctiveAction.trim()) {
                  return;
                }
                onComplete(selected.id, {
                  investigationIsoClause: isoClause,
                  investigationNotes,
                  rootCause,
                  correctiveAction,
                  investigationExtraNotes: extraNotes,
                });
              }}
              className={`h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}
            >
              NCR complete
            </button>
          </div>
        </section>
      )}
      {canViewCompletedReports && (
        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Completed NCR reports</h3>
          <div className="mt-2 space-y-2">
            {completed.length === 0 ? (
              <p className="text-sm text-slate-500">No completed NCR reports yet.</p>
            ) : (
              completed.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm text-slate-700">{item.reference} - {item.site} - {item.completedByName || "-"}</p>
                  <button type="button" onClick={() => onExportReport(item)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Print / export PDF</button>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function IncidentReportingScreen({
  currentUser,
  incidents,
  incidentActions,
  onSubmitIncident,
  onUpdateIncident,
  onAddIncidentAction,
  onUpdateIncidentAction,
}: {
  currentUser: User;
  incidents: IncidentRecord[];
  incidentActions: IncidentCorrectiveAction[];
  onSubmitIncident: (payload: {
    incidentType: IncidentType;
    severity: IncidentSeverity;
    incidentDate: string;
    incidentTime: string;
    reporterName: string;
    reporterEmail: string;
    department: string;
    location: string;
    description: string;
    immediateAction: string;
    injured: boolean;
    injuryDetails: string;
    contributingFactors: string;
    witnesses: string;
    evidenceUrls: IncidentEvidenceItem[];
  }) => Promise<IncidentRecord>;
  onUpdateIncident: (incidentId: string, patch: Partial<IncidentRecord>, options?: { statusNote?: string }) => void;
  onAddIncidentAction: (incidentId: string, payload: { description: string; owner: string; dueDate: string }) => void;
  onUpdateIncidentAction: (actionId: string, patch: Partial<IncidentCorrectiveAction>) => void;
}) {
  const [view, setView] = useState<"report" | "register" | "dashboard">("report");
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "All">("All");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | "All">("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<IncidentType | "All">("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    incidentType: "Near Miss" as IncidentType,
    severity: "Minor" as IncidentSeverity,
    incidentDate: new Date().toISOString().slice(0, 10),
    incidentTime: new Date().toTimeString().slice(0, 5),
    reporterName: currentUser.name,
    reporterEmail: `${currentUser.username}@qmsprecast.co.uk`,
    department: "",
    location: "",
    description: "",
    immediateAction: "",
    injured: false,
    injuryDetails: "",
    contributingFactors: "",
    witnesses: "",
    evidenceUrls: [] as IncidentEvidenceItem[],
  });

  const departments = useMemo(
    () => Array.from(new Set(incidents.map((item) => item.department).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [incidents],
  );

  const filteredIncidents = useMemo(
    () =>
      incidents.filter((item) => {
        if (statusFilter !== "All" && item.status !== statusFilter) return false;
        if (severityFilter !== "All" && item.severity !== severityFilter) return false;
        if (departmentFilter !== "All" && item.department !== departmentFilter) return false;
        if (typeFilter !== "All" && item.incidentType !== typeFilter) return false;
        if (fromDate && item.incidentDate < fromDate) return false;
        if (toDate && item.incidentDate > toDate) return false;
        return true;
      }),
    [incidents, statusFilter, severityFilter, departmentFilter, typeFilter, fromDate, toDate],
  );

  const selectedIncident = filteredIncidents.find((item) => item.id === selectedIncidentId) || incidents.find((item) => item.id === selectedIncidentId) || null;
  const selectedActions = selectedIncident ? incidentActions.filter((item) => item.incidentId === selectedIncident.id) : [];
  const openActionsCount = incidentActions.filter((item) => item.status !== "Complete").length;
  const underInvestigation = incidents.filter((item) => item.status === "Under Investigation").length;
  const highSeverityIncidents = incidents.filter((item) => item.priority === "High").length;
  const nearMisses = incidents.filter((item) => item.incidentType === "Near Miss").length;
  const overdueActions = incidentActions.filter((item) => item.status !== "Complete" && item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10)).length;

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();
    incidents.forEach((item) => {
      const key = item.incidentDate.slice(0, 7);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [incidents]);

  const onAddEvidence = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map((file) => ({
      id: `incident-evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      previewUrl: URL.createObjectURL(file),
      addedAt: new Date().toISOString(),
    }));
    setForm((current) => ({ ...current, evidenceUrls: [...current.evidenceUrls, ...next] }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const created = await onSubmitIncident(form);
    setSuccessMessage(`Incident submitted successfully: ${created.incidentId}`);
    setView("register");
    setSelectedIncidentId(created.id);
    setForm((current) => ({
      ...current,
      department: "",
      location: "",
      description: "",
      immediateAction: "",
      injured: false,
      injuryDetails: "",
      contributingFactors: "",
      witnesses: "",
      evidenceUrls: [],
    }));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Accident / Near miss</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Incident reporting module</h2>
            <p className="mt-2 text-sm text-slate-300">Mobile-first reporting plus register, investigation workflow, corrective actions, and dashboard.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setView("report")} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${view === "report" ? "border-orange-400 bg-orange-400/15 text-orange-200" : "border-slate-700 bg-slate-900 text-slate-300"}`}>Report form</button>
            <button type="button" onClick={() => setView("register")} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${view === "register" ? "border-orange-400 bg-orange-400/15 text-orange-200" : "border-slate-700 bg-slate-900 text-slate-300"}`}>Incident register</button>
            <button type="button" onClick={() => setView("dashboard")} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${view === "dashboard" ? "border-orange-400 bg-orange-400/15 text-orange-200" : "border-slate-700 bg-slate-900 text-slate-300"}`}>Dashboard</button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">QR reporting link: <span className="font-semibold text-slate-200">{`${window.location.origin}/?screen=incidents`}</span></p>
      </section>

      {successMessage && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {successMessage}
        </section>
      )}

      {view === "report" && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <select value={form.incidentType} onChange={(event) => setForm((current) => ({ ...current, incidentType: event.target.value as IncidentType }))} className="h-11 rounded-xl border px-3"><option>Accident</option><option>Near Miss</option><option>Dangerous Occurrence</option><option>Property Damage</option><option>Environmental</option></select>
            <select value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as IncidentSeverity }))} className="h-11 rounded-xl border px-3"><option>Minor</option><option>Medical Treatment</option><option>Lost Time Injury</option><option>Major Incident</option><option>Fatality</option></select>
            <input type="date" value={form.incidentDate} onChange={(event) => setForm((current) => ({ ...current, incidentDate: event.target.value }))} className="h-11 rounded-xl border px-3" />
            <input type="time" value={form.incidentTime} onChange={(event) => setForm((current) => ({ ...current, incidentTime: event.target.value }))} className="h-11 rounded-xl border px-3" />
            <input value={form.reporterName} onChange={(event) => setForm((current) => ({ ...current, reporterName: event.target.value }))} placeholder="Reporter name" className="h-11 rounded-xl border px-3" />
            <input value={form.reporterEmail} onChange={(event) => setForm((current) => ({ ...current, reporterEmail: event.target.value }))} placeholder="Reporter email" className="h-11 rounded-xl border px-3" />
            <input value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} placeholder="Department / Area" className="h-11 rounded-xl border px-3" />
            <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Exact location" className="h-11 rounded-xl border px-3" />
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description of what happened" className="md:col-span-2 min-h-24 rounded-xl border px-3 py-2" />
            <textarea value={form.immediateAction} onChange={(event) => setForm((current) => ({ ...current, immediateAction: event.target.value }))} placeholder="Immediate action taken" className="md:col-span-2 min-h-20 rounded-xl border px-3 py-2" />
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.injured} onChange={(event) => setForm((current) => ({ ...current, injured: event.target.checked }))} /> Was anyone injured?</label>
            {form.injured && <textarea value={form.injuryDetails} onChange={(event) => setForm((current) => ({ ...current, injuryDetails: event.target.value }))} placeholder="Injury details" className="md:col-span-2 min-h-20 rounded-xl border px-3 py-2" />}
            <textarea value={form.contributingFactors} onChange={(event) => setForm((current) => ({ ...current, contributingFactors: event.target.value }))} placeholder="Contributing factors" className="md:col-span-2 min-h-20 rounded-xl border px-3 py-2" />
            <textarea value={form.witnesses} onChange={(event) => setForm((current) => ({ ...current, witnesses: event.target.value }))} placeholder="Witnesses" className="md:col-span-2 min-h-20 rounded-xl border px-3 py-2" />
            <div className="md:col-span-2 rounded-xl border border-dashed border-slate-300 px-3 py-3">
              <p className="text-xs text-slate-500">Evidence uploads (photos, videos, PDFs, documents)</p>
              <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => onAddEvidence(event.target.files)} className="mt-2 w-full text-sm" />
              {form.evidenceUrls.length > 0 && <p className="mt-2 text-xs text-slate-600">{form.evidenceUrls.length} file(s) attached</p>}
            </div>
            <button type="submit" className="md:col-span-2 h-12 rounded-xl bg-[var(--bert-signal-orange)] font-semibold text-[var(--qms-navy-950)]">Submit incident report</button>
          </form>
        </section>
      )}

      {view === "register" && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
          <div className="grid gap-2 md:grid-cols-6">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IncidentStatus | "All")} className="h-10 rounded-lg border px-2"><option value="All">All status</option><option>Open</option><option>Under Investigation</option><option>Closed</option></select>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as IncidentSeverity | "All")} className="h-10 rounded-lg border px-2"><option value="All">All severity</option><option>Minor</option><option>Medical Treatment</option><option>Lost Time Injury</option><option>Major Incident</option><option>Fatality</option></select>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 rounded-lg border px-2"><option value="All">All departments</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as IncidentType | "All")} className="h-10 rounded-lg border px-2"><option value="All">All types</option><option>Accident</option><option>Near Miss</option><option>Dangerous Occurrence</option><option>Property Damage</option><option>Environmental</option></select>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 rounded-lg border px-2" />
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-10 rounded-lg border px-2" />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500"><th className="px-2 py-2">Incident</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Severity</th><th className="px-2 py-2">Reporter</th><th className="px-2 py-2">Department</th><th className="px-2 py-2">Location</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Assigned</th><th className="px-2 py-2">Due</th><th className="px-2 py-2">Evidence</th><th className="px-2 py-2">Action</th></tr></thead>
              <tbody>
                {filteredIncidents.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedIncidentId(item.id)} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-2 py-2 font-semibold">{item.incidentId}</td><td className="px-2 py-2">{item.incidentDate} {item.incidentTime}</td><td className="px-2 py-2">{item.incidentType}</td><td className="px-2 py-2">{item.severity}</td><td className="px-2 py-2">{item.reporterName}</td><td className="px-2 py-2">{item.department}</td><td className="px-2 py-2">{item.location}</td><td className="px-2 py-2">{item.status}</td><td className="px-2 py-2">{item.assignedTo || "-"}</td><td className="px-2 py-2">{item.dueDate || "-"}</td><td className="px-2 py-2">{item.evidenceUrls.length > 0 ? "Yes" : "No"}</td>
                    <td className="px-2 py-2">
                      {canInvestigateIncidents(currentUser.role) && item.status !== "Closed" && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedIncidentId(item.id);
                            if (item.status === "Open") {
                              onUpdateIncident(item.id, { status: "Under Investigation" }, { statusNote: "Investigation started" });
                            }
                          }}
                          className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          {item.status === "Open" ? "Start investigation" : "Continue"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "dashboard" && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
            <MiniMetric label="Total incidents" value={String(incidents.length)} />
            <MiniMetric label="Open incidents" value={String(incidents.filter((item) => item.status === "Open").length)} />
            <MiniMetric label="Under investigation" value={String(underInvestigation)} />
            <MiniMetric label="Closed incidents" value={String(incidents.filter((item) => item.status === "Closed").length)} />
            <MiniMetric label="Near misses" value={String(nearMisses)} />
            <MiniMetric label="High severity" value={String(highSeverityIncidents)} />
            <MiniMetric label="Overdue actions" value={String(overdueActions)} />
            <MiniMetric label="Open actions" value={String(openActionsCount)} />
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
            Monthly trend: {monthlyTrend.length === 0 ? "No data yet." : monthlyTrend.map(([month, count]) => `${month}: ${count}`).join(" | ")}
          </div>
        </section>
      )}

      {selectedIncident && canInvestigateIncidents(currentUser.role) && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Investigation workflow</p>
              <h3 className="text-xl font-semibold text-slate-900">{selectedIncident.incidentId}</h3>
              <p className="text-sm text-slate-600">{selectedIncident.description}</p>
            </div>
            <select value={selectedIncident.status} onChange={(event) => onUpdateIncident(selectedIncident.id, { status: event.target.value as IncidentStatus }, { statusNote: "Status updated from register" })} className="h-10 rounded-lg border px-2">
              <option>Open</option><option>Under Investigation</option><option>Closed</option>
            </select>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <textarea value={selectedIncident.investigationNotes} onChange={(event) => onUpdateIncident(selectedIncident.id, { investigationNotes: event.target.value })} placeholder="Investigation notes" className="min-h-24 rounded-xl border px-3 py-2" />
            <textarea value={selectedIncident.rootCause} onChange={(event) => onUpdateIncident(selectedIncident.id, { rootCause: event.target.value })} placeholder="Root cause analysis" className="min-h-24 rounded-xl border px-3 py-2" />
            <textarea value={selectedIncident.correctiveActions} onChange={(event) => onUpdateIncident(selectedIncident.id, { correctiveActions: event.target.value })} placeholder="Corrective actions summary" className="min-h-24 rounded-xl border px-3 py-2" />
            <textarea value={selectedIncident.preventiveActions} onChange={(event) => onUpdateIncident(selectedIncident.id, { preventiveActions: event.target.value })} placeholder="Preventive actions summary" className="min-h-24 rounded-xl border px-3 py-2" />
            <input value={selectedIncident.assignedTo} onChange={(event) => onUpdateIncident(selectedIncident.id, { assignedTo: event.target.value })} placeholder="Assigned to" className="h-10 rounded-lg border px-3" />
            <input value={selectedIncident.actionOwner} onChange={(event) => onUpdateIncident(selectedIncident.id, { actionOwner: event.target.value })} placeholder="Action owner" className="h-10 rounded-lg border px-3" />
            <input type="date" value={selectedIncident.dueDate} onChange={(event) => onUpdateIncident(selectedIncident.id, { dueDate: event.target.value })} className="h-10 rounded-lg border px-3" />
            <input type="date" value={selectedIncident.completionDate} onChange={(event) => onUpdateIncident(selectedIncident.id, { completionDate: event.target.value })} className="h-10 rounded-lg border px-3" />
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedIncident.riddorRequired} onChange={(event) => onUpdateIncident(selectedIncident.id, { riddorRequired: event.target.checked })} /> RIDDOR required</label>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Corrective action tracking</p>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <input value={actionDescription} onChange={(event) => setActionDescription(event.target.value)} placeholder="Action description" className="h-10 rounded-lg border px-2 md:col-span-2" />
              <input value={actionOwner} onChange={(event) => setActionOwner(event.target.value)} placeholder="Owner" className="h-10 rounded-lg border px-2" />
              <input type="date" value={actionDueDate} onChange={(event) => setActionDueDate(event.target.value)} className="h-10 rounded-lg border px-2" />
            </div>
            <button type="button" onClick={() => { onAddIncidentAction(selectedIncident.id, { description: actionDescription, owner: actionOwner, dueDate: actionDueDate }); setActionDescription(""); setActionOwner(""); setActionDueDate(""); }} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Add corrective action</button>
            <div className="mt-2 space-y-2">
              {selectedActions.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <p className="min-w-[14rem] flex-1">{item.description}</p>
                  <p className="text-slate-500">{item.owner}</p>
                  <p className="text-slate-500">{item.dueDate || "-"}</p>
                  <select value={item.status} onChange={(event) => onUpdateIncidentAction(item.id, { status: event.target.value as IncidentCorrectiveAction["status"] })} className="h-8 rounded border px-2 text-xs">
                    <option>Open</option><option>In Progress</option><option>Complete</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
          {selectedIncident.status !== "Closed" && (
            <button type="button" onClick={() => onUpdateIncident(selectedIncident.id, { status: "Closed", closedAt: new Date().toISOString(), closedBy: currentUser.name, completionDate: selectedIncident.completionDate || new Date().toISOString().slice(0, 10) }, { statusNote: "Incident closed" })} className="mt-3 h-10 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700">Close incident</button>
          )}
        </section>
      )}
    </div>
  );
}

function AuditsScreen({
  currentUser,
  audits,
  groupedAudits,
  drafts,
  unsyncedAuditIds,
  userProfilePhotos,
  onOpenAudit,
  auditAccessMatrix,
  auditScheduleMatrix,
  onToggleAuditAccess,
}: {
  currentUser: User;
  audits: Audit[];
  groupedAudits: Record<AuditStatus, Audit[]>;
  drafts: Record<string, AuditDraft>;
  unsyncedAuditIds: Set<string>;
  userProfilePhotos: Record<string, string>;
  onOpenAudit: (auditId: string) => void;
  auditAccessMatrix: AuditAccessMatrixRow[];
  auditScheduleMatrix: Record<string, AuditScheduleMatrixInfo>;
  onToggleAuditAccess: (email: string, auditId: string, currentAccess: AuditAccessLevel) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <AppIcon name="clipboard" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Audit centre</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {currentUser.role === "Auditor" ? "Assigned field audits" : "Complete and manage inspections"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Save progress mid-inspection, complete audits in the field, and let the system create corrective actions when issues are found.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3">
        <MiniMetric label="In progress" value={String(Object.keys(drafts).length)} />
      </section>

      {currentUser.role !== "Auditor" && (
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <SectionHeader
            icon="user"
            eyebrow="Access control"
            title="Audit access matrix"
            subtitle="Manage exactly which users can access each audit."
          />
          <div className="mt-4">
            <AccessMatrixTable
              auditAccessMatrix={auditAccessMatrix}
              auditScheduleMatrix={auditScheduleMatrix}
              userProfilePhotos={userProfilePhotos}
              onToggleAuditAccess={onToggleAuditAccess}
            />
          </div>
        </section>
      )}

      <TrafficLane title="Red" subtitle="Overdue" audits={groupedAudits.red} status="red" onOpenAudit={onOpenAudit} expanded drafts={drafts} unsyncedAuditIds={unsyncedAuditIds} />
      <TrafficLane
        title="Amber"
        subtitle={`Less than ${amberThresholdHours} hours remaining`}
        audits={groupedAudits.amber}
        status="amber"
        onOpenAudit={onOpenAudit}
        expanded
        drafts={drafts}
        unsyncedAuditIds={unsyncedAuditIds}
      />
      <TrafficLane
        title="Green"
        subtitle={`More than ${amberThresholdHours} hours remaining`}
        audits={groupedAudits.green}
        status="green"
        onOpenAudit={onOpenAudit}
        expanded
        drafts={drafts}
        unsyncedAuditIds={unsyncedAuditIds}
      />

      {audits.length === 0 && (
        <EmptyPanel
          title="No audit templates live"
          text="This blank version is ready for setup. Connect Google in Admin, select the company folder you want, verify the onboarding form, audit forms, and response sheet, then sync."
        />
      )}
    </div>
  );
}

function ActionsScreen({
  currentUser,
  actions,
  actionFilter,
  actionSeverityFilter,
  actionNcFilter,
  availableNonConformanceIds,
  availableAuditors,
  onFilterChange,
  onSeverityFilterChange,
  onNcFilterChange,
  onAdvanceAction,
  onAssignAction,
  onAddEvidence,
}: {
  currentUser: User;
  actions: ActionItem[];
  actionFilter: "Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity";
  actionSeverityFilter: RiskLevel | "All";
  actionNcFilter: string;
  availableNonConformanceIds: string[];
  availableAuditors: string[];
  onFilterChange: (value: "Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity") => void;
  onSeverityFilterChange: (value: RiskLevel | "All") => void;
  onNcFilterChange: (value: string) => void;
  onAdvanceAction: (actionId: string, nextStatus?: ActionStatus) => void;
  onAssignAction: (actionId: string, assignee: string) => void;
  onAddEvidence: (actionId: string, files: FileList) => void;
}) {
  const permissions = getRolePermissions(currentUser.role);
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <AppIcon name="warningTriangle" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{currentUser.role === "Auditor" ? "My actions" : "Corrective actions"}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{currentUser.role === "Auditor" ? "Assigned corrective actions" : "CAPA control centre"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Track failed findings, assign ownership, upload evidence, and verify closure.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-700 bg-slate-900 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={actionFilter}
            onChange={(event) => onFilterChange(event.target.value as "Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity")}
            className="h-12 rounded-2xl border border-[rgba(249,115,22,0.45)] bg-slate-950 px-4 text-sm text-white outline-none focus:border-[var(--bert-signal-orange)]"
          >
            <option value="Open">Open</option>
            <option value="Overdue">Overdue</option>
            <option value="Awaiting Verification">Awaiting Verification</option>
            <option value="Closed">Closed</option>
            <option value="Severity">All by severity</option>
          </select>
          <select
            value={actionSeverityFilter}
            onChange={(event) => onSeverityFilterChange(event.target.value as RiskLevel | "All")}
            className="h-12 rounded-2xl border border-[rgba(249,115,22,0.45)] bg-slate-950 px-4 text-sm text-white outline-none focus:border-[var(--bert-signal-orange)]"
          >
            <option value="All">All severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={actionNcFilter}
            onChange={(event) => onNcFilterChange(event.target.value)}
            className="h-12 rounded-2xl border border-[rgba(249,115,22,0.45)] bg-slate-950 px-4 text-sm text-white outline-none focus:border-[var(--bert-signal-orange)]"
          >
            <option value="All">All non-conformance refs</option>
            {availableNonConformanceIds.map((reference) => (
              <option key={reference} value={reference}>
                {reference}
              </option>
            ))}
          </select>
        </div>
      </section>

      {actions.length === 0 ? (
        <EmptyPanel title="No corrective actions in this view" text="Failed answers and flagged issues will create actions here automatically." />
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <section key={action.id} className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
              {(() => {
                const urgency = getActionUrgency(action);
                const urgencyTone =
                  urgency === "Escalated"
                    ? "bg-rose-200 text-rose-900"
                    : urgency === "Overdue"
                      ? "bg-rose-100 text-rose-700"
                      : urgency === "Stuck"
                        ? "bg-amber-100 text-amber-800"
                        : urgency === "Due soon"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-700";
                return (
                  <div className="mb-2 flex items-center justify-between">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{action.status}</div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${urgencyTone}`}>{urgency}</div>
                  </div>
                );
              })()}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{action.auditName}</p>
                  <p className="mt-2 text-sm text-slate-600">{action.questionText}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action.nonConformanceId && <MetaPill icon="spark" label={action.nonConformanceId} />}
                    <MetaPill icon="spark" label={action.severity} />
                    <MetaPill icon="clipboard" label={action.riskCategory} />
                    <MetaPill icon="user" label={action.assignedToName} />
                    <MetaPill icon="clock" label={action.dueDate || action.dueLabel} />
                    <MetaPill
                      icon="camera"
                      label={
                        action.evidenceRequired
                          ? action.evidenceCount === 0
                            ? "Evidence required"
                            : `${action.evidenceCount} evidence`
                          : action.evidenceCount > 0
                            ? `${action.evidenceCount} evidence`
                            : "Evidence optional"
                      }
                    />
                  </div>
                  {action.status !== "Closed" && action.evidenceRequired && action.evidenceCount === 0 && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">Reason not closed: evidence missing.</p>
                  )}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {permissions.canAssignActions && (
                  <select
                    value={action.assignedToName}
                    onChange={(event) => onAssignAction(action.id, event.target.value)}
                    className={`h-11 w-full min-w-0 rounded-2xl px-4 text-sm ${brandDarkFormControl}`}
                  >
                    {[action.assignedToName, ...availableAuditors].filter((value, index, list) => value && list.indexOf(value) === index).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
                <div className="flex flex-wrap gap-2">
                  {action.status !== "Closed" && (
                    <div className="w-full">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Upload evidence</p>
                      <label className={`inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                        Attach photo evidence
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            if (event.target.files?.length) {
                              onAddEvidence(action.id, event.target.files);
                              event.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <p className="mt-1 text-[11px] text-slate-500">Add photo evidence before submitting for verification.</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        title="Fallback file chooser"
                        className={`mt-2 h-9 w-full rounded-xl px-2 text-xs ${brandDarkFormControl}`}
                        onChange={(event) => {
                          if (event.target.files?.length) {
                            onAddEvidence(action.id, event.target.files);
                            event.target.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                  {action.status === "Open" && (
                    <button onClick={() => onAdvanceAction(action.id, "In Progress")} className={`h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                      Start action
                    </button>
                  )}
                  {action.status === "Awaiting Verification" && permissions.canVerifyActions && (
                    <button onClick={() => onAdvanceAction(action.id, "Closed")} className={`h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                      Verify & close
                    </button>
                  )}
                  {action.status === "In Progress" && (
                    <button onClick={() => onAdvanceAction(action.id, "Awaiting Verification")} className={`h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                      Submit for verification
                    </button>
                  )}
                  {permissions.canVerifyActions && action.status === "Awaiting Verification" && <button onClick={() => onAdvanceAction(action.id, "Rejected")} className="h-11 rounded-2xl bg-rose-50 px-4 text-sm font-semibold text-rose-700">Reject</button>}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncCentreScreen({
  currentUser,
  syncQueue,
  offlineQueueCount,
  onRetryItem,
  onForceSyncItem,
}: {
  currentUser: User;
  syncQueue: SyncQueueItem[];
  offlineQueueCount: number;
  onRetryItem: (localId: string) => void;
  onForceSyncItem: (localId: string) => void;
}) {
  const permissions = getRolePermissions(currentUser.role);
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <AppIcon name="sync" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Offline trust</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Sync Centre</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Every audit, action, evidence update, and schedule change is tracked until it safely syncs.</p>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3">
        <MiniMetric label="Queued offline submissions" value={String(offlineQueueCount)} />
        <MiniMetric label="Tracked sync items" value={String(syncQueue.length)} />
      </section>
      {syncQueue.length === 0 ? (
        <EmptyPanel title="No sync items yet" text="Offline work and admin changes will appear here with status, retries, and errors." />
      ) : (
        <div className="space-y-3">
          {syncQueue.map((item) => (
            <section key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.itemType}</p>
                  <p className="mt-1 text-xs text-slate-500">Local ID: {item.localId}</p>
                  <p className="mt-1 text-xs text-slate-500">Created {item.createdAt} • Updated {item.updatedAt}</p>
                  {item.lastError ? <p className="mt-2 text-xs font-semibold text-rose-600">{item.lastError}</p> : null}
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.status}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">Retries {item.retryCount}</div>
                {(item.status === "Failed" || item.status === "Conflict") && (
                  <button onClick={() => onRetryItem(item.localId)} className={`rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white ${slatePrimaryCtaInteract}`}>
                    Retry
                  </button>
                )}
                {permissions.canRepairWorkspace && <button onClick={() => onForceSyncItem(item.localId)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">Force sync</button>}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AccessMatrixTable({
  auditAccessMatrix,
  auditScheduleMatrix,
  userProfilePhotos,
  onToggleAuditAccess,
}: {
  auditAccessMatrix: AuditAccessMatrixRow[];
  auditScheduleMatrix: Record<string, AuditScheduleMatrixInfo>;
  userProfilePhotos: Record<string, string>;
  onToggleAuditAccess: (email: string, auditId: string, currentAccess: AuditAccessLevel) => void;
}) {
  const matrixAuditColumns = auditAccessMatrix[0]?.cells ?? [];
  const visibleMatrixAuditColumns = matrixAuditColumns;
  const filteredMatrixRows = auditAccessMatrix;
  const findProfilePhoto = (matrixUser: AuditAccessMatrixRow) => {
    const emailKey = matrixUser.email.split("@")[0]?.toLowerCase() || "";
    const nameKey = matrixUser.name.toLowerCase();
    const knownUser = users.find((item) => item.name.toLowerCase() === nameKey || item.username === emailKey);
    return (
      (knownUser ? userProfilePhotos[knownUser.username] : "") ||
      userProfilePhotos[emailKey] ||
      userProfilePhotos[nameKey] ||
      ""
    );
  };

  return (
    <>
      {filteredMatrixRows.length === 0 || visibleMatrixAuditColumns.length === 0 ? (
        <div className="mt-4">
          <EmptyPanel
            title="No access matrix available yet"
            text="Add live audits and users to this company workspace to generate the access matrix."
          />
        </div>
      ) : (
        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-[11rem] bg-slate-50 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    User
                  </th>
                  {visibleMatrixAuditColumns.map((audit) => (
                    <th
                      key={audit.auditId}
                      className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                    >
                      <span className="block truncate leading-4">{audit.auditName}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMatrixRows.map((user) => (
                  <tr key={user.email} className="border-b border-slate-100 align-top last:border-b-0">
                    <td className="bg-white px-2 py-2">
                      <div className="flex items-center gap-2">
                        {findProfilePhoto(user) ? (
                          <img
                            src={findProfilePhoto(user)}
                            alt={user.name}
                            className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                            {getWorkspaceInitials(user.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-4 text-slate-900">{user.name}</p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            {user.accessibleCount} audit{user.accessibleCount === 1 ? "" : "s"} accessible
                          </p>
                        </div>
                      </div>
                    </td>
                    {user.cells.map((cell) => (
                      <td key={`${user.email}-${cell.auditId}`} className="px-1.5 py-2">
                        <button
                          type="button"
                          onClick={() => onToggleAuditAccess(user.email, cell.auditId, cell.access)}
                          className={[
                            "w-full rounded-lg border px-2 py-1.5 text-left",
                            "cursor-pointer",
                            cell.access === "Full access"
                              ? "border-slate-200 bg-slate-950 text-white"
                              : cell.access === "Oversight"
                                ? "border-sky-200 bg-sky-50"
                                : cell.access === "Complete"
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-slate-200 bg-slate-50",
                          ].join(" ")}
                        >
                          <p
                            className={[
                              "text-[10px] font-semibold uppercase tracking-[0.12em]",
                              cell.access === "Full access"
                                ? "text-slate-200"
                                : cell.access === "Oversight"
                                  ? "text-sky-700"
                                  : cell.access === "Complete"
                                    ? "text-blue-800"
                                    : "text-slate-500",
                            ].join(" ")}
                          >
                            {cell.access}
                          </p>
                          <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                            Tap to change
                          </p>
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Schedule mapping</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {visibleMatrixAuditColumns.map((audit) => {
                  const schedule = auditScheduleMatrix[audit.auditId];
                  return (
                    <div key={`schedule-map-${audit.auditId}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{audit.auditName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {schedule
                          ? `${schedule.frequency} • ${schedule.days.join(", ")} • ${schedule.liveTime} • ${schedule.completionHours}h`
                          : "Not scheduled"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <QuickActionTile title="Users" value={String(filteredMatrixRows.length)} caption="Included in matrix" />
        <QuickActionTile title="Audits" value={String(visibleMatrixAuditColumns.length)} caption="Available on this workspace" />
        <QuickActionTile
          title="Assigned access"
          value={String(filteredMatrixRows.reduce((sum, row) => sum + row.accessibleCount, 0))}
          caption="User-to-audit links"
        />
      </div>
    </>
  );
}

function ReportsScreen({
  workspaceName,
  compliance,
  openActions,
  overdueActions,
  overdueAudits,
  actions,
  managedSchedules,
  syncQueue,
  riskSummary,
  recurringFailedQuestions,
  auditCompletionRate,
  evidenceCount,
  completedToday,
  offlineQueueCount,
  reportUsers,
  reportRecipients,
  reportInbox,
  history,
  templates,
  selectedReportTemplate,
  reportTitleInput,
  selectedReportSections,
  onToggleReportRecipient,
  onSelectReportTemplate,
  onReportTitleChange,
  onToggleReportSection,
  onExportAuditPack,
  onExportAuditPackPdf,
}: {
  workspaceName: string;
  compliance: number;
  openActions: ActionItem[];
  overdueActions: ActionItem[];
  overdueAudits: Audit[];
  actions: ActionItem[];
  managedSchedules: ManagedSchedule[];
  syncQueue: SyncQueueItem[];
  riskSummary: {
    totalRiskScore: number;
    highestRiskLevel: RiskLevel;
    criticalFindings: number;
    highFindings: number;
  };
  recurringFailedQuestions: [string, number][];
  auditCompletionRate: number;
  evidenceCount: number;
  completedToday: number;
  offlineQueueCount: number;
  reportUsers: CompanyReportUser[];
  reportRecipients: string[];
  reportInbox: ReportItem[];
  history: HistoryEntry[];
  templates: AuditTemplate[];
  selectedReportTemplate: ReportTemplateType;
  reportTitleInput: string;
  selectedReportSections: ReportSectionKey[];
  onToggleReportRecipient: (email: string) => void;
  onSelectReportTemplate: (value: ReportTemplateType) => void;
  onReportTitleChange: (value: string) => void;
  onToggleReportSection: (section: ReportSectionKey) => void;
  onExportAuditPack: () => void;
  onExportAuditPackPdf: () => void;
}) {
  const [showReportCreator, setShowReportCreator] = useState(false);
  const [showAuditPackOptions, setShowAuditPackOptions] = useState(false);
  const [selectedReportGraphType, setSelectedReportGraphType] = useState<"column" | "line" | "area" | "bar">("column");
  const reportPreviewSeries = [
    { label: "Completion", value: compliance, tone: "green" as const },
    { label: "Open actions", value: openActions.length, tone: "amber" as const },
    { label: "Overdue audits", value: overdueAudits.length, tone: "red" as const },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <AppIcon name="chart" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Report creator</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create audit packs and evidence reports</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Export handover packs, PDF-style reports, and evidence summaries for {workspaceName}.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MiniMetric label="Compliance" value={`${compliance}%`} />
        <MiniMetric label="Open actions" value={String(openActions.length)} icon="warningTriangle" />
        <MiniMetric label="Overdue audits" value={String(overdueAudits.length)} />
        <MiniMetric label="Evidence items" value={String(evidenceCount)} />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="chart"
          eyebrow="Visual summary"
          title="Report preview"
          subtitle={`A quick visual read of ${workspaceName} before you export.`}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.4rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Audit status split</p>
              <div className="relative w-[8.5rem]">
                <select
                  value={selectedReportGraphType}
                  onChange={(event) => setSelectedReportGraphType(event.target.value as "column" | "line" | "area" | "bar")}
                  className="h-8 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 pr-7 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  <option value="column">Column</option>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                  <option value="bar">Bar</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">▾</span>
              </div>
            </div>
            <LiveGraphChart data={reportPreviewSeries} chartType={selectedReportGraphType} />
            <div className="space-y-3">
              <TrendBar label="Completion rate" value={compliance} total={100} tone="green" />
              <TrendBar label="Open actions" value={openActions.length} total={Math.max(1, openActions.length + overdueActions.length + 2)} tone="amber" />
              <TrendBar label="Overdue audits" value={overdueAudits.length} total={Math.max(1, overdueAudits.length + 3)} tone="red" />
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Pack emphasis</p>
              <p className="text-xs text-slate-500">{selectedReportTemplate}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionTile title="History" value={String(history.length)} caption="Records available" />
              <QuickActionTile title="Templates" value={String(templates.filter((template) => template.active).length)} caption="Included" />
              <QuickActionTile title="Proof" value={String(evidenceCount)} caption="Evidence items" />
              <QuickActionTile title="Today" value={String(completedToday)} caption="Completed audits" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader
            icon="chart"
            eyebrow="Export centre"
            title="Report / Audit Pack Creator"
            subtitle="Generate the output you need without cluttering the live dashboard."
          />
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Queue {offlineQueueCount}
          </div>
        </div>
        {!showReportCreator ? (
          <button
            onClick={() => setShowReportCreator(true)}
            className={`h-12 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}
          >
            Create a report
          </button>
        ) : (
          <>
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setShowAuditPackOptions((current) => !current)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-200 ease-in-out hover:bg-slate-900/25 hover:text-white"
              >
                {showAuditPackOptions ? "Hide audit pack options" : "Create audit pack"}
              </button>
              <button
                onClick={() => onSelectReportTemplate("Evidence pack")}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-200 ease-in-out hover:bg-slate-900/25 hover:text-white"
              >
                Evidence pack
              </button>
            </div>
            <div className="mb-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Report type</p>
              <p className="mt-1 text-sm text-slate-500">Pick the report outcome you want to create for this workspace.</p>
              <div className="mt-3 grid gap-2">
                {reportTemplates.map((template) => {
                  const selected = template.type === selectedReportTemplate;
                  return (
                    <button
                      key={template.type}
                      onClick={() => onSelectReportTemplate(template.type)}
                      className={[
                        "rounded-2xl border px-4 py-3 text-left transition-colors duration-200 ease-in-out",
                        selected ? `border-slate-900 bg-slate-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)] ${slatePrimaryCtaInteract}` : "border-slate-200 bg-white hover:bg-slate-900/25 hover:text-white",
                      ].join(" ")}
                    >
                      <p className="text-sm font-semibold">{template.title}</p>
                      <p className={["mt-1 text-xs leading-5", selected ? "text-slate-300" : "text-slate-500"].join(" ")}>{template.subtitle}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Report title</label>
                <input
                  value={reportTitleInput}
                  onChange={(event) => onReportTitleChange(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  placeholder="Enter report title"
                />
              </div>
            </div>
            <div className="mb-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Who can see this report?</p>
              <p className="mt-1 text-sm text-slate-500">Select the company users who should see the report in their app.</p>
              <div className="mt-3 space-y-2">
                {reportUsers.map((user) => {
                  const selected = reportRecipients.includes(user.email);
                  return (
                    <button
                      key={user.email}
                      onClick={() => onToggleReportRecipient(user.email)}
                      className={[
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left",
                        selected ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {user.role} • {user.email}
                        </p>
                      </div>
                      <div
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          selected ? "bg-blue-500/12 text-blue-800" : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {selected ? "Can view" : "Select"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Choose what goes into the report</p>
              <p className="mt-1 text-sm text-slate-500">Select the sections to include in this export.</p>
              <div className="mt-3 space-y-2">
                {reportSectionOptions.map((section) => {
                  const selected = selectedReportSections.includes(section.key);
                  return (
                    <button
                      key={section.key}
                      onClick={() => onToggleReportSection(section.key)}
                      className={[
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left",
                        selected ? "border-slate-900 bg-white" : "border-slate-200 bg-white",
                      ].join(" ")}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {section.icon ? (
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                            <AppIcon name={section.icon} className="h-[18px] w-[18px]" />
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{section.description}</p>
                        </div>
                      </div>
                      <div
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {selected ? "Included" : "Exclude"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3">
              <button
                onClick={onExportAuditPackPdf}
                className={`h-14 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}
              >
                Export PDF report
              </button>
              {showAuditPackOptions && (
                <>
                  <button
                    onClick={onExportAuditPack}
                    className="h-14 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 transition-colors duration-200 ease-in-out hover:bg-slate-900/25 hover:text-white"
                  >
                    Export text audit pack
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowReportCreator(false);
                  setShowAuditPackOptions(false);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors duration-200 ease-in-out hover:bg-slate-900/25 hover:text-white"
              >
                Close report options
              </button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="dashboard"
          eyebrow="Shared visibility"
          title="Report inbox"
          subtitle="Generated reports appear here for selected company users."
        />
        <div className="mt-4 space-y-3">
          {reportInbox.length === 0 ? (
            <EmptyPanel title="No reports generated yet" text="Select recipients and export a report to create the first report inbox item." />
          ) : (
            reportInbox.map((report) => (
              <div key={report.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{report.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {report.type} • {report.template} • created by {report.createdBy} • {report.createdAt}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">Visible to {report.visibleTo.join(", ")}</p>
                  </div>
                  <div className="rounded-full bg-sky-500/12 px-3 py-1 text-xs font-semibold text-sky-700">
                    In app
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showReportCreator && (
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <SectionHeader
            icon="clipboard"
            eyebrow="Included sections"
            title="Report contents"
            subtitle="Only the sections marked below will be included in the export."
          />
          <div className="mt-4 space-y-3">
            {reportSectionOptions
              .filter((section) => selectedReportSections.includes(section.key))
              .map((section, index) => (
                <FlowItem
                  key={section.key}
                  number={String(index + 1).padStart(2, "0")}
                  title={section.title}
                  text={section.description}
                  icon={section.icon}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SchedulesScreen({
  selectedFolder,
  schedules,
  filter,
  availableAudits,
  availableAuditors,
  editorOpen,
  editingSchedule,
  scheduleName,
  selectedAuditIds,
  scheduleAudits,
  startDate,
  endDate,
  continuous,
  selectedAuditors,
  validationAttempted,
  onFilterChange,
  onOpenNew,
  onOpenSchedule,
  onToggleAudit,
  onToggleAuditDay,
  onAuditFieldChange,
  onScheduleNameChange,
  onStartDateChange,
  onEndDateChange,
  onContinuousChange,
  onToggleAuditor,
  onSave,
  onCancel,
  onReactivate,
  onDelete,
  onPause,
  onResume,
}: {
  selectedFolder: CompanyFolder | null;
  schedules: ManagedSchedule[];
  filter: ScheduleListFilter;
  availableAudits: { id: string; name: string }[];
  availableAuditors: string[];
  editorOpen: boolean;
  editingSchedule: ManagedSchedule | null;
  scheduleName: string;
  selectedAuditIds: string[];
  scheduleAudits: ManagedScheduleAudit[];
  startDate: string;
  endDate: string;
  continuous: boolean;
  selectedAuditors: string[];
  validationAttempted: boolean;
  onFilterChange: (value: ScheduleListFilter) => void;
  onOpenNew: () => void;
  onOpenSchedule: (scheduleId: string) => void;
  onToggleAudit: (auditId: string, auditName: string) => void;
  onToggleAuditDay: (auditId: string, day: ScheduleDay) => void;
  onAuditFieldChange: (auditId: string, field: "frequency" | "liveTime" | "completionHours", value: string) => void;
  onScheduleNameChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onContinuousChange: (value: boolean) => void;
  onToggleAuditor: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onReactivate: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
  onPause: (scheduleId: string) => void;
  onResume: (scheduleId: string) => void;
}) {
  const nameError = validationAttempted && !scheduleName.trim();
  const auditsError = validationAttempted && scheduleAudits.length === 0;
  const startDateError = validationAttempted && !startDate;
  const auditorsError = validationAttempted && selectedAuditors.length === 0;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
              <AppIcon name="clock" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Schedule control</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Live schedules</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Create, edit, archive, and reactivate company audit schedules for {selectedFolder?.name || "the live workspace"}.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenNew}
            className={`h-12 rounded-2xl px-5 text-sm font-semibold ${brandAccentFormField} ${slatePrimaryCtaInteract}`}
          >
            Add new schedule
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="flex items-end justify-between gap-3">
          <SectionHeader
            icon="clock"
            eyebrow="Schedule list"
            title={filter}
            subtitle="Open a schedule to edit its timings, audits, auditors, and revision history."
          />
          <div className="w-full max-w-[18rem]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Schedule view</label>
            <select
              value={filter}
              onChange={(event) => onFilterChange(event.target.value as ScheduleListFilter)}
              className={`h-12 w-full rounded-2xl px-4 text-sm ${brandAccentFormField}`}
            >
              <option value="Live">Live</option>
              <option value="Archived">Archived</option>
              <option value="All schedules">All schedules</option>
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {schedules.length === 0 ? (
            <EmptyPanel title="No schedules in this view" text="Add a new schedule or switch the filter to see archived revisions." />
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-[1.4rem] border border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.1)] px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{schedule.scheduleName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <MetaPill icon="spark" label={`${schedule.lifecycle} rev ${schedule.versionLabel}`} />
                      <MetaPill icon="clipboard" label={`${schedule.audits.length} audits`} />
                      <MetaPill icon="user" label={`${schedule.auditors.length} auditors`} />
                      {computeScheduleHealthState(schedule) === "Paused" && schedule.nextDueAt && (
                        <MetaPill icon="clock" label={`Paused until ${schedule.nextDueAt}`} />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Start {schedule.startDate} {schedule.endDate ? `• End ${schedule.endDate}` : "• No end date"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onOpenSchedule(schedule.id)} className={`rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white ${slatePrimaryCtaInteract}`}>
                      Edit
                    </button>
                    <button onClick={() => onDelete(schedule.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      Delete
                    </button>
                    {computeScheduleHealthState(schedule) === "Paused" ? (
                      <button onClick={() => onResume(schedule.id)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                        Resume
                      </button>
                    ) : (
                      <button onClick={() => onPause(schedule.id)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        Pause
                      </button>
                    )}
                    {schedule.lifecycle === "Archived" && (
                      <button onClick={() => onReactivate(schedule.id)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {editorOpen && (
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <SectionHeader
            icon="check"
            eyebrow="Schedule builder"
            title={editingSchedule ? "Edit schedule" : "Create schedule"}
            subtitle="Choose audits, set timings, add auditors, and save the live or archived revision."
          />
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Schedule name or ID</label>
              <input
                value={scheduleName}
                onChange={(event) => onScheduleNameChange(event.target.value)}
                className={[
                  "h-12 w-full rounded-2xl px-4 text-sm outline-none transition",
                  brandAccentFormField,
                  nameError ? "border-rose-400 ring-1 ring-rose-400" : "",
                ].join(" ")}
                placeholder="Enter the schedule name"
              />
            </div>

            <div className={["rounded-[1.5rem] border p-4", auditsError ? "border-rose-300 bg-rose-50/50" : "border-slate-200 bg-slate-50"].join(" ")}>
              <p className="text-sm font-semibold text-slate-900">Select audits for this schedule</p>
              <div className="mt-3 space-y-2">
                {availableAudits.map((audit) => {
                  const selected = selectedAuditIds.includes(audit.id);
                  return (
                    <label
                      key={audit.id}
                      className={[
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left",
                        selected
                          ? "border-[rgba(249,115,22,0.55)] bg-[rgba(249,115,22,0.18)]"
                          : "border-[rgba(249,115,22,0.28)] bg-[rgba(249,115,22,0.08)]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleAudit(audit.id, audit.name)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        <span className="text-sm font-semibold text-slate-900">{audit.name}</span>
                      </div>
                      <span className={["rounded-full px-3 py-1 text-xs font-semibold", selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"].join(" ")}>
                        {selected ? "Added" : "Add"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {scheduleAudits.map((audit) => {
              const auditError = validationAttempted && audit.days.length === 0;
              return (
                <div key={audit.id} className="rounded-[1.5rem] border border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.08)] p-4">
                  <p className="text-sm font-semibold text-slate-900">{audit.auditName}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scheduleDayOptions.map((day) => {
                      const selected = audit.days.includes(day);
                      return (
                        <label
                          key={day}
                          className={[
                            "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold",
                            selected ? `bg-slate-900 text-white ${slatePrimaryCtaInteract}` : "bg-slate-100 text-slate-600 transition-colors duration-200 hover:bg-slate-200",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleAuditDay(audit.auditId, day)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          {day}
                        </label>
                      );
                    })}
                  </div>
                  {auditError && <p className="mt-2 text-xs font-semibold text-rose-600">Select at least one day.</p>}
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <select
                      value={audit.frequency}
                      onChange={(event) => onAuditFieldChange(audit.auditId, "frequency", event.target.value)}
                      className={`h-12 rounded-2xl px-4 text-sm ${brandAccentFormField}`}
                    >
                      {scheduleFrequencyOptions.map((frequency) => (
                        <option key={frequency} value={frequency}>{frequency}</option>
                      ))}
                    </select>
                    <select
                      value={audit.liveTime}
                      onChange={(event) => onAuditFieldChange(audit.auditId, "liveTime", event.target.value)}
                      className={`h-12 rounded-2xl px-4 text-sm ${brandAccentFormField}`}
                    >
                      {scheduleTimeOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <select
                      value={String(audit.completionHours)}
                      onChange={(event) => onAuditFieldChange(audit.auditId, "completionHours", event.target.value)}
                      className={`h-12 rounded-2xl px-4 text-sm ${brandAccentFormField}`}
                    >
                      {scheduleDurationOptions.map((hours) => (
                        <option key={hours} value={hours}>{hours} hours to complete</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className={[
                    "h-12 w-full rounded-2xl px-4 text-sm outline-none transition",
                    brandAccentFormField,
                    startDateError ? "border-rose-400 ring-1 ring-rose-400" : "",
                  ].join(" ")}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">End date</label>
                <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={continuous}
                    onChange={(event) => {
                      onContinuousChange(event.target.checked);
                      if (event.target.checked) {
                        onEndDateChange("");
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  Continuous until an end date is given
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    onEndDateChange(event.target.value);
                    if (event.target.value) {
                      onContinuousChange(false);
                    }
                  }}
                  disabled={continuous}
                  className={[
                    "h-12 w-full rounded-2xl px-4 text-sm outline-none transition",
                    continuous
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : brandAccentFormField,
                  ].join(" ")}
                />
              </div>
            </div>

            <div className={["rounded-[1.5rem] border p-4", auditorsError ? "border-rose-300 bg-rose-50/50" : "border-slate-200 bg-slate-50"].join(" ")}>
              <p className="text-sm font-semibold text-slate-900">Select auditors for this schedule</p>
              <div className="mt-3 space-y-2">
                {availableAuditors.map((auditor) => {
                  const selected = selectedAuditors.includes(auditor);
                  return (
                    <label
                      key={auditor}
                      className={[
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left",
                        selected
                          ? "border-[rgba(249,115,22,0.55)] bg-[rgba(249,115,22,0.18)]"
                          : "border-[rgba(249,115,22,0.28)] bg-[rgba(249,115,22,0.08)]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleAuditor(auditor)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        <span className="text-sm font-semibold text-slate-900">{auditor}</span>
                      </div>
                      <span className={["rounded-full px-3 py-1 text-xs font-semibold", selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"].join(" ")}>
                        {selected ? "Added" : "Add"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={onSave} className={`h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                Save schedule
              </button>
              <button onClick={onCancel} className="h-12 rounded-2xl bg-slate-100 px-5 text-sm font-semibold text-slate-700">
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AccountSettingsScreen({
  currentUser,
  accountNameInput,
  accountPhotoUrl,
  themeMode,
  onAccountNameChange,
  onAccountPhotoChange,
  onThemeModeChange,
  onSave,
}: {
  currentUser: User;
  accountNameInput: string;
  accountPhotoUrl: string;
  themeMode: ThemeMode;
  onAccountNameChange: (value: string) => void;
  onAccountPhotoChange: (file: File) => void;
  onThemeModeChange: (value: ThemeMode) => void;
  onSave: () => void;
}) {
  const godMode = currentUser.role === "Master";

  return (
    <div className="space-y-4">
      <section className={["rounded-[1.75rem] px-5 py-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]", themeMode === "dark" ? "bg-slate-900" : "bg-slate-950"].join(" ")}>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Account settings</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{godMode ? "Device settings" : "Manage your profile"}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-300">
          {godMode
            ? "Control the appearance and device-level settings used for platform setup."
            : "Update your display name, profile photo, and appearance for this device."}
        </p>
      </section>

      {!godMode && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
              {accountPhotoUrl ? (
                <img src={accountPhotoUrl} alt={accountNameInput || currentUser.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-slate-500">
                  {(accountNameInput || currentUser.name).slice(0, 1)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{accountNameInput || currentUser.name}</p>
              <p className="text-xs text-slate-500">{getRoleDisplayName(currentUser.role)}</p>
              <label className={`mt-3 inline-flex h-10 cursor-pointer items-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white ${slatePrimaryCtaInteract}`}>
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onAccountPhotoChange(file);
                      event.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Appearance</p>
        <p className="mt-1 text-sm text-slate-500">Choose how {companyName} looks on this tablet.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["light", "dark"] as ThemeMode[]).map((mode) => {
            const selected = themeMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onThemeModeChange(mode)}
                className={[
                  "rounded-[1.5rem] border px-4 py-4 text-left transition",
                  selected
                    ? `border-slate-900 bg-slate-900 text-white shadow-[0_16px_28px_rgba(15,23,42,0.18)] ${slatePrimaryCtaInteract}`
                    : "border-slate-200 bg-slate-50 text-slate-700",
                ].join(" ")}
              >
                <p className="text-sm font-semibold">{mode === "light" ? "Light mode" : "Dark mode"}</p>
                <p className={["mt-1 text-xs leading-5", selected ? "text-slate-300" : "text-slate-500"].join(" ")}>
                  {mode === "light" ? "Bright interface for daylight and clean demos." : "Lower-glare interface for darker settings and a sharper look."}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {!godMode && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-slate-700">Display name</label>
          <input
            value={accountNameInput}
            onChange={(event) => onAccountNameChange(event.target.value)}
            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            placeholder="Enter your name"
          />
          <button
            onClick={onSave}
            className={`mt-4 h-12 w-full rounded-2xl bg-slate-900 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}
          >
            Save account settings
          </button>
        </section>
      )}
    </div>
  );
}

function EvidencePickerButtons({
  onFiles,
  compact = false,
}: {
  onFiles: (files: FileList) => void;
  compact?: boolean;
}) {
  const inputClass = compact
    ? "h-10 max-w-[14rem] rounded-xl border border-slate-300 bg-white px-2 text-xs text-slate-700"
    : "h-11 max-w-[18rem] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700";

  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="file"
        accept="image/*"
        className={inputClass}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function AuditModeScreen({
  audit,
  responses,
  notes,
  evidence,
  evidenceDebugLabel,
  questionIndex,
  offlineMode,
  pendingSyncCount,
  failedSyncCount,
  onAnswerSelect,
  onJumpToQuestion,
  onNoteChange,
  onAddEvidence,
  onComplete,
  onSaveAndExit,
}: {
  audit: Audit;
  responses: Record<string, Answer>;
  notes: Record<string, string>;
  evidence: Record<string, EvidenceItem[]>;
  evidenceDebugLabel: string;
  questionIndex: number;
  offlineMode: boolean;
  pendingSyncCount: number;
  failedSyncCount: number;
  onAnswerSelect: (question: AuditQuestion, answer: Answer) => void;
  onJumpToQuestion: (index: number) => void;
  onNoteChange: (questionId: string, value: string) => void;
  onAddEvidence: (questionId: string, files: FileList) => void;
  onComplete: () => void;
  onSaveAndExit: () => void;
}) {
  const noteInputRef = useRef<HTMLTextAreaElement | null>(null);
  if (audit.questions.length === 0) {
    return (
      <div className="space-y-4">
        <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Audit mode</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{audit.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{getDueWarning(audit.dueHours)}</p>
        </section>
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-base font-semibold text-slate-900">No questions are available for this audit.</p>
          <p className="mt-1 text-sm text-slate-500">Save and exit to return to your dashboard.</p>
          <button type="button" onClick={onSaveAndExit} className="mt-4 h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
            Save &amp; exit
          </button>
        </section>
      </div>
    );
  }
  const safeIndex = Math.max(0, Math.min(questionIndex, audit.questions.length - 1));
  const currentQuestion = audit.questions[safeIndex];
  const answeredCount = audit.questions.filter((question) => Boolean(responses[question.id])).length;
  const syncBadgeClass =
    failedSyncCount > 0 ? "bg-rose-100 text-rose-700" : pendingSyncCount > 0 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-800";
  const syncLabel = failedSyncCount > 0 ? "Sync failed" : pendingSyncCount > 0 ? `${pendingSyncCount} pending sync` : "Synced";
  const options: Answer[] = currentQuestion.fieldType === "Traffic light" ? ["pass", "nc", "fail"] : ["pass", "fail", "nc"];

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Audit mode</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{audit.name}</h2>
            <p className="mt-1 text-sm text-slate-300">{getDueWarning(audit.dueHours)}</p>
          </div>
          <StatusBadge status={getAuditTrafficStatus(audit.dueHours)} dark />
        </div>
        <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
          <p className="text-sm font-semibold">Question {safeIndex + 1} of {audit.questions.length}</p>
          <div className="mt-2 h-2 rounded-full bg-white/15">
            <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${(answeredCount / audit.questions.length) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-300">{answeredCount} answered</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{currentQuestion.riskLevel || "Medium"} risk</p>
        <p className="mt-2 text-xl font-semibold text-slate-900">{currentQuestion.text}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onAnswerSelect(currentQuestion, option)}
              className={[
                "h-16 rounded-2xl border text-lg font-semibold",
                responses[currentQuestion.id] === option ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-900",
              ].join(" ")}
            >
              {option === "pass" ? "Pass" : option === "nc" ? "No Conformance" : "Fail"}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => noteInputRef.current?.focus()}
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            Add note
          </button>
          <label className={`inline-flex h-11 cursor-pointer items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
            Upload photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) {
                  onAddEvidence(currentQuestion.id, event.target.files);
                  event.target.value = "";
                }
              }}
            />
          </label>
          <input
            type="file"
            accept="image/*"
            className="h-11 max-w-[16rem] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
            onChange={(event) => {
              if (event.target.files?.length) {
                onAddEvidence(currentQuestion.id, event.target.files);
                event.target.value = "";
              }
            }}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <textarea
            ref={noteInputRef}
            value={notes[currentQuestion.id] || ""}
            onChange={(event) => onNoteChange(currentQuestion.id, event.target.value)}
            placeholder="Add note"
            className="min-h-[7rem] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none"
          />
          <div className="flex min-h-[7rem] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4">
            <label className={`inline-flex h-11 cursor-pointer items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) {
                    onAddEvidence(currentQuestion.id, event.target.files);
                    event.target.value = "";
                  }
                }}
              />
            </label>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{evidence[currentQuestion.id]?.length || 0} photo(s) attached</p>
        {evidenceDebugLabel && <p className="mt-1 text-xs text-sky-700">{evidenceDebugLabel}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onSaveAndExit} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
            Save &amp; exit
          </button>
          <button
            type="button"
            onClick={() => {
              if (safeIndex === audit.questions.length - 1) onComplete();
              else onJumpToQuestion(safeIndex + 1);
            }}
            className={`h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}
          >
            {safeIndex === audit.questions.length - 1 ? "Complete audit" : "Next question"}
          </button>
          <div className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${syncBadgeClass}`}>{syncLabel}</div>
        </div>
        {offlineMode && <p className="mt-3 text-sm font-medium text-amber-700">Saved on this tablet. It will sync when online.</p>}
      </section>
    </div>
  );
}

function IssueFoundPrompt({
  issue,
  existingNote,
  evidenceCount,
  assignedToName,
  offlineMode,
  onAddPhoto,
  onSave,
  onCancel,
}: {
  issue: IssuePromptState;
  existingNote: string;
  evidenceCount: number;
  assignedToName: string;
  offlineMode: boolean;
  onAddPhoto: (files: FileList) => void;
  onSave: ({ noteValue, escalate }: { noteValue: string; escalate?: boolean }) => void;
  onCancel: () => void;
}) {
  const [noteValue, setNoteValue] = useState(existingNote);
  const severity = issue.question.riskLevel || (issue.answer === "fail" ? "Critical" : "High");
  const requiresPhoto = Boolean(issue.question.requiresPhotoEvidence);
  const willCreateAction =
    issue.question.autoActionRequired ||
    severity === "Critical" ||
    severity === "High" ||
    issue.answer === "fail";
  const actionTitle = `Resolve failed check: ${issue.question.text}`;
  const actionDueDate = addDaysIso(ACTION_DUE_DAYS_BY_SEVERITY[severity]);

  useEffect(() => {
    setNoteValue(existingNote);
  }, [existingNote, issue.question.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-3">
      <div className="w-full rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Issue found</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{issue.question.text}</p>
        <p className="mt-1 text-xs text-slate-500">Answer: {issue.answer.toUpperCase()} • Risk: {severity}</p>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p>Photo evidence: {requiresPhoto ? "Required" : "Optional but encouraged"}</p>
          <p>Corrective action: {willCreateAction ? "Will be created" : "Not required"}</p>
        </div>
        {willCreateAction && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <p className="font-semibold">Corrective action preview</p>
            <p className="mt-1">Title: {actionTitle}</p>
            <p>Severity: {severity}</p>
            <p>Due date: {actionDueDate}</p>
            <p>Assigned to: {assignedToName || "Unassigned"}</p>
          </div>
        )}
        <textarea
          value={noteValue}
          onChange={(event) => setNoteValue(event.target.value)}
          placeholder="Describe what was found"
          className="mt-3 min-h-[7rem] w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none"
        />
        <div className="mt-3 flex items-center gap-2">
          <label className={`inline-flex h-11 cursor-pointer items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
            Add photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) {
                  onAddPhoto(event.target.files);
                  event.target.value = "";
                }
              }}
            />
          </label>
          <p className="text-xs text-slate-500">{evidenceCount} photo(s) attached</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onSave({ noteValue, escalate: false })} className={`h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
            Save issue and continue
          </button>
          <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
            Change answer
          </button>
        </div>
        {offlineMode && <p className="mt-3 text-xs font-medium text-amber-700">Saved on this tablet. It will sync when online.</p>}
      </div>
    </div>
  );
}

function AuditCompletionSummary({
  summary,
  hasMoreAudits,
  onStartNext,
  onReturnDashboard,
}: {
  summary: AuditCompletionSummaryState;
  hasMoreAudits: boolean;
  onStartNext: () => void;
  onReturnDashboard: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Audit complete</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{summary.auditName}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <MiniMetric label="Answered" value={String(summary.questionsAnswered)} />
          <MiniMetric label="Issues" value={String(summary.issuesFound)} />
          <MiniMetric label="Actions" value={String(summary.actionsCreated)} />
          <MiniMetric label="Photos" value={String(summary.photosCaptured)} />
          <MiniMetric label="Sync" value={summary.syncLabel} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onStartNext} className={`h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
            {hasMoreAudits ? "Start next audit" : "All audits complete"}
          </button>
          <button type="button" onClick={onReturnDashboard} className="h-12 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700">
            Return to dashboard
          </button>
        </div>
      </section>
    </div>
  );
}

function CompleteAuditScreen({
  audit,
  responses,
  notes,
  evidence,
  signatureDataUrl,
  signatureSignedAt,
  offlineMode,
  savedAt,
  canSubmit,
  onSelect,
  onNoteChange,
  onAddEvidence,
  onRemoveEvidence,
  onSignatureChange,
  onSaveDraft,
  onSubmit,
  onCancel,
}: {
  audit: Audit;
  responses: Record<string, Answer>;
  notes: Record<string, string>;
  evidence: Record<string, EvidenceItem[]>;
  signatureDataUrl: string;
  signatureSignedAt: string;
  offlineMode: boolean;
  savedAt: string | null;
  canSubmit: boolean;
  onSelect: (questionId: string, answer: Answer) => void;
  onNoteChange: (questionId: string, value: string) => void;
  onAddEvidence: (questionId: string, files: FileList) => void;
  onRemoveEvidence: (questionId: string, evidenceId: string) => void;
  onSignatureChange: (dataUrl: string) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const answered = audit.questions.filter((question) => responses[question.id]).length;
  const evidenceTotal = audit.questions.reduce((total, question) => total + (evidence[question.id]?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{audit.category}</p>
            <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight">{audit.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                <AppIcon name="clipboard" className="h-3.5 w-3.5" />
                {audit.siteArea}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                <AppIcon name="user" className="h-3.5 w-3.5" />
                {audit.owner}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                <AppIcon name="spark" className="h-3.5 w-3.5" />
                {audit.templateVersion}
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-200">{getDueWarning(audit.dueHours)}</p>
          </div>
          <StatusBadge status={getAuditTrafficStatus(audit.dueHours)} dark />
        </div>
        <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
          <p className="text-xs text-slate-300">Progress</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="h-2 flex-1 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${(answered / audit.questions.length) * 100}%` }} />
            </div>
            <p className="ml-3 text-sm font-semibold">
              {answered}/{audit.questions.length}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            {evidenceTotal} evidence item{evidenceTotal === 1 ? "" : "s"} attached
          </p>
          {offlineMode && <p className="mt-2 text-xs font-semibold text-amber-300">Offline mode active. Submission will queue until the device reconnects.</p>}
          {savedAt && <p className="mt-2 text-xs text-slate-300">Last saved {savedAt}</p>}
        </div>
      </section>

      <section className="space-y-3">
        {audit.questions.map((question, index) => {
          const current = responses[question.id];
          const questionEvidence = evidence[question.id] ?? [];
          return (
            <div key={question.id} className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Question {index + 1}</p>
                <div className="flex flex-wrap gap-2">
                  <MetaPill icon="note" label={notes[question.id] ? "Notes added" : "No notes"} />
                  <MetaPill icon="camera" label={`${questionEvidence.length} photos`} />
                </div>
              </div>
              <p className="mt-3 text-[15px] font-semibold leading-6 text-slate-900">{question.text}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <AnswerButton label="Pass" selected={current === "pass"} tone="green" onClick={() => onSelect(question.id, "pass")} />
                <AnswerButton
                  label="No Conformance"
                  selected={current === "nc"}
                  tone="amber"
                  onClick={() => onSelect(question.id, "nc")}
                />
                <AnswerButton label="Fail" selected={current === "fail"} tone="red" onClick={() => onSelect(question.id, "fail")} />
              </div>
              <textarea
                value={notes[question.id] ?? ""}
                onChange={(event) => onNoteChange(question.id, event.target.value)}
                placeholder="Add notes or evidence summary"
                className="mt-3 min-h-[4.75rem] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
              <div className="mt-3 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Photo evidence</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Capture live photos or choose files from the device.
                    </p>
                  </div>
                  <EvidencePickerButtons compact onFiles={(files) => onAddEvidence(question.id, files)} />
                </div>
                {questionEvidence.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {questionEvidence.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                        <img src={item.previewUrl} alt={item.name} className="h-24 w-full object-cover" />
                        <div className="p-2">
                          <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{item.addedAt}</p>
                          <button
                            onClick={() => onRemoveEvidence(question.id, item.id)}
                            className="mt-2 text-[11px] font-semibold text-rose-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
        <SectionHeader
          icon="check"
          eyebrow="Final approval"
          title="Inspector sign-off"
          subtitle="Add a signature before submitting this audit."
        />
        <div className="mt-4">
          <SignaturePad value={signatureDataUrl} onChange={onSignatureChange} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {signatureDataUrl ? `Signed ${signatureSignedAt}` : "No signature captured yet"}
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <button onClick={onCancel} className="h-14 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
          Cancel
        </button>
        <button onClick={onSaveDraft} className="h-14 rounded-2xl bg-slate-200 text-sm font-semibold text-slate-800">
          Save draft
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={[
            "h-14 rounded-2xl text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition",
            canSubmit ? `bg-slate-900 active:scale-[0.99] ${slatePrimaryCtaInteract}` : "bg-slate-300",
          ].join(" ")}
        >
          Submit
        </button>
      </section>
    </div>
  );
}

function AdminScreen({
  currentUser,
  googleConnected,
  backendConfigured,
  sharedDriveId,
  googleStatusLoading,
  folderInspection,
  folderInspectionLoading,
  onboardingSource,
  onboardingRecords,
  onboardingRecordsLoading,
  selectedOnboardingRecordId,
  folders,
  selectedFolder,
  schedules,
  inviteEmailInput,
  inviteRoleInput,
  invitedUsers,
  sites,
  selectedSiteId,
  reportUsers,
  userSiteAssignments,
  onToggleUserSiteAssignment,
  creatableRoles,
  notificationsEnabled,
  companySheetSync,
  workspaceValidation,
  workspaceValidationLoading,
  templates,
  folderNameInput,
  folderIdInput,
  auditFormsFolderInput,
  masterSheetInput,
  evidenceFolderInput,
  healthSafetyFolderInput,
  exportsFolderInput,
  adminNotesFolderInput,
  templateNameInput,
  templateQuestionInput,
  templateQuestionTypeInput,
  templateDraftQuestions,
  syncState,
  scheduleNameInput,
  scheduleAreaInput,
  scheduleOwnerInput,
  scheduleScopeInput,
  schedulePersonalAssigneeInput,
  scheduleFrequencyInput,
  scheduleSendTimeInput,
  scheduleRecipientsInput,
  scheduleOverdueAlertRecipientsInput,
  scheduleEscalationContactInput,
  scheduleOverdueAlertTimingInput,
  scheduleCompletionCheckTimingInput,
  scheduleNextDueHoursInput,
  schedulePriorityInput,
  onGoogleConnect,
  onGoogleDisconnect,
  onRequestNotifications,
  onValidateWorkspace,
  onRepairWorkspace,
  onRefreshGoogleStatus,
  onRefreshOnboardingRecords,
  onSelectOnboardingRecord,
  onApplyOnboardingRecord,
  onFolderNameChange,
  onFolderIdChange,
  onAuditFormsFolderChange,
  onMasterSheetChange,
  onEvidenceFolderChange,
  onHealthSafetyFolderChange,
  onExportsFolderChange,
  onAdminNotesFolderChange,
  onScheduleNameChange,
  onScheduleAreaChange,
  onScheduleOwnerChange,
  onScheduleScopeChange,
  onSchedulePersonalAssigneeChange,
  onScheduleFrequencyChange,
  onScheduleSendTimeChange,
  onScheduleRecipientsChange,
  onScheduleOverdueAlertRecipientsChange,
  onScheduleEscalationContactChange,
  onScheduleOverdueAlertTimingChange,
  onScheduleCompletionCheckTimingChange,
  onScheduleNextDueHoursChange,
  onSchedulePriorityChange,
  onOpenOnboardingForm,
  onStartCompanyOnboarding,
  onAddFolder,
  onOneClickGoogleOnboarding,
  onTemplateNameChange,
  onTemplateQuestionChange,
  onTemplateQuestionTypeChange,
  onAddTemplateQuestion,
  onRemoveTemplateQuestion,
  onAddAnswerPromptToDraftQuestion,
  onRemoveAnswerPromptFromDraftQuestion,
  onAddTemplate,
  onToggleTemplate,
  onAddSchedule,
  onSelectFolder,
  onVerifyOnboarding,
  onVerifyAudits,
  onVerifyResponseSheet,
  onSyncForms,
  onLoadDemoData,
  onClearDemoData,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteUser,
  onResendInvite,
  onDeleteInvite,
  onResyncUsers,
  onSelectSite,
  onAddSite,
  onArchiveSite,
  standaloneOnboarding = false,
  hideMasterLocalDemoTools = false,
  godModeAppInviteEmail,
  onGodModeAppInviteEmailChange,
  onSendGodModeAppCompanyInvite,
}: {
  currentUser: User;
  googleConnected: boolean;
  backendConfigured: boolean;
  sharedDriveId: string;
  googleStatusLoading: boolean;
  folderInspection: FolderInspection | null;
  folderInspectionLoading: boolean;
  onboardingSource: OnboardingSource | null;
  onboardingRecords: OnboardingRecord[];
  onboardingRecordsLoading: boolean;
  selectedOnboardingRecordId: string;
  folders: CompanyFolder[];
  selectedFolder: CompanyFolder | null;
  schedules: ScheduleItem[];
  inviteEmailInput: string;
  inviteRoleInput: Role;
  invitedUsers: UserInvite[];
  sites: Site[];
  selectedSiteId: string;
  reportUsers: CompanyReportUser[];
  userSiteAssignments: UserSiteAssignments;
  onToggleUserSiteAssignment: (email: string, siteId: string) => void;
  creatableRoles: Role[];
  notificationsEnabled: boolean;
  companySheetSync: CompanySheetSyncStatus | null;
  workspaceValidation: WorkspaceValidation | null;
  workspaceValidationLoading: boolean;
  templates: AuditTemplate[];
  folderNameInput: string;
  folderIdInput: string;
  auditFormsFolderInput: string;
  masterSheetInput: string;
  evidenceFolderInput: string;
  healthSafetyFolderInput: string;
  exportsFolderInput: string;
  adminNotesFolderInput: string;
  templateNameInput: string;
  templateQuestionInput: string;
  templateQuestionTypeInput: AuditQuestion["fieldType"];
  templateDraftQuestions: DraftTemplateQuestion[];
  syncState: string;
  scheduleNameInput: string;
  scheduleAreaInput: string;
  scheduleOwnerInput: string;
  scheduleScopeInput: ScheduleScope;
  schedulePersonalAssigneeInput: string;
  scheduleFrequencyInput: ScheduleFrequency;
  scheduleSendTimeInput: string;
  scheduleRecipientsInput: string;
  scheduleOverdueAlertRecipientsInput: string;
  scheduleEscalationContactInput: string;
  scheduleOverdueAlertTimingInput: OverdueAlertTiming;
  scheduleCompletionCheckTimingInput: CompletionCheckTiming;
  scheduleNextDueHoursInput: string;
  schedulePriorityInput: Priority;
  onGoogleConnect: () => void;
  onGoogleDisconnect: () => void;
  onRequestNotifications: () => void;
  onValidateWorkspace: () => void;
  onRepairWorkspace: () => void;
  onRefreshGoogleStatus: () => void;
  onRefreshOnboardingRecords: () => void;
  onSelectOnboardingRecord: (recordId: string) => void;
  onApplyOnboardingRecord: () => void;
  onFolderNameChange: (value: string) => void;
  onFolderIdChange: (value: string) => void;
  onAuditFormsFolderChange: (value: string) => void;
  onMasterSheetChange: (value: string) => void;
  onEvidenceFolderChange: (value: string) => void;
  onHealthSafetyFolderChange: (value: string) => void;
  onExportsFolderChange: (value: string) => void;
  onAdminNotesFolderChange: (value: string) => void;
  onScheduleNameChange: (value: string) => void;
  onScheduleAreaChange: (value: string) => void;
  onScheduleOwnerChange: (value: string) => void;
  onScheduleScopeChange: (value: ScheduleScope) => void;
  onSchedulePersonalAssigneeChange: (value: string) => void;
  onScheduleFrequencyChange: (value: ScheduleFrequency) => void;
  onScheduleSendTimeChange: (value: string) => void;
  onScheduleRecipientsChange: (value: string) => void;
  onScheduleOverdueAlertRecipientsChange: (value: string) => void;
  onScheduleEscalationContactChange: (value: string) => void;
  onScheduleOverdueAlertTimingChange: (value: OverdueAlertTiming) => void;
  onScheduleCompletionCheckTimingChange: (value: CompletionCheckTiming) => void;
  onScheduleNextDueHoursChange: (value: string) => void;
  onSchedulePriorityChange: (value: Priority) => void;
  onOpenOnboardingForm: () => void;
  onStartCompanyOnboarding: () => void;
  onAddFolder: () => void;
  onOneClickGoogleOnboarding: () => void;
  onTemplateNameChange: (value: string) => void;
  onTemplateQuestionChange: (value: string) => void;
  onTemplateQuestionTypeChange: (value: AuditQuestion["fieldType"]) => void;
  onAddTemplateQuestion: () => void;
  onRemoveTemplateQuestion: (questionId: string) => void;
  onAddAnswerPromptToDraftQuestion: (questionId: string, answer: Answer) => void;
  onRemoveAnswerPromptFromDraftQuestion: (questionId: string, answer: Answer, promptIndex: number) => void;
  onAddTemplate: () => void;
  onToggleTemplate: (templateId: string) => void;
  onAddSchedule: () => void;
  onSelectFolder: (folderId: string) => void;
  onVerifyOnboarding: () => void;
  onVerifyAudits: () => void;
  onVerifyResponseSheet: () => void;
  onSyncForms: () => void;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: Role) => void;
  onInviteUser: () => void;
  onResendInvite: (invite: UserInvite) => void;
  onDeleteInvite: (invite: UserInvite) => void;
  onResyncUsers: () => void;
  onSelectSite: (siteId: string) => void;
  onAddSite: () => void;
  onArchiveSite: (siteId: string) => void;
  standaloneOnboarding?: boolean;
  hideMasterLocalDemoTools?: boolean;
  godModeAppInviteEmail: string;
  onGodModeAppInviteEmailChange: (value: string) => void;
  onSendGodModeAppCompanyInvite: () => void;
}) {
  const adminOnly = !canAccessAdmin(currentUser.role);
  const masterOnly = currentUser.role !== "Master";
  const godModeFirstUserInvite =
    currentUser.role === "Master" &&
    (companySheetSync?.usersCount ?? 0) === 0 &&
    invitedUsers.length === 0;
  const [adminView, setAdminView] = useState<"overview" | "onboarding">(standaloneOnboarding ? "onboarding" : "overview");
  const [showAdvancedOnboardingActions, setShowAdvancedOnboardingActions] = useState(false);
  const [pendingAdminScrollTarget, setPendingAdminScrollTarget] = useState<string | null>(null);
  const onboardingMode =
    standaloneOnboarding || (canAccessAdminOnboardingWorkspace(currentUser.role) && adminView === "onboarding");
  const godModeFullVisibility = currentUser.role === "Master";
  useEffect(() => {
    if (!pendingAdminScrollTarget) {
      return;
    }
    const targetElement = document.getElementById(pendingAdminScrollTarget);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingAdminScrollTarget(null);
    }
  }, [pendingAdminScrollTarget, onboardingMode, adminView, godModeFullVisibility]);

  return (
    <div className="space-y-4">
      {(!onboardingMode || godModeFullVisibility) && currentUser.role !== "Master" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Workspace control</h2>
            <p className="mt-1 text-sm text-slate-500">Tools and configuration based on your access level.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Online
            </div>
            <div className="rounded-full bg-fuchsia-100 px-2.5 py-1 text-xs font-semibold text-fuchsia-700">{getRoleDisplayName(currentUser.role)}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { key: "onboarding", targetId: "admin-user-management", icon: "user", title: "User Management", subtitle: "Invite users and manage roles" },
            { key: "overview", targetId: "admin-audit-templates", icon: "checklist", title: "Audit Templates", subtitle: "Build and manage audit form templates" },
            { key: "onboarding", targetId: "admin-maintenance", icon: "sync", title: "Maintenance", subtitle: "Sync queue tools, data export, and reset" },
          ].map((card) => (
            <button
              key={card.title}
              onClick={() => {
                setAdminView(card.key === "onboarding" ? "onboarding" : "overview");
                setPendingAdminScrollTarget(card.targetId);
              }}
              className="flex min-h-[76px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                  <AppIcon name={card.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{card.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{card.subtitle}</p>
                </span>
              </div>
              <span className="ml-3 text-sm text-slate-400">{">"}</span>
            </button>
          ))}
        </div>
        {currentUser.role === "Admin" && (
          <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/80 p-3">
            <button
              type="button"
              onClick={onLoadDemoData}
              className="h-11 rounded-xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-900 shadow-sm"
            >
              Load Demo Data
            </button>
            <button
              type="button"
              onClick={onClearDemoData}
              className="ml-2 h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm"
            >
              Clear Demo Data
            </button>
            <p className="mt-2 text-xs text-slate-600">
              Inserts realistic precast H&amp;S sample audits, CAPAs, and sync items in this tablet only — it does not write to linked Google Sheets.
            </p>
          </div>
        )}
        </section>
      )}

      {currentUser.role === "Master" && !hideMasterLocalDemoTools && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm">
          <p className="text-sm font-semibold text-sky-950">Local review data</p>
          <p className="mt-1 text-xs text-sky-900/85">Optional sample payloads for demos — stored on this device only; does not write to linked Google Sheets.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onLoadDemoData}
              className="h-11 rounded-xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-900 shadow-sm"
            >
              Load Demo Data
            </button>
            <button
              type="button"
              onClick={onClearDemoData}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm"
            >
              Clear Demo Data
            </button>
          </div>
        </section>
      )}

      {masterOnly && currentUser.role !== "Admin" && (
        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.24)]">
          <SectionHeader
            icon="shield"
            eyebrow="Platform control"
            title="Platform setup only"
            subtitle="Company provisioning, Google connection, and live app population are restricted to the platform setup account."
          />
          <div className="rounded-[1.5rem] bg-slate-900 p-4">
            <p className="text-sm font-semibold text-white">This workspace is managed centrally</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Google connection, company folder linking, and app population are only available from the platform setup account.
            </p>
          </div>
        </section>
      )}

      {!masterOnly && (
        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.24)]">
          <SectionHeader
            icon="spark"
            eyebrow="New tenant"
            title="Invite new company (app onboarding)"
            subtitle="Send a secure in-app link — the recipient creates the Drive workspace and their Admin account."
          />
          <div className="rounded-[1.5rem] bg-slate-900 p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Administrator email</label>
            <input
              value={godModeAppInviteEmail}
              onChange={(event) => onGodModeAppInviteEmailChange(event.target.value)}
              placeholder="admin@newcompany.com"
              className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-sky-400"
            />
            <button
              type="button"
              onClick={onSendGodModeAppCompanyInvite}
              className={`mt-3 h-11 w-full rounded-2xl bg-slate-100 text-sm font-semibold text-slate-900 ${slatePrimaryCtaInteract}`}
            >
              Send app onboarding link
            </button>
          </div>
        </section>
      )}

      {currentUser.role === "Master" && (onboardingMode || godModeFullVisibility) && (
        <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
          {!standaloneOnboarding && (
            <div className="mb-3">
              <button
                onClick={() => setAdminView("overview")}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                Back to admin overview
              </button>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
              <AppIcon name="shield" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Company setup onboarding</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Onboard new company workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Complete the platform setup steps below to connect Google Drive, link the company folder, and make the app live.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <MiniPill label={backendConfigured ? "Platform ready" : "Platform setup needed"} active={backendConfigured} />
            <MiniPill label={googleConnected ? "Google Drive connected" : "Google Drive not connected"} active={googleConnected} />
            <MiniPill
              label={selectedFolder ? `${selectedFolder.name} linked` : "Company folder not linked"}
              active={Boolean(selectedFolder)}
            />
            <MiniPill label={syncState === "Synced" ? "App live" : "App not live"} active={syncState === "Synced"} />
          </div>
          <div className="mt-5 rounded-[1.5rem] bg-white/6 p-4">
            <p className="text-sm font-semibold text-white">Onboarding status</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              {!backendConfigured
                ? "The platform backend needs to be configured before Google Drive can be connected."
                : !googleConnected
                  ? "Step 1: connect the God Mode account to Google Drive."
                  : !selectedFolder
                    ? "Step 2: paste the company Google Drive links below."
                    : syncState !== "Synced"
                      ? `Step 3: populate the app using ${selectedFolder.name}.`
                      : `${selectedFolder.name} is linked and the app is live.`}
            </p>
            {selectedFolder && <p className="mt-2 break-all text-xs text-slate-400">{selectedFolder.id}</p>}
            {googleConnected && (
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Company folder link or ID
                  </label>
                  <input
                    value={folderIdInput}
                    onChange={(event) => onFolderIdChange(event.target.value)}
                    placeholder="Paste the company folder link or ID"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/20 px-4 text-sm text-white outline-none transition focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Company master sheet link or ID
                  </label>
                  <input
                    value={masterSheetInput}
                    onChange={(event) => onMasterSheetChange(event.target.value)}
                    placeholder="Paste the company master sheet link or ID"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/20 px-4 text-sm text-white outline-none transition focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Audit forms folder link or ID
                  </label>
                  <input
                    value={auditFormsFolderInput}
                    onChange={(event) => onAuditFormsFolderChange(event.target.value)}
                    placeholder="Paste the audit forms folder link or ID"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/20 px-4 text-sm text-white outline-none transition focus:border-white/30"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Evidence folder
                    </label>
                    <input
                      value={evidenceFolderInput}
                      onChange={(event) => onEvidenceFolderChange(event.target.value)}
                      placeholder="Optional"
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/20 px-4 text-sm text-white outline-none transition focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Health &amp; Safety folder
                    </label>
                    <input
                      value={healthSafetyFolderInput}
                      onChange={(event) => onHealthSafetyFolderChange(event.target.value)}
                      placeholder="Recommended for incident reporting"
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/20 px-4 text-sm text-white outline-none transition focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Exports folder
                    </label>
                    <input
                      value={exportsFolderInput}
                      onChange={(event) => onExportsFolderChange(event.target.value)}
                      placeholder="Optional"
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/20 px-4 text-sm text-white outline-none transition focus:border-white/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Admin notes folder
                  </label>
                  <input
                    value={adminNotesFolderInput}
                    onChange={(event) => onAdminNotesFolderChange(event.target.value)}
                    placeholder="Optional"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/20 px-4 text-sm text-white outline-none transition focus:border-white/30"
                  />
                </div>
              </div>
            )}
            <div className="mt-4 space-y-3">
              <button
                onClick={onOneClickGoogleOnboarding}
                disabled={adminOnly || !backendConfigured || folderInspectionLoading}
                className={[
                  "h-12 rounded-2xl px-5 text-sm font-semibold transition",
                  adminOnly || !backendConfigured || folderInspectionLoading
                    ? "bg-white/10 text-slate-400"
                    : "bg-sky-300 text-slate-900 shadow-[0_14px_28px_rgba(14,165,233,0.25)] active:scale-[0.99]",
                ].join(" ")}
              >
                Run onboarding (one click)
              </button>
              <div className="flex flex-wrap items-center gap-3">
                {googleConnected && (
                  <button
                    onClick={onGoogleDisconnect}
                    disabled={adminOnly}
                    className={[
                      "h-11 rounded-2xl px-4 text-sm font-semibold transition",
                      adminOnly
                        ? "bg-white/10 text-slate-400"
                        : "border border-white/20 bg-transparent text-white hover:bg-white/10",
                    ].join(" ")}
                  >
                    Disconnect Google
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAdvancedOnboardingActions((current) => !current)}
                  className="h-11 rounded-2xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {showAdvancedOnboardingActions ? "Hide advanced" : "Show advanced"}
                </button>
              </div>
              {showAdvancedOnboardingActions && (
                <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                  <button
                    onClick={!googleConnected ? onGoogleConnect : onAddFolder}
                    disabled={adminOnly || !backendConfigured || googleStatusLoading}
                    className={[
                      "h-12 rounded-2xl px-5 text-sm font-semibold transition",
                      adminOnly || !backendConfigured || googleStatusLoading
                        ? "bg-white/10 text-slate-400"
                        : "bg-white text-slate-900 shadow-[0_14px_28px_rgba(15,23,42,0.18)] active:scale-[0.99]",
                    ].join(" ")}
                  >
                    {googleStatusLoading
                      ? "Checking Google Drive..."
                      : !googleConnected
                        ? "Connect Google Drive"
                        : "Start onboarding setup"}
                  </button>
                  {selectedFolder && (
                    <a
                      href={`https://drive.google.com/drive/folders/${selectedFolder.id}`}
                      className="inline-flex h-12 items-center rounded-2xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Open folder in Google Drive
                    </a>
                  )}
                  <button
                    onClick={onSyncForms}
                    disabled={adminOnly || !backendConfigured || !selectedFolder || folderInspectionLoading}
                    className={[
                      "h-12 rounded-2xl px-5 text-sm font-semibold transition",
                      adminOnly || !backendConfigured || !selectedFolder || folderInspectionLoading
                        ? "bg-white/10 text-slate-400"
                        : "bg-orange-500 text-white shadow-[0_14px_28px_rgba(249,115,22,0.35)] active:scale-[0.99]",
                    ].join(" ")}
                  >
                    {folderInspectionLoading
                      ? "Checking links..."
                      : syncState === "Synced"
                        ? "Populate app again"
                        : "Populate app"}
                  </button>
                </div>
              )}
            </div>
            {(folderInspection || selectedFolder) && (
              <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-slate-950/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Company folder check</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {folderInspection
                        ? `Checked ${folderInspection.folder.name}`
                        : selectedFolder
                          ? `Waiting to check ${selectedFolder.name}`
                          : "No company folder checked yet"}
                    </p>
                  </div>
                  {folderInspection && (
                    <div
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        folderInspection.blockingItems.length === 0
                          ? "bg-blue-500/12 text-blue-300"
                          : "bg-amber-500/12 text-amber-300",
                      ].join(" ")}
                    >
                      {folderInspection.blockingItems.length === 0 ? "Ready to populate" : "Blocked"}
                    </div>
                  )}
                </div>

                {folderInspection && (
                  <>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <FolderCheckRow label="Company Master Sheet" ok={folderInspection.checks.masterSheet} />
                      <FolderCheckRow
                        label={folderInspection.checks.auditFormsFolder ? "Audit forms folder" : "Audit forms folder (recommended)"}
                        ok={folderInspection.checks.auditFormsFolder}
                      />
                      <FolderCheckRow
                        label={
                          folderInspection.checks.masterDataFolder || !folderInspection.checks.masterSheet
                            ? "Master sheet link"
                            : "Master sheet link (recommended)"
                        }
                        ok={folderInspection.checks.masterDataFolder || folderInspection.checks.masterSheet}
                      />
                      <FolderCheckRow label="Evidence folder (recommended)" ok={folderInspection.checks.evidenceFolder} />
                      <FolderCheckRow label="Exports folder (recommended)" ok={folderInspection.checks.exportsFolder} />
                      <FolderCheckRow label="Admin notes folder (recommended)" ok={folderInspection.checks.adminNotesFolder} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/6 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Master sheet</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {folderInspection.masterSheet?.name || "Not found"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {folderInspection.masterSheet?.tabs.length
                            ? folderInspection.masterSheet.tabs.join(", ")
                            : "No tabs available"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/6 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Audit forms</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {folderInspection.auditForms.length} form{folderInspection.auditForms.length === 1 ? "" : "s"} found
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {folderInspection.auditForms.length > 0
                            ? folderInspection.auditForms.slice(0, 3).map((item) => item.name).join(", ")
                            : "No audit forms added yet"}
                        </p>
                      </div>
                    </div>

                    {folderInspection.blockingItems.length > 0 && (
                      <div className="mt-4 rounded-2xl bg-amber-500/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Blocking items</p>
                        <p className="mt-2 text-sm text-amber-100">{folderInspection.blockingItems.join(" • ")}</p>
                      </div>
                    )}

                    {folderInspection.recommendedItems.length > 0 && (
                      <div className="mt-4 rounded-2xl bg-slate-900/30 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Recommended structure</p>
                        <p className="mt-2 text-sm text-slate-200">{folderInspection.recommendedItems.join(" • ")}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {onboardingMode && (
        <>
          <section id="admin-user-management" className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {currentUser.role === "Master" ? "Platform control" : "Company admin"}
                </p>
                <h3 className="mt-1 text-base font-semibold text-white">Company setup</h3>
                <p className="text-sm text-slate-300">
                  Use this section for one-time company provisioning before inviting users.
                </p>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-slate-700">
                {syncState === "Synced" ? "Company live" : "Setup in progress"}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Step 1</p>
                <p className="mt-1 text-sm font-semibold text-white">Platform & Google</p>
                <p className="mt-1 text-xs text-slate-300">
                  {backendConfigured && googleConnected ? "Connected" : "Connect Google Drive from onboarding controls."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Step 2</p>
                <p className="mt-1 text-sm font-semibold text-white">Link company workspace</p>
                <p className="mt-1 text-xs text-slate-300">
                  {selectedFolder ? `${selectedFolder.name} linked` : "Link the company folder and master sheet."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Step 3</p>
                <p className="mt-1 text-sm font-semibold text-white">Populate app</p>
                <p className="mt-1 text-xs text-slate-300">
                  {syncState === "Synced" ? "App has been populated from company sheet." : "Run onboarding (one click)."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Step 4</p>
                <p className="mt-1 text-sm font-semibold text-white">Validate readiness</p>
                <p className="mt-1 text-xs text-slate-300">
                  {folderInspection?.blockingItems.length ? "Resolve blocking items shown below." : "Ready for user invites."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">User management</h3>
                <p className="text-sm text-slate-300">
                  {currentUser.role === "Master"
                    ? "Platform control can create Admin, Manager, and Auditor users."
                    : currentUser.role === "Admin"
                      ? "Admins can create Admin, Manager, and Auditor users."
                      : "User creation is not available on this account."}
                </p>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-slate-700">
                {getRoleDisplayName(currentUser.role)}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Site access</p>
                    <p className="text-sm text-slate-300">Select a site context or add a new site for this company.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onAddSite}
                    className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-200"
                  >
                    Add site
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onSelectSite("")}
                    className={[
                      "w-full rounded-xl border px-3 py-2 text-left text-sm",
                      selectedSiteId === ""
                        ? "border-[var(--bert-signal-orange)] bg-[rgba(249,115,22,0.14)] text-white"
                        : "border-slate-800 bg-slate-950 text-slate-300",
                    ].join(" ")}
                  >
                    All sites
                  </button>
                  {sites
                    .filter((site) => site.active)
                    .map((site) => (
                      <div key={site.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectSite(site.id)}
                          className={[
                            "flex-1 rounded-xl border px-3 py-2 text-left text-sm",
                            selectedSiteId === site.id
                              ? "border-[var(--bert-signal-orange)] bg-[rgba(249,115,22,0.14)] text-white"
                              : "border-slate-800 bg-slate-950 text-slate-300",
                          ].join(" ")}
                        >
                          {site.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => onArchiveSite(site.id)}
                          className="rounded-xl border border-rose-300 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700"
                        >
                          Archive
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assign users to sites</p>
                <p className="mt-1 text-sm text-slate-300">
                  For Managers and Auditors: leave all boxes unchecked to allow every active site. Check one or more sites to restrict their workspace to only those sites.
                </p>
                <div className="mt-4 space-y-4">
                  {reportUsers
                    .filter((user) => user.role !== "Master")
                    .map((user) => {
                      const assignmentKey = normalizeIdentity(user.email);
                      const assignedIds = userSiteAssignments[assignmentKey] ?? [];
                      const activeSites = sites.filter((site) => site.active);
                      return (
                        <div key={user.email} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{user.email}</p>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{user.role}</span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {activeSites.map((site) => {
                              const checked = assignedIds.includes(site.id);
                              return (
                                <label
                                  key={`${user.email}-${site.id}`}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm text-slate-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => onToggleUserSiteAssignment(user.email, site.id)}
                                    className="h-4 w-4 shrink-0 rounded border-slate-600"
                                  />
                                  <span className="min-w-0 truncate">{site.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-4">
                <div className="grid gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">User email</label>
                    <input
                      value={inviteEmailInput}
                      onChange={(event) => onInviteEmailChange(event.target.value)}
                      placeholder="name@company.com"
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Role to create</label>
                    {godModeFirstUserInvite ? (
                      <div className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-semibold leading-[3rem] text-slate-200">
                        Admin (first company user)
                      </div>
                    ) : (
                      <select
                        value={inviteRoleInput}
                        onChange={(event) => onInviteRoleChange(event.target.value as Role)}
                        className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-sky-400"
                      >
                        {creatableRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {creatableRoles.map((role) => (
                    <MiniPill key={role} label={`Can create ${role}`} active />
                  ))}
                </div>
                <button
                  onClick={onInviteUser}
                  className={`mt-4 h-12 w-full rounded-2xl bg-slate-900 text-sm font-semibold text-white active:scale-[0.99] ${slatePrimaryCtaInteract}`}
                >
                  Send app onboarding link
                </button>
                <button
                  onClick={onResyncUsers}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-200 transition hover:bg-slate-900"
                >
                  Re-sync users from company sheet
                </button>
              </div>

              {invitedUsers.length === 0 ? (
                <EmptyPanel
                  title="No user invites sent yet"
                  text="Use this area to send onboarding links for the roles you are allowed to create."
                />
              ) : (
                <div className="space-y-3">
                  {invitedUsers.slice(0, 5).map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{invite.email}</p>
                        <p className="truncate text-xs text-slate-300">
                          {invite.role} • sent by {invite.invitedBy} • {invite.sentAt}
                        </p>
                        {invite.senderEmail && <p className="truncate text-xs text-slate-300">From {invite.senderEmail}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {invite.appOnboardingUrl && (
                          <a
                            href={invite.appOnboardingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-xl border border-sky-400/50 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 no-underline"
                          >
                            Open link
                          </a>
                        )}
                        {invite.mailtoUrl && (
                          <a href={invite.mailtoUrl} className={`inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white no-underline ${slatePrimaryCtaInteract}`}>
                            Open email
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => onResendInvite(invite)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteInvite(invite)}
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Delete
                        </button>
                        <div className="rounded-full bg-blue-500/12 px-3 py-1 text-xs font-semibold text-blue-800">
                          {invite.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {onboardingMode && (
            <>
              <section id="admin-maintenance" className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader
            icon="spark"
            eyebrow="Live delivery"
            title="Live delivery controls"
            subtitle="Enable browser alerts and keep the company workspace ready for live notifications."
          />
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {notificationsEnabled ? "Browser alerts on" : "Browser alerts off"}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onRequestNotifications}
            className={`h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}
          >
            Enable browser notifications
          </button>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Invite emails use the in-app onboarding page. If SMTP is not configured, use the mail draft or copy the link from the toast.
          </div>
        </div>
              </section>

              <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader
            icon="chart"
            eyebrow="Data sync"
            title="Company sheet sync"
            subtitle="Shows what has been pulled from the company master sheet and whether the live company sync is healthy."
          />
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {companySheetSync ? "Synced" : "Waiting"}
          </div>
        </div>
        {companySheetSync ? (
          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{companySheetSync.sheetName}</p>
              <p className="mt-1 text-xs text-slate-500">Last synced {companySheetSync.lastSyncedAt}</p>
              <p className="mt-2 text-xs text-slate-500">{companySheetSync.tabs.join(", ")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="Users tab rows" value={String(companySheetSync.usersCount)} />
              <MiniMetric label="Schedule rows" value={String(companySheetSync.schedulesCount)} />
              <MiniMetric label="Onboarding rows" value={String(companySheetSync.onboardingCount)} />
              <MiniMetric label="Action rows" value={String(companySheetSync.actionsCount)} />
            </div>
          </div>
        ) : (
          <EmptyPanel
            title="No company sheet data synced yet"
            text="Populate the app from a company folder that contains a Company Master Sheet with Users and Schedule tabs."
          />
        )}
              </section>

              <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader
            icon="shield"
            eyebrow="Workspace health"
            title="Google workspace validator"
            subtitle="Checks tabs, schema version, and connected folders before the live company workspace is relied on in the field."
          />
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {workspaceValidation?.ok ? "Healthy" : "Check needed"}
          </div>
        </div>
        {workspaceValidation ? (
          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Schema version</p>
              <p className="mt-1 text-sm text-slate-500">
                Found {workspaceValidation.schemaVersion || "none"} • app expects {workspaceValidation.currentSchemaVersion}
              </p>
              {workspaceValidation.warnings.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {workspaceValidation.warnings.map((warning) => (
                    <div key={warning} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      {warning}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FolderCheckRow label="Company folder" ok={workspaceValidation.folders.companyFolder} />
              <FolderCheckRow label="Audit forms folder" ok={workspaceValidation.folders.auditFormsFolder} />
              <FolderCheckRow label="Evidence folder" ok={workspaceValidation.folders.evidenceFolder} />
              <FolderCheckRow label="Exports folder" ok={workspaceValidation.folders.exportsFolder} />
              <FolderCheckRow label="Admin notes folder" ok={workspaceValidation.folders.adminNotesFolder} />
              <FolderCheckRow label="Actions tab" ok={workspaceValidation.tabs.Actions} />
            </div>
            {workspaceValidation.missingTabs.length > 0 && (
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-900">Missing tabs</p>
                <p className="mt-2 text-sm text-rose-700">{workspaceValidation.missingTabs.join(", ")}</p>
              </div>
            )}
            {Object.entries(workspaceValidation.missingColumns).some(([, columns]) => columns.length > 0) && (
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Missing columns</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(workspaceValidation.missingColumns)
                    .filter(([, columns]) => columns.length > 0)
                    .map(([tab, columns]) => (
                      <p key={tab} className="text-sm text-amber-700">
                        {tab}: {columns.join(", ")}
                      </p>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyPanel
            title="No validation run yet"
            text="Run a workspace check after linking the company resources to confirm tabs, schema version, and folders are all ready."
          />
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={onValidateWorkspace} className={`h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
            {workspaceValidationLoading ? "Validating..." : "Validate workspace"}
          </button>
          <button onClick={onRepairWorkspace} className="h-12 rounded-2xl bg-blue-50 px-5 text-sm font-semibold text-blue-800">
            Repair / upgrade workspace
          </button>
        </div>
              </section>

              {syncState === "Synced" && selectedFolder && (
                <section className="rounded-[1.75rem] border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-4 shadow-[0_16px_36px_rgba(29,78,216,0.12)]">
          <SectionHeader
            icon="check"
            eyebrow="Go live complete"
            title={`${selectedFolder.name} is now live`}
            subtitle="This company workspace has been linked, checked, and populated from Google Drive."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickActionTile title="Audit forms" value={String(folderInspection?.auditForms.length ?? 0)} caption="Loaded from Drive" />
            <QuickActionTile title="Users" value={String(companySheetSync?.usersCount ?? 0)} caption="Synced from master sheet" />
            <QuickActionTile title="Schedules" value={String(companySheetSync?.schedulesCount ?? 0)} caption="Ready in app" />
          </div>
                </section>
              )}
            </>
          )}

      <section id="admin-audit-templates" className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader
            icon="clipboard"
            eyebrow="Build and activate"
            title="Audit template builder"
            subtitle="Create local templates, activate or pause them, and combine them with Google Drive audit forms."
          />
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {templates.filter((template) => template.active).length} active
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3">
            <input
              value={templateNameInput}
              onChange={(event) => onTemplateNameChange(event.target.value)}
              placeholder="Template name"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            <textarea
              value={templateQuestionInput}
              onChange={(event) => onTemplateQuestionChange(event.target.value)}
              placeholder="Write a question, then add it to the builder"
              className="min-h-[7rem] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            <select
              value={templateQuestionTypeInput}
              onChange={(event) => onTemplateQuestionTypeChange(event.target.value as AuditQuestion["fieldType"])}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="Traffic light">Traffic light</option>
              <option value="Pass / Fail">Pass / Fail</option>
              <option value="Text note">Text note</option>
              <option value="Photo evidence">Photo evidence</option>
            </select>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={onAddTemplateQuestion}
              className="h-12 rounded-2xl bg-slate-200 px-5 text-sm font-semibold text-slate-900"
            >
              Add question
            </button>
            <button
              onClick={onAddTemplate}
              className={`h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}
            >
              Create template
            </button>
          </div>
          {templateDraftQuestions.length > 0 && (
            <div className="mt-4 space-y-2">
              {templateDraftQuestions.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {index + 1}. {question.text}
                      </p>
                      <p className="truncate text-xs text-slate-500">{question.fieldType}</p>
                    </div>
                    <button
                      onClick={() => onRemoveTemplateQuestion(question.id)}
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {(["pass", "nc", "fail"] as Answer[]).map((answer) => (
                      <div key={`${question.id}-${answer}`} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <button
                          type="button"
                          onClick={() => onAddAnswerPromptToDraftQuestion(question.id, answer)}
                          className="w-full rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Do you need a prompt for this answer?
                        </button>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{answer.toUpperCase()}</p>
                        <div className="mt-1 space-y-1">
                          {(question.answerPrompts?.[answer] || []).map((prompt, promptIndex) => (
                            <div key={`${question.id}-${answer}-${promptIndex}`} className="flex items-start justify-between gap-2 rounded-lg bg-white px-2 py-1.5">
                              <p className="text-xs text-slate-700">{prompt}</p>
                              <button
                                type="button"
                                onClick={() => onRemoveAnswerPromptFromDraftQuestion(question.id, answer, promptIndex)}
                                className="text-[10px] font-semibold text-rose-600"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {templates.length === 0 ? (
            <EmptyPanel title="No templates yet" text="Google Drive forms and local templates will appear here once they are available." />
          ) : (
            templates.slice(0, 8).map((template) => (
              <div key={template.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{template.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {template.source} • {template.questions.length} questions
                  </p>
                </div>
                <button
                  onClick={() => onToggleTemplate(template.id)}
                  className={[
                    "rounded-xl px-3 py-2 text-xs font-semibold",
                    template.active ? "bg-blue-500/12 text-blue-800" : "bg-slate-200 text-slate-700",
                  ].join(" ")}
                >
                  {template.active ? "Active" : "Inactive"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

        </>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  tone,
  dark = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: "green" | "amber" | "red";
  dark?: boolean;
}) {
  const toneClasses =
    tone === "green"
      ? dark
        ? "bg-blue-500/20 text-blue-200 ring-blue-400/30"
        : "bg-blue-500/12 text-blue-800 ring-blue-500/20"
      : tone === "red"
        ? dark
          ? "bg-rose-500/20 text-rose-200 ring-rose-400/30"
          : "bg-rose-500/12 text-rose-700 ring-rose-500/20"
        : dark
          ? "bg-amber-500/20 text-amber-200 ring-amber-400/30"
          : "bg-amber-500/12 text-amber-700 ring-amber-500/20";

  return (
    <div className={["rounded-[1.6rem] border p-4 shadow-[0_18px_35px_rgba(15,23,42,0.08)]", dark ? "border-sky-700/70 bg-slate-900" : "border-sky-200/80 bg-white"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>{title}</div>
        <div
          className={[
            "h-10 w-10 rounded-2xl",
            tone === "green" ? (dark ? "bg-blue-500/22" : "bg-blue-500/12") : tone === "red" ? (dark ? "bg-rose-500/22" : "bg-rose-500/12") : (dark ? "bg-amber-500/22" : "bg-amber-500/12"),
          ].join(" ")}
        />
      </div>
      <p className={["mt-4 text-3xl font-semibold tracking-tight", dark ? "text-slate-100" : "text-slate-900"].join(" ")}>{value}</p>
      <p className={["mt-1 text-sm leading-6", dark ? "text-slate-300" : "text-slate-500"].join(" ")}>{subtitle}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon?: string;
  tone?: "slate" | "red" | "amber" | "green" | "sky";
}) {
  const toneClasses: Record<NonNullable<typeof tone>, { shell: string; icon: string; label: string; value: string }> = {
    slate: {
      shell: "border-slate-200 bg-white",
      icon: "text-slate-600",
      label: "text-slate-500",
      value: "text-slate-900",
    },
    red: {
      shell: "border-rose-200 bg-white",
      icon: "text-rose-600",
      label: "text-rose-500",
      value: "text-rose-900",
    },
    amber: {
      shell: "border-amber-200 bg-white",
      icon: "text-amber-600",
      label: "text-amber-600",
      value: "text-amber-900",
    },
    green: {
      shell: "border-blue-200 bg-white",
      icon: "text-blue-700",
      label: "text-blue-700",
      value: "text-blue-950",
    },
    sky: {
      shell: "border-sky-200 bg-white",
      icon: "text-sky-600",
      label: "text-sky-600",
      value: "text-sky-900",
    },
  };
  const classes = toneClasses[tone];
  return (
    <div className={`rounded-[1.5rem] border p-3 ${classes.shell}`}>
      <div className="flex items-center gap-2">
        {icon ? (
          <span className={classes.icon}>
            <AppIcon name={icon} className="h-4 w-4" />
          </span>
        ) : null}
        <p className={`text-[11px] font-semibold leading-tight tracking-[0.08em] ${classes.label}`}>{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${classes.value}`}>{value}</p>
    </div>
  );
}

function QuickActionTile({
  title,
  value,
  caption,
}: {
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[1.45rem] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{caption}</p>
    </div>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white px-4 py-5">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function MiniPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={[
        "rounded-full px-3 py-1 text-xs font-semibold",
        active ? "bg-blue-500/12 text-blue-800" : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

function FolderCheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/6 px-3 py-2">
      <p className="text-sm text-slate-200">{label}</p>
      <div
        className={[
          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
          ok ? "bg-blue-500/12 text-blue-300" : "bg-amber-500/12 text-amber-300",
        ].join(" ")}
      >
        {ok ? "Found" : "Missing"}
      </div>
    </div>
  );
}

function LiveGraphChart({
  data,
  chartType,
}: {
  data: Array<{ label: string; value: number; tone: "green" | "amber" | "red" }>;
  chartType: "column" | "line" | "area" | "bar";
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const toneColor = (tone: "green" | "amber" | "red") => (tone === "green" ? "#10b981" : tone === "amber" ? "#f59e0b" : "#f43f5e");

  if (chartType === "bar") {
    return (
      <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        {data.map((item) => {
          const width = Math.max(8, Math.round((item.value / max) * 100));
          return (
            <div key={`bar-${item.label}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="text-slate-500">{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: toneColor(item.tone) }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const width = 480;
  const height = 180;
  const left = 24;
  const right = 12;
  const top = 12;
  const bottom = 32;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const step = data.length > 1 ? plotW / (data.length - 1) : plotW;
  const points = data.map((item, index) => {
    const x = left + step * index;
    const y = top + (1 - item.value / max) * plotH;
    return { ...item, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${left},${top + plotH} ${linePoints} ${left + plotW},${top + plotH}`;

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
        <line x1={left} y1={top + plotH} x2={left + plotW} y2={top + plotH} stroke="#cbd5e1" strokeWidth="1" />
        {chartType === "column" &&
          points.map((point) => {
            const barW = Math.max(18, plotW / Math.max(data.length * 2, 6));
            return (
              <rect
                key={`col-${point.label}`}
                x={point.x - barW / 2}
                y={point.y}
                width={barW}
                height={top + plotH - point.y}
                rx="4"
                fill={toneColor(point.tone)}
                fillOpacity="0.9"
              />
            );
          })}
        {chartType === "line" && <polyline points={linePoints} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />}
        {chartType === "area" && (
          <>
            <polygon points={areaPoints} fill="#0f172a" fillOpacity="0.16" />
            <polyline points={linePoints} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {(chartType === "line" || chartType === "area") &&
          points.map((point) => <circle key={`dot-${point.label}`} cx={point.x} cy={point.y} r="4" fill={toneColor(point.tone)} />)}
        {points.map((point) => (
          <text key={`lbl-${point.label}`} x={point.x} y={height - 10} textAnchor="middle" fontSize="10" fill="#64748b">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function TrendBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "green" | "amber" | "red";
}) {
  const width = Math.max(8, Math.round((value / total) * 100));
  const toneClass =
    tone === "green" ? "bg-blue-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-slate-500">{value}</p>
      </div>
      <div className="h-3 rounded-full bg-white shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]">
        <div className={`h-3 rounded-full ${toneClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SignaturePad({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = value;
    }
  }, [value]);

  const getPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    drawingRef.current = true;
    const { x, y } = getPosition(event);
    context.beginPath();
    context.moveTo(x, y);
    context.lineWidth = 2;
    context.strokeStyle = "#0f172a";
    context.lineCap = "round";
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const { x, y } = getPosition(event);
    context.lineTo(x, y);
    context.stroke();
    onChange(canvas.toDataURL("image/png"));
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    onChange("");
  };

  return (
    <div className="rounded-[1.4rem] border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="h-36 w-full rounded-2xl bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <div className="mt-3 flex justify-end">
        <button onClick={clear} className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
          Clear signature
        </button>
      </div>
    </div>
  );
}

function TrafficLane({
  title,
  subtitle,
  audits,
  status,
  onOpenAudit,
  expanded = false,
  drafts = {},
  unsyncedAuditIds = new Set<string>(),
}: {
  title: string;
  subtitle: string;
  audits: Audit[];
  status: AuditStatus;
  onOpenAudit: (auditId: string) => void;
  expanded?: boolean;
  drafts?: Record<string, AuditDraft>;
  unsyncedAuditIds?: Set<string>;
}) {
  const compact = !expanded;
  const visibleAudits = compact ? audits.slice(0, 1) : audits;
  const hiddenCount = Math.max(0, audits.length - visibleAudits.length);

  return (
    <div className={["rounded-[1.2rem] p-2 ring-1 shadow-[0_8px_18px_rgba(15,23,42,0.05)]", statusStyles[status].soft, statusStyles[status].ring].join(" ")}>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusStyles[status].dot}`} />
          <div>
            <p className={`text-xs font-semibold ${statusStyles[status].text}`}>{title}</p>
            <p className="text-[10px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">{audits.length}</div>
      </div>

      <div className="space-y-1.5">
        {visibleAudits.map((audit) => (
          <button
            key={audit.id}
            onClick={() => onOpenAudit(audit.id)}
            className={["w-full rounded-xl bg-white/95 px-3 py-2 text-left shadow-[0_6px_14px_rgba(15,23,42,0.06)] transition active:scale-[0.99]", expanded ? "min-h-[4.25rem]" : ""].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">{audit.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {audit.siteArea} • {audit.priority} • Owner {audit.owner}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-600">{getDueWarning(audit.dueHours)}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {drafts[audit.id] ? `In progress ${drafts[audit.id].updatedAt}` : `Last completed ${audit.lastCompletedAt}`}
                </p>
                {unsyncedAuditIds.has(audit.id) && (
                  <p className="mt-0.5 text-[10px] font-semibold text-amber-700">Audit complete / not synced</p>
                )}
              </div>
              <div className="shrink-0 space-y-1 text-right">
                <StatusBadge status={getAuditTrafficStatus(audit.dueHours)} />
                <div className="text-[10px] text-slate-400">{audit.dueLabel}</div>
              </div>
            </div>
          </button>
        ))}
        {hiddenCount > 0 && <div className="px-1 text-[10px] font-semibold text-slate-500">+{hiddenCount} more</div>}
        {audits.length === 0 && <div className="rounded-xl bg-white/85 px-3 py-2 text-xs text-slate-500 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">No audits in this group.</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status, dark = false }: { status: AuditStatus; dark?: boolean }) {
  const base = statusStyles[status];
  return (
    <div className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", dark ? "bg-white/10 text-white" : `${base.soft} ${base.text}`].join(" ")}>
      <span className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-white" : base.dot}`} />
      {base.label}
    </div>
  );
}

function AnswerButton({
  label,
  selected,
  tone,
  onClick,
}: {
  label: string;
  selected: boolean;
  tone: AuditStatus;
  onClick: () => void;
}) {
  const selectedClasses =
    tone === "green"
      ? "bg-blue-600 text-white"
      : tone === "amber"
        ? "bg-amber-500 text-white"
        : "bg-rose-600 text-white";

  return (
    <button
      onClick={onClick}
      className={["min-h-[3.5rem] rounded-2xl px-2 text-center text-xs font-semibold leading-tight transition", selected ? selectedClasses : "bg-slate-100 text-slate-700"].join(" ")}
    >
      {label}
    </button>
  );
}

function AdminAction({
  title,
  subtitle,
  actionLabel,
  active,
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={[
          "shrink-0 rounded-xl px-4 py-3 text-xs font-semibold transition",
          disabled
            ? "bg-slate-200 text-slate-400"
            : active
              ? "bg-blue-500/12 text-blue-800"
              : `bg-slate-900 text-white ${slatePrimaryCtaInteract}`,
        ].join(" ")}
      >
        {active ? "Ready" : actionLabel}
      </button>
    </div>
  );
}

function FlowItem({ number, title, text, icon }: { number: string; title: string; text: string; icon?: string }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
        {icon ? <AppIcon name={icon} className="h-5 w-5 text-white" /> : number}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function ProcessCard({
  step,
  title,
  text,
  state,
  active,
  actionLabel,
  onAction,
  disabled = false,
  children,
}: {
  step: string;
  title: string;
  text: string;
  state: string;
  active: boolean;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            {step}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
          </div>
        </div>
        <div className={["shrink-0 rounded-full px-3 py-1 text-xs font-semibold", active ? "bg-blue-500/12 text-blue-800" : "bg-white text-slate-600"].join(" ")}>
          {active ? "Ready" : "Pending"}
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">{state}</div>
      {children && <div className="mt-3">{children}</div>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          disabled={disabled || active}
          className={[
            "mt-3 h-11 w-full rounded-2xl text-sm font-semibold transition",
            disabled || active ? "bg-slate-200 text-slate-400" : `bg-slate-900 text-white active:scale-[0.99] ${slatePrimaryCtaInteract}`,
          ].join(" ")}
        >
          {active ? "Ready" : actionLabel}
        </button>
      )}
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex max-w-[36rem] flex-col gap-2 px-4">
      {toasts.slice(0, 3).map((toast) => {
        const toneClass =
          toast.tone === "success"
            ? "border-blue-200 bg-blue-50 text-blue-950"
            : toast.tone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-white text-slate-900";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] ${toneClass}`}
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="mt-1 text-sm">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
}

export default App;
