import { useEffect, useMemo } from 'react';
import { Stage, useStageController, ThemeModeContext, type ThemeMode } from '../../engine';
import type { TemplateEntry } from '../../templates/registry';
import type { ProjectBackground } from '../../store/types';
import { applyBrand, useBrand } from '../../store/brand';
import { isVideoUrl } from '../../lib/media';

type Props = {
  template: TemplateEntry;
  /** Override props (e.g. for dashboard project cards). Falls back to the
   *  template's defaultProps when not provided. */
  props?: unknown;
  /** Override duration (e.g. for projects with custom duration). */
  duration?: number;
  /** When true, autoplay loops. When false, paused on a deterministic poster frame (not t=0). */
  playing: boolean;
  /** Aspect index into template.meta.aspects[]. Default 0 (the primary aspect). */
  aspectIndex?: number;
  /**
   * Seed for the **paused** poster frame (deterministic pseudo-random time in
   * the clip so cards are not stuck at t=0 where many ads are still black).
   * Defaults to `template.meta.id`. Pass **`project.id`** on dashboard cards
   * so each project gets its own poster moment.
   */
  posterSeed?: string;
  /** Force a specific theme mode when the template opts into supportsThemes.
   *  Used by the gallery to render a light/dark split preview (one instance
   *  per mode). When omitted, falls through to the ambient ThemeModeContext
   *  (which defaults to 'light'). */
  mode?: ThemeMode;
};

/** 0..1 from string; stable for the same seed (card identity). */
function stableUnitRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Pick a time away from the ends so fades / outros are less likely. */
function posterTimeFromSeed(seed: string, durationSec: number): number {
  const d = Math.max(0.05, durationSec);
  const u = stableUnitRandom(seed);
  const inset = Math.min(0.14 * d, d * 0.35);
  const span = Math.max(d - 2 * inset, 0.1);
  return inset + u * span;
}

/** Synthesize a `ProjectBackground` from a template's preview props
 *  so gallery cards show the video / image backdrop the way the
 *  editor would once the marketer creates a project from this
 *  template. Mirrors the auto-migration logic in
 *  `store/projects.ts:normalizeBackground` — picks `videoSrc`
 *  (Reel-only legacy) first, then `backgroundImage`, then falls
 *  through to undefined. */
function previewBackgroundFromProps(
  sceneProps: unknown,
  duration: number,
): ProjectBackground | undefined {
  if (!sceneProps || typeof sceneProps !== 'object') return undefined;
  const p = sceneProps as Record<string, unknown>;
  const candidate =
    (typeof p.videoSrc === 'string' && p.videoSrc) ||
    (typeof p.backgroundImage === 'string' && p.backgroundImage) ||
    undefined;
  if (!candidate) return undefined;
  if (isVideoUrl(candidate)) {
    return {
      kind: 'video',
      src: candidate,
      dim: typeof p.videoDim === 'number' ? Math.max(0, Math.min(1, p.videoDim)) : 0.24,
      anchorVideoTime: 0,
      trimStartSec: 0,
      endVideoTime: duration,
    };
  }
  return { kind: 'image', src: candidate, dim: 0 };
}

/** Resolve a theme-aware background colour from sceneProps.colors. Handles
 *  three shapes: `{ background }` (unthemed), `{ light: {background}, dark: {background} }`
 *  (themed pair), and `undefined` (fallback to a dark neutral). */
function resolveBackground(sceneProps: unknown, mode: ThemeMode): string {
  const colors = (sceneProps as { colors?: unknown })?.colors;
  if (!colors || typeof colors !== 'object') return '#0A0A0A';
  if ('light' in colors && 'dark' in colors) {
    const pair = colors as { light: { background?: string }; dark: { background?: string } };
    return (mode === 'dark' ? pair.dark?.background : pair.light?.background) ?? '#0A0A0A';
  }
  return (colors as { background?: string }).background ?? '#0A0A0A';
}

/**
 * A live, paused-by-default mini-render of a template scene.
 *
 * Used by gallery + dashboard cards to show the actual animation on hover
 * instead of a static thumbnail. Cheap when paused (no RAF loop). Multiple
 * instances on a page are safe — keyboard control + persist are disabled.
 */
export function TemplatePreview({
  template,
  props,
  duration,
  playing,
  aspectIndex = 0,
  posterSeed,
  mode,
}: Props) {
  const aspect = template.meta.aspects[aspectIndex] ?? template.meta.aspects[0];
  const dur = duration ?? template.meta.defaultDuration;
  const Scene = template.Scene;
  // When an explicit `props` isn't passed (Templates gallery cards), fall
  // back to the template's defaultProps *overlaid with the brand kit* so
  // preview cards reflect the user's current logo + palette. useBrand()
  // keeps this reactive — updating the brand kit re-renders all cards.
  const [brand] = useBrand();
  const sceneProps = useMemo(
    () =>
      props ??
      applyBrand(
        template.meta.defaultProps as Record<string, unknown>,
        brand,
      ),
    [props, template, brand],
  );

  const posterKey = useMemo(() => {
    const base = posterSeed ?? template.meta.id;
    return `${base}-a${aspectIndex}-d${Math.round(dur * 100)}-m${mode ?? 'x'}`;
  }, [posterSeed, template.meta.id, aspectIndex, dur, mode]);

  const posterTime = useMemo(() => posterTimeFromSeed(posterKey, dur), [posterKey, dur]);

  const controller = useStageController({
    duration: dur,
    loop: true,
    autoplay: false, // start paused; play only when hovered
    keyboard: false, // multiple stages per page → no global keyboard
    initialTime: posterTime,
  });

  const { setTime, setPlaying } = controller;

  // Drive play state from the prop. When idle, park on a seeded “poster”
  // time instead of 0 so thumbnails are not blank on fade-in opens.
  useEffect(() => {
    if (playing) {
      setPlaying(true);
      return;
    }
    setPlaying(false);
    setTime(posterTime);
  }, [playing, posterTime, setPlaying, setTime]);

  const resolvedMode: ThemeMode = mode ?? 'light';
  const bg = resolveBackground(sceneProps, resolvedMode);

  // Gallery / dashboard preview cards never reach the editor's
  // BackgroundDrawer state — they render straight off the template's
  // defaultProps. Synthesize a project-bg from the legacy
  // `videoSrc` / `backgroundImage` fields so cards show the same
  // video/image backdrop the editor would once the marketer created
  // a project from this template.
  const previewProjectBg = useMemo(
    () => previewBackgroundFromProps(sceneProps, dur),
    [sceneProps, dur],
  );

  const stage = (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${aspect.width} / ${aspect.height}`,
        background: bg,
        overflow: 'hidden',
        // Block pointer events so the parent card's onClick wins and the
        // scene's tap-ripple handlers don't fire inside a card.
        pointerEvents: 'none',
        borderRadius: 'var(--r-md)',
      }}
    >
      <Stage
        width={aspect.width}
        height={aspect.height}
        background={previewProjectBg ? 'transparent' : bg}
        controller={controller}
        projectBackground={previewProjectBg}
        chromeless
      >
        <Scene
          props={sceneProps}
          timeScale={dur / template.meta.defaultDuration}
          width={aspect.width}
          height={aspect.height}
        />
      </Stage>
    </div>
  );

  // Only wrap in ThemeModeContext when an explicit mode is passed — otherwise
  // the preview inherits whatever ThemeModeContext is in scope (default 'light').
  if (mode) {
    return <ThemeModeContext.Provider value={mode}>{stage}</ThemeModeContext.Provider>;
  }
  return stage;
}
