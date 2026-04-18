// Single source for all default product imagery used across templates.
// JPEGs live in ./photos/ at 1080×1620 q85 (~150 KB each, ~1.5 MB total).
//
// All template defaults reference these — never duplicate the image
// files inside a template folder.

import dress      from './photos/01-dress.jpg';
import trouser    from './photos/02-trouser.jpg';
import blouse     from './photos/03-blouse.jpg';
import outerwear  from './photos/04-outerwear.jpg';
import handbag    from './photos/05-handbag.jpg';
import shoes      from './photos/06-shoes.jpg';
import sunglasses from './photos/07-sunglasses.jpg';
import watch      from './photos/08-watch.jpg';
import jewellery  from './photos/09-jewellery.jpg';
import knitwear   from './photos/10-knitwear.jpg';

/**
 * Named export per garment type. Use these directly in template defaults
 * when you want a specific item:
 *
 *   import { photos } from '../../assets/placeholders';
 *   { id: 'p1', src: photos.dress, name: 'Silk Slip Dress', ... }
 */
export const photos = {
  dress,
  trouser,
  blouse,
  outerwear,
  handbag,
  shoes,
  sunglasses,
  watch,
  jewellery,
  knitwear,
} as const;

/** Ordered array of all 10 photos. Useful when iterating. */
export const allPhotos: string[] = Object.values(photos);

/** First N photos as an array — for templates that show a fixed grid. */
export function firstNPhotos(n: number): string[] {
  return allPhotos.slice(0, Math.max(0, Math.min(n, allPhotos.length)));
}

// ── Backwards-compatible aliases ─────────────────────────────────────────
// Earlier templates referenced `productPlaceholders.p01..p06`,
// `heroSilhouette`, `salePlaceholder`, `firstNPlaceholders`. Keep those
// names working so existing templates pick up the new photos with no edit.
//
// If you're authoring a NEW template, prefer `photos.<name>` for clarity.

export const productPlaceholders = {
  p01: dress,
  p02: trouser,
  p03: blouse,
  p04: outerwear,
  p05: handbag,
  p06: shoes,
  // Newly available — use these in future templates that want a wider set:
  p07: sunglasses,
  p08: watch,
  p09: jewellery,
  p10: knitwear,
} as const;

/** Single dramatic image for hero templates. */
export const heroSilhouette: string = photos.dress;

/** Moody luxury accent backdrop for promo templates. */
export const salePlaceholder: string = photos.jewellery;

/** Convenience: first N product placeholders as ordered array. */
export const firstNPlaceholders = firstNPhotos;
