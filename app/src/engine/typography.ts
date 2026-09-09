import { useEffect } from 'react';

// Typography token system.
//
// Templates never name a font directly — they reference the role via a CSS
// variable on the scene root:
//
//   fontFamily: 'var(--font-display)'
//   fontFamily: 'var(--font-body)'
//   fontFamily: 'var(--font-numeric)'
//   fontFamily: 'var(--font-arabic)'
//
// The brand kit overrides these at runtime by writing CSS variables on
// `:root` via `applyTypographyCSSVars()`. A locked set of curated Google
// Font families is available; uploaded custom fonts (registered via the
// FontFace API in Phase 5) extend the selectable list without code changes.
//
// Hardcoded defaults reflect Ounass's licensed brand typography:
//   - display  → Portrait (Commercial Type; "Portrait 2" = Regular2 cut)
//   - body     → Portrait (same family, kicker/body weights)
//   - numeric  → Nunito Sans (SIL OFL; for prices and digits)
//   - arabic   → Noto Kufi Arabic (SIL OFL; for Arabic script)
//
// All four default families are self-hosted under app/src/assets/fonts/
// with @font-face declarations in app/src/styles/fonts.css, so templates
// render deterministically offline and independent of Google Fonts.
// Alternate families in CURATED_FAMILIES come from Google Fonts (loaded
// in index.html) for marketer choice in Brand Kit → Typography.

export type TypographyRole = 'display' | 'body' | 'numeric' | 'arabic';

export type FontChoice = {
  /** Family name as used in CSS (no quotes — added at stack-build time). */
  family: string;
  /** Weight used by default for this role. Templates can override inline if
   *  they need heavier/lighter, but role defaults keep a consistent voice. */
  weight: number;
};

export type Typography = Record<TypographyRole, FontChoice>;

/** Per-role family options shown in Brand Kit → Typography dropdowns.
 *  First entry is the licensed/self-hosted default; remaining entries are
 *  Google Fonts alternates for marketer choice. Custom uploads (if ever
 *  needed later) could be appended at runtime — for now this list is the
 *  full selectable universe. */
export const CURATED_FAMILIES: Record<TypographyRole, string[]> = {
  display: ['Portrait', 'Cormorant Garamond', 'Playfair Display', 'Fraunces'],
  body: ['Portrait', 'Inter', 'DM Sans', 'Nunito Sans'],
  // Nunito Sans first — marketing supplied the full 14-face family and
  // asked for it as the number face (Build 0.3), replacing Noto Serif
  // Display. Portrait stays as the brand's primary face for marketers
  // who want prices in the display serif; Fraunces is the editorial
  // alternate and Inter the crisp sans-numeral option (PLP-style "WW"
  // tags and small badges).
  numeric: ['Nunito Sans', 'Portrait', 'Fraunces', 'Inter'],
  arabic: ['Noto Kufi Arabic', 'Noto Naskh Arabic', 'Cairo'],
};

/** Default typography shipped with the app. Brand Kit seeds from this on
 *  first load; editing in Brand Kit overrides these values per-boutique. */
export const DEFAULT_TYPOGRAPHY: Typography = {
  display: { family: 'Portrait', weight: 400 },   // Portrait 2 = Regular2 cut
  body: { family: 'Portrait', weight: 500 },      // Medium for kicker weight
  // 600 SemiBold, not 500: Nunito Sans ships no Medium cut, and asking
  // for a weight a family doesn't have lets the browser substitute or
  // synthesise one — the preview/export mismatch class we fixed in 0.2.
  numeric: { family: 'Nunito Sans', weight: 600 },
  arabic: { family: 'Noto Kufi Arabic', weight: 500 },
};

/** Human labels for CSS weight numbers, used by every weight picker. */
export const WEIGHT_LABELS: Record<number, string> = {
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/** Which cuts each family ACTUALLY ships, mirroring the @font-face
 *  declarations in styles/fonts.css (self-hosted) and
 *  styles/google-fonts.css (vendored). Weight pickers read this so a
 *  marketer can only pick a real face: asking for a weight/style a family
 *  doesn't have makes the browser substitute a neighbouring cut or
 *  synthesise a fake oblique, and those fakes have different metrics in
 *  the rasterized export than in the live preview.
 *
 *  Keep in sync when adding or removing an @font-face block. */
export const FAMILY_FACES: Record<string, { weights: number[]; italics: number[] }> = {
  // Self-hosted (styles/fonts.css)
  'Portrait': { weights: [300, 400, 500, 700], italics: [300, 400, 500, 700] },
  'Nunito Sans': {
    weights: [200, 300, 400, 600, 700, 800, 900],
    italics: [200, 300, 400, 600, 700, 800, 900],
  },
  'Noto Serif Display': { weights: [400, 500, 700], italics: [400, 500, 700] },
  'Noto Kufi Arabic': { weights: [400, 500, 600, 700], italics: [] },
  // Vendored from Google Fonts (styles/google-fonts.css)
  'Cormorant Garamond': { weights: [300, 400, 500, 600, 700], italics: [300, 400, 500, 600] },
  'Playfair Display': { weights: [400, 500, 600, 700, 800], italics: [400, 500] },
  'Fraunces': { weights: [300, 400, 500, 600], italics: [300] },
  'Inter': { weights: [300, 400, 500, 600, 700, 800], italics: [] },
  'DM Sans': { weights: [300, 400, 500, 700], italics: [400] },
  'Noto Naskh Arabic': { weights: [400, 500, 600, 700], italics: [] },
  'Cairo': { weights: [300, 400, 500, 600, 700, 800], italics: [] },
};

/** Fallback for a family we don't have a face list for (e.g. a future
 *  custom upload): offer the common range rather than nothing. */
const GENERIC_WEIGHTS = [300, 400, 500, 600, 700];

/** Weights this family can render without substitution. */
export function weightsFor(family: string): number[] {
  return FAMILY_FACES[family]?.weights ?? GENERIC_WEIGHTS;
}

/** True when this family ships a real italic for the given weight. */
export function supportsItalic(family: string, weight: number): boolean {
  const faces = FAMILY_FACES[family];
  if (!faces) return true;
  return faces.italics.includes(weight);
}

/** Nearest real weight in `family` to `weight`. Used when switching
 *  family (or loading an older save) would otherwise leave a selection
 *  pointing at a cut that family doesn't have — e.g. Noto Serif Display
 *  500 -> Nunito Sans, which has no 500. Ties round up, so a price keeps
 *  its presence rather than getting lighter. */
export function snapWeight(family: string, weight: number): number {
  const available = weightsFor(family);
  if (available.includes(weight)) return weight;
  return available.reduce((best, w) =>
    Math.abs(w - weight) < Math.abs(best - weight) ? w : best,
  available[0]);
}

/** Coerce a whole Typography object onto real faces. Brand kits are
 *  persisted in localStorage, so a kit saved before a family swap can
 *  name a family that is no longer offered (or a weight it never had).
 *  Called on read in store/brand.ts. */
export function normalizeTypography(typography: Typography): Typography {
  const out = {} as Typography;
  for (const role of Object.keys(typography) as TypographyRole[]) {
    const choice = typography[role] ?? DEFAULT_TYPOGRAPHY[role];
    const family = CURATED_FAMILIES[role].includes(choice.family)
      ? choice.family
      : DEFAULT_TYPOGRAPHY[role].family;
    out[role] = { family, weight: snapWeight(family, choice.weight) };
  }
  return out;
}

/** Build a CSS `font-family` stack string for a role. Appends web-safe
 *  fallbacks so even if the primary family fails to load the scene still
 *  renders in something sensible. Portrait is the preferred primary for
 *  display + body; the fallback chain includes Cormorant Garamond / Inter
 *  because they're the closest available substitutes if Portrait fails
 *  to load (e.g. before the woff2 arrives, or if the license lapses). */
export function fontStackFor(role: TypographyRole, family: string): string {
  const q = (f: string) => (/[^A-Za-z0-9-]/.test(f) ? `'${f}'` : f);
  // The chosen family is also present in most fallback chains, so a
  // marketer picking the role default used to yield "'Portrait',
  // 'Portrait', ..." — harmless to CSS but confusing when debugging which
  // face resolved. Drop exact repeats, keeping first-wins order.
  const dedupe = (stack: string) => {
    const seen = new Set<string>();
    return stack
      .split(',')
      .map((part) => part.trim())
      .filter((part) => {
        const key = part.replace(/['"]/g, '').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(', ');
  };
  return dedupe(rawFontStackFor(role, family, q));
}

function rawFontStackFor(
  role: TypographyRole,
  family: string,
  q: (f: string) => string,
): string {
  switch (role) {
    case 'display':
      return `${q(family)}, 'Portrait', 'Cormorant Garamond', 'Fraunces', Georgia, serif`;
    case 'body':
      return `${q(family)}, 'Portrait', 'Inter', 'Nunito Sans', -apple-system, system-ui, sans-serif`;
    case 'numeric':
      return `${q(family)}, 'Nunito Sans', 'Inter', -apple-system, system-ui, sans-serif`;
    case 'arabic':
      return `${q(family)}, 'Noto Kufi Arabic', 'Noto Naskh Arabic', 'Tahoma', sans-serif`;
  }
}

/** Write all four role families to CSS variables on the given element
 *  (defaults to document root). Called from a React effect whenever the
 *  brand kit changes, so scenes repaint with the new typography instantly. */
export function applyTypographyCSSVars(
  typography: Typography,
  target: HTMLElement = document.documentElement,
): void {
  for (const role of Object.keys(typography) as TypographyRole[]) {
    const { family } = typography[role];
    target.style.setProperty(`--font-${role}`, fontStackFor(role, family));
  }
}

/** React hook: keeps `:root` CSS variables in sync with the given
 *  `typography` object. Mount once at the app root; every scene downstream
 *  picks up the active families via `var(--font-*)` automatically. */
export function useApplyTypographyCSSVars(typography: Typography): void {
  useEffect(() => {
    applyTypographyCSSVars(typography);
  }, [typography]);
}
