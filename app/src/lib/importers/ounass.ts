// Ounass Importer — fetches product details by SKU from
// `https://www.ounass.ae/product/findbysku?sku=<id>` and normalises
// the response into a shape the editor can write into any template's
// productList row.
//
// Two paths, in order:
//
//   1. **Browser-direct fetch.** If the marketer has an active Ounass
//      session in the same browser (a Kasada cookie from any visit to
//      ounass.ae) and CORS allows our origin, the fetch succeeds.
//
//   2. **Paste fallback.** Ounass's product API is gated by Kasada
//      (HANDOFF Gotcha #4) — server-side curl/Vercel-Function calls
//      come back 429. The fallback opens the URL in a new tab so the
//      marketer's own browser session executes the call (Kasada is
//      happy), they copy the JSON, paste it into our dialog, and we
//      run the same parser. Survives the bot wall without any backend.
//
// Designed as a self-contained module so we can swap in a backend
// proxy or cached response store later without touching any UI code.
// All template-specific field mapping lives at the call site —
// `mapToProductFields()` walks the productFields descriptor of the
// active template and writes each subfield.

/** Normalised product as the editor expects to consume it. Whatever
 *  shape Ounass actually returns, the parser produces this shape so
 *  every template can write product data without per-template glue. */
export type OunassProduct = {
  /** SKU as fetched. Echoed back so the caller can record it. */
  sku: string;
  /** Display name, e.g. "Wide-leg Wool Trouser". */
  name: string;
  /** Brand / designer house, e.g. "Saint Laurent". */
  brand: string;
  /** Pre-formatted price string with currency, e.g. "1,890 AED". */
  price: string;
  /** Numeric price (un-formatted) when extractable. Templates that
   *  route prices through `composePrice()` use this as the raw input. */
  priceNumber: number | null;
  /** Currency suffix as Ounass returned it ("AED", "د.إ.", etc). */
  currency: string;
  /** Marketing description / product copy, condensed. May be empty. */
  description: string;
  /** Top-level category ("Handbags", "Shoes", ...). May be empty. */
  category: string;
  /** All image URLs the API returned, in display order. The editor
   *  pickers either auto-select index 0 (single-image flow) or prompt
   *  the marketer to choose (multi-image flow). */
  images: string[];
};

/** Failure modes the importer surfaces to the dialog. */
export type OunassImporterErrorReason =
  /** Network blocked us — Kasada 429, CORS preflight rejected, offline. */
  | 'blocked'
  /** We got a response but it wasn't valid JSON. */
  | 'invalid-json'
  /** Response parsed but contains no product (404, empty payload). */
  | 'not-found'
  /** Unexpected — surface the raw error in `cause`. */
  | 'unknown';

export class OunassImporterError extends Error {
  reason: OunassImporterErrorReason;
  detail?: string;
  constructor(
    reason: OunassImporterErrorReason,
    message: string,
    detail?: string,
  ) {
    super(message);
    this.name = 'OunassImporterError';
    this.reason = reason;
    this.detail = detail;
  }
}

/** Build the canonical Ounass findbysku URL for a given SKU. Exported so
 *  the dialog can render it as a "open in new tab" link in paste mode. */
export function ounassSkuUrl(sku: string): string {
  const cleaned = sku.trim();
  return `https://www.ounass.ae/product/findbysku?sku=${encodeURIComponent(cleaned)}`;
}

/** Fetch a SKU through the marketer's browser session. Returns a
 *  normalised OunassProduct or throws OunassImporterError. */
export async function fetchOunassProduct(sku: string): Promise<OunassProduct> {
  const url = ounassSkuUrl(sku);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      // `include` so any existing ounass.ae cookies (Kasada token)
      // ride along. Required to clear the bot wall when the marketer
      // has visited ounass.ae in this browser session.
      credentials: 'include',
      // Don't ask for any custom header — that triggers a CORS
      // preflight which the API may not respond to. A simple GET with
      // default Accept header is the most likely to make it through.
      headers: { Accept: 'application/json, text/plain, */*' },
      mode: 'cors',
    });
  } catch (err) {
    // Network error / CORS preflight rejected / DNS failure — all
    // surface here. Most common in practice.
    throw new OunassImporterError(
      'blocked',
      'Could not reach Ounass directly from the browser. Use the paste-fallback option below.',
      err instanceof Error ? err.message : String(err),
    );
  }
  if (res.status === 429 || res.status === 403) {
    throw new OunassImporterError(
      'blocked',
      `Ounass blocked the request (HTTP ${res.status}). The bot-protection layer (Kasada) intercepts server-to-server calls; use the paste-fallback to copy the response from your own browser tab.`,
    );
  }
  if (res.status === 404) {
    throw new OunassImporterError(
      'not-found',
      `No product found for SKU ${sku}.`,
    );
  }
  if (!res.ok) {
    throw new OunassImporterError(
      'unknown',
      `Ounass returned HTTP ${res.status}.`,
    );
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new OunassImporterError(
      'invalid-json',
      'Ounass returned non-JSON content (likely the bot-protection page). Use the paste-fallback.',
      text.slice(0, 200),
    );
  }
  return parseOunassResponse(json, sku);
}

/** Pure parser — pulls the editor-relevant fields out of an Ounass API
 *  payload. Defensive about shape since we don't fully control the API
 *  contract: every key has a fallback chain, missing optional fields
 *  collapse to empty strings / nulls / [] rather than throwing.
 *
 *  Exported so the paste-fallback path can reuse it on whatever JSON
 *  the marketer pastes — same parser, same output shape. */
export function parseOunassResponse(json: unknown, skuFallback = ''): OunassProduct {
  if (!json || typeof json !== 'object') {
    throw new OunassImporterError(
      'invalid-json',
      'Pasted content is not a JSON object.',
    );
  }
  const obj = json as Record<string, unknown>;
  // Ounass occasionally wraps the product in a `product` or `data` key.
  // Unwrap if the top level looks like a wrapper rather than the product.
  const product = unwrapProduct(obj);

  const name = stringFromKeys(product, [
    'displayName',
    'name',
    'title',
    'productName',
    'shortName',
  ]);

  // Brand can be a string ("Saint Laurent") or an object ({ name: "…" }).
  const brand =
    stringFromKeys(product, ['brandName', 'designerName']) ||
    (typeof product.brand === 'string'
      ? (product.brand as string)
      : pickString((product.brand as Record<string, unknown> | undefined) ?? {}, [
          'name',
          'displayName',
          'label',
        ])) ||
    pickString((product.designer as Record<string, unknown> | undefined) ?? {}, [
      'name',
      'displayName',
    ]);

  const description = stringFromKeys(product, [
    'description',
    'summary',
    'shortDescription',
    'productDescription',
  ]);

  const category = stringFromKeys(product, [
    'categoryName',
    'category',
    'departmentName',
    'productType',
  ]);

  // Price can live in many places. We prefer the sale/effective price
  // if both list and sale exist (matches what the marketer would see
  // on-site).
  const priceNumber =
    numberFromKeys(product, [
      'salePrice',
      'finalPrice',
      'currentPrice',
      'unitPrice',
      'priceFinal',
      'price',
    ]) ?? null;
  const currency = stringFromKeys(product, ['currency', 'currencyCode']) || 'AED';
  const price =
    priceNumber != null ? `${formatNumber(priceNumber)} ${currency}` : '';

  // Images: API responses tend to vary widely. We try a flat string
  // array first, then nested shapes.
  const images = collectImageUrls(product);

  if (!name && !brand && images.length === 0) {
    throw new OunassImporterError(
      'not-found',
      'Could not extract any product info from the response — empty payload?',
    );
  }

  return {
    sku: stringFromKeys(product, ['sku', 'productCode', 'code']) || skuFallback,
    name,
    brand,
    price,
    priceNumber,
    currency,
    description,
    category,
    images,
  };
}

// ── parser helpers ────────────────────────────────────────────────────

function unwrapProduct(obj: Record<string, unknown>): Record<string, unknown> {
  // If the top-level looks like a wrapper (only one string-keyed child
  // that's an object), unwrap one level. Common patterns:
  //   { product: {...} }
  //   { data: {...} }
  //   { result: { product: {...} } }
  const directKeys = ['product', 'data', 'result', 'item'];
  for (const key of directKeys) {
    const v = obj[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      // Recurse one more level in case it's `{ data: { product: ... } }`.
      return unwrapProduct(v as Record<string, unknown>);
    }
  }
  return obj;
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function stringFromKeys(
  obj: Record<string, unknown>,
  keys: string[],
): string {
  return pickString(obj, keys);
}

function numberFromKeys(
  obj: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/[, ]/g, ''));
      if (Number.isFinite(n)) return n;
    }
    // Some responses wrap price in { value: 1890, currency: 'AED' }.
    if (v && typeof v === 'object') {
      const inner = (v as Record<string, unknown>).value;
      if (typeof inner === 'number') return inner;
      if (typeof inner === 'string') {
        const n = Number(inner.replace(/[, ]/g, ''));
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return null;
}

function formatNumber(n: number): string {
  // Locale-stable thousands separator. Marketers expect "1,890" not
  // "1.890" or "1 890" regardless of browser locale.
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Walk a product object looking for image URLs in every common
 *  arrangement Ounass and similar e-com APIs use. Returns absolute
 *  https:// URLs only — relative paths are skipped because the editor
 *  embeds them as data URLs and base path is uncertain. */
function collectImageUrls(product: Record<string, unknown>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: unknown) => {
    if (typeof url !== 'string') return;
    let u = url.trim();
    if (!u) return;
    // Schemaless URLs like "//cdn.ounass.ae/…" — promote to https.
    if (u.startsWith('//')) u = `https:${u}`;
    if (!u.startsWith('http')) return;
    if (seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };

  // Direct keys with a flat URL or array of URLs.
  for (const key of [
    'image',
    'imageUrl',
    'mainImage',
    'thumbnail',
    'mediaUrl',
  ]) {
    push(product[key]);
  }

  // Array under common keys: ["url1","url2"] or [{ url: "…" }, …]
  for (const key of ['images', 'media', 'mediaList', 'gallery', 'imageUrls']) {
    const arr = product[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (typeof item === 'string') push(item);
      else if (item && typeof item === 'object') {
        for (const k of ['url', 'src', 'href', 'imageUrl', 'mediaUrl']) {
          push((item as Record<string, unknown>)[k]);
        }
      }
    }
  }

  // Nested media object: { media: { images: [...], video: ... } }
  const nested = product.media;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const arr = (nested as Record<string, unknown>).images;
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === 'string') push(item);
        else if (item && typeof item === 'object') {
          for (const k of ['url', 'src', 'href']) {
            push((item as Record<string, unknown>)[k]);
          }
        }
      }
    }
  }

  return out;
}

// ── field-mapping helper (template-agnostic) ──────────────────────────

import type { ProductListSubField } from '../../templates/fields';

/** Given an OunassProduct + the active template's `productFields`
 *  descriptor + the imagePath key, produce a partial product object
 *  ready to merge into the product row. The mapper recognises common
 *  field paths (name / brand / price / category / description) and
 *  fills them; unknown paths are left untouched.
 *
 *  Image is set on the imagePath key. The caller is responsible for
 *  having already let the marketer pick an image when there are
 *  multiple — `selectedImageUrl` is the single URL to write. */
export function mapOunassProductToFields(
  product: OunassProduct,
  productFields: ProductListSubField[],
  imagePath: string | undefined,
  selectedImageUrl: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const sub of productFields) {
    const path = sub.path;
    const value = pickValueForPath(product, path);
    if (value !== undefined) out[path] = value;
  }

  if (imagePath && selectedImageUrl) {
    out[imagePath] = selectedImageUrl;
  }

  return out;
}

/** Best-effort path → product-key mapping. Hand-curated rather than
 *  AI'd — the editable subfield paths in our templates are a small
 *  closed set ("name", "brand", "price", "category", "description",
 *  etc.) and a switch table is more predictable than fuzzy matching. */
function pickValueForPath(
  p: OunassProduct,
  path: string,
): string | number | undefined {
  switch (path) {
    case 'name':
    case 'productName':
    case 'displayName':
      return p.name || undefined;
    case 'brand':
    case 'brandName':
    case 'designer':
      return p.brand || undefined;
    case 'price':
    case 'priceText':
    case 'salePrice':
      return p.price || undefined;
    case 'priceNumber':
      return p.priceNumber ?? undefined;
    case 'priceUnit':
    case 'currency':
      return p.currency || undefined;
    case 'description':
    case 'summary':
    case 'shortDescription':
      return p.description || undefined;
    case 'category':
    case 'categoryName':
    case 'departmentName':
    case 'productType':
      return p.category || undefined;
    default:
      return undefined;
  }
}
