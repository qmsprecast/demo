import type { CatalogueEditorState, ColsPerPage, ProductImageSettings } from "./catalogueModel";
import { defaultProductImageSettings, productsById } from "./catalogueModel";
import type { CatalogueProduct } from "./catalogueUtils";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function attrSafeUrl(url: string): string {
  if (!url) return "";
  return url.replace(/"/g, "%22").replace(/</g, "%3C").replace(/>/g, "%3E");
}

/** Shared print + screen styles for catalogue sheets (preview + Puppeteer). */
export function catalogueDocumentCss(): string {
  return `
:root {
  --cat-header-h: 22mm;
  --cat-footer-h: 10mm;
  --cat-content-pad: 10mm;
}
.catalogue-doc-root {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #0f172a;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.catalogue-sheet {
  box-sizing: border-box;
  width: 210mm;
  height: 297mm;
  position: relative;
  overflow: hidden;
  background: #fff;
  page-break-after: always;
  break-after: page;
  display: flex;
  flex-direction: column;
}
.catalogue-sheet:last-child {
  page-break-after: auto;
  break-after: auto;
}
.catalogue-watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}
.catalogue-watermark img {
  max-width: 70%;
  max-height: 70%;
  object-fit: contain;
  opacity: var(--cat-wm-opacity, 0.08);
}
.catalogue-sheet-inner {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.catalogue-header {
  flex: 0 0 var(--cat-header-h);
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 28mm 1fr 28mm;
  align-items: center;
  gap: 4mm;
  padding: 0 var(--cat-content-pad);
  border-bottom: 0.35pt solid #cbd5e1;
}
.catalogue-header__logo {
  max-height: 16mm;
  max-width: 28mm;
  object-fit: contain;
}
.catalogue-header__text {
  text-align: center;
  min-width: 0;
}
.catalogue-header__title {
  font-size: 11pt;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  word-break: break-word;
}
.catalogue-header__subtitle {
  font-size: 9pt;
  color: #475569;
  margin: 1mm 0 0;
  line-height: 1.25;
  word-break: break-word;
}
.catalogue-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--cat-content-pad);
  display: flex;
  flex-direction: column;
}
.catalogue-cover {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4mm;
  padding: 12mm;
}
.catalogue-cover__title {
  font-size: 22pt;
  font-weight: 800;
  margin: 0;
}
.catalogue-cover__subtitle {
  font-size: 12pt;
  color: #475569;
  margin: 0;
}
.catalogue-cover__logos {
  display: flex;
  gap: 10mm;
  align-items: center;
  justify-content: center;
  margin-top: 6mm;
}
.catalogue-cover__logos img {
  max-height: 22mm;
  max-width: 45mm;
  object-fit: contain;
}
.catalogue-grid {
  display: grid;
  gap: 3mm;
  align-content: start;
  flex: 1;
  min-height: 0;
}
.catalogue-card {
  border: 0.35pt solid #cbd5e1;
  border-radius: 2mm;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
}
.catalogue-card__media {
  aspect-ratio: 4 / 3;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.catalogue-card__media-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.catalogue-card__media-inner img {
  max-width: 100%;
  max-height: 100%;
}
.catalogue-card__body {
  padding: 2.5mm 3mm;
  display: flex;
  flex-direction: column;
  gap: 1mm;
  flex: 1 1 auto;
}
.catalogue-card__name {
  font-size: 9.5pt;
  font-weight: 700;
  margin: 0;
}
.catalogue-card__sku {
  font-size: 7.5pt;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0;
}
.catalogue-card__desc {
  font-size: 8pt;
  color: #475569;
  margin: 0;
  line-height: 1.25;
}
.catalogue-card__price {
  margin-top: auto;
  font-size: 10pt;
  font-weight: 700;
}
.catalogue-footer {
  flex: 0 0 var(--cat-footer-h);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--cat-content-pad);
  border-top: 0.35pt solid #cbd5e1;
  font-size: 8pt;
  color: #64748b;
}
@media print {
  .catalogue-sheet {
    page-break-after: always;
  }
}
`;
}

function colsClass(cols: ColsPerPage): string {
  switch (cols) {
    case 1:
      return "grid-template-columns: repeat(1, minmax(0, 1fr));";
    case 3:
      return "grid-template-columns: repeat(3, minmax(0, 1fr));";
    case 4:
      return "grid-template-columns: repeat(4, minmax(0, 1fr));";
    default:
      return "grid-template-columns: repeat(2, minmax(0, 1fr));";
  }
}

function imageWrapperStyle(img: ProductImageSettings): string {
  const pad = img.paddingPx;
  const shadow = img.boxShadow || "none";
  return [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:100%",
    "height:100%",
    "box-sizing:border-box",
    `padding:${pad}px`,
    `box-shadow:${shadow}`,
  ].join(";");
}

function imageStyle(img: ProductImageSettings): string {
  const fit = img.objectFit;
  const z = img.zoom;
  const filter = img.enhanceCss ? "contrast(1.08) saturate(1.12)" : "none";
  return [
    "max-width:100%",
    "max-height:100%",
    `object-fit:${fit}`,
    `transform:scale(${z})`,
    `filter:${filter}`,
  ].join(";");
}

function renderProductCard(p: CatalogueProduct, img: ProductImageSettings): string {
  const media = p.imageUrl
    ? `<div class="catalogue-card__media-inner" style="${escapeHtml(imageWrapperStyle(img))}"><img src="${attrSafeUrl(p.imageUrl)}" alt="" style="${escapeHtml(imageStyle(img))}" /></div>`
    : `<div class="catalogue-card__media-inner" style="color:#94a3b8;font-size:8pt">No image</div>`;

  const sku = p.sku ? `<p class="catalogue-card__sku">SKU ${escapeHtml(p.sku)}</p>` : "";
  const desc = p.description ? `<p class="catalogue-card__desc">${escapeHtml(p.description)}</p>` : "";
  const price = p.price ? `<p class="catalogue-card__price">${escapeHtml(p.price)}</p>` : "";

  return `<article class="catalogue-card">
  <div class="catalogue-card__media">${media}</div>
  <div class="catalogue-card__body">
    <h2 class="catalogue-card__name">${escapeHtml(p.name)}</h2>
    ${sku}
    ${desc}
    ${price}
  </div>
</article>`;
}

export type BuildCatalogueHtmlOptions = {
  /** Include wrapping <!doctype html><html>... for Puppeteer */
  fullDocument: boolean;
  /** Optional title for <title> */
  documentTitle?: string;
};

export function buildCatalogueHtml(state: CatalogueEditorState, options: BuildCatalogueHtmlOptions): string {
  const { branding, defaults, pages, products, productImageSettings } = state;
  const byId = productsById(products);
  const wmOpacity = Math.min(1, Math.max(0, branding.watermarkOpacity));

  const sheets: string[] = [];
  const total = pages.length;

  pages.forEach((page, idx) => {
    const pageIndex = idx + 1;
    const title = page.headerTitle ?? defaults.headerTitle;
    const subtitle = page.headerSubtitle ?? defaults.headerSubtitle;
    const cols = (page.maxProductsOverride ?? defaults.colsPerPage) as ColsPerPage;

    const leftLogo = branding.logoLeftUrl
      ? `<img class="catalogue-header__logo" src="${attrSafeUrl(branding.logoLeftUrl)}" alt="" />`
      : `<span></span>`;
    const rightLogo = branding.logoRightUrl
      ? `<div style="justify-self:end"><img class="catalogue-header__logo" src="${attrSafeUrl(branding.logoRightUrl)}" alt="" /></div>`
      : `<span></span>`;

    const watermark =
      branding.watermarkUrl.trim() ?
        `<div class="catalogue-watermark" style="--cat-wm-opacity:${wmOpacity}"><img src="${attrSafeUrl(branding.watermarkUrl)}" alt="" /></div>`
      : "";

    let bodyInner = "";
    if (page.kind === "cover") {
      const cTitle = page.headerTitle ?? defaults.headerTitle;
      const cSub = page.headerSubtitle ?? defaults.headerSubtitle;
      const l = branding.logoLeftUrl
        ? `<img src="${attrSafeUrl(branding.logoLeftUrl)}" alt="" />`
        : "";
      const r = branding.logoRightUrl
        ? `<img src="${attrSafeUrl(branding.logoRightUrl)}" alt="" />`
        : "";
      bodyInner = `<div class="catalogue-cover">
  <h1 class="catalogue-cover__title">${escapeHtml(cTitle)}</h1>
  ${cSub ? `<p class="catalogue-cover__subtitle">${escapeHtml(cSub)}</p>` : ""}
  <div class="catalogue-cover__logos">${l}${r}</div>
</div>`;
    } else {
      const cards = page.productIds
        .map((id) => {
          const p = byId.get(id);
          if (!p) return "";
          const img = productImageSettings[id] ?? defaultProductImageSettings();
          return renderProductCard(p, img);
        })
        .join("");
      bodyInner = `<div class="catalogue-grid" style="${colsClass(cols)}">${cards}</div>`;
    }

    const showNum =
      defaults.showPageNumbers &&
      !(page.kind === "cover" && (page.omitPageNumber ?? !defaults.coverShowsPageNumber));

    const footerText = showNum ? `Page ${pageIndex} of ${total}` : "";

    sheets.push(`<section class="catalogue-sheet" data-page-id="${escapeHtml(page.id)}">
  ${watermark}
  <div class="catalogue-sheet-inner">
    <header class="catalogue-header">
      ${leftLogo}
      <div class="catalogue-header__text">
        <p class="catalogue-header__title">${escapeHtml(title)}</p>
        ${subtitle ? `<p class="catalogue-header__subtitle">${escapeHtml(subtitle)}</p>` : `<p class="catalogue-header__subtitle"></p>`}
      </div>
      ${rightLogo}
    </header>
    <main class="catalogue-body">${bodyInner}</main>
    <footer class="catalogue-footer">${escapeHtml(footerText)}</footer>
  </div>
</section>`);
  });

  const inner = `<div class="catalogue-doc-root">${sheets.join("\n")}</div>`;
  const css = catalogueDocumentCss();

  if (!options.fullDocument) {
    return `<style>${css}</style>${inner}`;
  }

  const docTitle = escapeHtml(options.documentTitle ?? "Catalogue");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${docTitle}</title>
<style>
@page { size: A4 portrait; margin: 0; }
html, body { margin: 0; padding: 0; }
${css}
</style>
</head>
<body>
${inner}
</body>
</html>`;
}
