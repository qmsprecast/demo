/**
 * Catalogue API. PDF rendering uses bundled Chromium from `puppeteer` by default.
 * To use a system Chrome/Chromium instead, set `PUPPETEER_EXECUTABLE_PATH` to the binary path.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import puppeteer from "puppeteer";
import * as XLSX from "xlsx";
import { aoaToObjects, parseGoogleSheetRef, type GoogleSheetRef } from "../shared/catalogueUtils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_SHEET_DOWNLOAD_BYTES = 12 * 1024 * 1024;

/** Avoid `res.status(NaN)` / invalid codes crashing the response. */
function safeHttpStatus(code: number, fallback = 502): number {
  if (typeof code !== "number" || !Number.isFinite(code)) return fallback;
  const n = Math.trunc(code);
  if (n < 100 || n > 599) return fallback;
  return n;
}

function exportUrls(ref: GoogleSheetRef): string[] {
  if (ref.kind === "published") {
    return [`https://docs.google.com/spreadsheets/d/e/${ref.key}/pub?output=xlsx`];
  }
  return [`https://docs.google.com/spreadsheets/d/${ref.id}/export?format=xlsx`];
}

function sniffHtml(buffer: Buffer): boolean {
  const head = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8").trimStart().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html") || head.includes("<html");
}

function describeAccessFailure(status: number, htmlSnippet: string): string {
  const lower = htmlSnippet.toLowerCase();
  if (lower.includes("sign in") || lower.includes("accounts.google.com")) {
    return "This spreadsheet requires sign-in or is not published. Publish to the web (File → Share → Publish to web) or use “Anyone with the link can view”, then try again.";
  }
  if (lower.includes("access denied") || lower.includes("you need permission")) {
    return "Access denied. The sheet is private — enable “Anyone with the link can view” or publish the sheet, then retry.";
  }
  if (status === 404) {
    return "Spreadsheet not found. Check the URL or that the document still exists.";
  }
  if (status === 401 || status === 403) {
    return "Google refused access (private or restricted). Adjust sharing / publish settings.";
  }
  return "Could not read this Google Sheet as a spreadsheet export. Confirm sharing or publish settings.";
}

async function fetchSpreadsheetXlsx(ref: GoogleSheetRef): Promise<{ buffer: Buffer } | { error: string; status: number }> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,application/vnd.ms-excel;q=0.9,*/*;q=0.8",
  };

  let lastStatus = 400;
  let lastNetworkMessage: string | null = null;

  for (const url of exportUrls(ref)) {
    let res: Response;
    try {
      res = await fetch(url, { headers, redirect: "follow" });
    } catch (e) {
      lastNetworkMessage = e instanceof Error ? e.message : "Network error while contacting Google.";
      continue;
    }

    lastStatus = res.status;
    let buf: Buffer;
    try {
      buf = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastNetworkMessage = e instanceof Error ? e.message : "Could not read spreadsheet response body.";
      continue;
    }

    if (buf.length > MAX_SHEET_DOWNLOAD_BYTES) {
      return {
        error: `Spreadsheet download is too large (>${Math.floor(MAX_SHEET_DOWNLOAD_BYTES / (1024 * 1024))} MB).`,
        status: 413,
      };
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();

    if (!res.ok) {
      continue;
    }
    if (ct.includes("text/html") || sniffHtml(buf)) {
      const snippet = buf.subarray(0, 800).toString("utf8");
      return { error: describeAccessFailure(res.status, snippet), status: 403 };
    }
    if (buf.length < 100) {
      continue;
    }
    return { buffer: buf };
  }

  if (lastNetworkMessage) {
    return {
      error: `Could not download spreadsheet: ${lastNetworkMessage}`,
      status: 502,
    };
  }

  return {
    error: describeAccessFailure(lastStatus, ""),
    status: lastStatus >= 400 ? lastStatus : 502,
  };
}

function readWorkbook(buffer: Buffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "buffer", cellDates: true });
}

function pickSheetName(workbook: XLSX.WorkBook, tab?: string | null): string | null {
  if (!workbook.SheetNames.length) return null;
  if (!tab?.trim()) return workbook.SheetNames[0] ?? null;
  const want = tab.trim().toLowerCase();
  return workbook.SheetNames.find((n) => n.trim().toLowerCase() === want) ?? null;
}

type SheetRowsOk = { sheetName: string; headers: string[]; rows: Record<string, string>[] };
type SheetRowsErr = { error: string; status: number; code: string };

function sheetToRows(workbook: XLSX.WorkBook, tab?: string | null): SheetRowsOk | SheetRowsErr {
  const sheetName = pickSheetName(workbook, tab);
  if (!sheetName) {
    const available = workbook.SheetNames.join(", ");
    return {
      error: tab?.trim()
        ? `Tab “${tab}” not found. Available tabs: ${available || "(none)"}.`
        : "No worksheets in workbook.",
      status: 400,
      code: "TAB_NOT_FOUND",
    };
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { error: `Worksheet “${sheetName}” missing.`, status: 422, code: "SHEET_MISSING" };
  }
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  const { headers, rows } = aoaToObjects(matrix);
  return { sheetName, headers, rows };
}

const app = express();
const PORT = Number(process.env.PORT) || 8787;
const MAX_RENDER_HTML_BYTES = 48 * 1024 * 1024;

app.use(express.json({ limit: "52mb" }));

function apiError(error: string, code: string) {
  return { ok: false as const, error, code };
}

app.use(
  cors({
    origin: [/localhost:\d+$/, /127\.0\.0\.1:\d+$/],
    credentials: true,
  }),
);

app.get("/api/google-tabs", async (req, res) => {
  try {
    const urlParam = typeof req.query.url === "string" ? req.query.url : "";
    const parsed = parseGoogleSheetRef(urlParam);
    if (!parsed) {
      return res.status(400).json(apiError("Invalid or missing Google Sheets URL.", "INVALID_URL"));
    }

    const fetched = await fetchSpreadsheetXlsx(parsed);
    if ("error" in fetched) {
      const st = safeHttpStatus(fetched.status);
      const code =
        st === 404 ? "NOT_FOUND" : st === 413 ? "PAYLOAD_TOO_LARGE" : st === 502 ? "UPSTREAM_ERROR" : "ACCESS_DENIED";
      return res.status(st).json(apiError(fetched.error, code));
    }

    try {
      const workbook = readWorkbook(fetched.buffer);
      const tabs = workbook.SheetNames;
      if (!tabs.length) {
        return res.status(422).json(apiError("Workbook contains no tabs.", "EMPTY_WORKBOOK"));
      }
      return res.json({ ok: true, tabs });
    } catch {
      return res.status(502).json(apiError("Downloaded file could not be parsed as XLSX.", "PARSE_ERROR"));
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error.";
    return res.status(500).json(apiError(message, "INTERNAL"));
  }
});

app.get("/api/google-sheet", async (req, res) => {
  try {
    const urlParam = typeof req.query.url === "string" ? req.query.url : "";
    const tab = typeof req.query.tab === "string" ? req.query.tab : undefined;
    const parsed = parseGoogleSheetRef(urlParam);
    if (!parsed) {
      return res.status(400).json(apiError("Invalid or missing Google Sheets URL.", "INVALID_URL"));
    }

    const fetched = await fetchSpreadsheetXlsx(parsed);
    if ("error" in fetched) {
      const st = safeHttpStatus(fetched.status);
      const code =
        st === 404 ? "NOT_FOUND" : st === 413 ? "PAYLOAD_TOO_LARGE" : st === 502 ? "UPSTREAM_ERROR" : "ACCESS_DENIED";
      return res.status(st).json(apiError(fetched.error, code));
    }

    try {
      const workbook = readWorkbook(fetched.buffer);
      const result = sheetToRows(workbook, tab);
      if ("error" in result) {
        return res.status(safeHttpStatus(result.status, 400)).json(apiError(result.error, result.code));
      }
      return res.json({
        ok: true,
        sheetName: result.sheetName,
        headers: result.headers,
        rows: result.rows,
      });
    } catch {
      return res.status(502).json(apiError("Downloaded file could not be parsed as XLSX.", "PARSE_ERROR"));
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error.";
    return res.status(500).json(apiError(message, "INTERNAL"));
  }
});

app.post("/api/render-pdf", async (req, res) => {
  try {
    const html = typeof req.body?.html === "string" ? req.body.html : "";
    const extraCss = typeof req.body?.css === "string" ? req.body.css : "";
    if (!html.trim()) {
      return res.status(400).json(apiError("Missing HTML body (`html` string required).", "INVALID_BODY"));
    }
    const bytes = Buffer.byteLength(html, "utf8");
    if (bytes > MAX_RENDER_HTML_BYTES) {
      return res.status(413).json(
        apiError(
          `HTML payload too large (${Math.ceil(bytes / (1024 * 1024))} MB). Reduce embedded images or split the catalogue.`,
          "PAYLOAD_TOO_LARGE",
        ),
      );
    }

    const documentHtml =
      extraCss.trim() ?
        html.replace("</head>", `<style>${extraCss}</style></head>`)
      : html;

    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || process.env.CHROME_PATH?.trim();
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"],
    });

    try {
      const page = await browser.newPage();
      // @ts-expect-error Puppeteer supports networkidle0; current Page typings omit it.
      await page.setContent(documentHtml, { waitUntil: "networkidle0", timeout: 120_000 });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      await page.close();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="catalogue.pdf"');
      return res.status(200).send(Buffer.from(pdf));
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "PDF render failed.";
    return res.status(500).json(apiError(message, "PDF_RENDER_ERROR"));
  }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "..", "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Catalogue API listening on http://127.0.0.1:${PORT}`);
});
