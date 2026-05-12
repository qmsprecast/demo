import type { NavItemId } from "../types/navigation";

export const navItems = [
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
] as const satisfies ReadonlyArray<{ id: NavItemId; label: string; icon: string }>;
