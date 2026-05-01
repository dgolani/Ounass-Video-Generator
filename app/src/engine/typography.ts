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
//   - numeric  → Noto Serif Display (SIL OFL; for prices and digits)
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
  // Portrait first — it's the brand's primary face and reads
  // beautifully on prices like "640 AED". The serif alternates stay
  // for marketers who want a more editorial/numeric look on a price
  // tag. Inter sneaks in for crisp sans-numerals (PLP-style "WW" tags
  // and small badges).
  numeric: ['Portrait', 'Noto Serif Display', 'Fraunces', 'Inter'],
  arabic: ['Noto Kufi Arabic', 'Noto Naskh Arabic', 'Cairo'],
};

/** Default typography shipped with the app. Brand Kit seeds from this on
 *  first load; editing in Brand Kit overrides these values per-boutique. */
export const DEFAULT_TYPOGRAPHY: Typography = {
  display: { family: 'Portrait', weight: 400 },   // Portrait 2 = Regular2 cut
  body: { family: 'Portrait', weight: 500 },      // Medium for kicker weight
  numeric: { family: 'Noto Serif Display', weight: 500 },
  arabic: { family: 'Noto Kufi Arabic', weight: 500 },
};

/** Build a CSS `font-family` stack string for a role. Appends web-safe
 *  fallbacks so even if the primary family fails to load the scene still
 *  renders in something sensible. Portrait is the preferred primary for
 *  display + body; the fallback chain includes Cormorant Garamond / Inter
 *  because they're the closest available substitutes if Portrait fails
 *  to load (e.g. before the woff2 arrives, or if the license lapses). */
export function fontStackFor(role: TypographyRole, family: string): string {
  const q = (f: string) => (/[^A-Za-z0-9-]/.test(f) ? `'${f}'` : f);
  switch (role) {
    case 'display':
      return `${q(family)}, 'Portrait', 'Cormorant Garamond', 'Fraunces', Georgia, serif`;
    case 'body':
      return `${q(family)}, 'Portrait', 'Inter', 'Nunito Sans', -apple-system, system-ui, sans-serif`;
    case 'numeric':
      return `${q(family)}, 'Noto Serif Display', 'Noto Serif', 'Fraunces', Georgia, serif`;
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
