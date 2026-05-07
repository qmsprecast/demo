import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Role = "Master" | "Admin" | "Manager" | "Auditor";
type AuditStatus = "green" | "amber" | "red";
type Answer = "pass" | "nc" | "fail";
type Priority = "High" | "Medium" | "Low";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";
type RiskCategory = "Health & Safety" | "Quality" | "Environmental" | "Operational" | "Other";
type ActionStatus = "Open" | "In Progress" | "Awaiting Verification" | "Closed" | "Rejected";
type ScheduleFrequency =
  | "Weekly"
  | "Bi-weekly"
  | "Monthly"
  | "Bi-monthly"
  | "3 Monthly"
  | "6 Monthly"
  | "12 Monthly";
type ScheduleScope = "Company schedule" | "Personal schedule";
type OverdueAlertTiming = "At due time" | "30 minutes overdue" | "1 hour overdue" | "2 hours overdue";
type CompletionCheckTiming = "30 minutes after send" | "1 hour after send" | "At due time" | "2 hours after due";
type Screen = "dashboard" | "audits" | "actions" | "reports" | "sync" | "schedules" | "admin" | "account" | "complete";
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

type UserInvite = {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  sentAt: string;
  status: "Invite sent";
  mailtoUrl?: string;
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
  auditId: string;
  auditName: string;
  questionId: string;
  questionText: string;
  sourceAnswer: string;
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

const companyName = "QMS Precast";
const CURRENT_SCHEMA_VERSION = "2.0.0";
const REQUIRED_WORKSPACE_TABS = ["Onboarding", "Users", "Schedule", "Actions", "Notes", "Config"] as const;
const ACTION_DUE_DAYS_BY_SEVERITY: Record<RiskLevel, number> = {
  Critical: 1,
  High: 3,
  Medium: 7,
  Low: 14,
};

const users: User[] = [
  { username: "master", password: "demo", role: "Master", name: "QMS Platform" },
  { username: "admin", password: "demo", role: "Admin", name: "Olivia Hart" },
  { username: "manager", password: "demo", role: "Manager", name: "James Cole" },
  { username: "auditor", password: "demo", role: "Auditor", name: "Amira Khan" },
];

const initialAudits: Audit[] = [];

const initialHistory: HistoryEntry[] = [];

const initialActions: ActionItem[] = [];
const initialSyncQueue: SyncQueueItem[] = [];
const initialSchedules: ScheduleItem[] = [];
const initialTemplates: AuditTemplate[] = [];
const amberThresholdHours = 2;
const scheduleDayOptions: ScheduleDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const scheduleFrequencyOptions: ScheduleFrequency[] = [
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Bi-monthly",
  "3 Monthly",
  "6 Monthly",
  "12 Monthly",
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
    dot: "bg-emerald-500",
    soft: "bg-emerald-500/12",
    ring: "ring-emerald-500/25",
    text: "text-emerald-700",
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

const navItems: { id: Exclude<Screen, "complete">; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "audits", label: "Audits", icon: "clipboard" },
  { id: "actions", label: "Actions", icon: "checklist" },
  { id: "reports", label: "Report creator", icon: "chart" },
  { id: "sync", label: "Sync Centre", icon: "sync" },
  { id: "schedules", label: "Schedules", icon: "clock" },
  { id: "admin", label: "Admin", icon: "shield" },
  { id: "account", label: "Account settings", icon: "user" },
];

const compactNavLabels: Partial<Record<Exclude<Screen, "complete">, string>> = {
  actions: "Actions",
  reports: "Reports",
  sync: "Sync",
  account: "Settings",
};

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
  }

  .qms-tablet-stage {
    display: flex;
    min-height: 100%;
    align-items: center;
    justify-content: center;
  }

  .qms-tablet-device {
    position: relative;
    width: min(92vw, 41rem);
    aspect-ratio: 10 / 16;
    padding: 0.9rem;
    border-radius: 2.8rem;
    background:
      linear-gradient(145deg, rgba(255,255,255,0.95), rgba(226,232,240,0.82)),
      linear-gradient(180deg, rgba(15,23,42,0.12), rgba(15,23,42,0.02));
    box-shadow:
      0 30px 90px rgba(15, 23, 42, 0.18),
      inset 0 1px 0 rgba(255,255,255,0.92),
      inset 0 -2px 0 rgba(148,163,184,0.18);
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
    padding-bottom: 7.25rem;
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
      padding-bottom: 7.25rem;
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

const userStorageKey = "qms-precast-current-user";
const offlineQueueStorageKey = "qms-precast-offline-submissions";
const themeStorageKey = "qms-precast-theme";
const previewOrientationStorageKey = "qms-precast-preview-orientation";
const folderLinksStorageKey = "qms-precast-folder-links";
const workspaceStateStorageKey = "qms-precast-workspace-state";
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
}[] = [
  { key: "compliance", title: "Compliance summary", description: "Live compliance and daily completion metrics." },
  { key: "auditCompletion", title: "Audit completion summary", description: "Completion rate, finished audits, and coverage." },
  { key: "overdueAudits", title: "Overdue audits", description: "Audits that are currently overdue." },
  { key: "correctiveActions", title: "Corrective actions", description: "Open and overdue CAPA items." },
  { key: "overdueActions", title: "Overdue actions", description: "Corrective actions past due date." },
  { key: "criticalFindings", title: "Critical/high findings", description: "Highest-risk audit findings needing attention." },
  { key: "repeatFailures", title: "Repeat failures", description: "Questions or findings repeatedly failing over time." },
  { key: "evidence", title: "Evidence summary", description: "Captured evidence and proof counts." },
  { key: "auditHistory", title: "Audit history", description: "Recent completed audit records." },
  { key: "verificationHistory", title: "Verification history", description: "Action verification and close-out activity." },
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

function canAccessReports(role: Role) {
  return role !== "Auditor";
}

function canAccessActions(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager" || role === "Auditor";
}

function getRolePermissions(role: Role) {
  return {
    canManageUsers: role === "Master" || role === "Admin",
    canManageSchedules: role === "Master" || role === "Admin",
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
        frequency: (extractByKeys(record, ["frequency"]) as ScheduleFrequency) || "Weekly",
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
      frequency: (extractByKeys(record, ["frequency"]) as ScheduleFrequency) || "Weekly",
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
        auditId,
        auditName,
        questionId: extractByKeys(record, ["source question id", "question id"]),
        questionText,
        sourceAnswer: extractByKeys(record, ["source answer", "answer"]),
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

function computeScheduleHealthState(schedule: ManagedSchedule): ScheduleHealthState {
  if (schedule.lifecycle === "Archived") {
    return "Paused";
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
      schedules?: ScheduleItem[];
      templates?: AuditTemplate[];
      drafts?: Record<string, AuditDraft>;
      managedSchedules?: ManagedSchedule[];
      folders?: CompanyFolder[];
      selectedFolderId?: string;
      syncState?: string;
      invitedUsers?: UserInvite[];
      companySheetSync?: CompanySheetSyncStatus | null;
      reportInbox?: ReportItem[];
      syncQueue?: SyncQueueItem[];
    };
  } catch {
    return null;
  }
}

function readStoredPreviewOrientation(): PreviewOrientation {
  try {
    const raw = window.localStorage.getItem(previewOrientationStorageKey);
    return raw === "landscape" ? "landscape" : "portrait";
  } catch {
    return "portrait";
  }
}

function App() {
  const actionsPersistReadyRef = useRef(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>(() => readStoredPreviewOrientation());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const storedWorkspaceState = readStoredWorkspaceState();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [accountPhotoUrl, setAccountPhotoUrl] = useState("");
  const [audits, setAudits] = useState<Audit[]>(storedWorkspaceState?.audits || initialAudits);
  const [history, setHistory] = useState<HistoryEntry[]>(storedWorkspaceState?.history || initialHistory);
  const [actions, setActions] = useState<ActionItem[]>(storedWorkspaceState?.actions || initialActions);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(storedWorkspaceState?.schedules || initialSchedules);
  const [templates, setTemplates] = useState<AuditTemplate[]>(storedWorkspaceState?.templates || initialTemplates);
  const [drafts, setDrafts] = useState<Record<string, AuditDraft>>(storedWorkspaceState?.drafts || {});
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, Answer>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, EvidenceItem[]>>({});
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
  const [exportsFolderInput, setExportsFolderInput] = useState(storedFolderLinks?.exportsFolderInput || "");
  const [adminNotesFolderInput, setAdminNotesFolderInput] = useState(storedFolderLinks?.adminNotesFolderInput || "");
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateQuestionInput, setTemplateQuestionInput] = useState("");
  const [templateQuestionTypeInput, setTemplateQuestionTypeInput] = useState<AuditQuestion["fieldType"]>("Traffic light");
  const [templateDraftQuestions, setTemplateDraftQuestions] = useState<DraftTemplateQuestion[]>([]);
  const [scheduleNameInput, setScheduleNameInput] = useState("");
  const [scheduleAreaInput, setScheduleAreaInput] = useState("");
  const [scheduleOwnerInput, setScheduleOwnerInput] = useState(users[1].name);
  const [scheduleScopeInput, setScheduleScopeInput] = useState<ScheduleScope>("Company schedule");
  const [schedulePersonalAssigneeInput, setSchedulePersonalAssigneeInput] = useState(users[2].name);
  const [scheduleFrequencyInput, setScheduleFrequencyInput] = useState<ScheduleFrequency>("Weekly");
  const [scheduleSendTimeInput, setScheduleSendTimeInput] = useState("08:00");
  const [scheduleRecipientsInput, setScheduleRecipientsInput] = useState(users[2].name);
  const [scheduleOverdueAlertRecipientsInput, setScheduleOverdueAlertRecipientsInput] = useState(users[1].name);
  const [scheduleEscalationContactInput, setScheduleEscalationContactInput] = useState(users[0].name);
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [companySheetSync, setCompanySheetSync] = useState<CompanySheetSyncStatus | null>(storedWorkspaceState?.companySheetSync || null);
  const [selectedReportTemplate, setSelectedReportTemplate] = useState<ReportTemplateType>("Executive summary");
  const [reportTitleInput, setReportTitleInput] = useState("QMS Precast Executive Summary");
  const [reportRecipients, setReportRecipients] = useState<string[]>([]);
  const [selectedReportSections, setSelectedReportSections] = useState<ReportSectionKey[]>(
    reportTemplateDefaults["Executive summary"],
  );
  const [reportInbox, setReportInbox] = useState<ReportItem[]>(storedWorkspaceState?.reportInbox || []);
  const [actionFilter, setActionFilter] = useState<"Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity">("Open");
  const [actionSeverityFilter, setActionSeverityFilter] = useState<RiskLevel | "All">("All");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const activeAudit = useMemo(
    () => audits.find((audit) => audit.id === activeAuditId) ?? null,
    [audits, activeAuditId],
  );

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  const workspaceName = selectedFolder?.name || companyName;

  const activeOnboardingRecord = useMemo(
    () => onboardingRecords.find((record) => record.id === selectedOnboardingRecordId) ?? null,
    [onboardingRecords, selectedOnboardingRecordId],
  );

  const selectedFolderSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.companyFolderId === selectedFolderId),
    [schedules, selectedFolderId],
  );

  const groupedAudits = useMemo(
    () => ({
      green: audits.filter((audit) => !isAuditCompleted(audit) && getAuditTrafficStatus(audit.dueHours) === "green"),
      amber: audits.filter((audit) => !isAuditCompleted(audit) && getAuditTrafficStatus(audit.dueHours) === "amber"),
      red: audits.filter((audit) => !isAuditCompleted(audit) && getAuditTrafficStatus(audit.dueHours) === "red"),
    }),
    [audits],
  );

  const compliance = useMemo(() => {
    if (audits.length === 0) {
      return 0;
    }
    const safeCount = audits.filter((audit) => getAuditTrafficStatus(audit.dueHours) === "green").length;
    return Math.round((safeCount / audits.length) * 100);
  }, [audits]);

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
    () => audits.filter((audit) => !isAuditCompleted(audit) && getAuditTrafficStatus(audit.dueHours) === "red"),
    [audits],
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
    const total = audits.length + history.length;
    if (total === 0) return 0;
    return Math.round((history.length / total) * 100);
  }, [audits.length, history.length]);
  const actionClosureRate = useMemo(() => {
    if (actions.length === 0) return 0;
    return Math.round((actions.filter((item) => item.status === "Closed").length / actions.length) * 100);
  }, [actions]);
  const averageActionClosureDays = useMemo(() => {
    const closed = actions.filter((item) => item.closedAt && item.createdAt);
    if (closed.length === 0) return 0;
    const totalDays = closed.reduce((sum, item) => {
      const diff = new Date(item.closedAt).getTime() - new Date(item.createdAt).getTime();
      return sum + Math.max(1, Math.round(diff / 86400000));
    }, 0);
    return Math.round(totalDays / closed.length);
  }, [actions]);
  const recurringFailedQuestions = useMemo(() => {
    const map = new Map<string, number>();
    actions.forEach((action) => {
      map.set(action.questionText, (map.get(action.questionText) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [actions]);
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
    audits.forEach((audit) => {
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
  }, [audits]);
  const visibleActions = useMemo(() => {
    if (!currentUser) return actions;
    const permissions = getRolePermissions(currentUser.role);
    if (permissions.canAssignActions) return actions;
    return actions.filter((action) => action.assignedToName === currentUser.name || action.assignedToUserId === currentUser.username);
  }, [actions, currentUser]);
  const filteredActions = useMemo(() => {
    let next = [...visibleActions];
    if (actionFilter === "Open") {
      next = next.filter((item) => item.status === "Open" || item.status === "In Progress");
    } else if (actionFilter === "Overdue") {
      next = next.filter((item) => item.dueHours < 0 && item.status !== "Closed");
    } else if (actionFilter === "Awaiting Verification") {
      next = next.filter((item) => item.status === "Awaiting Verification");
    } else if (actionFilter === "Closed") {
      next = next.filter((item) => item.status === "Closed");
    }
    if (actionSeverityFilter !== "All") {
      next = next.filter((item) => item.severity === actionSeverityFilter);
    }
    return next;
  }, [visibleActions, actionFilter, actionSeverityFilter]);

  const assignedAudits = useMemo(() => {
    if (!currentUser) {
      return audits.filter((audit) => !isAuditCompleted(audit));
    }
    if (canAccessAdmin(currentUser.role) || currentUser.role === "Manager") {
      return audits.filter((audit) => !isAuditCompleted(audit));
    }
    return audits.filter((audit) => audit.owner === currentUser.name && !isAuditCompleted(audit));
  }, [audits, currentUser]);

  const roleLabel = useMemo(() => {
    if (!currentUser) {
      return "";
    }
    if (currentUser.role === "Master") {
      return "God Mode access for platform setup, company provisioning, and full control";
    }
    if (currentUser.role === "Admin") {
      return "Platform configuration and template control";
    }
    if (currentUser.role === "Manager") {
      return "Review actions, overdue items, and compliance risk";
    }
    return "Complete assigned audits and capture site outcomes";
  }, [currentUser]);

  const visibleNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (!currentUser) {
          return false;
        }
        if (item.id === "admin") {
          return canAccessAdmin(currentUser.role);
        }
        if (item.id === "schedules") {
          return canAccessAdmin(currentUser.role);
        }
        if (item.id === "reports") {
          return canAccessReports(currentUser.role);
        }
        if (item.id === "actions") {
          return canAccessActions(currentUser.role);
        }
        if (item.id === "sync") {
          return true;
        }
        return true;
      }),
    [currentUser],
  );

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
            ? "olivia@qmsprecest.co.uk"
            : user.username === "manager"
              ? "james@qmsprecest.co.uk"
              : "amira@qmsprecest.co.uk",
        name: user.name,
        role: user.role,
      }));
    const invited = invitedUsers.map((invite) => ({
      username: invite.email.split("@")[0],
      email: invite.email,
      name: invite.email,
      role: invite.role,
    }));
    const merged = [...seededUsers, ...invited];
    return merged.filter((user, index, list) => list.findIndex((item) => item.email === user.email) === index);
  }, [invitedUsers]);

  const availableScheduleAudits = useMemo(() => {
    const templateOptions = templates
      .filter((template) => template.active)
      .map((template) => ({ id: template.id, name: template.name }));
    const auditOptions = audits.map((audit) => ({ id: audit.id, name: audit.name }));
    const merged = [...templateOptions, ...auditOptions];
    return merged.filter((item, index, list) => list.findIndex((entry) => entry.name === item.name) === index);
  }, [templates, audits]);

  const availableScheduleAuditors = useMemo(() => {
    const seeded = users.filter((user) => user.role === "Auditor").map((user) => user.name);
    const invited = invitedUsers.filter((invite) => invite.role === "Auditor").map((invite) => invite.email);
    return [...seeded, ...invited].filter((item, index, list) => list.indexOf(item) === index);
  }, [invitedUsers]);

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
  }, [companyReportUsers, availableScheduleAudits, managedSchedules, selectedFolderId, audits]);

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
      const matchedUser = users.find(
        (user) =>
          user.username === parsed.username &&
          user.role === parsed.role &&
          user.name === parsed.name,
      );

      if (matchedUser) {
        setCurrentUser(matchedUser);
        setAccountNameInput(matchedUser.name);
      } else {
        window.localStorage.removeItem(userStorageKey);
      }
    } catch {
      window.localStorage.removeItem(userStorageKey);
    }
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
    window.localStorage.setItem(
      folderLinksStorageKey,
      JSON.stringify({
        folderNameInput,
        folderIdInput,
        auditFormsFolderInput,
        masterSheetInput,
        evidenceFolderInput,
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
        schedules,
        templates,
        drafts,
        managedSchedules,
        folders,
        selectedFolderId,
        syncState,
        invitedUsers,
        companySheetSync,
        reportInbox,
        syncQueue,
      }),
    );
  }, [
    audits,
    history,
    actions,
    schedules,
    templates,
    drafts,
    managedSchedules,
    folders,
    selectedFolderId,
    syncState,
    invitedUsers,
    companySheetSync,
    reportInbox,
    syncQueue,
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
    window.localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  useEffect(() => {
    window.localStorage.setItem(previewOrientationStorageKey, previewOrientation);
  }, [previewOrientation]);

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
          submittedByUser: users.find((item) => item.name === submission.submittedBy) || users[1],
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
      granted ? "QMS Precast can now send live browser alerts." : "Enable browser notifications to receive live alerts.",
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
    const match = users.find(
      (user) => user.username === username.trim().toLowerCase() && user.password === password,
    );
    if (!match) {
      pushToast("Sign in failed", "Please check your username and password.", "warning");
      return;
    }
    setCurrentUser(match);
    setAccountNameInput(match.name);
    window.localStorage.setItem(userStorageKey, JSON.stringify(match));
    setScreen("dashboard");
    setUsername("");
    setPassword("");
    pushToast("Welcome back", `Signed in as ${getRoleDisplayName(match.role)}.`, "success");
  };

  const handleInviteUser = () => {
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

    const trimmedEmail = inviteEmailInput.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      pushToast("Email required", "Enter a valid email address to send the onboarding link.", "warning");
      return;
    }

    if (invitedUsers.some((invite) => invite.email === trimmedEmail && invite.role === inviteRoleInput)) {
      pushToast("Invite already sent", "That user and role already has an active onboarding invite.", "warning");
      return;
    }

    setInvitedUsers((current) => [
      {
        id: `invite-${Date.now()}`,
        email: trimmedEmail,
        role: inviteRoleInput,
        invitedBy: currentUser.name,
        sentAt: formatStamp(),
        status: "Invite sent",
        mailtoUrl: `mailto:${encodeURIComponent(trimmedEmail)}?subject=${encodeURIComponent(`QMS Precast ${inviteRoleInput} onboarding`)}&body=${encodeURIComponent(
          `You have been invited to QMS Precast as a ${inviteRoleInput}. Complete your onboarding using the approved company onboarding process.`,
        )}`,
      },
      ...current,
    ]);
    setInviteEmailInput("");
    pushToast("Onboarding link sent", `${inviteRoleInput} invite sent to ${trimmedEmail}.`, "success");
    triggerNotification("User onboarding invite", `${trimmedEmail} has been invited as ${inviteRoleInput}.`);
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
    window.localStorage.removeItem(userStorageKey);
    setCurrentUser(null);
    setAccountNameInput("");
    setAccountPhotoUrl("");
    setScreen("dashboard");
    setActiveAuditId(null);
    setResponses({});
    setNotes({});
    setEvidence({});
    pushToast("Signed out", "Your session has been closed.", "neutral");
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
    setScreen("complete");
    if (draft) {
      pushToast("Draft loaded", "Saved progress has been restored.", "neutral");
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
        requiresManagerReview: item.question.requiresManagerReview,
      } satisfies ActionItem));

    if (actionItems.length > 0) {
      setActions((current) => [...actionItems, ...current]);
      queueSyncItem({
        itemType: "actionUpdate",
        localId: `actions-${audit.id}-${Date.now()}`,
        status: googleConnected && !offlineMode ? "Pending Sync" : "Pending Sync",
        createdAt: completedAt,
        retryCount: 0,
        lastError: "",
        payload: { companyFolderId: selectedFolderId, actions: actionItems },
      });
    }

    return actionItems;
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
      triggerNotification("QMS Precast", `${activeAudit.name} has been queued offline for sync.`);
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
        owner: scheduleOwnerInput || users[1].name,
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
          : "Reconnect Google first so QMS Precast can find the onboarding form link.",
        "warning",
      );
      return;
    }

    window.location.href = `https://docs.google.com/forms/d/${onboardingSource.formId}/viewform`;
  };

  const handleApplyOnboardingRecord = () => {
    if (!activeOnboardingRecord) {
      pushToast("Submission required", "Select an onboarding submission before applying it.", "warning");
      return;
    }

    setFolderNameInput(
      normalizeFolderName(activeOnboardingRecord.companyName || activeOnboardingRecord.companyFolderReference),
    );
    setScheduleRecipientsInput(activeOnboardingRecord.auditRecipients || users[2].name);
    setScheduleOverdueAlertRecipientsInput(
      activeOnboardingRecord.overdueAlertRecipients || activeOnboardingRecord.reportingContact || users[1].name,
    );
    setScheduleEscalationContactInput(activeOnboardingRecord.reportingContact || users[0].name);
    setScheduleOwnerInput(activeOnboardingRecord.mainContact || users[1].name);
    setSchedulePersonalAssigneeInput(activeOnboardingRecord.mainContact || users[2].name);
    setSyncState("Onboarding submission applied");
    pushToast(
      "Submission applied",
      `${activeOnboardingRecord.companyName} details have been loaded into the onboarding setup.`,
      "success",
    );
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
          owner: scheduleOwnerInput || users[1].name,
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
      },
    ]);
    setTemplateQuestionInput("");
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
        owner: scheduleOwnerInput || users[1].name,
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
        createdBy: currentUser?.name || "QMS Precast",
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
        createdBy: currentUser?.name || "QMS Precast",
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
    setScheduleOwnerInput(users[1].name);
    setScheduleScopeInput("Company schedule");
    setSchedulePersonalAssigneeInput(users[2].name);
    setScheduleFrequencyInput("Weekly");
    setScheduleSendTimeInput("08:00");
    setScheduleRecipientsInput(users[2].name);
    setScheduleOverdueAlertRecipientsInput(users[1].name);
    setScheduleEscalationContactInput(users[0].name);
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
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      loadGoogleStatus();
      loadOnboardingRecords({ silent: true });
      pushToast("Google connected", "Shared Google Drive access is now active.", "success");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (googleConnected) {
      loadOnboardingRecords({ silent: true });
    } else {
      setOnboardingRecords([]);
      setSelectedOnboardingRecordId("");
    }
  }, [googleConnected]);

  useEffect(() => {
    if (currentUser && !canAccessAdmin(currentUser.role) && screen === "admin") {
      setScreen("dashboard");
    }
    if (currentUser && !canAccessAdmin(currentUser.role) && screen === "schedules") {
      setScreen("dashboard");
    }
    if (currentUser && !canAccessReports(currentUser.role) && screen === "reports") {
      setScreen("dashboard");
    }
    if (currentUser && !canAccessActions(currentUser.role) && screen === "actions") {
      setScreen("dashboard");
    }
  }, [currentUser, screen]);

  if (!currentUser) {
    return (
      <div
        className={[
          shellPreviewClass,
          "min-h-[100dvh] px-4 py-6",
          themeMode === "dark"
            ? "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-slate-100"
            : "bg-[radial-gradient(circle_at_top,_rgba(17,24,39,0.08),_transparent_35%),linear-gradient(180deg,_#eef4f7_0%,_#f9fbfc_45%,_#e8eff3_100%)] text-slate-900",
        ].join(" ")}
      >
        <style>{appMotionStyles}</style>
        <div className="qms-tablet-stage">
          <div className="qms-tablet-device">
            <div
              className={[
                "qms-login-shell qms-login-card flex flex-col justify-center rounded-[2.2rem] border p-6 backdrop-blur",
                themeMode === "dark"
                  ? "border-slate-800/80 bg-slate-950/80 shadow-[0_32px_90px_rgba(2,6,23,0.58)]"
                  : "border-white/70 bg-white/90 shadow-[0_32px_90px_rgba(15,23,42,0.14)]",
              ].join(" ")}
            >
            <div className="mb-5 flex items-center justify-between">
              <div className={["rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]", themeMode === "dark" ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-500"].join(" ")}>
                Tablet sign in
              </div>
              <button
                onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
                className={["rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] transition", themeMode === "dark" ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"].join(" ")}
              >
                {themeMode === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button
                onClick={() => setPreviewOrientation(previewOrientation === "landscape" ? "portrait" : "landscape")}
                className={["rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] transition", themeMode === "dark" ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"].join(" ")}
              >
                {previewOrientation === "landscape" ? "Portrait preview" : "Landscape preview"}
              </button>
            </div>
            <div className="qms-login-grid">
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold tracking-[0.28em] text-white">
                    QMS
                  </div>
                  <div>
                    <p className={["text-xs font-semibold uppercase tracking-[0.3em]", themeMode === "dark" ? "text-slate-400" : "text-slate-500"].join(" ")}>
                      Health &amp; Safety Audit System
                    </p>
                    <h1 className={["text-2xl font-semibold tracking-tight", themeMode === "dark" ? "text-white" : "text-slate-900"].join(" ")}>{companyName}</h1>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.7rem] bg-slate-950 px-5 py-5 text-white shadow-[0_24px_50px_rgba(15,23,42,0.28)]">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-slate-300">Commercial field platform</p>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                      Live demo
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-semibold leading-tight">
                    Control onboarding, live audits, and corrective actions in one tablet app.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Sign in to manage company setup, review compliance, complete inspections, and close risk actions.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-white/8 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Audit</p>
                      <p className="mt-2 text-lg font-semibold">Live</p>
                    </div>
                    <div className="rounded-2xl bg-white/8 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Actions</p>
                      <p className="mt-2 text-lg font-semibold">Tracked</p>
                    </div>
                    <div className="rounded-2xl bg-white/8 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Reports</p>
                      <p className="mt-2 text-lg font-semibold">Ready</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="qms-login-access mt-6">
                <div className="space-y-4">
                  <div>
                    <label className={["mb-2 block text-sm font-medium", themeMode === "dark" ? "text-slate-300" : "text-slate-700"].join(" ")}>Username</label>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className={[
                        "h-14 w-full rounded-2xl border px-4 text-base outline-none transition",
                        themeMode === "dark"
                          ? "border-slate-700 bg-slate-900 text-slate-100 focus:border-sky-400 focus:bg-slate-950"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-400 focus:bg-white",
                      ].join(" ")}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className={["mb-2 block text-sm font-medium", themeMode === "dark" ? "text-slate-300" : "text-slate-700"].join(" ")}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          handleLogin();
                        }
                      }}
                      className={[
                        "h-14 w-full rounded-2xl border px-4 text-base outline-none transition",
                        themeMode === "dark"
                          ? "border-slate-700 bg-slate-900 text-slate-100 focus:border-sky-400 focus:bg-slate-950"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-400 focus:bg-white",
                      ].join(" ")}
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  className="mt-6 h-14 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.24)] transition active:scale-[0.99]"
                >
                  Sign in
                </button>

                <div className={["mt-6 rounded-[1.5rem] border p-4", themeMode === "dark" ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-slate-50"].join(" ")}>
                  <p className={["text-sm font-semibold", themeMode === "dark" ? "text-slate-100" : "text-slate-800"].join(" ")}>Approved demo access</p>
                  <div className="mt-3 grid gap-3">
                    {users.map((user) => (
                      <div
                        key={user.username}
                        className={[
                          "flex items-center justify-between rounded-2xl border px-4 py-3",
                          themeMode === "dark" ? "border-slate-800 bg-slate-950" : "border-white bg-white",
                        ].join(" ")}
                      >
                        <div>
                          <p className={["text-sm font-semibold", themeMode === "dark" ? "text-slate-100" : "text-slate-900"].join(" ")}>{getRoleDisplayName(user.role)}</p>
                          <p className={["text-xs", themeMode === "dark" ? "text-slate-400" : "text-slate-500"].join(" ")}>
                            {user.username} / {user.password}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setUsername(user.username);
                            setPassword(user.password);
                          }}
                          className={["rounded-xl px-3 py-2 text-xs font-semibold transition", themeMode === "dark" ? "bg-slate-900 text-slate-200 hover:bg-slate-800" : "bg-slate-100 text-slate-700 hover:bg-slate-200"].join(" ")}
                        >
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
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
          ? "bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-slate-100"
          : "bg-[radial-gradient(circle_at_top,_rgba(2,132,199,0.10),_transparent_32%),linear-gradient(180deg,_#edf4f7_0%,_#f9fbfc_45%,_#eef3f5_100%)] text-slate-900",
        ].join(" ")}
    >
      <style>{appMotionStyles}</style>
      <div className="qms-tablet-stage">
        <div className="qms-tablet-device">
          <div
            className={[
              "qms-app-shell mx-auto flex h-full w-full flex-col overflow-hidden rounded-[2.25rem] border backdrop-blur",
              themeMode === "dark"
                ? "border-slate-800/90 bg-slate-950/80 shadow-[0_28px_90px_rgba(2,6,23,0.5)]"
                : "border-white/80 bg-white/90 shadow-[0_28px_90px_rgba(15,23,42,0.16)]",
            ].join(" ")}
          >
        <header className={["qms-app-header border-b px-4 pb-4 pt-3", themeMode === "dark" ? "border-slate-800 bg-slate-950/80" : "border-slate-200/80 bg-white/90"].join(" ")}>
          <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em]">
            <div className={["rounded-full px-3 py-1", themeMode === "dark" ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-500"].join(" ")}>
              Tablet workspace
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewOrientation(previewOrientation === "landscape" ? "portrait" : "landscape")}
                className={["rounded-full px-3 py-1", themeMode === "dark" ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"].join(" ")}
              >
                {previewOrientation === "landscape" ? "Portrait preview" : "Landscape preview"}
              </button>
              <div className={["rounded-full px-3 py-1", offlineMode ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/12 text-emerald-700"].join(" ")}>
                {offlineMode ? "Offline" : "Online"}
              </div>
              <div className={["rounded-full px-3 py-1", themeMode === "dark" ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"].join(" ")}>
                {deviceTimeLabel}
              </div>
            </div>
          </div>
          <div className="qms-app-header-main">
            <div className="flex items-start gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold tracking-[0.12em] text-white">
                {getWorkspaceInitials(workspaceName)}
                {selectedFolder && (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white">
                    Live
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={["truncate text-lg font-semibold tracking-tight", themeMode === "dark" ? "text-white" : "text-slate-900"].join(" ")}>{workspaceName}</p>
                <p className={["truncate text-xs uppercase tracking-[0.24em]", themeMode === "dark" ? "text-slate-400" : "text-slate-500"].join(" ")}>
                  {selectedFolder ? "Live company workspace" : "Health &amp; Safety Audit System"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm"
              >
                Logout
              </button>
            </div>

            <div className={["qms-app-session-bar mt-3 flex items-center justify-between rounded-2xl px-3 py-3", themeMode === "dark" ? "bg-slate-900" : "bg-slate-50"].join(" ")}>
              <div className="min-w-0">
                <p className={["truncate text-sm font-semibold", themeMode === "dark" ? "text-slate-100" : "text-slate-900"].join(" ")}>{currentUser.name}</p>
                <p className={["text-xs", themeMode === "dark" ? "text-slate-400" : "text-slate-500"].join(" ")}>{getRoleDisplayName(currentUser.role)}</p>
                <p className={["mt-1 text-xs", themeMode === "dark" ? "text-slate-500" : "text-slate-400"].join(" ")}>{roleLabel}</p>
              </div>
              <div className="text-right">
                <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {selectedFolder ? "Live workspace" : "Live session"}
                </div>
                {selectedFolder && <p className="mt-1 text-[11px] text-slate-400">Google Drive linked</p>}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <div className={["qms-screen-stage h-full overflow-y-auto px-4 pb-32 pt-4", themeMode === "dark" ? "[&_section.border]:border-slate-800 [&_section.bg-white]:bg-slate-900 [&_section.bg-slate-50]:bg-slate-900 [&_section_.text-slate-900]:text-slate-100 [&_section_.text-slate-800]:text-slate-200 [&_section_.text-slate-700]:text-slate-300 [&_section_.text-slate-600]:text-slate-400 [&_section_.text-slate-500]:text-slate-400 [&_section_.text-slate-400]:text-slate-500 [&_section_input]:border-slate-700 [&_section_input]:bg-slate-950 [&_section_input]:text-slate-100 [&_section_textarea]:border-slate-700 [&_section_textarea]:bg-slate-950 [&_section_textarea]:text-slate-100 [&_.bg-gradient-to-b]:from-slate-900 [&_.bg-gradient-to-b]:to-slate-950 [&_.bg-slate-100]:bg-slate-800 [&_.bg-slate-200]:bg-slate-800" : ""].join(" ")}>
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
                assignedAudits={assignedAudits}
                history={history}
                drafts={drafts}
                companySheetSync={companySheetSync}
                auditCompletionRate={auditCompletionRate}
                actionClosureRate={actionClosureRate}
                averageActionClosureDays={averageActionClosureDays}
                recurringFailedQuestions={recurringFailedQuestions}
                topOverdueSchedules={topOverdueSchedules}
                riskSummary={riskSummary}
                onOpenAudit={startAudit}
                onAdvanceAction={updateActionStatus}
              />
            )}

            {screen === "audits" && (
              <AuditsScreen
                currentUser={currentUser}
                audits={audits}
                groupedAudits={groupedAudits}
                drafts={drafts}
                onOpenAudit={startAudit}
              />
            )}

            {screen === "actions" && canAccessActions(currentUser.role) && (
              <ActionsScreen
                currentUser={currentUser}
                actions={filteredActions}
                actionFilter={actionFilter}
                actionSeverityFilter={actionSeverityFilter}
                availableAuditors={availableScheduleAuditors}
                onFilterChange={setActionFilter}
                onSeverityFilterChange={setActionSeverityFilter}
                onAdvanceAction={updateActionStatus}
                onAssignAction={assignAction}
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
                auditAccessMatrix={auditAccessMatrix}
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

            {screen === "schedules" && canAccessAdmin(currentUser.role) && (
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
              />
            )}

            {screen === "admin" && canAccessAdmin(currentUser.role) && (
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
                onRequestNotifications={requestNotificationAccess}
                onValidateWorkspace={() => void validateWorkspace()}
                onRepairWorkspace={repairWorkspace}
                onTemplateNameChange={setTemplateNameInput}
                onTemplateQuestionChange={setTemplateQuestionInput}
                onTemplateQuestionTypeChange={setTemplateQuestionTypeInput}
                onAddTemplateQuestion={handleAddTemplateQuestion}
                onRemoveTemplateQuestion={handleRemoveTemplateQuestion}
                onAddTemplate={handleAddTemplate}
                onToggleTemplate={handleToggleTemplate}
                onAddSchedule={handleAddSchedule}
                onSelectFolder={handleSelectFolder}
                onVerifyOnboarding={handleVerifyOnboarding}
                onVerifyAudits={handleVerifyAudits}
                onVerifyResponseSheet={handleVerifyResponseSheet}
                onSyncForms={handleSyncForms}
                onInviteEmailChange={setInviteEmailInput}
                onInviteRoleChange={setInviteRoleInput}
                onInviteUser={handleInviteUser}
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
                onAccountPhotoChange={(file) => setAccountPhotoUrl(URL.createObjectURL(file))}
                onThemeModeChange={setThemeMode}
                onSave={handleSaveAccountSettings}
              />
            )}

            {screen === "complete" && activeAudit && (
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

        <nav className="qms-bottom-nav absolute inset-x-0 bottom-0 mx-auto w-full max-w-[37rem] px-3 pb-3">
          <div
            className={[
              "qms-bottom-nav-grid grid gap-2 rounded-[1.75rem] border p-2 shadow-[0_20px_45px_rgba(15,23,42,0.16)] backdrop-blur-xl",
              themeMode === "dark" ? "border-slate-800 bg-slate-950/92" : "border-white/80 bg-white/92",
            ].join(" ")}
            style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
          >
            {visibleNavItems.map((item) => {
              const selected = screen === item.id || (screen === "complete" && item.id === "audits");
              const navLabel = compactNavLabels[item.id] ?? item.label;
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={[
                    "qms-nav-button group flex h-12 flex-col items-center justify-center rounded-2xl border px-1 text-[10px] font-semibold leading-none transition-all duration-200 sm:text-[11px]",
                    selected
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]"
                      : themeMode === "dark"
                        ? "border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-slate-700 hover:text-slate-100"
                        : "border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-slate-300 hover:text-slate-900",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mb-0.5 h-1.5 w-7 rounded-full transition-all duration-200",
                      selected ? "bg-white/90" : themeMode === "dark" ? "bg-slate-700 group-hover:bg-slate-500" : "bg-slate-300 group-hover:bg-slate-400",
                    ].join(" ")}
                  />
                  <span className={["mb-0.5", selected ? "text-white" : themeMode === "dark" ? "text-slate-400 group-hover:text-slate-100" : "text-slate-500 group-hover:text-slate-900"].join(" ")}>
                    <AppIcon name={item.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="qms-nav-label max-w-full truncate">{navLabel}</span>
                </button>
              );
            })}
          </div>
          </nav>
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
  onOpenAudit,
  onAdvanceAction,
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
  onOpenAudit: (auditId: string) => void;
  onAdvanceAction: (actionId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Live overview</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{workspaceName}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
              Live control of onboarding, site audits, and corrective action ownership from one field-ready workspace.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
            <p className="text-xs text-slate-300">Overdue audits</p>
            <p className="mt-1 text-2xl font-semibold">{overdueAudits.length}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <KpiCard
          title="Live audits due today"
          value={String(assignedAudits.length)}
          tone={assignedAudits.length === 0 ? "green" : "amber"}
          subtitle={`${completedToday} completed today`}
        />
        <KpiCard
          title="Overdue audits"
          value={String(overdueAudits.length)}
          tone={overdueAudits.length === 0 ? "green" : "red"}
          subtitle={`${offlineQueueCount} pending offline sync`}
        />
        <KpiCard
          title="Open corrective actions"
          value={String(openActions.length)}
          tone={openActions.length === 0 ? "green" : "amber"}
          subtitle={`${overdueActions.length} overdue`}
        />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <KpiCard
          title="Overdue CAPA"
          value={String(overdueActions.length)}
          tone={overdueActions.length === 0 ? "green" : "red"}
          subtitle={`${awaitingVerificationActions.length} awaiting verification`}
        />
        <KpiCard
          title="Critical/high risk"
          value={String(criticalActions.length)}
          tone={criticalActions.length === 0 ? "green" : "red"}
          subtitle={`${riskSummary.criticalFindings} critical findings`}
        />
        <KpiCard
          title="Failed questions"
          value={String(recurringFailedQuestions.reduce((sum, item) => sum + item[1], 0))}
          tone={recurringFailedQuestions.length === 0 ? "green" : "amber"}
          subtitle={`${recurringFailedQuestions.length} recurring patterns`}
        />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <KpiCard
          title="Compliance"
          value={`${compliance}%`}
          tone="green"
          subtitle={complianceDelta >= 0 ? `Up ${complianceDelta}% vs previous run` : `Down ${Math.abs(complianceDelta)}% vs previous run`}
        />
        <KpiCard
          title="Closure rate"
          value={`${actionClosureRate}%`}
          tone={actionClosureRate > 79 ? "green" : "amber"}
          subtitle={`${averageActionClosureDays || 0} day average close`}
        />
        <KpiCard
          title="Audit completion"
          value={`${auditCompletionRate}%`}
          tone={auditCompletionRate > 79 ? "green" : "amber"}
          subtitle={`${riskSummary.highestRiskLevel} highest risk`}
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="shield"
          eyebrow="Workspace identity"
          title="Live company system"
          subtitle={companySheetSync ? `Connected to ${companySheetSync.sheetName} with ${companySheetSync.tabs.length} live tabs.` : "Waiting for company master sheet sync to complete."}
        />
        <div className="grid grid-cols-2 gap-3">
          <QuickActionTile title="Workspace" value={workspaceName} caption="Current live company" />
          <QuickActionTile title="Data sync" value={companySheetSync ? "Healthy" : "Waiting"} caption={companySheetSync ? `Synced ${companySheetSync.lastSyncedAt}` : "Populate app to complete sync"} />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="dashboard"
          eyebrow="Live status"
          title="Traffic light audit board"
          subtitle="Operational status across every live audit area"
        />
        <div className="grid gap-3">
          <TrafficLane
            title="Green"
            subtitle={`More than ${amberThresholdHours} hours remaining`}
            audits={groupedAudits.green}
            status="green"
            onOpenAudit={onOpenAudit}
          />
          <TrafficLane
            title="Amber"
            subtitle={`Less than ${amberThresholdHours} hours remaining`}
            audits={groupedAudits.amber}
            status="amber"
            onOpenAudit={onOpenAudit}
          />
          <TrafficLane title="Red" subtitle="Overdue" audits={groupedAudits.red} status="red" onOpenAudit={onOpenAudit} />
        </div>
      </section>

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
          icon="checklist"
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
                      {drafts[audit.id] ? `Draft saved ${drafts[audit.id].updatedAt}` : `Last completed ${audit.lastCompletedAt}`}
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

function AuditsScreen({
  currentUser,
  audits,
  groupedAudits,
  drafts,
  onOpenAudit,
}: {
  currentUser: User;
  audits: Audit[];
  groupedAudits: Record<AuditStatus, Audit[]>;
  drafts: Record<string, AuditDraft>;
  onOpenAudit: (auditId: string) => void;
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

      {audits.length === 0 && (
        <EmptyPanel
          title="No audit templates live"
          text="This blank version is ready for setup. Connect Google in Admin, select the company folder you want, verify the onboarding form, audit forms, and response sheet, then sync."
        />
      )}

      <TrafficLane
        title="Green"
        subtitle={`More than ${amberThresholdHours} hours remaining`}
        audits={groupedAudits.green}
        status="green"
        onOpenAudit={onOpenAudit}
        expanded
        drafts={drafts}
      />
      <TrafficLane
        title="Amber"
        subtitle={`Less than ${amberThresholdHours} hours remaining`}
        audits={groupedAudits.amber}
        status="amber"
        onOpenAudit={onOpenAudit}
        expanded
        drafts={drafts}
      />
      <TrafficLane title="Red" subtitle="Overdue" audits={groupedAudits.red} status="red" onOpenAudit={onOpenAudit} expanded drafts={drafts} />
    </div>
  );
}

function ActionsScreen({
  currentUser,
  actions,
  actionFilter,
  actionSeverityFilter,
  availableAuditors,
  onFilterChange,
  onSeverityFilterChange,
  onAdvanceAction,
  onAssignAction,
}: {
  currentUser: User;
  actions: ActionItem[];
  actionFilter: "Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity";
  actionSeverityFilter: RiskLevel | "All";
  availableAuditors: string[];
  onFilterChange: (value: "Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity") => void;
  onSeverityFilterChange: (value: RiskLevel | "All") => void;
  onAdvanceAction: (actionId: string, nextStatus?: ActionStatus) => void;
  onAssignAction: (actionId: string, assignee: string) => void;
}) {
  const permissions = getRolePermissions(currentUser.role);
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <AppIcon name="checklist" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{currentUser.role === "Auditor" ? "My actions" : "Corrective actions"}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{currentUser.role === "Auditor" ? "Assigned corrective actions" : "CAPA control centre"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Track failed findings, assign ownership, upload evidence, and verify closure.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={actionFilter} onChange={(event) => onFilterChange(event.target.value as "Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity")} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none">
            <option value="Open">Open</option>
            <option value="Overdue">Overdue</option>
            <option value="Awaiting Verification">Awaiting Verification</option>
            <option value="Closed">Closed</option>
            <option value="Severity">All by severity</option>
          </select>
          <select value={actionSeverityFilter} onChange={(event) => onSeverityFilterChange(event.target.value as RiskLevel | "All")} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none">
            <option value="All">All severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </section>

      {actions.length === 0 ? (
        <EmptyPanel title="No corrective actions in this view" text="Failed answers and flagged issues will create actions here automatically." />
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <section key={action.id} className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{action.auditName}</p>
                  <p className="mt-2 text-sm text-slate-600">{action.questionText}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaPill icon="spark" label={action.severity} />
                    <MetaPill icon="clipboard" label={action.riskCategory} />
                    <MetaPill icon="user" label={action.assignedToName} />
                    <MetaPill icon="clock" label={action.dueDate || action.dueLabel} />
                  </div>
                </div>
                <div className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">{action.status}</div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {permissions.canAssignActions && (
                  <select value={action.assignedToName} onChange={(event) => onAssignAction(action.id, event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none">
                    {[action.assignedToName, ...availableAuditors].filter((value, index, list) => value && list.indexOf(value) === index).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
                <div className="flex flex-wrap gap-2">
                  {action.status !== "Closed" && <button onClick={() => onAdvanceAction(action.id, action.status === "Open" ? "In Progress" : action.status === "In Progress" ? "Awaiting Verification" : "Closed")} className="h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white">{action.status === "Open" ? "Start action" : action.status === "In Progress" ? "Submit for verification" : "Verify & close"}</button>}
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
                {(item.status === "Failed" || item.status === "Conflict") && <button onClick={() => onRetryItem(item.localId)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Retry</button>}
                {permissions.canRepairWorkspace && <button onClick={() => onForceSyncItem(item.localId)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Force sync</button>}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
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
  auditAccessMatrix,
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
  auditAccessMatrix: AuditAccessMatrixRow[];
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
  const matrixAuditColumns = auditAccessMatrix[0]?.cells ?? [];

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
        <MiniMetric label="Open actions" value={String(openActions.length)} />
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
              <p className="text-xs text-slate-500">Live</p>
            </div>
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
        <SectionHeader
          icon="user"
          eyebrow="Access control"
          title="Audit access matrix"
          subtitle="Managers and above can see exactly which company users can access each audit."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <QuickActionTile title="Users" value={String(auditAccessMatrix.length)} caption="Included in matrix" />
          <QuickActionTile title="Audits" value={String(matrixAuditColumns.length)} caption="Available on this workspace" />
          <QuickActionTile
            title="Assigned access"
            value={String(auditAccessMatrix.reduce((sum, row) => sum + row.accessibleCount, 0))}
            caption="User-to-audit links"
          />
        </div>

        {auditAccessMatrix.length === 0 || matrixAuditColumns.length === 0 ? (
          <div className="mt-4">
            <EmptyPanel
              title="No access matrix available yet"
              text="Add live audits and users to this company workspace to generate the access matrix."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
            <table className="min-w-[62rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 min-w-[13rem] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    User
                  </th>
                  {matrixAuditColumns.map((audit) => (
                    <th
                      key={audit.auditId}
                      className="min-w-[10rem] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                    >
                      {audit.auditName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditAccessMatrix.map((user) => (
                  <tr key={user.email} className="border-b border-slate-100 align-top last:border-b-0">
                    <td className="sticky left-0 z-10 min-w-[13rem] bg-white px-4 py-4">
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {user.role} • {user.email}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {user.accessibleCount} audit{user.accessibleCount === 1 ? "" : "s"} accessible
                      </p>
                    </td>
                    {user.cells.map((cell) => (
                      <td key={`${user.email}-${cell.auditId}`} className="px-4 py-4">
                        <div
                          className={[
                            "rounded-2xl border px-3 py-3",
                            cell.access === "Full access"
                              ? "border-slate-200 bg-slate-950 text-white"
                              : cell.access === "Oversight"
                                ? "border-sky-200 bg-sky-50"
                                : cell.access === "Complete"
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-slate-200 bg-slate-50",
                          ].join(" ")}
                        >
                          <p
                            className={[
                              "text-xs font-semibold uppercase tracking-[0.18em]",
                              cell.access === "Full access"
                                ? "text-slate-200"
                                : cell.access === "Oversight"
                                  ? "text-sky-700"
                                  : cell.access === "Complete"
                                    ? "text-emerald-700"
                                    : "text-slate-500",
                            ].join(" ")}
                          >
                            {cell.access}
                          </p>
                          <p
                            className={[
                              "mt-2 text-xs leading-5",
                              cell.access === "Full access"
                                ? "text-slate-300"
                                : cell.access === "Oversight"
                                  ? "text-sky-700"
                                  : cell.access === "Complete"
                                    ? "text-emerald-700"
                                    : "text-slate-500",
                            ].join(" ")}
                          >
                            {cell.detail}
                          </p>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader
            icon="chart"
            eyebrow="Export centre"
            title="Report creator"
            subtitle="Generate the output you need without cluttering the live dashboard."
          />
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Queue {offlineQueueCount}
          </div>
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
                    "rounded-2xl border px-4 py-3 text-left transition",
                    selected ? "border-slate-900 bg-slate-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]" : "border-slate-200 bg-white",
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
                    selected ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white",
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
                      selected ? "bg-emerald-500/12 text-emerald-700" : "bg-slate-100 text-slate-500",
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
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{section.description}</p>
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
            className="h-14 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            Export PDF report
          </button>
          <button
            onClick={onExportAuditPack}
            className="h-14 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-800"
          >
            Export text audit pack
          </button>
        </div>
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
              />
            ))}
        </div>
      </section>
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
}) {
  const nameError = validationAttempted && !scheduleName.trim();
  const auditsError = validationAttempted && scheduleAudits.length === 0;
  const startDateError = validationAttempted && !startDate;
  const auditorsError = validationAttempted && selectedAuditors.length === 0;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
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
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Schedule view</label>
            <select
              value={filter}
              onChange={(event) => onFilterChange(event.target.value as ScheduleListFilter)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="Live">Live</option>
              <option value="Archived">Archived</option>
              <option value="All schedules">All schedules</option>
            </select>
          </div>
          <button onClick={onOpenNew} className="h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white">
            Add new schedule
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <SectionHeader
          icon="clock"
          eyebrow="Schedule list"
          title={filter}
          subtitle="Open a schedule to edit its timings, audits, auditors, and revision history."
        />
        <div className="mt-4 space-y-3">
          {schedules.length === 0 ? (
            <EmptyPanel title="No schedules in this view" text="Add a new schedule or switch the filter to see archived revisions." />
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-[1.4rem] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{schedule.scheduleName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <MetaPill icon="spark" label={`${schedule.lifecycle} rev ${schedule.versionLabel}`} />
                      <MetaPill icon="clipboard" label={`${schedule.audits.length} audits`} />
                      <MetaPill icon="user" label={`${schedule.auditors.length} auditors`} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Start {schedule.startDate} {schedule.endDate ? `• End ${schedule.endDate}` : "• No end date"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onOpenSchedule(schedule.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                      Edit
                    </button>
                    {schedule.lifecycle === "Archived" && (
                      <button onClick={() => onReactivate(schedule.id)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
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
                  "h-12 w-full rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none transition",
                  nameError ? "border-rose-300" : "border-slate-200 focus:border-slate-400",
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
                    <button
                      key={audit.id}
                      onClick={() => onToggleAudit(audit.id, audit.name)}
                      className={[
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left",
                        selected ? "border-slate-900 bg-white" : "border-slate-200 bg-white",
                      ].join(" ")}
                    >
                      <span className="text-sm font-semibold text-slate-900">{audit.name}</span>
                      <span className={["rounded-full px-3 py-1 text-xs font-semibold", selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"].join(" ")}>
                        {selected ? "Added" : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {scheduleAudits.map((audit) => {
              const auditError = validationAttempted && audit.days.length === 0;
              return (
                <div key={audit.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{audit.auditName}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scheduleDayOptions.map((day) => {
                      const selected = audit.days.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => onToggleAuditDay(audit.auditId, day)}
                          className={[
                            "rounded-full px-3 py-2 text-xs font-semibold",
                            selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {auditError && <p className="mt-2 text-xs font-semibold text-rose-600">Select at least one day.</p>}
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <select
                      value={audit.frequency}
                      onChange={(event) => onAuditFieldChange(audit.auditId, "frequency", event.target.value)}
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
                    >
                      {scheduleFrequencyOptions.map((frequency) => (
                        <option key={frequency} value={frequency}>{frequency}</option>
                      ))}
                    </select>
                    <select
                      value={audit.liveTime}
                      onChange={(event) => onAuditFieldChange(audit.auditId, "liveTime", event.target.value)}
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
                    >
                      {scheduleTimeOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <select
                      value={String(audit.completionHours)}
                      onChange={(event) => onAuditFieldChange(audit.auditId, "completionHours", event.target.value)}
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
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
                    "h-12 w-full rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none transition",
                    startDateError ? "border-rose-300" : "border-slate-200 focus:border-slate-400",
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
                    "h-12 w-full rounded-2xl border px-4 text-sm outline-none transition",
                    continuous
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : "border-slate-200 bg-white text-slate-900 focus:border-slate-400",
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
                    <button
                      key={auditor}
                      onClick={() => onToggleAuditor(auditor)}
                      className={[
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left",
                        selected ? "border-slate-900 bg-white" : "border-slate-200 bg-white",
                      ].join(" ")}
                    >
                      <span className="text-sm font-semibold text-slate-900">{auditor}</span>
                      <span className={["rounded-full px-3 py-1 text-xs font-semibold", selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"].join(" ")}>
                        {selected ? "Added" : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={onSave} className="h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white">
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
      <section className={["rounded-[1.75rem] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]", themeMode === "dark" ? "bg-slate-900" : "bg-slate-950"].join(" ")}>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Account settings</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{godMode ? "Device settings" : "Manage your profile"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
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
              <label className="mt-3 inline-flex h-10 cursor-pointer items-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white">
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
        <p className="mt-1 text-sm text-slate-500">Choose how QMS Precast looks on this tablet.</p>
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
                    ? "border-slate-900 bg-slate-900 text-white shadow-[0_16px_28px_rgba(15,23,42,0.18)]"
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
            className="mt-4 h-12 w-full rounded-2xl bg-slate-900 text-sm font-semibold text-white"
          >
            Save account settings
          </button>
        </section>
      )}
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
                      Add images to support failures, no conformances, or proof of completion.
                    </p>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white">
                    Add photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        if (event.target.files?.length) {
                          onAddEvidence(question.id, event.target.files);
                          event.target.value = "";
                        }
                      }}
                    />
                  </label>
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
            canSubmit ? "bg-slate-900 active:scale-[0.99]" : "bg-slate-300",
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
  onTemplateNameChange,
  onTemplateQuestionChange,
  onTemplateQuestionTypeChange,
  onAddTemplateQuestion,
  onRemoveTemplateQuestion,
  onAddTemplate,
  onToggleTemplate,
  onAddSchedule,
  onSelectFolder,
  onVerifyOnboarding,
  onVerifyAudits,
  onVerifyResponseSheet,
  onSyncForms,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteUser,
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
  onTemplateNameChange: (value: string) => void;
  onTemplateQuestionChange: (value: string) => void;
  onTemplateQuestionTypeChange: (value: AuditQuestion["fieldType"]) => void;
  onAddTemplateQuestion: () => void;
  onRemoveTemplateQuestion: (questionId: string) => void;
  onAddTemplate: () => void;
  onToggleTemplate: (templateId: string) => void;
  onAddSchedule: () => void;
  onSelectFolder: (folderId: string) => void;
  onVerifyOnboarding: () => void;
  onVerifyAudits: () => void;
  onVerifyResponseSheet: () => void;
  onSyncForms: () => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: Role) => void;
  onInviteUser: () => void;
}) {
  const adminOnly = !canAccessAdmin(currentUser.role);
  const masterOnly = currentUser.role !== "Master";

  return (
    <div className="space-y-4">
      {masterOnly && (
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <SectionHeader
            icon="shield"
            eyebrow="Platform control"
            title="God Mode only"
            subtitle="Company provisioning, Google connection, and live app population are restricted to platform control."
          />
          <div className="rounded-[1.5rem] bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Platform setup is managed in God Mode</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Google connection, company folder linking, and app population are only available from the God Mode account.
            </p>
          </div>
        </section>
      )}

      {currentUser.role === "Master" && (
        <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
              <AppIcon name="shield" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">God Mode control</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Onboard new company</h2>
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
            <p className="text-sm font-semibold text-white">Setup status</p>
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
            <div className="mt-4 flex flex-wrap gap-3">
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
                    : "Link company workspace"}
              </button>
              {selectedFolder && (
                <a
                  href={`https://drive.google.com/drive/folders/${selectedFolder.id}`}
                  className="inline-flex h-12 items-center rounded-2xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open folder in Google Drive
                </a>
              )}
              {googleConnected && (
                <button
                  onClick={onGoogleDisconnect}
                  disabled={adminOnly}
                  className={[
                    "h-12 rounded-2xl px-5 text-sm font-semibold transition",
                    adminOnly
                      ? "bg-white/10 text-slate-400"
                      : "border border-white/20 bg-transparent text-white hover:bg-white/10",
                  ].join(" ")}
                >
                  Disconnect Google
                </button>
              )}
              <button
                onClick={onSyncForms}
                disabled={adminOnly || !backendConfigured || !selectedFolder || folderInspectionLoading}
                className={[
                  "h-12 rounded-2xl px-5 text-sm font-semibold transition",
                  adminOnly || !backendConfigured || !selectedFolder || folderInspectionLoading
                    ? "bg-white/10 text-slate-400"
                    : "bg-emerald-400 text-slate-950 shadow-[0_14px_28px_rgba(16,185,129,0.22)] active:scale-[0.99]",
                ].join(" ")}
              >
                {folderInspectionLoading
                  ? "Checking links..."
                  : syncState === "Synced"
                    ? "Populate app again"
                    : "Populate app"}
              </button>
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
                          ? "bg-emerald-500/12 text-emerald-300"
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

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
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
            className="h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white"
          >
            Enable browser notifications
          </button>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Invite emails open as mail drafts from the device, while live alerts use browser notifications.
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
          <button onClick={onValidateWorkspace} className="h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white">
            {workspaceValidationLoading ? "Validating..." : "Validate workspace"}
          </button>
          <button onClick={onRepairWorkspace} className="h-12 rounded-2xl bg-emerald-50 px-5 text-sm font-semibold text-emerald-700">
            Repair / upgrade workspace
          </button>
        </div>
      </section>

      {syncState === "Synced" && selectedFolder && (
        <section className="rounded-[1.75rem] border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-[0_16px_36px_rgba(16,185,129,0.10)]">
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

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
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
              className="h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white"
            >
              Create template
            </button>
          </div>
          {templateDraftQuestions.length > 0 && (
            <div className="mt-4 space-y-2">
              {templateDraftQuestions.map((question, index) => (
                <div key={question.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
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
                    template.active ? "bg-emerald-500/12 text-emerald-700" : "bg-slate-200 text-slate-700",
                  ].join(" ")}
                >
                  {template.active ? "Active" : "Inactive"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">User management</h3>
            <p className="text-sm text-slate-500">
              {currentUser.role === "Master"
                ? "God Mode can create Admin, Manager, and Auditor users."
                : currentUser.role === "Admin"
                  ? "Admins can create Admin, Manager, and Auditor users."
                  : "User creation is not available on this account."}
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {getRoleDisplayName(currentUser.role)}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">User email</label>
                <input
                  value={inviteEmailInput}
                  onChange={(event) => onInviteEmailChange(event.target.value)}
                  placeholder="name@company.com"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Role to create</label>
                <select
                  value={inviteRoleInput}
                  onChange={(event) => onInviteRoleChange(event.target.value as Role)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {creatableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {creatableRoles.map((role) => (
                <MiniPill key={role} label={`Can create ${role}`} active />
              ))}
            </div>
            <button
              onClick={onInviteUser}
              className="mt-4 h-12 w-full rounded-2xl bg-slate-900 text-sm font-semibold text-white transition active:scale-[0.99]"
            >
              Send onboarding link
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
                <div key={invite.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{invite.email}</p>
                    <p className="truncate text-xs text-slate-500">
                      {invite.role} • sent by {invite.invitedBy} • {invite.sentAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {invite.mailtoUrl && (
                      <a href={invite.mailtoUrl} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                        Open email
                      </a>
                    )}
                    <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {invite.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: "green" | "amber" | "red";
}) {
  const toneClasses =
    tone === "green"
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20"
      : tone === "red"
        ? "bg-rose-500/12 text-rose-700 ring-rose-500/20"
        : "bg-amber-500/12 text-amber-700 ring-amber-500/20";

  return (
    <div className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 p-4 shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>{title}</div>
        <div
          className={[
            "h-10 w-10 rounded-2xl",
            tone === "green" ? "bg-emerald-500/12" : tone === "red" ? "bg-rose-500/12" : "bg-amber-500/12",
          ].join(" ")}
        />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
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
        active ? "bg-emerald-500/12 text-emerald-700" : "bg-slate-100 text-slate-600",
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
          ok ? "bg-emerald-500/12 text-emerald-300" : "bg-amber-500/12 text-amber-300",
        ].join(" ")}
      >
        {ok ? "Found" : "Missing"}
      </div>
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
    tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
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
}: {
  title: string;
  subtitle: string;
  audits: Audit[];
  status: AuditStatus;
  onOpenAudit: (auditId: string) => void;
  expanded?: boolean;
  drafts?: Record<string, AuditDraft>;
}) {
  return (
    <div className={["rounded-[1.6rem] p-4 ring-1 shadow-[0_16px_30px_rgba(15,23,42,0.06)]", statusStyles[status].soft, statusStyles[status].ring].join(" ")}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${statusStyles[status].dot}`} />
          <div>
            <p className={`text-sm font-semibold ${statusStyles[status].text}`}>{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">{audits.length}</div>
      </div>

      <div className="space-y-3">
        {audits.map((audit) => (
          <button
            key={audit.id}
            onClick={() => onOpenAudit(audit.id)}
            className={["w-full rounded-[1.35rem] bg-white/95 px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition active:scale-[0.99]", expanded ? "min-h-[6rem]" : ""].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{audit.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {audit.siteArea} • {audit.priority} • Owner {audit.owner}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-600">{getDueWarning(audit.dueHours)}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {drafts[audit.id] ? `Draft saved ${drafts[audit.id].updatedAt}` : `Last completed ${audit.lastCompletedAt}`}
                </p>
              </div>
              <div className="shrink-0 space-y-2 text-right">
                <StatusBadge status={getAuditTrafficStatus(audit.dueHours)} />
                <div className="text-xs text-slate-400">{audit.dueLabel}</div>
              </div>
            </div>
          </button>
        ))}
        {audits.length === 0 && <div className="rounded-[1.35rem] bg-white/85 px-4 py-4 text-sm text-slate-500 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">No audits in this group.</div>}
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
      ? "bg-emerald-600 text-white"
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
          disabled ? "bg-slate-200 text-slate-400" : active ? "bg-emerald-500/12 text-emerald-700" : "bg-slate-900 text-white",
        ].join(" ")}
      >
        {active ? "Ready" : actionLabel}
      </button>
    </div>
  );
}

function FlowItem({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
        {number}
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
        <div className={["shrink-0 rounded-full px-3 py-1 text-xs font-semibold", active ? "bg-emerald-500/12 text-emerald-700" : "bg-white text-slate-600"].join(" ")}>
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
            disabled || active ? "bg-slate-200 text-slate-400" : "bg-slate-900 text-white active:scale-[0.99]",
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
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
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
