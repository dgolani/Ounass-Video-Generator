import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stage, SafeZoneEnforcementContext, useStageController } from '../../engine';
import { BrandSpotlightScene } from '../../templates/brand-spotlight';
import { defaultProps, type SpotlightProps } from '../../templates/brand-spotlight/schema';
import { useBrand, applyBrand } from '../../store/brand';

const ASPECTS = {
  '9x16': { width: 1080, height: 1920, label: '9:16' },
  '4x5': { width: 1080, height: 1350, label: '4:5' },
  '1x1': { width: 1080, height: 1080, label: '1:1' },
} as const;

type AspectKey = keyof typeof ASPECTS;

function parseAspect(value: string | null): AspectKey {
  if (value === '4x5' || value === '1x1') return value;
  return '9x16';
}

function parseTime(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function BrandSpotlightVisualTestRoute() {
  const [params] = useSearchParams();
  const [brand] = useBrand();

  const aspectKey = parseAspect(params.get('aspect'));
  const safeOn = (params.get('safe') ?? 'on') !== 'off';
  const t = parseTime(params.get('t'));
  const aspect = ASPECTS[aspectKey];

  const sceneProps = useMemo(
    () => applyBrand(defaultProps as unknown as Record<string, unknown>, brand) as SpotlightProps,
    [brand],
  );

  const controller = useStageController({
    duration: 15,
    loop: false,
    autoplay: false,
    keyboard: false,
    initialTime: t,
  });

  useEffect(() => {
    controller.setTime(t);
    controller.setPlaying(false);
  }, [controller, t]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0B0B0C',
      }}
    >
      <SafeZoneEnforcementContext.Provider value={safeOn}>
        <div
          style={{
            width: 'min(88vw, 420px)',
            aspectRatio: `${aspect.width} / ${aspect.height}`,
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          }}
        >
          <Stage
            width={aspect.width}
            height={aspect.height}
            background={sceneProps.colors.background}
            controller={controller}
            chromeless
          >
            <BrandSpotlightScene
              props={sceneProps}
              timeScale={1}
              width={aspect.width}
              height={aspect.height}
            />
          </Stage>
        </div>
      </SafeZoneEnforcementContext.Provider>
      <div
        style={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          fontFamily: 'var(--sans)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.72)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Brand Spotlight · {ASPECTS[aspectKey].label} · safe {safeOn ? 'on' : 'off'} · t={t.toFixed(1)}
      </div>
    </div>
  );
}
