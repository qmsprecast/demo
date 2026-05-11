import type { CatalogueProduct } from "./catalogueUtils";

export const TEMPLATE_VERSION = 1 as const;

export type ColsPerPage = 1 | 2 | 3 | 4;

export type ProductImageSettings = {
  objectFit: "contain" | "cover";
  /** 1 = 100% */
  zoom: number;
  paddingPx: number;
  /** CSS box-shadow value, e.g. "0 4px 12px rgba(0,0,0,0.12)" */
  boxShadow: string;
  /** Applies CSS contrast/saturation boost (not ML). */
  enhanceCss: boolean;
};

export const defaultProductImageSettings = (): ProductImageSettings => ({
  objectFit: "cover",
  zoom: 1,
  paddingPx: 0,
  boxShadow: "0 1px 3px rgba(15,23,42,0.12)",
  enhanceCss: false,
});

export type CataloguePageKind = "cover" | "products";

export type CataloguePage = {
  id: string;
  kind: CataloguePageKind;
  productIds: string[];
  maxProductsOverride?: ColsPerPage;
  headerTitle?: string;
  headerSubtitle?: string;
  /** When true, footer shows "—" or blank instead of page index */
  omitPageNumber?: boolean;
};

export type CatalogueDefaults = {
  colsPerPage: ColsPerPage;
  headerTitle: string;
  headerSubtitle: string;
  showPageNumbers: boolean;
  /** Cover uses omitPageNumber often; still configurable */
  coverShowsPageNumber: boolean;
};

export type CatalogueBranding = {
  logoLeftUrl: string;
  logoRightUrl: string;
  watermarkUrl: string;
  /** 0–1 */
  watermarkOpacity: number;
};

export type CatalogueEditorState = {
  version: typeof TEMPLATE_VERSION;
  defaults: CatalogueDefaults;
  branding: CatalogueBranding;
  products: CatalogueProduct[];
  pages: CataloguePage[];
  productImageSettings: Record<string, ProductImageSettings>;
};

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const defaultDefaults = (): CatalogueDefaults => ({
  colsPerPage: 2,
  headerTitle: "Product catalogue",
  headerSubtitle: "",
  showPageNumbers: true,
  coverShowsPageNumber: false,
});

export const defaultBranding = (): CatalogueBranding => ({
  logoLeftUrl: "",
  logoRightUrl: "",
  watermarkUrl: "",
  watermarkOpacity: 0.08,
});

export function emptyEditorState(): CatalogueEditorState {
  return {
    version: TEMPLATE_VERSION,
    defaults: defaultDefaults(),
    branding: defaultBranding(),
    products: [],
    pages: [],
    productImageSettings: {},
  };
}

export function getProductImageSettings(
  state: CatalogueEditorState,
  productId: string,
): ProductImageSettings {
  return state.productImageSettings[productId] ?? defaultProductImageSettings();
}

export function productsById(products: CatalogueProduct[]): Map<string, CatalogueProduct> {
  return new Map(products.map((p) => [p.id, p]));
}

/** Single product page holding all ids in import order */
export function initialPagesFromProducts(products: CatalogueProduct[]): CataloguePage[] {
  if (!products.length) return [];
  return [
    {
      id: newId("page"),
      kind: "products",
      productIds: products.map((p) => p.id),
    },
  ];
}

export function splitProductIdsIntoChunks(ids: string[], chunk: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += chunk) {
    out.push(ids.slice(i, i + chunk));
  }
  return out.length ? out : [[]];
}

export function redistributePages(
  state: CatalogueEditorState,
  mode: "equal" | "byCategory",
): CatalogueEditorState {
  const cols = state.defaults.colsPerPage;
  if (!state.products.length) {
    return { ...state, pages: state.pages.filter((p) => p.kind === "cover") };
  }

  const coverPages = state.pages.filter((p) => p.kind === "cover");
  const productPages: CataloguePage[] = [];

  if (mode === "byCategory") {
    const groups = new Map<string, string[]>();
    for (const p of state.products) {
      const cat = (p.category || "Uncategorised").trim() || "Uncategorised";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p.id);
    }
    const orderedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));
    for (const k of orderedKeys) {
      const ids = groups.get(k)!;
      for (const chunk of splitProductIdsIntoChunks(ids, cols)) {
        productPages.push({ id: newId("page"), kind: "products", productIds: chunk });
      }
    }
  } else {
    const orderedIds = state.products.map((p) => p.id);
    for (const chunk of splitProductIdsIntoChunks(orderedIds, cols)) {
      productPages.push({ id: newId("page"), kind: "products", productIds: chunk });
    }
  }

  return { ...state, pages: [...coverPages, ...productPages] };
}

export function insertCoverPage(state: CatalogueEditorState): CatalogueEditorState {
  const hasCover = state.pages.some((p) => p.kind === "cover");
  if (hasCover) return state;
  const cover: CataloguePage = {
    id: newId("cover"),
    kind: "cover",
    productIds: [],
    omitPageNumber: !state.defaults.coverShowsPageNumber,
    headerTitle: state.defaults.headerTitle,
    headerSubtitle: state.defaults.headerSubtitle,
  };
  return { ...state, pages: [cover, ...state.pages] };
}

export function removeCoverPage(state: CatalogueEditorState): CatalogueEditorState {
  return { ...state, pages: state.pages.filter((p) => p.kind !== "cover") };
}
