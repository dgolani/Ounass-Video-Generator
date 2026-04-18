import type { SceneOutline } from '../../templates/registry';

type Props = {
  scenes: SceneOutline[];
  duration: number;
  time: number;
  onSeek: (t: number) => void;
};

export function Outline({ scenes, duration, time, onSeek }: Props) {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--editor-text-dim)',
        }}
      >
        Scenes
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {scenes.map((scene) => {
          const isActive = time >= scene.start && time <= scene.end;
          const leftPct = (scene.start / duration) * 100;
          const widthPct = ((scene.end - scene.start) / duration) * 100;
          return (
            <button
              key={scene.id}
              onClick={() => onSeek(scene.start)}
              style={{
                background: isActive
                  ? 'var(--editor-panel-2)'
                  : 'transparent',
                border: `1px solid ${isActive ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
                borderRadius: 'var(--r-md)',
                padding: '10px 12px',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--editor-text)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'border-color 120ms, background 120ms',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: isActive
                      ? 'var(--editor-text)'
                      : 'var(--editor-text-dim)',
                  }}
                >
                  {scene.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: 'var(--editor-text-dim)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {scene.start.toFixed(1)}s – {scene.end.toFixed(1)}s
                </span>
              </div>
              <div
                style={{
                  height: 2,
                  background: 'var(--editor-border)',
                  borderRadius: 1,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    height: '100%',
                    background: isActive
                      ? 'var(--editor-accent)'
                      : 'var(--editor-text-dim)',
                    borderRadius: 1,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
