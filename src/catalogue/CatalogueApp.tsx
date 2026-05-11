import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { buildCatalogueHtml } from "@shared/buildCatalogueDocument";
import {
  defaultProductImageSettings,
  emptyEditorState,
  getProductImageSettings,
  initialPagesFromProducts,
  insertCoverPage,
  redistributePages,
  removeCoverPage,
  type CatalogueEditorState,
  type ColsPerPage,
} from "@shared/catalogueModel";
import type { CatalogueProduct } from "@shared/catalogueUtils";
import { ImportSection } from "./components/ImportSection";
import { useTemplateStorage } from "./hooks/useTemplateStorage";
import { arrayMove } from "./lib/arrayMove";
import { trimNearUniformBorder } from "./lib/imageEnhance";

function pruneImageSettings(products: CatalogueProduct[], settings: Record<string, ReturnType<typeof defaultProductImageSettings>>) {
  const ids = new Set(products.map((p) => p.id));
  const next = { ...settings };
  for (const k of Object.keys(next)) {
    if (!ids.has(k)) delete next[k];
  }
  for (const p of products) {
    if (!next[p.id]) next[p.id] = defaultProductImageSettings();
  }
  return next;
}

export default function CatalogueApp() {
  const [editor, setEditor] = useState<CatalogueEditorState>(() => emptyEditorState());
  const deferred = useDeferredValue(editor);
  const [activePage, setActivePage] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("default");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const templates = useTemplateStorage();

  const previewHtml = useMemo(
    () => buildCatalogueHtml(deferred, { fullDocument: true, documentTitle: deferred.defaults.headerTitle }),
    [deferred],
  );

  useEffect(() => {
    const el = iframeRef.current;
    const doc = el?.contentDocument;
    if (!doc) return;
    const sheets = [...doc.querySelectorAll(".catalogue-sheet")];
    if (!sheets.length) return;
    const idx = Math.min(Math.max(activePage, 0), sheets.length - 1);
    sheets[idx]?.scrollIntoView({ block: "start" });
  }, [previewHtml, activePage]);

  useEffect(() => {
    setActivePage((i) => {
      if (!editor.pages.length) return 0;
      return Math.min(i, editor.pages.length - 1);
    });
  }, [editor.pages.length]);

  const onProductsLoaded = useCallback((products: CatalogueProduct[]) => {
    setEditor((s) => ({
      ...s,
      products,
      pages: initialPagesFromProducts(products),
      productImageSettings: pruneImageSettings(products, s.productImageSettings),
    }));
    setActivePage(0);
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<CatalogueProduct>) => {
    setEditor((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const replaceProductImage = useCallback((id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      updateProduct(id, { imageUrl: url });
    };
    reader.readAsDataURL(file);
  }, [updateProduct]);

  const readFileAsUrl = useCallback((file: File | null, onDone: (url: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      onDone(url);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDragStart = (index: number) => setDragIndex(index);
  const onDragEnterRow = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setEditor((s) => ({
      ...s,
      products: arrayMove(s.products, dragIndex, index),
    }));
    setDragIndex(index);
  };
  const onDragEnd = () => setDragIndex(null);

  const selectedPage = editor.pages[activePage];

  const exportPdf = useCallback(async () => {
    setError(null);
    setPdfBusy(true);
    try {
      const html = buildCatalogueHtml(editor, { fullDocument: true, documentTitle: editor.defaults.headerTitle });
      const res = await fetch("/api/render-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!res.ok) {
        let msg = res.statusText || "PDF export failed";
        try {
          const j = (await res.json()) as { error?: string; code?: string };
          if (typeof j.error === "string") msg = j.error;
          if (typeof j.code === "string") msg += ` [${j.code}]`;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "catalogue.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed.");
    } finally {
      setPdfBusy(false);
    }
  }, [editor]);

  const printCatalogue = useCallback(() => {
    const html = buildCatalogueHtml(editor, { fullDocument: true, documentTitle: editor.defaults.headerTitle });
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
    if (!w) {
      setError("Could not open print window (popup blocked).");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
    };
  }, [editor, setError]);

  const colsOptions: ColsPerPage[] = [1, 2, 3, 4];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product catalogue</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Import from Google (server-side fetch), XLSX, or pasted CSV. Build A4 pages with branding, then export a
              multi-page PDF (one A4 per sheet) for tools like FlipHTML5. Puppeteer uses the same HTML builder as the
              preview.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void exportPdf()}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50"
              disabled={!editor.pages.length || pdfBusy}
            >
              {pdfBusy ? "Rendering PDF…" : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={printCatalogue}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              disabled={!editor.pages.length}
            >
              Print
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-8">
        <ImportSection busy={busy} setBusy={setBusy} error={error} setError={setError} onProductsLoaded={onProductsLoaded} />

        <div className="no-print grid gap-6 xl:grid-cols-[12.5rem,1fr,22rem]">
          <aside className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pages</h2>
            <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
              {editor.pages.map((p, i) => {
                const active = i === activePage;
                const count = p.kind === "cover" ? "Cover" : `${p.productIds.length} items`;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePage(i)}
                    className={`flex w-full flex-col rounded-lg border p-2 text-left text-xs transition ${
                      active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    style={{ aspectRatio: "210 / 297" }}
                  >
                    <span className="text-[10px] font-semibold text-slate-500">Page {i + 1}</span>
                    <span className="mt-1 line-clamp-2 text-[11px] font-medium text-slate-800">
                      {p.kind === "cover" ? "Cover" : p.headerTitle ?? editor.defaults.headerTitle}
                    </span>
                    <span className="mt-auto text-[10px] text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <p className="font-semibold text-slate-700">Page tools</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-left hover:bg-slate-50"
                  onClick={() => setEditor((s) => insertCoverPage(s))}
                >
                  Add cover page
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-left hover:bg-slate-50"
                  onClick={() => setEditor((s) => removeCoverPage(s))}
                >
                  Remove cover
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-left hover:bg-slate-50"
                  onClick={() => setEditor((s) => redistributePages(s, "equal"))}
                >
                  Auto-fill pages (equal columns)
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-left hover:bg-slate-50"
                  onClick={() => setEditor((s) => redistributePages(s, "byCategory"))}
                >
                  Auto-fill by category
                </button>
              </div>
              {selectedPage ? (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <p className="font-semibold text-slate-700">Selected page</p>
                  {selectedPage.kind === "products" ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-500">Max products / page</span>
                      <select
                        className="rounded-md border border-slate-300 px-2 py-1"
                        value={selectedPage.maxProductsOverride ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditor((s) => {
                            const pages = s.pages.map((pg, idx) =>
                              idx === activePage ?
                                {
                                  ...pg,
                                  maxProductsOverride: v === "" ? undefined : (Number(v) as ColsPerPage),
                                }
                              : pg,
                            );
                            return { ...s, pages };
                          });
                        }}
                      >
                        <option value="">Default ({editor.defaults.colsPerPage})</option>
                        {colsOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="flex flex-col gap-1">
                    <span className="text-slate-500">Page title override</span>
                    <input
                      className="rounded-md border border-slate-300 px-2 py-1"
                      value={selectedPage.headerTitle ?? ""}
                      placeholder={editor.defaults.headerTitle}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditor((s) => ({
                          ...s,
                          pages: s.pages.map((pg, i) => (i === activePage ? { ...pg, headerTitle: v || undefined } : pg)),
                        }));
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-slate-500">Page subtitle override</span>
                    <input
                      className="rounded-md border border-slate-300 px-2 py-1"
                      value={selectedPage.headerSubtitle ?? ""}
                      placeholder={editor.defaults.headerSubtitle}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditor((s) => ({
                          ...s,
                          pages: s.pages.map((pg, i) => (i === activePage ? { ...pg, headerSubtitle: v || undefined } : pg)),
                        }));
                      }}
                    />
                  </label>
                  {selectedPage.kind === "cover" ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!selectedPage.omitPageNumber}
                        onChange={(e) =>
                          setEditor((s) => ({
                            ...s,
                            pages: s.pages.map((pg, i) =>
                              i === activePage ? { ...pg, omitPageNumber: !e.target.checked } : pg,
                            ),
                          }))
                        }
                      />
                      <span>Show page number on cover</span>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>

          <section className="min-w-0 space-y-3">
            <div className="no-print flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">A4 preview</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Zoom</span>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1"
                  onClick={() => setPreviewZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                >
                  −
                </button>
                <span className="w-12 text-center font-mono text-xs">{Math.round(previewZoom * 100)}%</span>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1"
                  onClick={() => setPreviewZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))}
                >
                  +
                </button>
                <button type="button" className="rounded-md border border-slate-300 bg-white px-2 py-1" onClick={() => setPreviewZoom(1)}>
                  Reset
                </button>
              </div>
            </div>
            <div className="a4-preview-shell">
              <div className="a4-preview-viewport">
                <div className="a4-preview-scaler">
                  <div
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <div className="a4-preview-page" style={{ minHeight: "auto", padding: 0 }}>
                      {!editor.pages.length ? (
                        <p className="a4-preview-placeholder p-6 text-center text-sm text-slate-500">
                          Load products to see paginated A4 sheets.
                        </p>
                      ) : (
                        <iframe
                          ref={iframeRef}
                          title="Catalogue preview"
                          className="block border-0"
                          style={{ width: "210mm", height: `${297 * editor.pages.length}mm` }}
                          srcDoc={previewHtml}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="no-print text-xs text-slate-500">
              Client-side “Enhance” uses mild contrast/saturation; “Trim borders” uses a simple colour threshold and can
              crop incorrectly on complex edges. FlipHTML5 imports work best with standard multi-page PDFs (one A4 per
              page), not a single tall canvas.
            </p>
          </section>

          <aside className="no-print space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Global layout</h2>
              <div className="mt-3 space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">Products per page (default)</span>
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1"
                    value={editor.defaults.colsPerPage}
                    onChange={(e) =>
                      setEditor((s) => ({
                        ...s,
                        defaults: { ...s.defaults, colsPerPage: Number(e.target.value) as ColsPerPage },
                      }))
                    }
                  >
                    {colsOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">Header title</span>
                  <input
                    className="rounded-md border border-slate-300 px-2 py-1"
                    value={editor.defaults.headerTitle}
                    onChange={(e) => setEditor((s) => ({ ...s, defaults: { ...s.defaults, headerTitle: e.target.value } }))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">Header subtitle</span>
                  <input
                    className="rounded-md border border-slate-300 px-2 py-1"
                    value={editor.defaults.headerSubtitle}
                    onChange={(e) =>
                      setEditor((s) => ({ ...s, defaults: { ...s.defaults, headerSubtitle: e.target.value } }))
                    }
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editor.defaults.showPageNumbers}
                    onChange={(e) =>
                      setEditor((s) => ({ ...s, defaults: { ...s.defaults, showPageNumbers: e.target.checked } }))
                    }
                  />
                  <span>Show page numbers</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editor.defaults.coverShowsPageNumber}
                    onChange={(e) =>
                      setEditor((s) => ({ ...s, defaults: { ...s.defaults, coverShowsPageNumber: e.target.checked } }))
                    }
                  />
                  <span>Cover shows page number (default for new covers)</span>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branding</h2>
              <div className="mt-3 space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">Left logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    onChange={(e) =>
                      readFileAsUrl(e.target.files?.[0] ?? null, (url) =>
                        setEditor((s) => ({ ...s, branding: { ...s.branding, logoLeftUrl: url } })),
                      )
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">Right logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    onChange={(e) =>
                      readFileAsUrl(e.target.files?.[0] ?? null, (url) =>
                        setEditor((s) => ({ ...s, branding: { ...s.branding, logoRightUrl: url } })),
                      )
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">Watermark / background</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    onChange={(e) =>
                      readFileAsUrl(e.target.files?.[0] ?? null, (url) =>
                        setEditor((s) => ({ ...s, branding: { ...s.branding, watermarkUrl: url } })),
                      )
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">Watermark opacity ({editor.branding.watermarkOpacity})</span>
                  <input
                    type="range"
                    min={0}
                    max={0.35}
                    step={0.01}
                    value={editor.branding.watermarkOpacity}
                    onChange={(e) =>
                      setEditor((s) => ({
                        ...s,
                        branding: { ...s.branding, watermarkOpacity: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Templates (IndexedDB)</h2>
              <div className="mt-3 flex flex-col gap-2">
                <input
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="template name"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white"
                    onClick={() =>
                      void templates.save(templateName, editor).catch((e) => setError(e instanceof Error ? e.message : "Save failed"))
                    }
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    onClick={() =>
                      void templates
                        .load(templateName)
                        .then((data) => {
                          setEditor(data);
                          setActivePage(0);
                        })
                        .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
                    }
                  >
                    Load
                  </button>
                  <button type="button" className="rounded-md border border-slate-300 px-2 py-1 text-xs" onClick={() => void templates.refreshNames()}>
                    Refresh list
                  </button>
                </div>
                {templates.names.length ? (
                  <p className="text-[11px] text-slate-500">Saved: {templates.names.join(", ")}</p>
                ) : (
                  <p className="text-[11px] text-slate-500">No templates yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Products & images</h2>
            <span className="text-xs text-slate-500">Drag ⋮⋮ to reorder</span>
          </div>
          <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {editor.products.map((p, index) => {
              const img = getProductImageSettings(editor, p.id);
              return (
                <article
                  key={p.id}
                  className="rounded-xl border border-slate-200 p-3"
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="flex gap-3">
                    <button
                      type="button"
                      draggable
                      onDragStart={() => onDragStart(index)}
                      onDragEnter={() => onDragEnterRow(index)}
                      onDragEnd={onDragEnd}
                      className="mt-1 cursor-grab select-none text-slate-400 active:cursor-grabbing"
                      aria-label="Drag to reorder"
                    >
                      ⋮⋮
                    </button>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex flex-col text-xs">
                          <span className="text-slate-500">Name</span>
                          <input
                            className="rounded-md border border-slate-300 px-2 py-1"
                            value={p.name}
                            onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                          />
                        </label>
                        <label className="flex flex-col text-xs">
                          <span className="text-slate-500">SKU</span>
                          <input
                            className="rounded-md border border-slate-300 px-2 py-1"
                            value={p.sku}
                            onChange={(e) => updateProduct(p.id, { sku: e.target.value })}
                          />
                        </label>
                        <label className="flex flex-col text-xs sm:col-span-2">
                          <span className="text-slate-500">Price</span>
                          <input
                            className="rounded-md border border-slate-300 px-2 py-1"
                            value={p.price}
                            onChange={(e) => updateProduct(p.id, { price: e.target.value })}
                          />
                        </label>
                        <label className="flex flex-col text-xs sm:col-span-2">
                          <span className="text-slate-500">Description</span>
                          <textarea
                            className="min-h-[52px] rounded-md border border-slate-300 px-2 py-1"
                            value={p.description}
                            onChange={(e) => updateProduct(p.id, { description: e.target.value })}
                          />
                        </label>
                        {p.category ? (
                          <p className="text-[11px] text-slate-500 sm:col-span-2">
                            Category: <span className="font-medium text-slate-700">{p.category}</span>
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">
                          Image
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(ev) => replaceProductImage(p.id, ev.target.files?.[0] ?? null)}
                          />
                        </label>
                        <button
                          type="button"
                          className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                          disabled={!p.imageUrl}
                          onClick={() =>
                            void trimNearUniformBorder(p.imageUrl)
                              .then((url) => updateProduct(p.id, { imageUrl: url }))
                              .catch((e) => setError(e instanceof Error ? e.message : "Trim failed"))
                          }
                        >
                          Trim borders
                        </button>
                      </div>
                      <div className="grid gap-2 border-t border-slate-100 pt-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={img.enhanceCss}
                            onChange={(e) =>
                              setEditor((s) => ({
                                ...s,
                                productImageSettings: {
                                  ...s.productImageSettings,
                                  [p.id]: { ...getProductImageSettings(s, p.id), enhanceCss: e.target.checked },
                                },
                              }))
                            }
                          />
                          Enhance (CSS)
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">Fit</span>
                          <select
                            className="rounded-md border border-slate-300 px-1 py-0.5"
                            value={img.objectFit}
                            onChange={(e) =>
                              setEditor((s) => ({
                                ...s,
                                productImageSettings: {
                                  ...s.productImageSettings,
                                  [p.id]: {
                                    ...getProductImageSettings(s, p.id),
                                    objectFit: e.target.value as "contain" | "cover",
                                  },
                                },
                              }))
                            }
                          >
                            <option value="cover">cover</option>
                            <option value="contain">contain</option>
                          </select>
                        </label>
                        <label className="flex flex-col text-xs">
                          <span className="text-slate-500">Zoom ({img.zoom})</span>
                          <input
                            type="range"
                            min={0.6}
                            max={1.6}
                            step={0.02}
                            value={img.zoom}
                            onChange={(e) =>
                              setEditor((s) => ({
                                ...s,
                                productImageSettings: {
                                  ...s.productImageSettings,
                                  [p.id]: { ...getProductImageSettings(s, p.id), zoom: Number(e.target.value) },
                                },
                              }))
                            }
                          />
                        </label>
                        <label className="flex flex-col text-xs">
                          <span className="text-slate-500">Padding px ({img.paddingPx})</span>
                          <input
                            type="range"
                            min={0}
                            max={32}
                            step={1}
                            value={img.paddingPx}
                            onChange={(e) =>
                              setEditor((s) => ({
                                ...s,
                                productImageSettings: {
                                  ...s.productImageSettings,
                                  [p.id]: { ...getProductImageSettings(s, p.id), paddingPx: Number(e.target.value) },
                                },
                              }))
                            }
                          />
                        </label>
                        <label className="flex flex-col text-xs sm:col-span-2">
                          <span className="text-slate-500">Box shadow (CSS)</span>
                          <input
                            className="rounded-md border border-slate-300 px-2 py-1 font-mono text-[11px]"
                            value={img.boxShadow}
                            onChange={(e) =>
                              setEditor((s) => ({
                                ...s,
                                productImageSettings: {
                                  ...s.productImageSettings,
                                  [p.id]: { ...getProductImageSettings(s, p.id), boxShadow: e.target.value },
                                },
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div
                      className="h-24 w-28 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                      style={{ boxShadow: img.boxShadow }}
                    >
                      {p.imageUrl ? (
                        <div
                          className="flex h-full w-full items-center justify-center"
                          style={{
                            padding: img.paddingPx,
                            filter: img.enhanceCss ? "contrast(1.08) saturate(1.12)" : undefined,
                          }}
                        >
                          <img
                            src={p.imageUrl}
                            alt=""
                            className={img.objectFit === "cover" ? "h-full w-full object-cover" : "max-h-full max-w-full object-contain"}
                            style={{ transform: `scale(${img.zoom})` }}
                          />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-slate-400">No image</div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            {!editor.products.length ? <p className="text-sm text-slate-500">No products loaded.</p> : null}
          </div>
        </section>

        {/* Full multi-page markup in-document (offscreen) — same builder as PDF; Puppeteer POST uses full HTML string */}
        {editor.pages.length ? (
          <div
            id="catalogue-offscreen-print-root"
            className="pointer-events-none fixed left-[-9999px] top-0 w-[210mm] opacity-0"
            aria-hidden
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: buildCatalogueHtml(editor, { fullDocument: false }) }}
          />
        ) : null}
      </main>
    </div>
  );
}
