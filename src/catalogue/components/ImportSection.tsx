import { FormEvent, useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { aoaToObjects, parsePastedCsv, rowsToProducts, type CatalogueProduct } from "@shared/catalogueUtils";

export async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error(res.statusText || "Invalid server response.");
  }
  if (!res.ok || data.ok === false) {
    const err = typeof data.error === "string" ? data.error : res.statusText || "Request failed";
    const code = typeof data.code === "string" ? ` [${data.code}]` : "";
    throw new Error(`${err}${code}`);
  }
  return data;
}

function localXlsxSheetNames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buf = reader.result;
        if (!(buf instanceof ArrayBuffer)) {
          reject(new Error("Could not read file."));
          return;
        }
        const workbook = XLSX.read(buf, { type: "array" });
        resolve(workbook.SheetNames || []);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Invalid XLSX."));
      }
    };
    reader.onerror = () => reject(new Error("File read error."));
    reader.readAsArrayBuffer(file);
  });
}

function localXlsxTabToProducts(file: File, tab: string): Promise<{ headers: string[]; products: CatalogueProduct[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buf = reader.result;
        if (!(buf instanceof ArrayBuffer)) {
          reject(new Error("Could not read file."));
          return;
        }
        const workbook = XLSX.read(buf, { type: "array", cellDates: true });
        const name =
          workbook.SheetNames.find((sheetName: string) => sheetName.trim().toLowerCase() === tab.trim().toLowerCase()) ??
          workbook.SheetNames[0];
        if (!name) {
          resolve({ headers: [], products: [] });
          return;
        }
        const sheet = workbook.Sheets[name];
        if (!sheet) {
          resolve({ headers: [], products: [] });
          return;
        }
        const matrix = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false,
        }) as unknown[][];
        const { headers, rows } = aoaToObjects(matrix);
        resolve({ headers, products: rowsToProducts(rows, headers) });
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Invalid XLSX."));
      }
    };
    reader.onerror = () => reject(new Error("File read error."));
    reader.readAsArrayBuffer(file);
  });
}

type Props = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
  onProductsLoaded: (products: CatalogueProduct[]) => void;
};

export function ImportSection({ busy, setBusy, error, setError, onProductsLoaded }: Props) {
  const [googleUrl, setGoogleUrl] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [tab, setTab] = useState("");
  const [csvPaste, setCsvPaste] = useState("");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localTabs, setLocalTabs] = useState<string[]>([]);

  const clearError = () => setError(null);

  const loadGoogleTabs = useCallback(async () => {
    clearError();
    setBusy(true);
    try {
      const qs = new URLSearchParams({ url: googleUrl.trim() });
      const res = await fetch(`/api/google-tabs?${qs.toString()}`);
      const data = await readApiJson(res);
      const nextTabs = Array.isArray(data.tabs) ? (data.tabs as string[]) : [];
      setLocalFile(null);
      setLocalTabs([]);
      setTabs(nextTabs);
      setTab(nextTabs[0] ?? "");
    } catch (e) {
      setTabs([]);
      setTab("");
      setError(e instanceof Error ? e.message : "Failed to load tabs.");
    } finally {
      setBusy(false);
    }
  }, [googleUrl, setBusy, setError]);

  const loadGoogleSheet = useCallback(async () => {
    clearError();
    setBusy(true);
    try {
      const qs = new URLSearchParams({ url: googleUrl.trim() });
      if (tab.trim()) qs.set("tab", tab.trim());
      const res = await fetch(`/api/google-sheet?${qs.toString()}`);
      const data = await readApiJson(res);
      const headers = Array.isArray(data.headers) ? (data.headers as string[]) : [];
      const rows = Array.isArray(data.rows) ? (data.rows as Record<string, string>[]) : [];
      onProductsLoaded(rowsToProducts(rows, headers));
      setLocalFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sheet.");
    } finally {
      setBusy(false);
    }
  }, [googleUrl, tab, onProductsLoaded, setBusy, setError]);

  const applyCsvPaste = useCallback(() => {
    clearError();
    try {
      const matrix = parsePastedCsv(csvPaste);
      const { headers, rows } = aoaToObjects(matrix);
      onProductsLoaded(rowsToProducts(rows, headers));
      setLocalFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse CSV.");
    }
  }, [csvPaste, onProductsLoaded, setError]);

  const onLocalXlsx = useCallback(
    async (file: File | null) => {
      clearError();
      if (!file) {
        setLocalFile(null);
        setLocalTabs([]);
        return;
      }
      setBusy(true);
      try {
        setLocalFile(file);
        const names = await localXlsxSheetNames(file);
        setLocalTabs(names);
        const t = names[0] ?? "";
        setTab(t);
        const { headers, products: next } = await localXlsxTabToProducts(file, t);
        onProductsLoaded(next.length ? next : rowsToProducts([], headers));
      } catch (e) {
        setLocalFile(null);
        setLocalTabs([]);
        setError(e instanceof Error ? e.message : "Invalid spreadsheet file.");
      } finally {
        setBusy(false);
      }
    },
    [onProductsLoaded, setBusy, setError],
  );

  const reloadLocalTab = useCallback(async () => {
    if (!localFile) return;
    clearError();
    setBusy(true);
    try {
      const { products: next } = await localXlsxTabToProducts(localFile, tab);
      onProductsLoaded(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read tab.");
    } finally {
      setBusy(false);
    }
  }, [localFile, tab, onProductsLoaded, setBusy, setError]);

  const onSubmitGoogle = (ev: FormEvent) => {
    ev.preventDefault();
    void loadGoogleSheet();
  };

  return (
    <div className="no-print space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Google Sheet</h2>
        <form className="flex flex-col gap-3" onSubmit={onSubmitGoogle}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={googleUrl}
            onChange={(e) => setGoogleUrl(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void loadGoogleTabs()}
              disabled={busy || !googleUrl.trim()}
            >
              Load tabs
            </button>
            <select
              className="min-w-[10rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              value={tab}
              onChange={(e) => setTab(e.target.value)}
              disabled={!tabs.length && !localTabs.length}
            >
              {(localFile ? localTabs : tabs).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              disabled={busy || !googleUrl.trim()}
            >
              Load sheet rows
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Local XLSX</h2>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
          onChange={(e) => void onLocalXlsx(e.target.files?.[0] ?? null)}
        />
        {localFile ? (
          <p className="text-xs text-slate-500">
            Using <span className="font-medium">{localFile.name}</span>. Change the tab above and{" "}
            <button type="button" className="font-medium text-blue-600 hover:underline" onClick={() => void reloadLocalTab()}>
              apply tab
            </button>{" "}
            to reload rows from the workbook.
          </p>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pasted CSV</h2>
        <textarea
          className="min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Paste CSV (header row first)..."
          value={csvPaste}
          onChange={(e) => setCsvPaste(e.target.value)}
        />
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          onClick={applyCsvPaste}
        >
          Parse CSV into catalogue
        </button>
      </section>
    </div>
  );
}
