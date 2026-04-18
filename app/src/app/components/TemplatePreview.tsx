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
  /** When true, autoplay loops. When false, paused at frame 0. */
  playing: boolean;
  /** Aspect index into template.meta.aspects[]. Default 0 (the primary aspect). */
  aspectIndex?: number;
};

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

  const controller = useStageController({
    duration: dur,
    loop: true,
    autoplay: false,        // start paused; play only when hovered
    keyboard: false,        // multiple stages per page → no global keyboard
  });

  // Drive play state from the prop. Reset to start when leaving hover so
  // the next hover always begins from the opening frame.
  useEffect(() => {
    if (playing) {
      controller.setPlaying(true);
    } else {
      controller.setPlaying(false);
      controller.setTime(0);
    }
  }, [playing]);

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
