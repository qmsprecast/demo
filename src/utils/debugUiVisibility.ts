/**
 * Central gate for demo/debug-only shell chrome (role switcher, layout preview,
 * empty-state dev hints, demo badges, etc.).
 *
 * Visible when running Vite in development **or** when `VITE_SHOW_DEBUG_UI=true`
 * (e.g. to surface the same tools in a production build preview).
 *
 * Admin-only extras still respect `VITE_SHOW_ADMIN_DEBUG_UI` when not in debug UI.
 */
export function isDebugUiAllowed(): boolean {
  return import.meta.env.DEV === true || import.meta.env.VITE_SHOW_DEBUG_UI === "true";
}

export function isAdminDebugUiAllowed(userRole: string | undefined): boolean {
  if (isDebugUiAllowed()) return true;
  const raw = String(import.meta.env.VITE_SHOW_ADMIN_DEBUG_UI || "").trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") {
    return userRole === "Admin";
  }
  return false;
}
