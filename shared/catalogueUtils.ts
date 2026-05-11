/**
 * Shared helpers for catalogue row parsing, Google Sheet URL parsing, and product mapping.
 * Used by the React app and the Express server (no Node-only imports here).
 */

/** Standard spreadsheet id, or a published document key from `/d/e/<key>/`. */
export type GoogleSheetRef = { kind: "standard"; id: string } | { kind: "published"; key: string };

/**
 * Parse a Google Sheets or Drive “open” URL into a fetchable ref.
 * Only allows docs.google.com / drive.google.com hostnames (SSRF guard input for callers).
 */
export function parseGoogleSheetRef(raw: string): GoogleSheetRef | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (!url.hostname.endsWith("docs.google.com") && !url.hostname.endsWith("drive.google.com")) {
    return null;
  }

  if (url.hostname === "drive.google.com" && url.pathname === "/open") {
    const id = url.searchParams.get("id");
    if (id) return { kind: "standard", id };
  }

  const pathname = url.pathname;
  const pub = pathname.match(/\/spreadsheets\/d\/e\/([^/]+)/);
  if (pub?.[1]) {
    return { kind: "published", key: pub[1] };
  }
  const std = pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (std?.[1] && std[1] !== "e") {
    return { kind: "standard", id: std[1] };
  }
  return null;
}

/** Returns the raw id or published key string for display/logging; prefer `parseGoogleSheetRef` for fetching. */
export function extractSpreadsheetId(url: string): string | null {
  const ref = parseGoogleSheetRef(url);
  if (!ref) return null;
  return ref.kind === "standard" ? ref.id : ref.key;
}

export type CatalogueProduct = {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: string;
  imageUrl: string;
  /** Derived from a mapped “category” column when present */
  category: string;
  raw: Record<string, string>;
};

/** Alias for `CatalogueProduct` (printable row in the UI). */
export type Product = CatalogueProduct;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function scoreHeader(header: string, needles: string[]): number {
  const h = norm(header);
  let best = 0;
  for (const n of needles) {
    if (h === n) best = Math.max(best, 100);
    else if (h.includes(n)) best = Math.max(best, 50);
    else if (n.includes(h) && h.length > 1) best = Math.max(best, 25);
  }
  return best;
}

export function detectColumnMapping(
  headers: string[],
): Record<keyof Omit<CatalogueProduct, "id" | "raw">, string | null> {
  const fields: { key: keyof Omit<CatalogueProduct, "id" | "raw">; needles: string[] }[] = [
    { key: "name", needles: ["name", "title", "product", "item"] },
    { key: "sku", needles: ["sku", "code", "product code", "item code"] },
    { key: "description", needles: ["description", "details", "notes", "summary"] },
    { key: "price", needles: ["price", "rrp", "cost", "amount", "gbp", "usd", "eur"] },
    { key: "imageUrl", needles: ["image", "photo", "picture", "img", "thumbnail"] },
    { key: "category", needles: ["category", "type", "department", "group", "collection"] },
  ];

  const used = new Set<string>();
  const mapping = {
    name: null as string | null,
    sku: null as string | null,
    description: null as string | null,
    price: null as string | null,
    imageUrl: null as string | null,
    category: null as string | null,
  };

  for (const { key: field, needles } of fields) {
    let best: { header: string; score: number } | null = null;
    for (const h of headers) {
      const trimmed = h.trim();
      if (!trimmed || used.has(trimmed)) continue;
      const sc = scoreHeader(trimmed, needles);
      if (sc > 0 && (!best || sc > best.score)) best = { header: trimmed, score: sc };
    }
    if (best) {
      mapping[field] = best.header;
      used.add(best.header);
    }
  }

  return mapping;
}

export function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** First non-empty row becomes headers; following rows are records. */
export function aoaToObjects(matrix: unknown[][]): { headers: string[]; rows: Record<string, string>[] } {
  const cleaned = matrix.map((row) => (Array.isArray(row) ? row.map(cellToString) : []));
  let headerIdx = 0;
  while (headerIdx < cleaned.length && cleaned[headerIdx].every((c) => !c.trim())) {
    headerIdx++;
  }
  if (headerIdx >= cleaned.length) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = cleaned[headerIdx].map((h, i) => h.trim() || `Column ${i + 1}`);
  const headers = dedupeHeaders(rawHeaders);
  const rows: Record<string, string>[] = [];

  for (let r = headerIdx + 1; r < cleaned.length; r++) {
    const line = cleaned[r];
    if (!line.some((c) => c.trim())) continue;
    const rec: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rec[headers[c]] = line[c] ?? "";
    }
    rows.push(rec);
  }

  return { headers, rows };
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const n = seen.get(h) ?? 0;
    seen.set(h, n + 1);
    return n === 0 ? h : `${h} (${n + 1})`;
  });
}

export function parsePastedCsv(text: string): unknown[][] {
  const lines: unknown[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    lines.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") pushField();
      else if (ch === "\r") continue;
      else if (ch === "\n") pushRow();
      else field += ch;
    }
  }
  pushField();
  if (row.some((c) => c.length > 0)) {
    lines.push(row);
  }
  return lines;
}

export function rowsToProducts(rows: Record<string, string>[], headers: string[]): CatalogueProduct[] {
  const mapping = detectColumnMapping(headers);
  return rows.map((raw, index) => {
    const pick = (col: string | null, fallbacks: string[]) => {
      if (col && raw[col] !== undefined) return raw[col] ?? "";
      for (const f of fallbacks) {
        const k = headers.find((h) => norm(h) === norm(f));
        if (k && raw[k] !== undefined) return raw[k] ?? "";
      }
      return "";
    };

    const name = pick(mapping.name, ["Name", "Product"]);
    const sku = pick(mapping.sku, ["SKU", "Code"]);
    const description = pick(mapping.description, ["Description"]);
    const price = pick(mapping.price, ["Price"]);
    const imageUrl = pick(mapping.imageUrl, ["Image", "Image URL", "Photo"]);
    const category = pick(mapping.category, ["Category", "Type", "Department"]);

    return {
      id: sku ? `sku:${sku}` : `row:${index + 1}`,
      name: name || `Product ${index + 1}`,
      sku,
      description,
      price,
      imageUrl,
      category,
      raw,
    };
  });
}

/** Same as {@link rowsToProducts} — name matches spreadsheet “map rows to catalogue items”. */
export const mapRowsToProducts = rowsToProducts;
