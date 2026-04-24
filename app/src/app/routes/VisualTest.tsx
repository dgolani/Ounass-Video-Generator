// Dev harness — mount any template's Scene at a chosen aspect + time,
// with the safe-zone overlay toggleable and an optional dark-palette
// override. Used for visual-verifying the Phase 2 template-by-template
// polish passes — both safe-zone correctness AND brand-kit adaptivity.
//
// URL:
//   /visual-test/:templateId
//     ?aspect=9:16|4:5
//     &time=<sec>
//     &overlay=0|1
//     &palette=default|dark     // override props.colors for brand-adaptivity test
//
// Lifespan: added during Hero polish, deleted once the last template
// (Lookbook) has been polished. Remove this file + the route
// registration in App.tsx at that point.

import { useSearchParams, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { Stage } from '../../engine/Stage';
import { useStageController } from '../../engine/useStageController';
import { SafeZoneOverlay } from '../../engine/SafeZoneOverlay';
import { ThemeModeContext, type ThemeMode } from '../../engine/themeMode';
import { getTemplate, type SceneComponentProps } from '../../templates/registry';

type AspectKey = '9:16' | '4:5';

const ASPECTS: Record<AspectKey, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
};

// Dark palette overlay — represents a coherent "dark brand kit": both
// background AND paper are dark tones, ink is light so it contrasts
// with both surfaces (scene bg AND card paper). This is the pattern
// the Brand Kit expects — ink is the dominant text color against BOTH
// surfaces, so brands should set bg + paper in the same tonality.
const DARK_PALETTE_OVERRIDE = {
  background: '#1A1A1A',
  paper: '#2A2A2A',              // dark paper so card text (ink) contrasts
  ink: '#EDE9E2',                // light ink — contrasts with both bg and paper
  backgroundDeep: '#0F0F0F',
  cream: '#3A3A3A',
  inkDeep: '#050505',
  rule: '#4A4A4A',
};

export function VisualTest() {
  const { templateId = 'hero' } = useParams();
  const [params] = useSearchParams();
  const aspectKey = (params.get('aspect') ?? '9:16') as AspectKey;
  const timeSec = parseFloat(params.get('time') ?? '0');
  const overlay = params.get('overlay') === '1';
  const palette = params.get('palette') ?? 'default';
  const mode: ThemeMode = params.get('mode') === 'dark' ? 'dark' : 'light';

  const { width, height } = ASPECTS[aspectKey] ?? ASPECTS['9:16'];
  const tpl = getTemplate(templateId);

  const controller = useStageController({
    duration: tpl?.meta.defaultDuration ?? 8,
    autoplay: false,
    loop: false,
    keyboard: false,
    initialTime: Number.isFinite(timeSec) ? timeSec : 0,
  });

  useEffect(() => {
    controller.setPlaying(false);
    controller.setTime(Number.isFinite(timeSec) ? timeSec : 0);
  }, [timeSec, aspectKey, templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tpl) {
    return <div style={{ padding: 24, color: '#fff' }}>Unknown template: {templateId}</div>;
  }

  const Scene = tpl.Scene as ComponentType<SceneComponentProps>;
  const timeScale = controller.duration / tpl.meta.defaultDuration;

  // Merge the dark-palette override into the template's colors so
  // brand-kit adaptivity can be visually verified without creating a
  // real project. Only keys the palette defines are overridden;
  // template-specific colors (accent, accentDark, etc) keep their defaults.
  const defaultProps = tpl.meta.defaultProps as { colors?: Record<string, string> };
  const testProps =
    palette === 'dark' && defaultProps.colors
      ? {
          ...defaultProps,
          colors: { ...defaultProps.colors, ...DARK_PALETTE_OVERRIDE },
        }
      : defaultProps;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: `min(calc(100vw - 40px), calc((100vh - 40px) * ${width} / ${height}))`,
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <Stage width={width} height={height} controller={controller} chromeless>
          <ThemeModeContext.Provider value={mode}>
            <Scene
              props={testProps as unknown as SceneComponentProps['props']}
              timeScale={timeScale}
              width={width}
              height={height}
            />
          </ThemeModeContext.Provider>
          {overlay ? <SafeZoneOverlay aspect={{ width, height }} /> : null}
        </Stage>
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          color: '#fff',
          font: '12px system-ui',
          background: 'rgba(0,0,0,0.6)',
          padding: '4px 8px',
          borderRadius: 4,
        }}
      >
        {templateId} · {aspectKey} · t={timeSec}s · overlay={overlay ? 'ON' : 'off'} · palette={palette} · mode={mode}
      </div>
    </div>
  );
}
