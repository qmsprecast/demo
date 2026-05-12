import type { NavItemId } from "../types/navigation";

export const navItems = [
  { id: "dashboard", label: "Home", icon: "dashboard" },
  { id: "audits", label: "Audits", icon: "clipboard" },
  { id: "actions", label: "Actions", icon: "warningTriangle" },
  { id: "nonConformance", label: "NCR", icon: "checklist" },
  { id: "incidents", label: "Incidents", icon: "camera" },
  { id: "schedules", label: "Schedule", icon: "clock" },
  { id: "reports", label: "Reports", icon: "chart" },
  { id: "sync", label: "Sync", icon: "sync" },
  { id: "admin", label: "Admin", icon: "shield" },
  { id: "onboarding", label: "Setup", icon: "spark" },
  { id: "account", label: "Account", icon: "user" },
] as const satisfies ReadonlyArray<{ id: NavItemId; label: string; icon: string }>;
