import { useEffect, useState } from 'react';

export type BrandKit = {
  boutiqueName: string;
  /** Logo as a data URL. Templates that declare a `logo` prop use this
   *  as the default when a new project is created. */
  logo?: string;
  colors: {
    background: string;
    paper: string;
    accent: string;
    accentDark: string;
  };
  updatedAt: number;
};

export const DEFAULT_BRAND: BrandKit = {
  boutiqueName: 'Ounass',
  logo: undefined,
  colors: {
    background: '#0A0A0A',
    paper: '#F5F3EF',
    accent: '#C49373',
    accentDark: '#9C6B48',
  },
  updatedAt: 0,
};

const KEY = 'vag:brand:v1';
const CHANNEL = 'vag:brand:changed';

export function readBrand(): BrandKit {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_BRAND;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BRAND, ...parsed, colors: { ...DEFAULT_BRAND.colors, ...(parsed.colors ?? {}) } };
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

/** Overlay brand kit values on top of a template's defaultProps. */
export function applyBrand<P extends Record<string, unknown>>(
  defaults: P,
  brand: BrandKit,
): P {
  const out: Record<string, unknown> = structuredClone(defaults);
  if ('boutiqueName' in out && brand.boutiqueName) {
    out.boutiqueName = brand.boutiqueName;
  }
  if ('logo' in out && brand.logo) {
    out.logo = brand.logo;
  }
  if (
    'colors' in out &&
    out.colors &&
    typeof out.colors === 'object'
  ) {
    out.colors = { ...(out.colors as object), ...brand.colors };
  }
  return out as P;
}
