/**
 * Central gate for demo/debug-only shell chrome (role switcher, layout preview,
 * empty-state dev hints, demo badges, etc.).
 *
 * **Customer default:** hidden in both dev and production unless you opt in with
 * `VITE_SHOW_DEBUG_UI=true` (e.g. in `.env.local`). This avoids `npm run dev` looking
 * like a debug build while you iterate on real UX.
 *
 * Admin-only extras still respect `VITE_SHOW_ADMIN_DEBUG_UI` when not in debug UI.
 */
export function isDebugUiAllowed(): boolean {
  return String(import.meta.env.VITE_SHOW_DEBUG_UI || "").trim().toLowerCase() === "true";
}

export function isAdminDebugUiAllowed(userRole: string | undefined): boolean {
  if (isDebugUiAllowed()) return true;
  const raw = String(import.meta.env.VITE_SHOW_ADMIN_DEBUG_UI || "").trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") {
    return userRole === "Admin";
  }
  return false;
}
