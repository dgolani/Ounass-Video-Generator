// Safe-zone config — keep-clear margins per aspect that keep copy, CTAs,
// and buttons out of platform UI overlays (Instagram caption, TikTok
// like-stack, story progress bar, etc.).
//
// **Always-safe regime** (post-2026-04-24 cleanup): scenes always render
// with the resolved safe margins. There is no "enforcement off" render
// state — the editor's "Safe zones" toggle only controls the dim-overlay
// visibility, not the composition. Exports, preview cards, and the
// editor canvas all show the same safe-aware render.
//
// Trade-off: 1:1 square was removed from the supported aspect list at
// the same time (marketing only ships 9:16 Story and 4:5 Feed). If it
// ever returns, add the key to AspectKey + DEFAULT_SAFE_ZONES and it'll
// flow back through every template via meta.aspects[].

import { createContext, useContext, useMemo } from 'react';
import type { AspectRatio } from '../templates/types';

/** Identifier per aspect preset. Matches the width/height ratios used in
 *  templates' meta.aspects[]. `9:16-no-chrome` is reserved for export
 *  targets without platform UI (WhatsApp / DOOH / email) and resolves
 *  to zero margins — not yet wired into any template's aspects list. */
export type AspectKey = '9:16' | '4:5' | '9:16-no-chrome';

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
 *  level via Brand Kit → Safe Zones (Phase 4). */
export const DEFAULT_SAFE_ZONES: Record<AspectKey, SafeZone> = {
  '9:16':            { top: 250, bottom: 300, left: 0, right: 120 },
  '4:5':             { top: 120, bottom: 200, left: 0, right: 0 },
  '9:16-no-chrome':  { top: 0,   bottom: 0,   left: 0, right: 0 },
};

/** Zero-margin zone — useful fallback when no key resolves. */
export const ZERO_SAFE_ZONE: SafeZone = { top: 0, bottom: 0, left: 0, right: 0 };

/** Classify a concrete aspect-ratio entry (with width + height in pixels)
 *  as one of our AspectKey presets. Returns null for custom ratios that
 *  don't match any preset — callers should fall back to ZERO_SAFE_ZONE. */
export function aspectKeyOf(aspect: Pick<AspectRatio, 'width' | 'height'>): AspectKey | null {
  const r = aspect.width / aspect.height;
  // Tolerance ~1% to absorb rounding (9/16 = 0.5625, 4/5 = 0.8).
  if (Math.abs(r - 9 / 16) < 0.01) return '9:16';
  if (Math.abs(r - 4 / 5) < 0.01) return '4:5';
  return null;
}

/** Resolve the safe zone for an aspect (by key). Brand Kit overrides
 *  take precedence over the defaults; unknown keys fall back to zero. */
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
 *  No enforcement flag — safe margins are always applied. The editor's
 *  "Safe zones" toggle only affects whether the dim overlay renders;
 *  the scene composition is identical either way.
 */
export function useSafeZone(aspect: Pick<AspectRatio, 'width' | 'height'>) {
  const overrides = useContext(SafeZoneOverridesContext);
  return useMemo(() => {
    const key = aspectKeyOf(aspect);
    const base = key
      ? overrides?.[key] ?? DEFAULT_SAFE_ZONES[key]
      : ZERO_SAFE_ZONE;
    return {
      /** Resolved key ('9:16' / '4:5' / '9:16-no-chrome' / null). */
      key,
      /** Resolved margins in output pixels. */
      base,
      /** Aspect's own base dimensions (pass-through for convenience). */
      baseW: aspect.width,
      baseH: aspect.height,
    };
  }, [aspect.width, aspect.height, overrides]);
}
