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

import { createContext, useContext, useMemo } from 'react';
import type { AspectRatio } from '../templates/types';

/** Whether the current render should enforce safe-zone margins on content.
 *
 *  - `true`  → scenes anchor safe-layer content to the resolved zone
 *              (CTAs / kickers / badges get pulled in).
 *  - `false` → scenes render at their original designer-intent positions
 *              (content may sit under platform UI — useful in the editor
 *              to preview the pure design).
 *
 *  Default is `true`. The editor overrides this to the value of its
 *  "Safe zones" toggle so designers can flip between designer-view
 *  (toggle OFF) and platform-view (toggle ON). MP4 export and preview
 *  cards don't override the default — they always render enforced so
 *  what ships is what platforms can show. */
export const SafeZoneEnforcementContext = createContext<boolean>(true);

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

/** Context for per-aspect safe-zone overrides supplied by the brand kit.
 *  When null (default), `useSafeZone` falls back to DEFAULT_SAFE_ZONES.
 *  The app top-level mounts a Provider fed by useBrand() so every scene
 *  reactively picks up Brand Kit → Safe Zones edits without prop drilling. */
export const SafeZoneOverridesContext = createContext<
  Record<AspectKey, SafeZone> | null
>(null);

/** React hook — resolve the safe zone for a given aspect.
 *
 *  Resolution order (first non-null wins):
 *    1. brand kit's `safeZones[key]`  (via SafeZoneOverridesContext)
 *    2. DEFAULT_SAFE_ZONES[key]
 *    3. ZERO_SAFE_ZONE (unknown aspect)
 *
 *  Honours SafeZoneEnforcementContext: when enforcement is off (editor
 *  toggle OFF), ZERO is returned regardless of the resolved values so
 *  designers can preview the unshifted layout.
 */
export function useSafeZone(aspect: Pick<AspectRatio, 'width' | 'height'>) {
  const enforce = useContext(SafeZoneEnforcementContext);
  const overrides = useContext(SafeZoneOverridesContext);
  return useMemo(() => {
    const key = aspectKeyOf(aspect);
    const resolved = key
      ? overrides?.[key] ?? DEFAULT_SAFE_ZONES[key]
      : ZERO_SAFE_ZONE;
    const base = enforce ? resolved : ZERO_SAFE_ZONE;
    return {
      /** Resolved key ('9:16' / '4:5' / '1:1' / null for custom). */
      key,
      /** Resolved margins in output pixels. Zeros if enforcement is off. */
      base,
      /** Aspect's own base dimensions (pass-through for convenience). */
      baseW: aspect.width,
      baseH: aspect.height,
      /** Whether enforcement is currently on for this render. */
      enforced: enforce,
    };
  }, [aspect.width, aspect.height, enforce, overrides]);
}
