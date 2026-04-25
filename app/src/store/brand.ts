import { useEffect, useState } from 'react';
import ounassLogoRaw from '../assets/ounass-logo.svg?raw';
import ounassLogoArabicRaw from '../assets/ounass-logo-arabic.svg?raw';
import { sanitizeSvg, svgToDataURL } from '../lib/logo';
import { DEFAULT_TYPOGRAPHY, type Typography } from '../engine/typography';
import {
  DEFAULT_SAFE_ZONES,
  type AspectKey,
  type SafeZone,
} from '../engine/safeZones';
import type { Locale } from '../engine/locale';

// Re-export so existing imports (`from '../store/brand'`) keep working.
export type { Locale };

export type BrandKit = {
  boutiqueName: string;
  /** Logo as a data URL. SVG-only going forward — the `<BoutiqueLogo>`
   *  component detects SVG and recolours it to match each template's
   *  palette. Legacy raster uploads still render (without recolour). */
  logo?: string;
  /** Arabic-locale variant of the boutique logo. When present and the
   *  active locale is `'ar'`, `applyBrand()` overlays this onto the
   *  template's logo path instead of `logo`. Falls through to `logo` if
   *  not set so single-locale boutiques keep working. */
  logoArabic?: string;
  colors: {
    background: string;
    paper: string;
    accent: string;
    accentDark: string;
  };
  /** Per-role typography selection (display / body / numeric / arabic).
   *  Templates read these via CSS variables (`var(--font-display)`, etc.)
   *  that are set on :root whenever the brand kit changes. Defaults flow
   *  through DEFAULT_TYPOGRAPHY when no brand override is saved. */
  typography: Typography;
  /** Per-aspect safe-zone margins (output pixels). Templates resolve
   *  these through `useSafeZone(aspect)` and anchor safe-layer elements
   *  (CTAs, kickers, badges) to the zone via `Math.max(design, safe.X)`.
   *  Seeded from DEFAULT_SAFE_ZONES — which matches marketing's spec —
   *  and editable per boutique from Brand Kit → Safe zones. */
  safeZones: Record<AspectKey, SafeZone>;
  /** Active locale for new ads. 'ar' triggers RTL + Arabic typography
   *  fallback at the scene level. Per-project override lands in Phase 5. */
  locale: Locale;
  /** Currency suffix appended to prices per locale. Defaults: English
   *  'AED', Arabic 'د.إ.' (UAE dirham abbreviation). Editable so other
   *  markets (e.g. SAR / ر.س.) can be configured without a code change. */
  currencyByLocale: Record<Locale, string>;
  updatedAt: number;
};

/** Default boutique logo — the vendored Ounass SVG wordmark. Encoded
 *  once at module load so the brand kit ships with it preselected. */
export const OUNASS_LOGO_DATA_URL = svgToDataURL(sanitizeSvg(ounassLogoRaw));
/** Arabic-locale Ounass wordmark (وناس / ounas in Arabic). Same encoding
 *  pipeline as the Latin mark — sanitised + base64 data URL. Picked up
 *  by `applyBrand()` when the active locale is `'ar'`. */
export const OUNASS_LOGO_ARABIC_DATA_URL = svgToDataURL(sanitizeSvg(ounassLogoArabicRaw));

export const DEFAULT_BRAND: BrandKit = {
  boutiqueName: 'Ounass',
  logo: OUNASS_LOGO_DATA_URL,
  logoArabic: OUNASS_LOGO_ARABIC_DATA_URL,
  colors: {
    background: '#0A0A0A',
    paper: '#F5F3EF',
    accent: '#C49373',
    accentDark: '#9C6B48',
  },
  typography: DEFAULT_TYPOGRAPHY,
  safeZones: DEFAULT_SAFE_ZONES,
  locale: 'en',
  currencyByLocale: { en: 'AED', ar: 'د.إ.' },
  updatedAt: 0,
};

const KEY = 'vag:brand:v1';
const CHANNEL = 'vag:brand:changed';

export function readBrand(): BrandKit {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_BRAND;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BRAND,
      ...parsed,
      colors: { ...DEFAULT_BRAND.colors, ...(parsed.colors ?? {}) },
      // Deep-merge typography so a partial override (e.g. just the display
      // role) still receives defaults for the other three.
      typography: {
        ...DEFAULT_BRAND.typography,
        ...(parsed.typography ?? {}),
      },
      // Per-aspect safe zones merge so newly introduced aspects (e.g. a
      // future 9:16-no-chrome-v2) don't strand older saves.
      safeZones: {
        ...DEFAULT_BRAND.safeZones,
        ...(parsed.safeZones ?? {}),
      },
      currencyByLocale: {
        ...DEFAULT_BRAND.currencyByLocale,
        ...(parsed.currencyByLocale ?? {}),
      },
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

export function writeBrand(brand: BrandKit) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...brand, updatedAt: Date.now() }));
    window.dispatchEvent(new CustomEvent(CHANNEL));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function resetBrand() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(CHANNEL));
  } catch {
    /* ignore */
  }
}

export function useBrand(): [BrandKit, (next: BrandKit) => void] {
  const [brand, setBrand] = useState<BrandKit>(() => readBrand());
  useEffect(() => {
    const onChange = () => setBrand(readBrand());
    window.addEventListener(CHANNEL, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANNEL, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  const set = (next: BrandKit) => {
    writeBrand(next);
    setBrand(next);
  };
  return [brand, set];
}

/** Overlay brand kit values on top of a template's defaultProps.
 *
 *  ONLY boutiqueName and logo are overlaid. Colors are **not** — each
 *  template keeps its editorial palette (Editorial = cream/ink/copper,
 *  Bestsellers = bone/ink/copper, Countdown = bold accent, etc.) so
 *  changing the brand kit never reshapes a designed template's look.
 *  Per-project colour customisation happens in the editor's Properties
 *  panel color pickers instead — that's where a marketer overrides a
 *  specific project's palette when they need to.
 *
 *  Brand Kit still stores colors (FormatDrawer uses them as a swatch
 *  palette for quick picks when editing a project's individual field
 *  colors) — they're just not auto-propagated. */
export function applyBrand<P extends Record<string, unknown>>(
  defaults: P,
  brand: BrandKit,
  /** Optional active locale. When `'ar'` and `brand.logoArabic` is
   *  set, the Arabic logo variant is overlaid in place of the Latin
   *  one. Omit (or pass `'en'`) to keep the existing behaviour. */
  options: { locale?: Locale } = {},
): P {
  const out: Record<string, unknown> = structuredClone(defaults);
  if ('boutiqueName' in out && brand.boutiqueName) {
    out.boutiqueName = brand.boutiqueName;
  }
  if ('logo' in out) {
    const localeAwareLogo =
      options.locale === 'ar' && brand.logoArabic ? brand.logoArabic : brand.logo;
    if (localeAwareLogo) {
      out.logo = localeAwareLogo;
    }
  }
  return out as P;
}
