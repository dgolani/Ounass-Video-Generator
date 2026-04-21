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
// Hardcoded defaults reflect Ounass's luxury-fashion direction:
//   - display  → Cormorant Garamond (editorial, couture italic)
//   - body     → Inter (clean digital-luxury sans)
//   - numeric  → Noto Serif (elegant, tabular-feel digits)
//   - arabic   → Noto Kufi Arabic (contemporary Arabic for luxury brands)

export type TypographyRole = 'display' | 'body' | 'numeric' | 'arabic';

export type FontChoice = {
  /** Family name as used in CSS (no quotes — added at stack-build time). */
  family: string;
  /** Weight used by default for this role. Templates can override inline if
   *  they need heavier/lighter, but role defaults keep a consistent voice. */
  weight: number;
};

export type Typography = Record<TypographyRole, FontChoice>;

/** The eight curated Google Fonts (+ the Ounass previous defaults kept as
 *  fallbacks). Every option is free + webfont-licensed. Custom uploads
 *  (Portrait 2, etc.) extend this list at runtime via registerCustomFont(). */
export const CURATED_FAMILIES: Record<TypographyRole, string[]> = {
  display: ['Cormorant Garamond', 'Playfair Display', 'Fraunces'],
  body: ['Inter', 'DM Sans', 'Nunito Sans'],
  numeric: ['Noto Serif', 'Fraunces'],
  arabic: ['Noto Kufi Arabic', 'Noto Naskh Arabic', 'Cairo'],
};

/** Default typography shipped with the app. Brand Kit seeds from this on
 *  first load; editing in Brand Kit overrides these values per-boutique. */
export const DEFAULT_TYPOGRAPHY: Typography = {
  display: { family: 'Cormorant Garamond', weight: 400 },
  body: { family: 'Inter', weight: 500 },
  numeric: { family: 'Noto Serif', weight: 500 },
  arabic: { family: 'Noto Kufi Arabic', weight: 500 },
};

/** Build a CSS `font-family` stack string for a role. Appends web-safe
 *  fallbacks so even if the primary family fails to load the scene still
 *  renders in something sensible. */
export function fontStackFor(role: TypographyRole, family: string): string {
  const q = (f: string) => (/[^A-Za-z0-9-]/.test(f) ? `'${f}'` : f);
  switch (role) {
    case 'display':
      return `${q(family)}, 'Cormorant Garamond', 'Fraunces', Georgia, serif`;
    case 'body':
      return `${q(family)}, 'Inter', 'Nunito Sans', -apple-system, system-ui, sans-serif`;
    case 'numeric':
      return `${q(family)}, 'Noto Serif', 'Fraunces', Georgia, serif`;
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
