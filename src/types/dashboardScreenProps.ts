/**
 * Structural props types for DashboardScreen — mirrors App.tsx domain types so the screen
 * does not import App.tsx. Keep aligned when workspace models change.
 */

import type { Role } from "../permissions";
import type { ActionItem, Audit, AuditStatus } from "./reportsScreenProps";

export type ThemeMode = "light" | "dark";
export type Answer = "pass" | "nc" | "fail";

export type User = {
  username: string;
  password: string;
  role: Role;
  name: string;
};

export type EvidenceItem = {
  id: string;
  name: string;
  previewUrl: string;
  addedAt: string;
  uploaded?: boolean;
};

export type AuditDraft = {
  responses: Record<string, Answer>;
  notes: Record<string, string>;
  evidence: Record<string, EvidenceItem[]>;
  updatedAt: string;
};

export type CompanyFolder = {
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

export type CompanySheetSyncStatus = {
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

export type WorkspaceValidation = {
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

export type AuditorTaskDashboardProps = {
  currentUser: User;
  groupedAudits: Record<AuditStatus, Audit[]>;
  assignedAudits: Audit[];
  drafts: Record<string, AuditDraft>;
  actions: ActionItem[];
  pendingSyncCount: number;
  failedSyncCount: number;
  onOpenAudit: (auditId: string) => void;
  slatePrimaryCtaInteract: string;
};

export type ManagerDashboardProps = {
  groupedAudits: Record<AuditStatus, Audit[]>;
  assignedAudits: Audit[];
  actions: ActionItem[];
  onOpenAudit: (auditId: string) => void;
  onAdvanceAction: (actionId: string, nextStatus?: ActionItem["status"]) => void;
  recurringFailedQuestions: [string, number][];
};

export type AdminDashboardProps = {
  groupedAudits: Record<AuditStatus, Audit[]>;
  assignedAudits: Audit[];
  actions: ActionItem[];
  pendingSyncCount: number;
  failedSyncCount: number;
  reportUsersCount: number;
  activeSchedulesCount: number;
  templatesCount: number;
  onOpenAudit: (auditId: string) => void;
  onAdvanceAction: (actionId: string, nextStatus?: ActionItem["status"]) => void;
};
