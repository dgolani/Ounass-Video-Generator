// Project-background side drawer — opened by the "Add background"
// button on the timeline. Mirrors the MusicLibraryDrawer's open/close
// transitions, backdrop, and right-side slide-in pattern, but the
// content is much simpler: pick image upload OR video URL, plus a
// dim slider. No curated library — backgrounds are user assets.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type TransitionEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { ProjectBackground } from '../../store/types';
import { ImageDropZone } from './PropertiesPanel';
import {
  checkVideoExportable,
  isVideoUrl,
  type VideoExportability,
} from '../../lib/media';

const Z_BACKDROP = 9200;
const Z_DRAWER = 9201;

type Mode = 'none' | 'image' | 'video' | 'color';

type Props = {
  open: boolean;
  onClose: () => void;
  background: ProjectBackground | undefined;
  onChange: (next: ProjectBackground | undefined) => void;
  /** Project duration — used to default the video clip length when
   *  the marketer pastes a fresh URL. */
  duration: number;
  /** When the marketer creates a new bg, anchor it to where the
   *  content (blue) clip starts on the project timeline. */
  videoClipStartSec: number;
};

export function BackgroundDrawer({
  open,
  onClose,
  background,
  onChange,
  duration,
  videoClipStartSec,
}: Props) {
  const [present, setPresent] = useState(false);
  const [entered, setEntered] = useState(false);

  // Mount/unmount with transition so the slide-in/out animates.
  // Mirrors MusicLibraryDrawer's effect exactly: useLayoutEffect to
  // commit the `present` flag before paint, then a NESTED double
  // requestAnimationFrame so the browser has a chance to paint the
  // initial off-screen position before we flip `entered` true.
  // Without the double rAF the browser collapses the initial render
  // and the entry transform skip-renders past the off-screen state,
  // killing the slide animation.
  useLayoutEffect(() => {
    if (open) {
      setPresent(true);
      const r = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(r);
    }
    setEntered(false);
    return undefined;
  }, [open]);

  const onAsideTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLElement>) => {
      if (e.propertyName !== 'transform') return;
      if (!open) setPresent(false);
    },
    [open],
  );

  // Esc closes.
  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present, onClose]);

  // Per-mode memory so toggling Off → Image → Video → Color doesn't
  // wipe the marketer's parked-aside state for any of the modes.
  const lastImageRef = useRef<Extract<ProjectBackground, { kind: 'image' }> | null>(null);
  const lastVideoRef = useRef<Extract<ProjectBackground, { kind: 'video' }> | null>(null);
  const lastColorRef = useRef<Extract<ProjectBackground, { kind: 'color' }> | null>(null);
  useEffect(() => {
    if (background?.kind === 'image') lastImageRef.current = background;
    else if (background?.kind === 'video') lastVideoRef.current = background;
    else if (background?.kind === 'color') lastColorRef.current = background;
  }, [background]);

  const mode: Mode = background?.kind ?? 'none';

  const setMode = (next: Mode) => {
    if (next === 'none') {
      onChange(undefined);
      return;
    }
    if (next === mode) return;
    if (next === 'image') {
      onChange(lastImageRef.current ?? { kind: 'image', src: '', dim: 0 });
      return;
    }
    if (next === 'color') {
      onChange(lastColorRef.current ?? { kind: 'color', color: '#000000' });
      return;
    }
    // 'video' — defaults span the content layer (anchor matches the
    // video clip start, end matches its end). Marketer can always
    // drag the lane to override.
    onChange(
      lastVideoRef.current ?? {
        kind: 'video',
        src: '',
        dim: 0.24,
        anchorVideoTime: videoClipStartSec,
        trimStartSec: 0,
        endVideoTime: videoClipStartSec + duration,
      },
    );
  };

  if (!present) return null;

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const dur = reduceMotion ? '0.01ms' : undefined;
  const backdropOpacity = entered ? 1 : 0;
  const panelTransform = entered ? 'translate3d(0,0,0)' : 'translate3d(100%,0,0)';

  const asideStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: 'min(420px, 100vw)',
    maxWidth: 440,
    zIndex: Z_DRAWER,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(195deg, #1a1a22 0%, #121218 42%, #0c0c10 100%)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '-32px 0 80px rgba(0,0,0,0.55)',
    transform: panelTransform,
    transition: dur ? `transform ${dur}` : 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'transform',
  };

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: Z_BACKDROP,
    background: 'rgba(4,4,10,0.52)',
    backdropFilter: 'blur(6px)',
    opacity: backdropOpacity,
    transition: dur ? `opacity ${dur}` : 'opacity 0.36s cubic-bezier(0.22, 1, 0.36, 1)',
    pointerEvents: entered ? 'auto' : 'none',
  };

  return createPortal(
    <>
      <div
        style={backdropStyle}
        aria-hidden
        onMouseDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="bg-drawer-title"
        data-timeline-no-seek
        style={asideStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onTransitionEnd={onAsideTransitionEnd}
      >
        <header
          style={{
            padding: '20px 22px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--editor-text-dim)',
                marginBottom: 4,
              }}
            >
              Project
            </div>
            <h2
              id="bg-drawer-title"
              style={{
                margin: 0,
                fontFamily: 'var(--sans)',
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: '0.01em',
                color: 'var(--editor-text)',
              }}
            >
              Background
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'var(--editor-text)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '18px 22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <ModeToggle mode={mode} onChange={setMode} />

          {mode === 'image' && background?.kind === 'image' ? (
            <ImageBgSection
              src={background.src}
              onChange={(patch) => onChange({ ...background, ...patch })}
            />
          ) : null}

          {mode === 'video' && background?.kind === 'video' ? (
            <VideoBgSection
              background={background}
              onChange={(patch) => onChange({ ...background, ...patch })}
            />
          ) : null}

          {mode === 'color' && background?.kind === 'color' ? (
            <ColorBgSection
              color={background.color}
              onChange={(color) => onChange({ kind: 'color', color })}
            />
          ) : null}

          {mode === 'none' ? (
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--editor-text-dim)',
              }}
            >
              The template renders its own paper / gradient backdrop.
              Pick Image or Video to override it project-wide.
            </div>
          ) : null}
        </div>
      </aside>
    </>,
    document.body,
  );
}

// ── Sub-components ──────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (next: Mode) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 3,
        background: 'var(--editor-panel-2)',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
      }}
    >
      {(['none', 'image', 'video', 'color'] as Mode[]).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            style={{
              flex: 1,
              padding: '8px 6px',
              fontSize: 10,
              fontFamily: 'var(--sans)',
              fontWeight: 700,
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
  );
}

function ImageBgSection({
  src,
  onChange,
}: {
  src: string;
  onChange: (patch: { src?: string }) => void;
}) {
  return (
    <>
      <SectionLabel>Image</SectionLabel>
      <ImageDropZone
        url={src}
        onImage={(dataURL) => onChange({ src: dataURL })}
        onClear={() => onChange({ src: '' })}
        aspectRatio={9 / 16}
        size="large"
      />
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 11,
          color: 'var(--editor-text-dim)',
          letterSpacing: '0.01em',
        }}
      >
        Tweak the dim from the settings icon next to the timeline.
      </div>
    </>
  );
}

function ColorBgSection({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  return (
    <>
      <SectionLabel>Solid colour</SectionLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 8,
          border: '1px solid var(--editor-border)',
          borderRadius: 'var(--r-md)',
          background: 'var(--editor-panel-2)',
        }}
      >
        <input
          type="color"
          value={normalizeHexInput(color)}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 56,
            height: 56,
            padding: 0,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--r-sm)',
            background: 'transparent',
            cursor: 'pointer',
          }}
          aria-label="Pick background colour"
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            boxSizing: 'border-box',
            padding: '10px 12px',
            fontSize: 13,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
            color: 'var(--editor-text)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--editor-border)',
            borderRadius: 'var(--r-sm)',
            outline: 'none',
            textTransform: 'uppercase',
          }}
        />
      </div>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 11,
          color: 'var(--editor-text-dim)',
          letterSpacing: '0.01em',
          marginTop: -4,
        }}
      >
        Solid backdrop with no dim layer — pick a darker shade if you
        want a dimmer feel. Hex `#RRGGBB` or `#RGB` or `#RRGGBBAA`.
      </div>
    </>
  );
}

/** `<input type="color">` requires a 6-digit `#RRGGBB`. Truncate
 *  alpha + expand short-form so the picker doesn't reset. */
function normalizeHexInput(c: string): string {
  const s = c.trim();
  if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(s)) return s.slice(0, 7);
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return '#000000';
}

function VideoBgSection({
  background,
  onChange,
}: {
  background: Extract<ProjectBackground, { kind: 'video' }>;
  onChange: (patch: Partial<Extract<ProjectBackground, { kind: 'video' }>>) => void;
}) {
  return (
    <>
      <SectionLabel>Video URL</SectionLabel>
      <input
        type="url"
        value={background.src}
        placeholder="Paste mp4 / webm / mov URL"
        onChange={(e) => onChange({ src: e.target.value })}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
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
          fontFamily: 'var(--sans)',
          fontSize: 11,
          color: 'var(--editor-text-dim)',
          letterSpacing: '0.01em',
        }}
      >
        Plays muted + looped. Drag / trim on the timeline. Tweak the
        dim and source-file in-point from the settings icon next to
        the timeline.
      </div>
      {background.src && isVideoUrl(background.src) ? (
        <ExportStatusBadge url={background.src} />
      ) : null}
    </>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: 'var(--sans)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--editor-text-dim)',
      }}
    >
      {children}
    </div>
  );
}

function ExportStatusBadge({ url }: { url: string }) {
  const [state, setState] = useState<VideoExportability | 'pending'>('pending');
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    setState('pending');
    const t = setTimeout(() => {
      checkVideoExportable(url, { signal: ctrl.signal })
        .then((res) => {
          if (alive) setState(res);
        })
        .catch(() => {
          if (alive) setState('skip');
        });
    }, 350);
    return () => {
      alive = false;
      ctrl.abort();
      clearTimeout(t);
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
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 'var(--r-sm)',
        background: bg,
        border: `1px solid ${border}`,
        fontFamily: 'var(--sans)',
        fontSize: 11,
        lineHeight: 1.4,
        color: fg,
      }}
    >
      <span aria-hidden style={{ flex: 'none' }}>{icon}</span>
      <span>{message}</span>
    </div>
  );
}
