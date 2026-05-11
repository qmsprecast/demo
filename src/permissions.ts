/**
 * Central role and navigation access rules for bert.
 * All boolean rules live here; App.tsx imports and uses these helpers only.
 */

export type Role = "Master" | "Admin" | "Manager" | "Auditor";

/** Must stay aligned with `Screen` minus `"complete"` in App.tsx */
export type NavItemId =
  | "dashboard"
  | "audits"
  | "actions"
  | "nonConformance"
  | "incidents"
  | "reports"
  | "sync"
  | "schedules"
  | "admin"
  | "onboarding"
  | "account";

export type HomeScreen = Extract<NavItemId, "dashboard" | "onboarding">;

/** High-level capabilities — implemented by delegating to the same helpers as navigation. */
export type PermissionCapability =
  | "accessAdmin"
  | "accessControlScreen"
  | "accessSchedules"
  | "accessAdminOnboardingWorkspace"
  | "accessOnboardingNav"
  | "accessReports"
  | "accessActions"
  | "accessCompletedNcrReports"
  | "accessAuditsCentre"
  | "submitIncidents"
  | "investigateIncidents"
  | "editLegalName"
  | "nav:dashboard"
  | "nav:audits"
  | "nav:actions"
  | "nav:nonConformance"
  | "nav:incidents"
  | "nav:reports"
  | "nav:sync"
  | "nav:schedules"
  | "nav:admin"
  | "nav:onboarding"
  | "nav:account"
  | "manageUsers"
  | "manageSchedules"
  | "manageTemplates"
  | "assignActions"
  | "verifyActions"
  | "exportReports"
  | "repairWorkspace"
  | "viewAllReports";

export interface RoleTaskPermissions {
  canManageUsers: boolean;
  canManageSchedules: boolean;
  canManageTemplates: boolean;
  canAssignActions: boolean;
  canVerifyActions: boolean;
  canExportReports: boolean;
  canRepairWorkspace: boolean;
  canViewAllReports: boolean;
}

export function canAccessAdmin(role: Role) {
  return role === "Master" || role === "Admin";
}

/** Control (admin) workspace tab — company Admin only; God Mode uses Onboarding only. */
export function canAccessControlScreen(role: Role) {
  return role === "Admin";
}

export function getHomeScreenForRole(role: Role): HomeScreen {
  if (role === "Master") {
    return "onboarding";
  }
  return "dashboard";
}

export function canAccessSchedules(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager";
}

/** Master or Admin may use the in-app onboarding workspace tab (folder linking, user invites). */
export function canAccessAdminOnboardingWorkspace(role: Role) {
  return role === "Master" || role === "Admin";
}

/** Dedicated Onboarding menu — company Admin and God Mode (platform setup). */
export function canAccessOnboardingNav(role: Role) {
  return role === "Admin" || role === "Master";
}

export function canAccessReports(role: Role) {
  return role !== "Auditor";
}

export function canAccessActions(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager" || role === "Auditor";
}

export function canAccessCompletedNcrReports(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager";
}

export function canAccessAuditsCentre(role: Role) {
  return role !== "Auditor";
}

export function canSubmitIncidents(_role: Role) {
  return true;
}

export function canInvestigateIncidents(role: Role) {
  return role === "Master" || role === "Admin" || role === "Manager";
}

export function canEditLegalName(role: Role) {
  return role === "Master" || role === "Admin";
}

export function canRoleAccessNavItem(role: Role, itemId: NavItemId) {
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

export function getRolePermissions(role: Role): RoleTaskPermissions {
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

export function getRoleDisplayName(role: Role) {
  return role === "Master" ? "God Mode" : role;
}

export function getCreatableRoles(role: Role): Role[] {
  if (role === "Master" || role === "Admin") {
    return ["Admin", "Manager", "Auditor"];
  }
  if (role === "Manager") {
    return ["Manager", "Auditor"];
  }
  return [];
}

const NAV_CAPABILITY_MAP: Record<NavItemId, PermissionCapability> = {
  dashboard: "nav:dashboard",
  audits: "nav:audits",
  actions: "nav:actions",
  nonConformance: "nav:nonConformance",
  incidents: "nav:incidents",
  reports: "nav:reports",
  sync: "nav:sync",
  schedules: "nav:schedules",
  admin: "nav:admin",
  onboarding: "nav:onboarding",
  account: "nav:account",
};

/**
 * Typed capability checks — each case delegates to the same functions used for nav and UI gates.
 */
export function can(role: Role, capability: PermissionCapability): boolean {
  switch (capability) {
    case "accessAdmin":
      return canAccessAdmin(role);
    case "accessControlScreen":
      return canAccessControlScreen(role);
    case "accessSchedules":
      return canAccessSchedules(role);
    case "accessAdminOnboardingWorkspace":
      return canAccessAdminOnboardingWorkspace(role);
    case "accessOnboardingNav":
      return canAccessOnboardingNav(role);
    case "accessReports":
      return canAccessReports(role);
    case "accessActions":
      return canAccessActions(role);
    case "accessCompletedNcrReports":
      return canAccessCompletedNcrReports(role);
    case "accessAuditsCentre":
      return canAccessAuditsCentre(role);
    case "submitIncidents":
      return canSubmitIncidents(role);
    case "investigateIncidents":
      return canInvestigateIncidents(role);
    case "editLegalName":
      return canEditLegalName(role);
    case "nav:dashboard":
      return canRoleAccessNavItem(role, "dashboard");
    case "nav:audits":
      return canRoleAccessNavItem(role, "audits");
    case "nav:actions":
      return canRoleAccessNavItem(role, "actions");
    case "nav:nonConformance":
      return canRoleAccessNavItem(role, "nonConformance");
    case "nav:incidents":
      return canRoleAccessNavItem(role, "incidents");
    case "nav:reports":
      return canRoleAccessNavItem(role, "reports");
    case "nav:sync":
      return canRoleAccessNavItem(role, "sync");
    case "nav:schedules":
      return canRoleAccessNavItem(role, "schedules");
    case "nav:admin":
      return canRoleAccessNavItem(role, "admin");
    case "nav:onboarding":
      return canRoleAccessNavItem(role, "onboarding");
    case "nav:account":
      return canRoleAccessNavItem(role, "account");
    case "manageUsers":
      return getRolePermissions(role).canManageUsers;
    case "manageSchedules":
      return getRolePermissions(role).canManageSchedules;
    case "manageTemplates":
      return getRolePermissions(role).canManageTemplates;
    case "assignActions":
      return getRolePermissions(role).canAssignActions;
    case "verifyActions":
      return getRolePermissions(role).canVerifyActions;
    case "exportReports":
      return getRolePermissions(role).canExportReports;
    case "repairWorkspace":
      return getRolePermissions(role).canRepairWorkspace;
    case "viewAllReports":
      return getRolePermissions(role).canViewAllReports;
  }
}

/** Map a nav item to its capability key for `can(role, …)`. */
export function navItemToCapability(itemId: NavItemId): PermissionCapability {
  return NAV_CAPABILITY_MAP[itemId];
}
