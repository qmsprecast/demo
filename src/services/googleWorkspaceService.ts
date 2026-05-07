type JsonResponse = Record<string, unknown> & { ok?: boolean; error?: string };

async function parseResponse<T extends JsonResponse>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Google workspace request failed.");
  }
  return payload;
}

export const googleWorkspaceService = {
  async getStatus<T extends JsonResponse>() {
    return parseResponse<T>(await fetch("/api/google/status"));
  },
  async getOnboardingSubmissions<T extends JsonResponse>() {
    return parseResponse<T>(await fetch("/api/onboarding/submissions"));
  },
  async inspectCompanyFolder<T extends JsonResponse>(folderId: string) {
    return parseResponse<T>(await fetch(`/api/company-folder/${encodeURIComponent(folderId)}`));
  },
  async getGoogleFile<T extends JsonResponse>(fileId: string) {
    return parseResponse<T>(await fetch(`/api/google-file/${encodeURIComponent(fileId)}`));
  },
  async getGoogleFormsFolder<T extends JsonResponse>(folderId: string) {
    return parseResponse<T>(await fetch(`/api/google-forms-folder/${encodeURIComponent(folderId)}`));
  },
  async getCompanySheet<T extends JsonResponse>(folderId: string) {
    return parseResponse<T>(await fetch(`/api/company-sheet/${encodeURIComponent(folderId)}`));
  },
  async getCompanySheetById<T extends JsonResponse>(sheetId: string) {
    return parseResponse<T>(await fetch(`/api/google-sheet-by-id/${encodeURIComponent(sheetId)}`));
  },
  startGoogleLogin() {
    window.location.href = "/auth/google/login";
  },
  async disconnectGoogle() {
    const response = await fetch("/auth/google/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    return parseResponse<JsonResponse>(response);
  },
};
