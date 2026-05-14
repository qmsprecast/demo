/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Short app name in UI chrome (default `bert.` in code). */
  readonly VITE_APP_NAME?: string;
  /** When `"true"`, shows role switcher, layout/landscape preview, demo badges, dashboard layout tools. */
  readonly VITE_SHOW_DEBUG_UI?: string;
  readonly VITE_SHOW_ADMIN_DEBUG_UI?: string;
  readonly VITE_ENABLE_DEMO_LOGIN?: string;
  readonly VITE_GODMODE_USERNAME?: string;
  readonly VITE_GODMODE_PASSWORD?: string;
}
