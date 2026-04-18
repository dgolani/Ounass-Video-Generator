import { useEffect, useMemo } from 'react';
import { Stage, useStageController } from '../../engine';
import type { TemplateEntry } from '../../templates/registry';
import { applyBrand, useBrand } from '../../store/brand';

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
    return `${base}-a${aspectIndex}-d${Math.round(dur * 100)}`;
  }, [posterSeed, template.meta.id, aspectIndex, dur]);

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

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${aspect.width} / ${aspect.height}`,
        background:
          (sceneProps as { colors?: { background?: string } })?.colors?.background ??
          '#0A0A0A',
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
        background={
          (sceneProps as { colors?: { background?: string } })?.colors?.background ??
          '#0A0A0A'
        }
        controller={controller}
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
}
