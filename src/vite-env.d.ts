/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_DEBUG_UI?: string;
  readonly VITE_SHOW_ADMIN_DEBUG_UI?: string;
  readonly VITE_ENABLE_DEMO_LOGIN?: string;
  readonly VITE_GODMODE_USERNAME?: string;
  readonly VITE_GODMODE_PASSWORD?: string;
}
