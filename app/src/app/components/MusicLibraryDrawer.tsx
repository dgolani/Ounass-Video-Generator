import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TransitionEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  addUserMusicFile,
  ASSET_MUSIC_TRACKS,
  listUserMusicTracks,
  MUSIC_TRACKS,
  removeUserMusic,
  resolveAudioUrl,
} from '../../lib/musicLibrary';
import type { MusicTrack } from '../../lib/musicTracks';
import { probeAudioDurationSec } from '../../lib/audioProbe';

const Z_BACKDROP = 9200;
const Z_DRAWER = 9201;
const PREVIEW_CAP_SEC = 28;

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${mm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return m > 0
    ? `${m}:${s.toString().padStart(2, '0')}`
    : `0:${s.toString().padStart(2, '0')}`;
}

function useTrackDurations(resolvedById: Record<string, string>) {
  const ids = useMemo(() => Object.keys(resolvedById).sort().join('\0'), [resolvedById]);
  const [durations, setDurations] = useState<Record<string, number | null>>({});

  useEffect(() => {
    const entries = Object.entries(resolvedById);
    if (entries.length === 0) return;
    let cancelled = false;
    (async () => {
      const batch = 5;
      for (let i = 0; i < entries.length; i += batch) {
        if (cancelled) return;
        const slice = entries.slice(i, i + batch);
        const results = await Promise.all(
          slice.map(async ([id, url]) => {
            const d = await probeAudioDurationSec(url);
            return [id, d] as const;
          }),
        );
        if (cancelled) return;
        setDurations((prev) => {
          const next = { ...prev };
          for (const [id, d] of results) next[id] = d;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids, resolvedById]);

  return durations;
}

type Section = { title: string; hint?: string; tracks: MusicTrack[] };

function PlayGlyph({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <rect x="3" y="2" width="3" height="10" rx="1" />
        <rect x="8" y="2" width="3" height="10" rx="1" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <path d="M4 3.5v7l6-3.5-6-3.5z" />
    </svg>
  );
}

type RowProps = {
  track: MusicTrack;
  durationSec: number | null | undefined;
  playing: boolean;
  onPreview: () => void;
  onUse: () => void;
  onDelete?: () => void;
};

function TrackRow({ track, durationSec, playing, onPreview, onUse, onDelete }: RowProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      role="listitem"
      className={`music-lib-row${playing ? ' music-lib-row--active' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: onDelete ? '44px 1fr 48px 36px' : '44px 1fr 48px',
        alignItems: 'center',
        gap: 2,
        minHeight: 56,
        padding: '6px 10px 6px 6px',
        marginBottom: 2,
        borderRadius: 12,
        border: playing ? '1px solid rgba(232,197,71,0.35)' : '1px solid transparent',
        background: playing
          ? 'linear-gradient(90deg, rgba(232,197,71,0.1) 0%, rgba(255,255,255,0.03) 100%)'
          : hover
            ? 'rgba(255,255,255,0.045)'
            : 'transparent',
        transition: 'background 0.18s ease, border-color 0.18s ease',
      }}
    >
      <button
        type="button"
        className="music-lib-preview-btn"
        title={playing ? 'Stop preview' : 'Preview'}
        aria-label={playing ? `Stop preview of ${track.label}` : `Preview ${track.label}`}
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: playing
            ? '1.5px solid rgba(232,197,71,0.75)'
            : '1.5px solid rgba(255,255,255,0.14)',
          background: playing
            ? 'linear-gradient(145deg, rgba(232,197,71,0.22) 0%, rgba(232,197,71,0.06) 100%)'
            : 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.15) 100%)',
          color: playing ? '#f5e6bc' : 'var(--editor-text-dim)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: playing ? '0 0 20px rgba(232,197,71,0.12)' : 'none',
          transition: 'border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <PlayGlyph playing={playing} />
      </button>
      <button
        type="button"
        onClick={onUse}
        style={{
          textAlign: 'left',
          minWidth: 0,
          padding: '6px 8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'inherit',
          font: 'inherit',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--editor-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {track.label}
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 11,
            color: 'var(--editor-text-dim)',
            letterSpacing: '0.02em',
          }}
        >
          {track.id.startsWith('user:')
            ? 'This device'
            : track.id.startsWith('asset:')
              ? 'Sound collection'
              : 'Curated bed'}
        </div>
      </button>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: 'rgba(255,255,255,0.5)',
          paddingRight: 2,
          textAlign: 'right',
          alignSelf: 'center',
        }}
      >
        {formatDuration(durationSec)}
      </div>
      {onDelete ? (
        <button
          type="button"
          title="Remove from this device"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.35)',
            color: 'var(--editor-text-dim)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            justifySelf: 'end',
            alignSelf: 'center',
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  onPickTrackId: (id: string) => void;
};

export function MusicLibraryDrawer({ open, onClose, onPickTrackId }: Props) {
  const [present, setPresent] = useState(false);
  const [entered, setEntered] = useState(false);
  const [userRev, setUserRev] = useState(0);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (open) {
      setPresent(true);
      const r = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(r);
    }
    setEntered(false);
  }, [open]);

  useEffect(() => {
    if (!open) {
      const el = previewRef.current;
      if (el) {
        el.pause();
        el.removeAttribute('src');
        el.load();
      }
      setPreviewTrackId(null);
    }
  }, [open]);

  const stopPreview = useCallback(() => {
    const el = previewRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    setPreviewTrackId(null);
  }, []);

  const togglePreview = useCallback((id: string, resolvedUrl: string) => {
    const el = previewRef.current;
    if (!el) return;
    if (previewTrackId === id && !el.paused) {
      stopPreview();
      return;
    }
    setPreviewTrackId(id);
    el.src = resolvedUrl;
    el.currentTime = 0;
    el.play().catch(() => {
      setPreviewTrackId(null);
    });
  }, [previewTrackId, stopPreview]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || !previewTrackId) return;
    const onTime = () => {
      if (el.currentTime >= PREVIEW_CAP_SEC) {
        el.pause();
        el.currentTime = 0;
        setPreviewTrackId(null);
      }
    };
    const onEnded = () => {
      setPreviewTrackId(null);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [previewTrackId]);

  const userTracks = useMemo(() => listUserMusicTracks(), [userRev]);

  const sections: Section[] = useMemo(() => {
    const out: Section[] = [];
    if (userTracks.length > 0) {
      out.push({ title: 'Your library', hint: 'Stored on this device', tracks: userTracks });
    }
    if (ASSET_MUSIC_TRACKS.length > 0) {
      out.push({
        title: 'Sound collection',
        hint: 'Shipped with the app',
        tracks: [...ASSET_MUSIC_TRACKS],
      });
    }
    if (MUSIC_TRACKS.length > 0) {
      out.push({ title: 'Curated beds', hint: 'Public / export-safe', tracks: [...MUSIC_TRACKS] });
    }
    return out;
  }, [userTracks]);

  const resolvedById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of sections) {
      for (const t of s.tracks) {
        m[t.id] = resolveAudioUrl(t.src);
      }
    }
    return m;
  }, [sections]);

  const durations = useTrackDurations(present ? resolvedById : {});

  const onAsideTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLElement>) => {
      if (e.propertyName !== 'transform') return;
      if (!open) setPresent(false);
    },
    [open],
  );

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopPreview();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present, onClose, stopPreview]);

  const applyTrack = useCallback(
    (id: string) => {
      stopPreview();
      onPickTrackId(id);
      onClose();
    },
    [onPickTrackId, onClose, stopPreview],
  );

  const onUpload = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setUploadErr(null);
      setUploadBusy(true);
      try {
        const { id } = await addUserMusicFile(file);
        setUserRev((r) => r + 1);
        applyTrack(id);
      } catch (err) {
        setUploadErr(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setUploadBusy(false);
      }
    },
    [applyTrack],
  );

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
        className="music-lib-drawer-backdrop"
        style={backdropStyle}
        aria-hidden
        onMouseDown={(e) => {
          e.preventDefault();
          stopPreview();
          onClose();
        }}
      />
      <aside
        className="music-lib-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="music-lib-drawer-title"
        data-timeline-no-seek
        style={asideStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onTransitionEnd={onAsideTransitionEnd}
      >
        <audio ref={previewRef} preload="metadata" style={{ display: 'none' }} />

        <header
          style={{
            flexShrink: 0,
            padding: '20px 22px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(180deg, rgba(232,197,71,0.06) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(232,197,71,0.75)',
                  marginBottom: 6,
                }}
              >
                Audio
              </div>
              <h2
                id="music-lib-drawer-title"
                style={{
                  margin: 0,
                  fontFamily: 'var(--serif)',
                  fontWeight: 400,
                  fontSize: 'clamp(22px, 4.2vw, 26px)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  color: 'var(--editor-text)',
                }}
              >
                Add Music From Library
              </h2>
              <p
                style={{
                  margin: '10px 0 0',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: 'var(--editor-text-dim)',
                  maxWidth: 340,
                }}
              >
                Preview clips like Reels, then tap a title to use it on your timeline.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                stopPreview();
                onClose();
              }}
              aria-label="Close music library"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.25)',
                color: 'var(--editor-text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 22,
                lineHeight: 1,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginTop: 18 }}>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.ogg"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                void onUpload(f);
              }}
            />
            <button
              type="button"
              disabled={uploadBusy}
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px dashed rgba(232,197,71,0.38)',
                background: 'rgba(232,197,71,0.07)',
                color: '#f0e6cc',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                fontWeight: 600,
                cursor: uploadBusy ? 'wait' : 'pointer',
                opacity: uploadBusy ? 0.65 : 1,
              }}
            >
              {uploadBusy ? 'Importing…' : '+ Import from device'}
            </button>
            {uploadErr ? (
              <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.45, color: '#e8a0a0' }}>{uploadErr}</p>
            ) : null}
          </div>
        </header>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            padding: '12px 14px 28px',
          }}
        >
          {sections.length === 0 ? (
            <div
              style={{
                marginTop: 24,
                padding: 20,
                borderRadius: 14,
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--editor-text-dim)',
              }}
            >
              No tracks in the library yet. Use <strong style={{ color: 'var(--editor-text)' }}>Import</strong> above,
              or add files under <code style={{ fontSize: 11 }}>src/assets/music/</code> and rebuild.
            </div>
          ) : (
            sections.map((sec) => (
              <section key={sec.title} style={{ marginBottom: 28 }}>
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    padding: '8px 6px 10px',
                    marginBottom: 4,
                    background: 'linear-gradient(180deg, rgba(18,18,24,0.98) 70%, transparent 100%)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--editor-text)',
                    }}
                  >
                    {sec.title}
                  </div>
                  {sec.hint ? (
                    <div style={{ marginTop: 3, fontSize: 11, color: 'var(--editor-text-dim)' }}>{sec.hint}</div>
                  ) : null}
                </div>
                <div role="list" style={{ display: 'flex', flexDirection: 'column' }}>
                  {sec.tracks.map((t) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      durationSec={durations[t.id]}
                      playing={previewTrackId === t.id}
                      onPreview={() => togglePreview(t.id, resolvedById[t.id] ?? '')}
                      onUse={() => applyTrack(t.id)}
                      onDelete={
                        t.id.startsWith('user:')
                          ? () => {
                              if (previewTrackId === t.id) stopPreview();
                              removeUserMusic(t.id);
                              setUserRev((r) => r + 1);
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
