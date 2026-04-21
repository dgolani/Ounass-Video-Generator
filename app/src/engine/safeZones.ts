// Safe-zone config — the "keep-clear" margins per aspect that keep copy,
// CTAs, and buttons out of platform UI overlays (Instagram caption, TikTok
// like-stack, story progress bar, etc.).
//
// Phase 2 (this file): config + resolver + hook. No template changes yet.
// Phase 3 will retrofit templates to anchor their safe-layer content to
// the resolved zone via useSafeZone().
// Phase 4 will add Brand Kit editing surfaces so Faizan can tune the
// defaults per boutique without a code change.
// Phase 5 will add per-project overrides.

import { useMemo } from 'react';
import type { AspectRatio } from '../templates/types';

/** Identifier per aspect preset. Matches the width/height ratios used in
 *  templates' meta.aspects[]. A fourth `'9:16-no-chrome'` preset exists
 *  for export targets without platform UI (WhatsApp, DOOH, email) and
 *  resolves to zero margins — surfaced in the export picker in Phase 4. */
export type AspectKey = '9:16' | '4:5' | '1:1' | '9:16-no-chrome';

/** Margins in base-1080-canvas pixels. Every template uses the same base
 *  and scales via w/h helpers, so values here transfer directly. */
export type SafeZone = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** Ounass's default safe zones — values from marketing (Faizan, 2026-04-19).
 *  Tuned to clear Instagram/TikTok chrome on phones. Editable at boutique
 *  level once Brand Kit → Safe Zones lands in Phase 4. */
export const DEFAULT_SAFE_ZONES: Record<AspectKey, SafeZone> = {
  '9:16':            { top: 250, bottom: 300, left: 0, right: 120 },
  '4:5':             { top: 120, bottom: 200, left: 0, right: 0 },
  '1:1':             { top: 100, bottom: 100, left: 0, right: 0 },
  '9:16-no-chrome':  { top: 0,   bottom: 0,   left: 0, right: 0 },
};

/** Zero-margin zone — useful fallback when no key resolves. */
export const ZERO_SAFE_ZONE: SafeZone = { top: 0, bottom: 0, left: 0, right: 0 };

/** Classify a concrete aspect-ratio entry (with width + height in pixels)
 *  as one of our AspectKey presets. Returns null for custom ratios that
 *  don't match any preset — callers should fall back to ZERO_SAFE_ZONE. */
export function aspectKeyOf(aspect: Pick<AspectRatio, 'width' | 'height'>): AspectKey | null {
  const r = aspect.width / aspect.height;
  // Tolerance ~1% to absorb rounding (1080/1350 = 0.8, 1080/1920 = 0.5625, 1/1 = 1)
  if (Math.abs(r - 9 / 16) < 0.01) return '9:16';
  if (Math.abs(r - 4 / 5) < 0.01) return '4:5';
  if (Math.abs(r - 1) < 0.01) return '1:1';
  return null;
}

/** Resolve the safe zone for an aspect (by key). Phase 2: returns the
 *  hardcoded default. Phase 4/5 will extend this to compose project
 *  override → brand kit override → default. */
export function resolveSafeZone(key: AspectKey | null): SafeZone {
  if (!key) return ZERO_SAFE_ZONE;
  return DEFAULT_SAFE_ZONES[key] ?? ZERO_SAFE_ZONE;
}

/** React hook — resolve the safe zone for a given aspect and return both
 *  base-canvas values (for templates that compute against the 1080×1920
 *  base) and scaled pixel values (convenience for the editor overlay).
 *
 *  Usage in a scene:
 *    const { base } = useSafeZone(aspect);
 *    style={{ bottom: h(base.bottom) }}  // respects the zone
 *
 *  Usage in the overlay:
 *    const { baseW, baseH, base } = useSafeZone(aspect);
 *    // draw rect at (base.left, base.top) sized (baseW - left - right) × ...
 */
export function useSafeZone(aspect: Pick<AspectRatio, 'width' | 'height'>) {
  return useMemo(() => {
    const key = aspectKeyOf(aspect);
    const base = resolveSafeZone(key);
    return {
      /** Resolved key ('9:16' / '4:5' / '1:1' / null for custom). */
      key,
      /** Raw margins in base-1080-canvas pixels. Feed through h()/w(). */
      base,
      /** Aspect's own base dimensions (pass-through for convenience). */
      baseW: aspect.width,
      baseH: aspect.height,
    };
  }, [aspect.width, aspect.height]);
}
