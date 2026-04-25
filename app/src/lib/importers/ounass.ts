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

/** Base URL applied to relative image paths returned by Ounass.
 *
 *  The `findbysku` API returns `media[].src` like
 *  `/2/1/219552822_grey_in.jpg?ts=1776254014.7642` — these are
 *  Magento-style hashed paths. The Ounass storefront's <img srcset>
 *  reveals the actual CDN host: `ounass-ae.atgcdn.ae` (Al Tayer Group
 *  CDN, region-tagged for the UAE storefront) under
 *  `/pub/media/catalog/product/`. Verified against SKU 219552822
 *  (April 2026) — both variants work:
 *
 *    https://ounass-ae.atgcdn.ae/pub/media/catalog/product/2/1/…jpg
 *      → 200 OK, image/jpeg, full-resolution original.
 *    https://ounass-ae.atgcdn.ae/small_light(of=webp,q=90)/pub/media/catalog/product/2/1/…jpg
 *      → 200 OK, image/webp, transformed (smaller, faster).
 *
 *  We use the full-resolution path here because the imported image
 *  ends up baked into the marketer's exported MP4 — quality wins over
 *  payload size at that stage. Network preview uses the same URL;
 *  Ounass's CDN serves it fast enough.
 *
 *  Exported so the constant is easy to swap if Ounass migrates the
 *  CDN later (or splits per-region — e.g. `ounass-sa.atgcdn.ae` for
 *  Saudi Arabia). */
export const OUNASS_IMAGE_BASE_URL =
  'https://ounass-ae.atgcdn.ae/pub/media/catalog/product';

function resolveImageUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return '';
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${OUNASS_IMAGE_BASE_URL}${u}`;
  return `${OUNASS_IMAGE_BASE_URL}/${u}`;
}

/** Strip HTML tags from a string and collapse whitespace runs. Used
 *  for the `description` field which Ounass returns as
 *  `"<p>Effortlessly elegant, the Margherita Mule 50…</p>\n"`. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
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
    'name', // confirmed: Ounass live response key
    'displayName',
    'title',
    'productName',
    'shortName',
  ]);

  // Brand sits under `designer` (string) on the live Ounass response.
  // Fall back to brand-as-string, brand-as-object, designer-as-object,
  // and analytics.brand for older / alternate payloads.
  const brand =
    stringFromKeys(product, ['designer', 'brandName', 'designerName']) ||
    (typeof product.brand === 'string'
      ? (product.brand as string).trim()
      : pickString((product.brand as Record<string, unknown> | undefined) ?? {}, [
          'name',
          'displayName',
          'label',
        ])) ||
    (product.designer && typeof product.designer === 'object' && !Array.isArray(product.designer)
      ? pickString(product.designer as Record<string, unknown>, ['name', 'displayName'])
      : '') ||
    pickString((product.analytics as Record<string, unknown> | undefined) ?? {}, [
      'brand',
      'designer',
    ]);

  const descriptionRaw = stringFromKeys(product, [
    'description',
    'summary',
    'shortDescription',
    'productDescription',
  ]);
  // Ounass wraps description in <p>…</p>\n. Strip tags + collapse
  // whitespace so the editor's text field gets clean copy.
  const description = stripHtml(descriptionRaw);

  // Category preference, most-specific first:
  //   1. Last breadcrumb name ("Heels") — matches what marketers see
  //      on the storefront PDP.
  //   2. analytics.class ("Heels") — the single-word ad-tracking label.
  //   3. analytics.subClass ("Mules") — slightly more granular if the
  //      class field is empty.
  //   4. productClass / categoryName / productType — older payloads.
  const breadcrumbs = product.breadcrumbs;
  let category = '';
  if (Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
    const last = breadcrumbs[breadcrumbs.length - 1];
    if (last && typeof last === 'object') {
      category = pickString(last as Record<string, unknown>, ['name', 'label']);
    }
  }
  if (!category) {
    category =
      pickString((product.analytics as Record<string, unknown> | undefined) ?? {}, [
        'class',
        'subClass',
        'productClass',
      ]) ||
      stringFromKeys(product, [
        'productClass',
        'categoryName',
        'category',
        'departmentName',
        'productType',
      ]);
  }

  // Price preference: salePrice > finalPrice > minPrice > price >
  // initialPrice. The live response has top-level `price: 4920` plus
  // `minPrice: 4920` plus `initialPrice: 4920` — they're equal at full
  // price, but minPrice wins when there's a markdown.
  const priceNumber =
    numberFromKeys(product, [
      'salePrice',
      'finalPrice',
      'specialPrice',
      'currentPrice',
      'unitPrice',
      'priceFinal',
      'minPrice',
      'price',
      'initialPrice',
    ]) ?? null;
  const currency =
    stringFromKeys(product, ['localeCurrency', 'currency', 'currencyCode']) || 'AED';
  const price =
    priceNumber != null ? `${formatNumber(priceNumber)} ${currency}` : '';

  const images = collectImageUrls(product);

  if (!name && !brand && images.length === 0) {
    throw new OunassImporterError(
      'not-found',
      'Could not extract any product info from the response — empty payload?',
    );
  }

  return {
    sku:
      stringFromKeys(product, ['sku', 'visibleSku', 'productCode', 'code']) ||
      skuFallback,
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
 *  arrangement Ounass and similar e-com APIs use. Resolves relative
 *  paths via OUNASS_IMAGE_BASE_URL — the live response returns
 *  Magento-style hashed paths like `/2/1/219552822_grey_in.jpg?ts=…`
 *  rather than absolute CDN URLs.
 *
 *  Image kinds (`media[].mediaType`) are filtered to "image" only —
 *  videos in the same array are skipped because the editor's
 *  product-row image slot expects still images. */
function collectImageUrls(product: Record<string, unknown>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: unknown) => {
    if (typeof url !== 'string') return;
    const resolved = resolveImageUrl(url);
    if (!resolved) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);
    out.push(resolved);
  };

  // Live Ounass shape: `media: [{ src, mediaType: 'image', position }, …]`
  // Sort by `position` (1, 2, 3, 4) so the marketer sees images in the
  // same order as the storefront PDP gallery.
  const mediaArr = product.media;
  if (Array.isArray(mediaArr)) {
    const sorted = [...mediaArr].sort((a, b) => {
      const pa = (a as Record<string, unknown>)?.position;
      const pb = (b as Record<string, unknown>)?.position;
      const na = typeof pa === 'number' ? pa : 0;
      const nb = typeof pb === 'number' ? pb : 0;
      return na - nb;
    });
    for (const item of sorted) {
      if (typeof item === 'string') {
        push(item);
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      // Skip videos / non-image media types.
      const kind = obj.mediaType;
      if (typeof kind === 'string' && kind !== 'image') continue;
      for (const k of ['url', 'src', 'href', 'imageUrl', 'mediaUrl']) {
        push(obj[k]);
      }
    }
  } else if (mediaArr && typeof mediaArr === 'object') {
    // Older shape: `{ media: { images: [...] } }`
    const arr = (mediaArr as Record<string, unknown>).images;
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

  // Top-level direct keys (single URLs).
  for (const key of [
    'image',
    'imageUrl',
    'mainImage',
    'thumbnail',
    'smallImage',
    'mediaUrl',
  ]) {
    push(product[key]);
  }

  // Other array keys for older / alternate payloads.
  for (const key of ['images', 'mediaList', 'gallery', 'imageUrls']) {
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
