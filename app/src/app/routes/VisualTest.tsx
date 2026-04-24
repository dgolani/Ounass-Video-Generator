// Dev harness — mount any template's Scene at a chosen aspect + time,
// with the safe-zone overlay toggleable. Used for visual-verifying the
// Phase 2 template-by-template safe-zone polish passes.
//
// URL: /visual-test/:templateId?aspect=9:16|4:5&time=<sec>&overlay=0|1
// Lifespan: added during Hero polish (commit below), deleted once the
// last template (Lookbook) has been polished. Remove this file + the
// route registration in App.tsx at that point.

import { useSearchParams, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { Stage } from '../../engine/Stage';
import { useStageController } from '../../engine/useStageController';
import { SafeZoneOverlay } from '../../engine/SafeZoneOverlay';
import { getTemplate, type SceneComponentProps } from '../../templates/registry';

type AspectKey = '9:16' | '4:5';

const ASPECTS: Record<AspectKey, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
};

export function VisualTest() {
  const { templateId = 'hero' } = useParams();
  const [params] = useSearchParams();
  const aspectKey = (params.get('aspect') ?? '9:16') as AspectKey;
  const timeSec = parseFloat(params.get('time') ?? '0');
  const overlay = params.get('overlay') === '1';

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
          <Scene
            props={tpl.meta.defaultProps as unknown as SceneComponentProps['props']}
            timeScale={timeScale}
            width={width}
            height={height}
          />
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
        {templateId} · {aspectKey} · t={timeSec}s · overlay={overlay ? 'ON' : 'off'}
      </div>
    </div>
  );
}
