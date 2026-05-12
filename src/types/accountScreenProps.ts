import type { Role } from "../permissions";

export type ThemeMode = "light" | "dark";

export type AccountUser = {
  username: string;
  password: string;
  role: Role;
  name: string;
};

export type AccountSettingsScreenProps = {
  currentUser: AccountUser;
  accountNameInput: string;
  accountPhotoUrl: string;
  themeMode: ThemeMode;
  companyName: string;
  slatePrimaryCtaInteract: string;
  onAccountNameChange: (value: string) => void;
  onAccountPhotoChange: (file: File) => void;
  onThemeModeChange: (value: ThemeMode) => void;
  onSave: () => void;
};
