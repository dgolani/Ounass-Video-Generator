// Project-level background controls — replaces the per-template
// `Custom backdrop` field. The marketer picks ONE of:
//   - Upload image (data URL stored in localStorage)
//   - Paste hosted video URL (CDN-hosted; no upload limit)
// Both are mutually exclusive — selecting one clears the other.
//
// Renders above the per-template PropertiesPanel in the editor's
// right pane. The state lives on `EditableState.background` so undo/
// redo rolls it back like every other editable field.

import { useEffect, useRef, useState } from 'react';
import type { ProjectBackground } from '../../store/types';
import { ImageDropZone } from './PropertiesPanel';
import {
  checkVideoExportable,
  isVideoUrl,
  type VideoExportability,
} from '../../lib/media';

type Mode = 'none' | 'image' | 'video';

type Props = {
  background: ProjectBackground | undefined;
  onChange: (next: ProjectBackground | undefined) => void;
  /** Project duration in seconds — used to default the video end
   *  marker for newly-pasted URLs. */
  duration: number;
};

export function ProjectBackgroundPanel({ background, onChange, duration }: Props) {
  const mode: Mode = background?.kind ?? 'none';

  const setMode = (next: Mode) => {
    if (next === 'none') {
      onChange(undefined);
      return;
    }
    if (next === mode) return;
    if (next === 'image') {
      onChange({ kind: 'image', src: '', dim: 0 });
      return;
    }
    onChange({
      kind: 'video',
      src: '',
      dim: 0.24,
      anchorVideoTime: 0,
      trimStartSec: 0,
      endVideoTime: duration,
    });
  };

  return (
    <div
      style={{
        padding: '14px 16px 18px',
        borderBottom: '1px solid var(--editor-border)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--editor-text-dim)',
          marginBottom: 10,
        }}
      >
        Project background
      </div>

      {/* Mode toggle — three pills */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 3,
          background: 'var(--editor-panel-2)',
          border: '1px solid var(--editor-border)',
          borderRadius: 'var(--r-md)',
          marginBottom: 12,
        }}
      >
        {(['none', 'image', 'video'] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: 11,
                fontFamily: 'var(--sans)',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? '#fff' : 'var(--editor-text-dim)',
                background: active ? 'var(--editor-accent)' : 'transparent',
                border: 0,
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
              }}
            >
              {m === 'none' ? 'Off' : m}
            </button>
          );
        })}
      </div>

      {mode === 'image' && background?.kind === 'image' ? (
        <ImageBgFields
          src={background.src}
          dim={background.dim}
          onChange={(patch) =>
            onChange({ ...background, ...patch })
          }
        />
      ) : null}

      {mode === 'video' && background?.kind === 'video' ? (
        <VideoBgFields
          background={background}
          onChange={(patch) => onChange({ ...background, ...patch })}
        />
      ) : null}

      {mode === 'none' ? (
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 11,
            color: 'var(--editor-text-dim)',
            lineHeight: 1.4,
          }}
        >
          The template renders its own paper / gradient backdrop. Pick
          Image or Video to override it project-wide.
        </div>
      ) : null}
    </div>
  );
}

// ── Image branch ───────────────────────────────────────────────

function ImageBgFields({
  src,
  dim,
  onChange,
}: {
  src: string;
  dim: number;
  onChange: (patch: { src?: string; dim?: number }) => void;
}) {
  return (
    <>
      <ImageDropZone
        url={src}
        onImage={(dataURL) => onChange({ src: dataURL })}
        onClear={() => onChange({ src: '' })}
        aspectRatio={9 / 16}
        size="large"
      />
      <DimSlider
        value={dim}
        onChange={(v) => onChange({ dim: v })}
      />
    </>
  );
}

// ── Video branch ───────────────────────────────────────────────

function VideoBgFields({
  background,
  onChange,
}: {
  background: Extract<ProjectBackground, { kind: 'video' }>;
  onChange: (patch: Partial<Extract<ProjectBackground, { kind: 'video' }>>) => void;
}) {
  return (
    <>
      <input
        type="url"
        value={background.src}
        placeholder="Paste a hosted video URL (mp4 / webm / mov)"
        onChange={(e) => onChange({ src: e.target.value })}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 10px',
          fontSize: 12,
          fontFamily: 'var(--mono)',
          letterSpacing: '0.02em',
          color: 'var(--editor-text)',
          background: 'var(--editor-panel-2)',
          border: '1px solid var(--editor-border)',
          borderRadius: 'var(--r-sm)',
          outline: 'none',
        }}
      />
      <div
        style={{
          marginTop: 4,
          fontFamily: 'var(--sans)',
          fontSize: 10,
          color: 'var(--editor-text-dim)',
          letterSpacing: '0.02em',
        }}
      >
        Plays muted + looped. Drag / trim on the timeline like music
        (coming next).
      </div>
      {background.src && isVideoUrl(background.src) ? (
        <ExportStatusBadge url={background.src} />
      ) : null}
      <DimSlider
        value={background.dim}
        onChange={(v) => onChange({ dim: v })}
      />
    </>
  );
}

function ExportStatusBadge({ url }: { url: string }) {
  const [state, setState] = useState<VideoExportability | 'pending'>('pending');
  const ctrlRef = useRef<AbortController | null>(null);
  useEffect(() => {
    setState('pending');
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const t = setTimeout(() => {
      checkVideoExportable(url, { signal: ctrl.signal })
        .then((res) => !ctrl.signal.aborted && setState(res))
        .catch(() => !ctrl.signal.aborted && setState('skip'));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [url]);

  let icon = '…';
  let message = 'Checking…';
  let fg = 'var(--editor-text-dim)';
  let bg = 'rgba(255,255,255,0.03)';
  let border = 'var(--editor-border)';
  if (state === 'direct' || state === 'proxy') {
    icon = '✓';
    message = 'Will export to MP4.';
    fg = '#7ec394';
    bg = 'rgba(126,195,148,0.08)';
    border = 'rgba(126,195,148,0.35)';
  } else if (state === 'skip') {
    icon = '⚠';
    message = "Won't export — try another host.";
    fg = '#d8a96b';
    bg = 'rgba(216,169,107,0.08)';
    border = 'rgba(216,169,107,0.35)';
  }
  return (
    <div
      style={{
        marginTop: 6,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '5px 8px',
        borderRadius: 'var(--r-sm)',
        background: bg,
        border: `1px solid ${border}`,
        fontFamily: 'var(--sans)',
        fontSize: 10,
        lineHeight: 1.35,
        color: fg,
        letterSpacing: '0.01em',
      }}
    >
      <span aria-hidden style={{ flex: 'none' }}>{icon}</span>
      <span>{message}</span>
    </div>
  );
}

// ── Dim slider (shared) ─────────────────────────────────────────

function DimSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--editor-text-dim)',
          marginBottom: 6,
        }}
      >
        Dim
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="range"
          min={0}
          max={0.85}
          step={0.01}
          value={Math.max(0, Math.min(0.85, value))}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--editor-accent)' }}
        />
        <span
          style={{
            minWidth: 36,
            textAlign: 'right',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--editor-text-dim)',
          }}
        >
          {value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
