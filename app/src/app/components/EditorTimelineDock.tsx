import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Slider } from '../../ui/Slider';
import { getMusicTrack, resolveAudioUrl } from '../../lib/musicLibrary';
import { probeAudioDurationSec } from '../../lib/audioProbe';
import { MAX_TIMELINE_EXTENT_SEC, timelineContentUpperSec } from '../../lib/timelineBounds';
import { MusicLibraryDrawer } from './MusicLibraryDrawer';
import type { Project } from '../../store/types';
import type { SceneOutline } from '../../templates/types';

const PX_PER_SEC = 42;
/** Small fixed inset so the track does not sit flush against the panel edge. */
const TIMELINE_LEFT_INSET_PX = 14;
/** Right-side scroll gutter so the end of the ruler can approach viewport center; capped on ultra-wide layouts. */
const MAX_TIMELINE_GUTTER_PX = 300;
/** Ruler band: tick marks grow upward from bottom; room for labels above tallest tick */
const RULER_H = 28;
const RULER_MAJOR_H = 16;
const RULER_MID_H = 10;
const RULER_MINOR_H = 5;
const FILMSTRIP_H = 58;
const MUSIC_LANE_H = 44;
const VIDEO_LANE_H = 42;
const MIN_CLIP_SEC = 0.25;
const MIN_VIDEO_DURATION = 5;
const MAX_VIDEO_DURATION = 20;
const SOUND_PANEL_W = 292;
const SOUND_PANEL_Z = 9400;
/** Reels-style trim accent */
const TRIM_GOLD = '#E8C547';
const TRIM_GOLD_DIM = 'rgba(232, 197, 71, 0.35)';
const VIDEO_TRIM = '#9EC5E8';
const VIDEO_TRIM_DIM = 'rgba(158, 197, 232, 0.45)';

export type FilmstripStatus = 'idle' | 'capturing' | 'ready' | 'error';

type Patch = Partial<
  Pick<
    Project,
    | 'backgroundTrackId'
    | 'musicVolume'
    | 'musicAnchorVideoTime'
    | 'musicTrimStartSec'
    | 'musicEndVideoTime'
    | 'duration'
    | 'videoClipStartSec'
  >
>;

type Props = {
  duration: number;
  videoClipStartSec: number;
  /** Scene ranges in local video seconds (0…duration), already scaled to project duration */
  videoScenes?: SceneOutline[];
  time: number;
  playing: boolean;
  onSeek: (t: number) => void;
  filmstripImages: string[];
  filmstripStatus: FilmstripStatus;
  filmstripError: string | null;
  backgroundTrackId: string | null;
  musicVolume: number;
  musicAnchorVideoTime: number;
  musicTrimStartSec: number;
  musicEndVideoTime: number;
  onPatch: (patch: Patch) => void;
  onPlayPause: () => void;
  onReset: () => void;
  /** Expanded preview: show slim timeline rail instead of full dock */
  cinemaMode?: boolean;
  onExitCinema?: () => void;
};

function formatTc(s: number) {
  if (!Number.isFinite(s)) return '—';
  const sec = Math.floor(s);
  const d = Math.round((s - sec) * 10);
  return `${sec}.${d}`;
}

/** Soft-snap `value` to the nearest target within `threshold` seconds.
 *  Returns the original value if nothing is near enough. */
function snap(value: number, targets: readonly number[], threshold: number): number {
  let best = value;
  let bestDelta = threshold;
  for (const t of targets) {
    const d = Math.abs(t - value);
    if (d < bestDelta) {
      bestDelta = d;
      best = t;
    }
  }
  return best;
}

/** Snap threshold in seconds — ~5px of slop at 42 px/sec. Tight enough
 *  that it doesn't feel magnetic, generous enough to actually help. */
const SNAP_THRESHOLD_SEC = 0.12;

const transportIconBtn: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid var(--editor-border)',
  background: 'var(--editor-panel-2)',
  color: 'var(--editor-text)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
};

function EditorTransportCluster({
  playing,
  onReset,
  onPlayPause,
}: {
  playing: boolean;
  onReset: () => void;
  onPlayPause: () => void;
}) {
  return (
    <div data-timeline-no-seek style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        title="Back to clip start (local 0)"
        aria-label="Back to clip start"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReset();
        }}
        style={transportIconBtn}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M3 2v10M12 2L5 7l7 5V2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        title="Play or pause (space)"
        aria-label={playing ? 'Pause' : 'Play'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPlayPause();
        }}
        style={{
          ...transportIconBtn,
          borderColor: playing ? 'var(--editor-accent)' : undefined,
          color: playing ? 'var(--editor-accent)' : 'var(--editor-text)',
        }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="3" y="2" width="3" height="10" fill="currentColor" />
            <rect x="8" y="2" width="3" height="10" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3 2l9 5-9 5V2z" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}

/** Sliders / faders — reads as “mix” in compact toolbars */
function SoundMixIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 21v-8M4 13V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="4" cy="16" r="2" fill="currentColor" />
      <path
        d="M12 21v-4M12 15V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="11" r="2" fill="currentColor" />
      <path
        d="M20 21v-12M20 7V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="14" r="2" fill="currentColor" />
    </svg>
  );
}

export function EditorTimelineDock({
  duration,
  videoClipStartSec,
  videoScenes = [],
  time,
  playing,
  onSeek,
  filmstripImages,
  filmstripStatus,
  filmstripError,
  backgroundTrackId,
  musicVolume,
  musicAnchorVideoTime,
  musicTrimStartSec,
  musicEndVideoTime,
  onPatch,
  onPlayPause,
  onReset,
  cinemaMode = false,
  onExitCinema = () => {},
}: Props) {
  const scrollMeasureRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const compactTrackRef = useRef<HTMLDivElement | null>(null);
  const cinemaScrubRef = useRef(false);
  const programmaticScroll = useRef(false);
  const userScrollLock = useRef(false);
  const scrollUnlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineInteract = useRef(false);
  const [padRight, setPadRight] = useState(0);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);
  const audioMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const soundPanelRef = useRef<HTMLDivElement | null>(null);
  const soundTriggerRef = useRef<HTMLButtonElement | null>(null);

  type Drag =
    | {
        /** Long-press on clip body: scrub in-point along the source file (ghost moves; timeline clip stays). */
        kind: 'fileTrim';
        startX: number;
        trim0: number;
        clipLen: number;
        fileDur: number | null;
      }
    | { kind: 'trimL'; startX: number; a0: number; e0: number }
    | { kind: 'trimR'; startX: number; a0: number; e0: number };

  const dragRef = useRef<Drag | null>(null);
  const captureElRef = useRef<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);
  /** While true, show file-time ruler during long-press source trim drag. */
  const [showMusicFileRuler, setShowMusicFileRuler] = useState(false);
  const [sourceFileDurationSec, setSourceFileDurationSec] = useState<number | null>(null);
  const longPressMoveRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    startX: number;
    startY: number;
  } | null>(null);
  const lastMusicPointerRef = useRef({ x: 0, y: 0 });
  const musicTimesRef = useRef({ a: 0, e: 0 });

  useEffect(() => {
    if (!backgroundTrackId) {
      setSourceFileDurationSec(null);
      return;
    }
    const track = getMusicTrack(backgroundTrackId);
    if (!track) {
      setSourceFileDurationSec(null);
      return;
    }
    let cancelled = false;
    void probeAudioDurationSec(resolveAudioUrl(track.src)).then((dur) => {
      if (!cancelled) setSourceFileDurationSec(dur);
    });
    return () => {
      cancelled = true;
    };
  }, [backgroundTrackId]);

  useEffect(() => {
    musicTimesRef.current = { a: musicAnchorVideoTime, e: musicEndVideoTime };
  }, [musicAnchorVideoTime, musicEndVideoTime]);

  const musicTrimRef = useRef(musicTrimStartSec);
  musicTrimRef.current = musicTrimStartSec;
  const sourceFileDurRef = useRef<number | null>(null);
  sourceFileDurRef.current = sourceFileDurationSec;

  const timelineExtentSec = useMemo(
    () =>
      timelineContentUpperSec({
        duration,
        videoClipStartSec,
        musicEndVideoTime,
      }),
    [duration, musicEndVideoTime, videoClipStartSec],
  );
  /** Minimum track width at nominal density (px per second). */
  const minTrackW = useMemo(() => timelineExtentSec * PX_PER_SEC, [timelineExtentSec]);
  const [scrollClientW, setScrollClientW] = useState(0);
  /**
   * Track width in px: at least nominal density, and wide enough that
   * `inset + track + padRight` fills the scroll viewport (no dead gap inside the scroller).
   */
  const displayTrackW = useMemo(() => {
    const inset = TIMELINE_LEFT_INSET_PX;
    const minRow = inset + minTrackW + padRight;
    if (scrollClientW <= 0) return minTrackW;
    const rowTargetW = Math.max(scrollClientW, minRow);
    return Math.max(minTrackW, rowTargetW - inset - padRight);
  }, [scrollClientW, padRight, minTrackW]);
  const pxPerSec = useMemo(
    () => displayTrackW / Math.max(0.001, timelineExtentSec),
    [displayTrackW, timelineExtentSec],
  );

  useLayoutEffect(() => {
    if (cinemaMode) return;
    /** Measure a wrapper that does not host the horizontal scrollbar — avoids width ↔ scrollbar feedback loops. */
    const el = scrollMeasureRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setScrollClientW(w);
      const ideal = Math.max(64, Math.floor(w / 2));
      setPadRight(Math.min(ideal, MAX_TIMELINE_GUTTER_PX));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cinemaMode]);

  const [soundPanelBox, setSoundPanelBox] = useState<{ top: number; left: number } | null>(null);

  const placeSoundPanel = useCallback(() => {
    const trig = soundTriggerRef.current;
    if (!trig || !soundPanelOpen) return;
    const rect = trig.getBoundingClientRect();
    const panel = soundPanelRef.current;
    const h = panel ? panel.getBoundingClientRect().height : 300;
    const gap = 10;
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;
    const placeBelow = spaceBelow >= Math.min(h, 260) || spaceBelow >= spaceAbove;
    let top: number;
    if (placeBelow) {
      top = Math.min(rect.bottom + gap, vh - margin - h);
      top = Math.max(margin, top);
    } else {
      top = Math.max(margin, rect.top - gap - h);
    }
    let left = rect.right - SOUND_PANEL_W;
    left = Math.min(Math.max(margin, left), vw - SOUND_PANEL_W - margin);
    setSoundPanelBox({ top, left });
  }, [soundPanelOpen]);

  useLayoutEffect(() => {
    if (!soundPanelOpen) {
      setSoundPanelBox(null);
      return;
    }
    placeSoundPanel();
    let ro: ResizeObserver | null = null;
    const raf = requestAnimationFrame(() => {
      placeSoundPanel();
      const p = soundPanelRef.current;
      if (p) {
        ro = new ResizeObserver(() => placeSoundPanel());
        ro.observe(p);
      }
    });
    window.addEventListener('resize', placeSoundPanel);
    window.addEventListener('scroll', placeSoundPanel, true);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', placeSoundPanel);
      window.removeEventListener('scroll', placeSoundPanel, true);
    };
  }, [soundPanelOpen, placeSoundPanel, musicVolume, musicTrimStartSec, backgroundTrackId]);

  useEffect(() => {
    if (!soundPanelOpen) return;
    const close = (e: MouseEvent) => {
      const n = e.target as Node;
      if (soundPanelRef.current?.contains(n)) return;
      if (soundTriggerRef.current?.contains(n)) return;
      setSoundPanelOpen(false);
    };
    window.addEventListener('mousedown', close, true);
    return () => window.removeEventListener('mousedown', close, true);
  }, [soundPanelOpen]);

  useEffect(() => {
    if (!backgroundTrackId) setSoundPanelOpen(false);
  }, [backgroundTrackId]);

  const scrollToTime = useCallback(
    (t: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const globalT = videoClipStartSec + t;
      const target = TIMELINE_LEFT_INSET_PX + globalT * pxPerSec - el.clientWidth / 2;
      const next = Math.min(max, Math.max(0, target));
      programmaticScroll.current = true;
      el.scrollLeft = next;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          programmaticScroll.current = false;
        });
      });
    },
    [pxPerSec, videoClipStartSec],
  );

  /** Follow playhead only while playing — avoids jumps on load, edits, and filmstrip capture scrubbing */
  useEffect(() => {
    if (cinemaMode) return;
    if (!playing) return;
    if (timelineInteract.current || userScrollLock.current) return;
    scrollToTime(time);
  }, [time, scrollToTime, playing, cinemaMode]);

  /** User scroll just moves the viewport. Seeking happens via click-to-
   *  track or via the cinema rail. The lock stays — it prevents the
   *  programmatic playhead-follow from fighting with a user scroll. */
  const onScroll = () => {
    if (programmaticScroll.current) return;
    userScrollLock.current = true;
    if (scrollUnlockTimer.current) clearTimeout(scrollUnlockTimer.current);
    scrollUnlockTimer.current = setTimeout(() => {
      userScrollLock.current = false;
    }, 160);
  };

  const seekFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    const x = clientX - r.left;
    const w = Math.max(1, r.width);
    const globalT = (x / w) * timelineExtentSec;
    const local = globalT - videoClipStartSec;
    onSeek(Math.min(duration, Math.max(0, local)));
  };

  const seekCinemaFromClientX = useCallback(
    (clientX: number) => {
      const el = compactTrackRef.current;
      if (!el) return;
      const ext = Math.max(0.001, timelineExtentSec);
      const r = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const globalT = frac * ext;
      const local = globalT - videoClipStartSec;
      onSeek(Math.min(duration, Math.max(0, local)));
    },
    [timelineExtentSec, videoClipStartSec, duration, onSeek],
  );

  const onCinemaTrackPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    seekCinemaFromClientX(e.clientX);
    cinemaScrubRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onCinemaTrackPointerMove = (e: React.PointerEvent) => {
    if (!cinemaScrubRef.current) return;
    seekCinemaFromClientX(e.clientX);
  };

  const onCinemaTrackPointerUp = (e: React.PointerEvent) => {
    cinemaScrubRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onTrackMouseDown = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-timeline-no-seek]')) return;
    seekFromClientX(e.clientX);
  };

  const applyClipBounds = useCallback(
    (a: number, e: number) => {
      const e1 = Math.min(timelineExtentSec, Math.max(a + MIN_CLIP_SEC, e));
      const a1 = Math.min(e1 - MIN_CLIP_SEC, Math.max(0, a));
      return { a: a1, e: Math.max(e1, a1 + MIN_CLIP_SEC) };
    },
    [timelineExtentSec],
  );

  /** Snap targets for music anchor/end (in local video seconds).
   *  Includes video bounds + every scene boundary. */
  const musicSnapTargets = useMemo(() => {
    const ts = new Set<number>([0, duration, timelineExtentSec]);
    for (const s of videoScenes) {
      ts.add(Math.min(Math.max(0, s.start), duration));
      ts.add(Math.min(Math.max(0, s.end), duration));
    }
    return [...ts].sort((a, b) => a - b);
  }, [videoScenes, duration, timelineExtentSec]);

  /** Snap targets for video duration — whole seconds within legal range. */
  const videoDurationSnapTargets = useMemo(() => {
    const ts: number[] = [];
    for (let s = MIN_VIDEO_DURATION; s <= MAX_VIDEO_DURATION; s++) ts.push(s);
    return ts;
  }, []);

  const onClipPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dSec = dx / pxPerSec;
      if (d.kind === 'fileTrim') {
        const trimRaw = d.trim0 + dSec;
        const fd = d.fileDur;
        const Tmax =
          fd != null && Number.isFinite(fd) && fd > d.clipLen + 0.001
            ? Math.min(120, fd - d.clipLen)
            : 120;
        const trim = Math.min(Tmax, Math.max(0, trimRaw));
        onPatch({ musicTrimStartSec: trim });
      } else if (d.kind === 'trimL') {
        let na = d.a0 + dSec;
        na = Math.min(na, d.e0 - MIN_CLIP_SEC);
        na = Math.max(0, na);
        na = snap(na, musicSnapTargets, SNAP_THRESHOLD_SEC);
        na = Math.min(na, d.e0 - MIN_CLIP_SEC);
        na = Math.max(0, na);
        onPatch({ musicAnchorVideoTime: na });
      } else {
        let ne = d.e0 + dSec;
        ne = Math.max(ne, d.a0 + MIN_CLIP_SEC);
        ne = Math.min(timelineExtentSec, ne);
        ne = snap(ne, musicSnapTargets, SNAP_THRESHOLD_SEC);
        ne = Math.max(ne, d.a0 + MIN_CLIP_SEC);
        ne = Math.min(timelineExtentSec, ne);
        onPatch({ musicEndVideoTime: ne });
      }
    },
    [
      applyClipBounds,
      duration,
      musicAnchorVideoTime,
      musicEndVideoTime,
      musicSnapTargets,
      onPatch,
      pxPerSec,
      timelineExtentSec,
    ],
  );

  const endClipInteraction = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    timelineInteract.current = false;
    setDragging(false);
    setShowMusicFileRuler(false);
    const node = captureElRef.current;
    captureElRef.current = null;
    if (node) {
      try {
        node.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const onClipPointerMoveRef = useRef(onClipPointerMove);
  onClipPointerMoveRef.current = onClipPointerMove;
  const endClipInteractionRef = useRef(endClipInteraction);
  endClipInteractionRef.current = endClipInteraction;

  /** Long-press before the gold clip arms as draggable (ms). */
  const LONG_PRESS_MOVE_MS = 260;
  /** Cancel long-press only if the pointer strays this far before the hold completes. */
  const LONG_PRESS_MOVE_SLOP_PX = 22;

  const musicWindowSessionRef = useRef<{
    pointerId: number;
    onMove: (ev: PointerEvent) => void;
    onUp: (ev: PointerEvent) => void;
  } | null>(null);

  const detachMusicWindowSession = useCallback(() => {
    const s = musicWindowSessionRef.current;
    if (!s) return;
    window.removeEventListener('pointermove', s.onMove, true);
    window.removeEventListener('pointerup', s.onUp, true);
    window.removeEventListener('pointercancel', s.onUp, true);
    musicWindowSessionRef.current = null;
  }, []);

  useEffect(
    () => () => {
      detachMusicWindowSession();
      const lp = longPressMoveRef.current;
      if (lp) {
        clearTimeout(lp.timer);
        longPressMoveRef.current = null;
      }
      setShowMusicFileRuler(false);
    },
    [detachMusicWindowSession],
  );

  const clearMusicLongPress = useCallback(() => {
    const lp = longPressMoveRef.current;
    if (lp) {
      clearTimeout(lp.timer);
      longPressMoveRef.current = null;
    }
  }, []);

  const onMusicClipBodyPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('button') || t.closest('[data-music-trim]')) return;
      e.preventDefault();
      e.stopPropagation();
      detachMusicWindowSession();
      clearMusicLongPress();
      const pointerId = e.pointerId;
      lastMusicPointerRef.current = { x: e.clientX, y: e.clientY };
      const { a, e: endT } = musicTimesRef.current;
      longPressMoveRef.current = {
        timer: setTimeout(() => {
          longPressMoveRef.current = null;
          timelineInteract.current = true;
          setDragging(true);
          const fd = sourceFileDurRef.current;
          setShowMusicFileRuler(fd != null && fd > 0.2);
          dragRef.current = {
            kind: 'fileTrim',
            startX: lastMusicPointerRef.current.x,
            trim0: musicTrimRef.current,
            clipLen: Math.max(MIN_CLIP_SEC, endT - a),
            fileDur: fd,
          };
        }, LONG_PRESS_MOVE_MS),
        startX: e.clientX,
        startY: e.clientY,
      };
      const onWinMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        lastMusicPointerRef.current = { x: ev.clientX, y: ev.clientY };
        const lp = longPressMoveRef.current;
        if (lp) {
          const dx = ev.clientX - lp.startX;
          const dy = ev.clientY - lp.startY;
          if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_SLOP_PX) {
            clearTimeout(lp.timer);
            longPressMoveRef.current = null;
          }
          return;
        }
        if (dragRef.current?.kind === 'fileTrim') {
          ev.preventDefault();
          onClipPointerMoveRef.current(ev as unknown as React.PointerEvent<HTMLElement>);
        }
      };
      const onWinUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const lpUp = longPressMoveRef.current;
        if (lpUp) {
          clearTimeout(lpUp.timer);
          longPressMoveRef.current = null;
        } else if (dragRef.current?.kind === 'fileTrim') {
          endClipInteractionRef.current(ev as unknown as React.PointerEvent<HTMLElement>);
        } else {
          timelineInteract.current = false;
          setDragging(false);
        }
        detachMusicWindowSession();
      };
      window.addEventListener('pointermove', onWinMove, true);
      window.addEventListener('pointerup', onWinUp, true);
      window.addEventListener('pointercancel', onWinUp, true);
      musicWindowSessionRef.current = { pointerId, onMove: onWinMove, onUp: onWinUp };
    },
    [clearMusicLongPress, detachMusicWindowSession],
  );

  const onClipPointerDown = (e: React.PointerEvent, kind: 'trimL' | 'trimR') => {
    e.preventDefault();
    e.stopPropagation();
    timelineInteract.current = true;
    setDragging(true);
    dragRef.current = {
      kind,
      startX: e.clientX,
      a0: musicAnchorVideoTime,
      e0: musicEndVideoTime,
    };
    const el = e.currentTarget as HTMLElement;
    captureElRef.current = el;
    el.setPointerCapture(e.pointerId);
  };

  type VideoClipDrag =
    | { kind: 'move'; startX: number; s0: number; d0: number }
    | { kind: 'trimL'; startX: number; s0: number; d0: number }
    | { kind: 'trimR'; startX: number; s0: number; d0: number };

  const videoClipDragRef = useRef<VideoClipDrag | null>(null);
  const videoCaptureElRef = useRef<HTMLElement | null>(null);

  const endVideoClipInteraction = useCallback((e: React.PointerEvent) => {
    videoClipDragRef.current = null;
    timelineInteract.current = false;
    setDragging(false);
    setShowMusicFileRuler(false);
    const node = videoCaptureElRef.current;
    videoCaptureElRef.current = null;
    if (node) {
      try {
        node.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const onVideoClipPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = videoClipDragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dSec = dx / pxPerSec;
      const e0 = d.s0 + d.d0;
      if (d.kind === 'move') {
        let ns = d.s0 + dSec;
        ns = Math.min(Math.max(0, ns), MAX_TIMELINE_EXTENT_SEC - d.d0);
        // Snap clip start to 0 (start of global timeline) when nearby.
        ns = snap(ns, [0], SNAP_THRESHOLD_SEC);
        onPatch({ videoClipStartSec: ns });
      } else if (d.kind === 'trimL') {
        let ns = d.s0 + dSec;
        ns = Math.min(ns, e0 - MIN_VIDEO_DURATION);
        ns = Math.max(0, ns);
        ns = snap(ns, [0], SNAP_THRESHOLD_SEC);
        let newD = e0 - ns;
        newD = snap(
          newD,
          videoDurationSnapTargets,
          SNAP_THRESHOLD_SEC,
        );
        newD = Math.min(MAX_VIDEO_DURATION, Math.max(MIN_VIDEO_DURATION, newD));
        onPatch({ videoClipStartSec: ns, duration: newD });
      } else {
        let newD = d.d0 + dSec;
        newD = snap(newD, videoDurationSnapTargets, SNAP_THRESHOLD_SEC);
        newD = Math.min(MAX_VIDEO_DURATION, Math.max(MIN_VIDEO_DURATION, newD));
        if (d.s0 + newD > MAX_TIMELINE_EXTENT_SEC) {
          newD = MAX_TIMELINE_EXTENT_SEC - d.s0;
        }
        newD = Math.max(MIN_VIDEO_DURATION, newD);
        onPatch({ duration: newD });
      }
    },
    [onPatch, pxPerSec, videoDurationSnapTargets],
  );

  const onVideoClipPointerDown = (e: React.PointerEvent, kind: VideoClipDrag['kind']) => {
    e.preventDefault();
    e.stopPropagation();
    timelineInteract.current = true;
    setDragging(true);
    videoClipDragRef.current = {
      kind,
      startX: e.clientX,
      s0: videoClipStartSec,
      d0: duration,
    };
    const el = e.currentTarget as HTMLElement;
    videoCaptureElRef.current = el;
    el.setPointerCapture(e.pointerId);
  };

  const tickStep = timelineExtentSec > 24 ? 2 : 1;

  /** Physical-style ruler: major (1s), mid (0.5s), minor (0.25s); coarsens on very long tracks */
  const rulerMarks = useMemo(() => {
    const maxMarks = 240;
    let divsPerSec = 4;
    if (timelineExtentSec * divsPerSec > maxMarks) divsPerSec = 2;
    if (timelineExtentSec * divsPerSec > maxMarks) divsPerSec = 1;

    const step = 1 / divsPerSec;
    const n = Math.ceil(timelineExtentSec * divsPerSec - 1e-9);
    const out: { t: number; kind: 'major' | 'mid' | 'minor' }[] = [];
    let prevT = -1;
    for (let i = 0; i <= n; i++) {
      const t = Math.min(i * step, timelineExtentSec);
      if (prevT >= 0 && Math.abs(t - prevT) < 1e-6) continue;
      prevT = t;

      let kind: 'major' | 'mid' | 'minor';
      if (divsPerSec === 4) {
        kind = i % 4 === 0 ? 'major' : i % 2 === 0 ? 'mid' : 'minor';
      } else if (divsPerSec === 2) {
        kind = i % 2 === 0 ? 'major' : 'mid';
      } else {
        kind = 'major';
      }
      out.push({ t, kind });
    }
    return out;
  }, [timelineExtentSec]);

  const skeletonCount = 12;
  const clipLeftPx = musicAnchorVideoTime * pxPerSec;
  const clipWpx = Math.max(
    MIN_CLIP_SEC * pxPerSec,
    (musicEndVideoTime - musicAnchorVideoTime) * pxPerSec,
  );
  const videoClipLeftPx = videoClipStartSec * pxPerSec;
  const videoClipWpx = Math.max(MIN_VIDEO_DURATION * pxPerSec, duration * pxPerSec);
  const videoStripRightPx = videoClipLeftPx + videoClipWpx;

  const showSourceGhost =
    Boolean(backgroundTrackId) &&
    sourceFileDurationSec != null &&
    sourceFileDurationSec > 0.2;
  const ghostLeftPx = showSourceGhost
    ? (musicAnchorVideoTime - musicTrimStartSec) * pxPerSec
    : 0;
  /** Full file width in px (logical ghost). */
  const ghostFullWidthPx =
    showSourceGhost && sourceFileDurationSec != null ? sourceFileDurationSec * pxPerSec : 0;
  /** While scrubbing source trim, show the full ghost; otherwise clip to the video strip. */
  const expandMusicGhostForDrag =
    dragging && dragRef.current !== null && dragRef.current.kind === 'fileTrim';
  const ghostDisplayWidthPx = showSourceGhost
    ? expandMusicGhostForDrag
      ? ghostFullWidthPx
      : Math.min(ghostFullWidthPx, Math.max(0, videoStripRightPx - ghostLeftPx))
    : 0;
  const musicClipLenSec = Math.max(MIN_CLIP_SEC, musicEndVideoTime - musicAnchorVideoTime);
  const maxTrimStartSec = useMemo(() => {
    if (sourceFileDurationSec != null && sourceFileDurationSec > musicClipLenSec + 0.05) {
      return Math.min(120, sourceFileDurationSec - musicClipLenSec);
    }
    return 120;
  }, [sourceFileDurationSec, musicClipLenSec]);

  /** Seconds grid on the source-file ghost: major (labels), mid, minor tick heights. */
  const musicGhostDurationMarks = useMemo(() => {
    if (!showSourceGhost || sourceFileDurationSec == null || sourceFileDurationSec < 0.25) return [];
    const D = sourceFileDurationSec;
    const majorStep = D > 90 ? 15 : D > 45 ? 10 : D > 22 ? 5 : D > 9 ? 2 : 1;
    let minorStep = majorStep >= 10 ? majorStep / 5 : majorStep >= 5 ? 1 : majorStep === 2 ? 0.5 : 0.25;
    let nEst = Math.ceil(D / minorStep) + 2;
    while (nEst > 96 && minorStep < majorStep) {
      minorStep *= 2;
      nEst = Math.ceil(D / minorStep) + 2;
    }
    const midStep = majorStep / 2;
    const out: { sec: number; kind: 'major' | 'mid' | 'minor' }[] = [];
    const roundSec = (x: number) => Math.round(x * 1000) / 1000;
    const steps = Math.min(400, Math.ceil(D / minorStep + 1e-9));
    let prev = -1;
    for (let i = 0; i <= steps; i++) {
      const sec = roundSec(Math.min(D, i * minorStep));
      if (sec <= prev + 1e-6) continue;
      prev = sec;
      const isMajor = Math.abs(sec / majorStep - Math.round(sec / majorStep)) < 0.02;
      const isMid =
        !isMajor &&
        midStep >= minorStep * 1.2 &&
        Math.abs(sec / midStep - Math.round(sec / midStep)) < 0.02;
      out.push({ sec, kind: isMajor ? 'major' : isMid ? 'mid' : 'minor' });
    }
    const last = out[out.length - 1];
    if (last && D - last.sec > minorStep * 0.75) {
      out.push({ sec: roundSec(D), kind: 'major' });
    }
    return out;
  }, [showSourceGhost, sourceFileDurationSec]);

  const playheadGlobalSec = videoClipStartSec + time;
  const playheadLineLeftPx = Math.min(
    displayTrackW,
    Math.max(0, (playheadGlobalSec / Math.max(0.001, timelineExtentSec)) * displayTrackW),
  );

  /** Unique scene starts for markers (local seconds), merged if closer than ~3 frames at 30fps */
  const sceneBoundaryMarkers = useMemo(() => {
    if (!videoScenes.length || duration <= 0.001) return [];
    const sorted = [...videoScenes]
      .map((s) => ({
        ...s,
        start: Math.min(duration, Math.max(0, s.start)),
      }))
      .sort((a, b) => a.start - b.start);
    const out: SceneOutline[] = [];
    for (const s of sorted) {
      const prev = out[out.length - 1];
      if (!prev || Math.abs(s.start - prev.start) > 0.04) out.push(s);
    }
    return out;
  }, [videoScenes, duration]);

  /** Timeline labels: one block per scene from 0 / each start to next start or duration */
  const videoSceneLabelSegments = useMemo(() => {
    if (!videoScenes.length || duration <= 0.001) return [];
    const sorted = [...videoScenes]
      .map((s) => ({
        id: s.id,
        label: s.label,
        start: Math.min(duration, Math.max(0, s.start)),
        end: Math.min(duration, Math.max(0, s.end)),
      }))
      .sort((a, b) => a.start - b.start);
    const out: { id: string; label: string; start: number; end: number; weight: number }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = i === 0 ? 0 : sorted[i].start;
      const end = i + 1 < sorted.length ? sorted[i + 1].start : duration;
      const weight = end - start;
      if (weight < 0.02) continue;
      out.push({
        id: sorted[i].id,
        label: sorted[i].label,
        start,
        end,
        weight,
      });
    }
    return out;
  }, [videoScenes, duration]);

  const musicMeta = backgroundTrackId ? getMusicTrack(backgroundTrackId) : null;
  const trackLabel = backgroundTrackId ? musicMeta?.label ?? 'Audio' : '';

  const musicLibraryDrawerEl = (
    <MusicLibraryDrawer
      open={audioMenuOpen}
      onClose={() => setAudioMenuOpen(false)}
      onPickTrackId={(id) => {
        onPatch({
          backgroundTrackId: id,
          musicAnchorVideoTime: 0,
          musicTrimStartSec: 0,
          musicEndVideoTime: duration,
        });
      }}
    />
  );

  if (cinemaMode) {
    const ext = Math.max(0.001, timelineExtentSec);
    const vLeftPct = (videoClipStartSec / ext) * 100;
    const vWidthPct = (duration / ext) * 100;
    const mLeftPct = (musicAnchorVideoTime / ext) * 100;
    const mWidthPct =
      (Math.max(MIN_CLIP_SEC, musicEndVideoTime - musicAnchorVideoTime) / ext) * 100;
    const playheadPct = Math.min(100, Math.max(0, ((videoClipStartSec + time) / ext) * 100));
    const microCols = Math.min(10, Math.max(1, filmstripImages.length));

    return (
      <>
      <div
        style={{
          marginTop: 0,
          padding: '10px 14px 12px',
          fontFamily: 'var(--sans)',
          color: 'var(--editor-text)',
          background: 'linear-gradient(180deg, #16161c 0%, #0e0e12 100%)',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 10px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(165deg, rgba(26,28,36,0.95) 0%, rgba(14,15,20,0.98) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <button
            type="button"
            data-timeline-no-seek
            title="Full timeline (Esc)"
            aria-label="Expand full timeline"
            onClick={() => onExitCinema()}
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 10,
              border: '1px solid rgba(158,197,232,0.35)',
              background:
                'linear-gradient(180deg, rgba(158,197,232,0.12) 0%, rgba(158,197,232,0.03) 100%)',
              color: VIDEO_TRIM,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M7 14l5-5 5 5M7 20l5-5 5 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            aria-hidden
            style={{
              width: 1,
              height: 28,
              flexShrink: 0,
              background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)',
            }}
          />

          <EditorTransportCluster playing={playing} onReset={onReset} onPlayPause={onPlayPause} />

          <div
            ref={compactTrackRef}
            onPointerDown={onCinemaTrackPointerDown}
            onPointerMove={onCinemaTrackPointerMove}
            onPointerUp={onCinemaTrackPointerUp}
            onPointerCancel={onCinemaTrackPointerUp}
            style={{
              flex: 1,
              minWidth: 120,
              height: 38,
              position: 'relative',
              borderRadius: 10,
              overflow: 'hidden',
              cursor: 'crosshair',
              background: '#08080c',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.45,
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent 0, transparent 11px, rgba(255,255,255,0.04) 11px, rgba(255,255,255,0.04) 12px)',
              }}
            />
            {backgroundTrackId ? (
              <div
                title={trackLabel}
                style={{
                  position: 'absolute',
                  left: `${mLeftPct}%`,
                  width: `${mWidthPct}%`,
                  bottom: 3,
                  height: 5,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${TRIM_GOLD_DIM}, ${TRIM_GOLD})`,
                  boxShadow: `0 0 10px ${TRIM_GOLD_DIM}`,
                  pointerEvents: 'none',
                }}
              />
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: `${vLeftPct}%`,
                width: `${vWidthPct}%`,
                top: 5,
                bottom: 11,
                borderRadius: 7,
                boxSizing: 'border-box',
                border: `1px solid ${VIDEO_TRIM_DIM}`,
                background: 'linear-gradient(180deg, rgba(158,197,232,0.18) 0%, rgba(80,110,150,0.12) 100%)',
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              {filmstripStatus === 'capturing' ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(6,8,12,0.75)',
                  }}
                >
                  <div className="editor-filmstrip-shimmer-track" style={{ width: '72%', maxWidth: 160 }}>
                    <div className="editor-filmstrip-shimmer-sweep" />
                  </div>
                </div>
              ) : filmstripStatus === 'ready' && filmstripImages.length > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 2,
                    display: 'flex',
                    gap: 1,
                    borderRadius: 5,
                    overflow: 'hidden',
                  }}
                >
                  {filmstripImages.slice(0, microCols).map((src, i) => (
                    <div key={src + i} style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <img
                        src={src}
                        alt=""
                        draggable={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          opacity: 0.92,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : filmstripStatus === 'error' ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 600,
                    color: 'var(--error)',
                    padding: '0 6px',
                    textAlign: 'center',
                  }}
                >
                  Preview error
                </div>
              ) : null}
            </div>
            {videoSceneLabelSegments.length > 0 ? (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: `${vLeftPct}%`,
                  width: `${vWidthPct}%`,
                  top: 5,
                  bottom: 11,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'stretch',
                  pointerEvents: 'none',
                  zIndex: 1,
                  padding: '0 3px 5px',
                  boxSizing: 'border-box',
                }}
              >
                {videoSceneLabelSegments.map((seg, idx) => (
                  <div
                    key={`cin-lbl-${seg.id}`}
                    title={seg.label}
                    style={{
                      flexGrow: seg.weight,
                      flexBasis: 0,
                      minWidth: 0,
                      maxWidth: '100%',
                      borderLeft:
                        idx === 0 ? 'none' : '1px solid rgba(158,197,232,0.28)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      padding: '0 1px',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '100%',
                        minWidth: 0,
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.9)',
                        textAlign: 'center',
                        lineHeight: 1.1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {seg.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            {sceneBoundaryMarkers.map((sc) => {
              const leftPct = (videoClipStartSec + sc.start) / ext;
              return (
                <button
                  key={`cin-scene-${sc.id}-${sc.start}`}
                  type="button"
                  data-timeline-no-seek
                  title={`${sc.label} · ${sc.start.toFixed(1)}s — seek`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSeek(sc.start);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${leftPct * 100}%`,
                    top: 5,
                    bottom: 11,
                    width: 12,
                    marginLeft: '-6px',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 3,
                      bottom: 3,
                      width: 1,
                      transform: 'translateX(-0.5px)',
                      borderRadius: 1,
                      background: 'rgba(255,255,255,0.4)',
                      boxShadow: `0 0 0 1px ${VIDEO_TRIM_DIM}`,
                      pointerEvents: 'none',
                    }}
                  />
                </button>
              );
            })}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: `${playheadPct}%`,
                top: 2,
                bottom: 2,
                width: 2,
                marginLeft: -1,
                borderRadius: 1,
                background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.75) 100%)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 12px rgba(255,255,255,0.35)',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 2,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--editor-text-dim)',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: 'var(--editor-text)' }}>{formatTc(videoClipStartSec + time)}</span>
              <span style={{ opacity: 0.45 }}> / </span>
              {formatTc(videoClipStartSec + duration)}
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--editor-text-dim)',
                opacity: 0.75,
              }}
            >
              Timeline
            </span>
          </div>
        </div>
      </div>
      {musicLibraryDrawerEl}
      </>
    );
  }

  return (
    <>
    <div
      style={{
        marginTop: 2,
        padding: 'var(--s-4) var(--s-5) var(--s-3)',
        background: 'linear-gradient(180deg, var(--editor-panel-2) 0%, var(--editor-panel) 100%)',
        borderTop: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
        fontFamily: 'var(--sans)',
        color: 'var(--editor-text)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--s-3)',
          gap: 12,
          position: 'relative',
          zIndex: 8,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--editor-text-dim)',
          }}
        >
          Timeline
        </span>
        <div style={{ marginLeft: 4 }}>
          <EditorTransportCluster playing={playing} onReset={onReset} onPlayPause={onPlayPause} />
        </div>
        <div style={{ flex: 1, minWidth: 8 }} aria-hidden />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--editor-text-dim)',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ color: 'var(--editor-text)' }}>{formatTc(videoClipStartSec + time)}</span>
            <span style={{ opacity: 0.45 }}> / </span>
            {formatTc(videoClipStartSec + duration)}s
          </span>
          {backgroundTrackId ? (
            <div style={{ position: 'relative' }}>
              <button
                ref={soundTriggerRef}
                type="button"
                data-timeline-no-seek
                aria-expanded={soundPanelOpen}
                aria-haspopup="dialog"
                aria-label="Audio mix"
                title="Audio mix"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSoundPanelOpen((o) => !o);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${soundPanelOpen ? TRIM_GOLD_DIM : 'var(--editor-border)'}`,
                  background: soundPanelOpen
                    ? `linear-gradient(180deg, rgba(232,197,71,0.14) 0%, rgba(232,197,71,0.04) 100%)`
                    : 'var(--editor-panel-2)',
                  color: soundPanelOpen ? TRIM_GOLD : 'var(--editor-text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: soundPanelOpen
                    ? `0 0 20px rgba(232,197,71,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition: 'border-color 180ms, background 180ms, color 180ms, box-shadow 180ms',
                }}
              >
                <SoundMixIcon />
              </button>
              {soundPanelOpen && soundPanelBox
                ? createPortal(
                    <div
                      ref={soundPanelRef}
                      data-timeline-no-seek
                      role="dialog"
                      aria-label="Audio mix"
                      style={{
                        position: 'fixed',
                        top: soundPanelBox.top,
                        left: soundPanelBox.left,
                        width: SOUND_PANEL_W,
                        maxHeight: 'min(72vh, calc(100vh - 16px))',
                        overflowY: 'auto',
                        zIndex: SOUND_PANEL_Z,
                        padding: '18px 18px 16px',
                        borderRadius: 14,
                        border: `1px solid rgba(232,197,71,0.22)`,
                        background: 'linear-gradient(165deg, #1E1E24 0%, #121216 55%, #0E0E12 100%)',
                        boxShadow:
                          '0 28px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(232,197,71,0.08) inset',
                        color: 'var(--editor-text)',
                        fontFamily: 'var(--sans)',
                      }}
                    >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: TRIM_GOLD,
                      marginBottom: 4,
                    }}
                  >
                    Audio mix
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--editor-text)',
                      lineHeight: 1.35,
                      marginBottom: 16,
                      paddingBottom: 14,
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {trackLabel}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--editor-text-dim)',
                      marginBottom: 8,
                    }}
                  >
                    Output level
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <span style={{ fontSize: 15, opacity: musicVolume < 0.02 ? 0.45 : 1 }} aria-hidden>
                      {musicVolume < 0.02 ? '🔇' : '🔉'}
                    </span>
                    <Slider
                      compact
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '4px 8px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 8,
                      }}
                      value={Math.round(musicVolume * 100)}
                      min={0}
                      max={100}
                      step={2}
                      suffix="%"
                      onChange={(v) => onPatch({ musicVolume: Math.min(1, Math.max(0, v / 100)) })}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--editor-text-dim)',
                      marginBottom: 8,
                    }}
                  >
                    Source file trim
                  </div>
                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: 10,
                      lineHeight: 1.45,
                      color: 'rgba(255,255,255,0.42)',
                    }}
                  >
                    <strong style={{ color: 'rgba(232,197,71,0.9)' }}>Press and hold</strong>, then drag to
                    scrub the in-point in the file (timeline clip stays put). Dashed bar = full file while
                    dragging; otherwise it matches the video strip. Scale = file seconds. Steppers ±0.25s.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      title="Earlier in file (−0.25s)"
                      onClick={() =>
                        onPatch({ musicTrimStartSec: Math.max(0, musicTrimStartSec - 0.25) })
                      }
                      style={stepperBtnCompact}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 13,
                        minWidth: 48,
                        textAlign: 'center',
                        color: 'var(--editor-text)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {musicTrimStartSec.toFixed(1)}s
                    </span>
                    <button
                      type="button"
                      title="Later in file (+0.25s)"
                      onClick={() =>
                        onPatch({
                          musicTrimStartSec: Math.min(maxTrimStartSec, musicTrimStartSec + 0.25),
                        })
                      }
                      style={stepperBtnCompact}
                    >
                      +
                    </button>
                  </div>
                  {musicMeta?.attribution ? (
                    <p
                      style={{
                        margin: '14px 0 0',
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        fontSize: 10,
                        lineHeight: 1.5,
                        color: 'var(--editor-text-dim)',
                      }}
                    >
                      {musicMeta.attribution}
                    </p>
                  ) : null}
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--editor-border)',
          background: '#0A0A0C',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.45)',
        }}
      >
        <div
          ref={scrollMeasureRef}
          style={{
            width: '100%',
            minWidth: 0,
          }}
        >
          <div
            ref={scrollRef}
            onScroll={onScroll}
            style={{
              width: '100%',
              minWidth: 0,
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--editor-border) transparent',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                width: TIMELINE_LEFT_INSET_PX + displayTrackW + padRight,
              minHeight: RULER_H + FILMSTRIP_H + VIDEO_LANE_H + MUSIC_LANE_H + 16,
            }}
          >
            <div style={{ width: TIMELINE_LEFT_INSET_PX, flexShrink: 0 }} aria-hidden />
            <div
              ref={trackRef}
              onMouseDown={onTrackMouseDown}
              style={{
                width: displayTrackW,
                flexShrink: 0,
                position: 'relative',
                cursor: 'crosshair',
              }}
            >
              <div
                style={{
                  height: RULER_H,
                  position: 'relative',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {rulerMarks.map(({ t, kind }) => {
                  const h =
                    kind === 'major' ? RULER_MAJOR_H : kind === 'mid' ? RULER_MID_H : RULER_MINOR_H;
                  const opacity = kind === 'major' ? 0.42 : kind === 'mid' ? 0.22 : 0.14;
                  const rounded = Math.round(t);
                  const isWholeSecond = Math.abs(t - rounded) < 1e-5;
                  const showLabel =
                    kind === 'major' &&
                    isWholeSecond &&
                    (rounded % tickStep === 0 || rounded === 0);
                  return (
                    <div
                      key={`${t}-${kind}`}
                      style={{
                        position: 'absolute',
                        left: t * pxPerSec,
                        bottom: 0,
                        width: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      {showLabel ? (
                        <span
                          style={{
                            position: 'absolute',
                            left: 3,
                            bottom: RULER_MAJOR_H + 2,
                            fontFamily: 'var(--mono)',
                            fontSize: 10,
                            color: 'var(--editor-text-dim)',
                            whiteSpace: 'nowrap',
                            lineHeight: 1,
                          }}
                        >
                          <span style={{ color: 'var(--editor-text)', opacity: 0.92 }}>
                            {rounded}
                          </span>
                          <span style={{ fontSize: 8, marginLeft: 1, opacity: 0.65 }}>s</span>
                        </span>
                      ) : null}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          bottom: 0,
                          width: 1,
                          height: h,
                          background: `rgba(255,255,255,${opacity})`,
                          borderRadius: 0.5,
                          transform: 'translateX(-0.5px)',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  position: 'relative',
                  width: displayTrackW,
                  height: FILMSTRIP_H,
                  boxSizing: 'border-box',
                }}
              >
                {filmstripStatus === 'capturing' ? (
                  <div
                    className="editor-filmstrip-capture-overlay"
                    style={{
                      position: 'absolute',
                      left: videoClipLeftPx,
                      width: videoClipWpx,
                      top: 0,
                      height: '100%',
                      zIndex: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 14,
                      pointerEvents: 'none',
                      boxSizing: 'border-box',
                      background:
                        'linear-gradient(165deg, rgba(10,12,18,0.88) 0%, rgba(6,7,10,0.92) 50%, rgba(8,10,14,0.9) 100%)',
                      backdropFilter: 'blur(8px) saturate(1.1)',
                      WebkitBackdropFilter: 'blur(8px) saturate(1.1)',
                      borderRadius: 'var(--r-md)',
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${VIDEO_TRIM_DIM}`,
                    }}
                  >
                    <div
                      className="editor-filmstrip-capture-perf"
                      aria-hidden
                      style={{
                        display: 'flex',
                        gap: 5,
                        opacity: 0.35,
                      }}
                    >
                      {Array.from({ length: 14 }).map((_, i) => (
                        <div
                          key={i}
                          style={
                            {
                              width: 2,
                              height: 10,
                              borderRadius: 1,
                              background: 'rgba(255,255,255,0.55)',
                              ['--perf-delay' as string]: `${i * 55}ms`,
                            } as CSSProperties
                          }
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          color: 'var(--editor-text-dim)',
                          fontFamily: 'var(--sans)',
                        }}
                      >
                        Preview
                      </span>
                      <div className="editor-filmstrip-shimmer-track">
                        <div className="editor-filmstrip-shimmer-sweep" />
                      </div>
                    </div>
                  </div>
                ) : null}
                <div
                  style={{
                    position: 'absolute',
                    left: videoClipLeftPx,
                    top: 0,
                    width: videoClipWpx,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    gap: 3,
                    padding: '6px 0',
                    boxSizing: 'border-box',
                  }}
                >
                  {filmstripStatus === 'error' ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: 'var(--error)',
                        fontFamily: 'var(--sans)',
                      }}
                    >
                      {filmstripError ?? 'Preview strip unavailable'}
                    </div>
                  ) : filmstripStatus === 'ready' && filmstripImages.length > 0 ? (
                    filmstripImages.map((src, i) => (
                      <div
                        key={src + i}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          borderRadius: 'var(--r-md)',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                        }}
                      >
                        <img
                          src={src}
                          alt=""
                          draggable={false}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            userSelect: 'none',
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    Array.from({ length: skeletonCount }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          borderRadius: 'var(--r-md)',
                          background:
                            'linear-gradient(110deg, var(--editor-panel-2) 0%, #2A2A30 40%, var(--editor-panel-2) 80%)',
                          backgroundSize: '200% 100%',
                          opacity: 0.55,
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              <div
                data-timeline-no-seek
                style={{
                  height: VIDEO_LANE_H,
                  marginTop: 4,
                  borderRadius: 'var(--r-md)',
                  background: 'rgba(255,255,255,0.03)',
                  position: 'relative',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  data-timeline-no-seek
                  data-video-clip
                  style={{
                    position: 'absolute',
                    left: videoClipLeftPx,
                    width: videoClipWpx,
                    top: 5,
                    height: VIDEO_LANE_H - 10,
                    borderRadius: 'var(--r-md)',
                    boxSizing: 'border-box',
                    border: `2px solid ${VIDEO_TRIM}`,
                    boxShadow: `0 0 0 1px rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.4)`,
                    background: playing
                      ? `linear-gradient(180deg, ${VIDEO_TRIM_DIM} 0%, rgba(100,140,180,0.15) 100%)`
                      : `linear-gradient(180deg, rgba(158,197,232,0.2) 0%, rgba(100,140,180,0.1) 100%)`,
                    touchAction: 'none',
                    zIndex: 2,
                  }}
                >
                  <div
                    data-timeline-no-seek
                    onPointerDown={(e) => onVideoClipPointerDown(e, 'trimL')}
                    onPointerMove={onVideoClipPointerMove}
                    onPointerUp={endVideoClipInteraction}
                    onPointerCancel={endVideoClipInteraction}
                    title="Trim video start (global timeline)"
                    style={{
                      position: 'absolute',
                      left: -14,
                      top: -8,
                      width: 28,
                      height: VIDEO_LANE_H + 4,
                      cursor: 'ew-resize',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 4,
                      touchAction: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: VIDEO_LANE_H - 10,
                        borderRadius: 3,
                        background: VIDEO_TRIM,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  <div
                    data-timeline-no-seek
                    onPointerDown={(e) => onVideoClipPointerDown(e, 'move')}
                    onPointerMove={onVideoClipPointerMove}
                    onPointerUp={endVideoClipInteraction}
                    onPointerCancel={endVideoClipInteraction}
                    title="Slip video clip on timeline"
                    style={{
                      position: 'absolute',
                      left: 10,
                      right: 10,
                      top: 0,
                      bottom: 0,
                      cursor: dragging ? 'grabbing' : 'grab',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'stretch',
                      padding: '0 2px',
                      minWidth: 0,
                    }}
                  >
                    {videoSceneLabelSegments.map((seg, idx) => (
                      <div
                        key={`vseg-${seg.id}`}
                        title={`${seg.label} (${seg.start.toFixed(1)}s–${seg.end.toFixed(1)}s)`}
                        style={{
                          flexGrow: seg.weight,
                          flexBasis: 0,
                          minWidth: 0,
                          maxWidth: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderLeft:
                            idx === 0 ? 'none' : '1px solid rgba(0,0,0,0.35)',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                          padding: '0 2px',
                          pointerEvents: 'none',
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            width: '100%',
                            minWidth: 0,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                            color: 'var(--editor-text)',
                            textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textAlign: 'center',
                          }}
                        >
                          {seg.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    data-timeline-no-seek
                    onPointerDown={(e) => onVideoClipPointerDown(e, 'trimR')}
                    onPointerMove={onVideoClipPointerMove}
                    onPointerUp={endVideoClipInteraction}
                    onPointerCancel={endVideoClipInteraction}
                    title="Trim / extend video end (duration)"
                    style={{
                      position: 'absolute',
                      right: -14,
                      top: -8,
                      width: 28,
                      height: VIDEO_LANE_H + 4,
                      cursor: 'ew-resize',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 4,
                      touchAction: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: VIDEO_LANE_H - 10,
                        borderRadius: 3,
                        background: VIDEO_TRIM,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                data-timeline-no-seek
                style={{
                  height: MUSIC_LANE_H,
                  marginTop: 4,
                  borderRadius: 'var(--r-md)',
                  background: 'rgba(255,255,255,0.04)',
                  position: 'relative',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'visible',
                  zIndex: 1,
                }}
              >
                {backgroundTrackId ? (
                  <>
                  {showSourceGhost && sourceFileDurationSec != null && ghostDisplayWidthPx > 0.5 ? (
                    <div
                      aria-hidden
                      title={
                        expandMusicGhostForDrag
                          ? 'Source file (full length while dragging) — shaded region is heard through the gold clip'
                          : 'Source file (clipped to video strip) — shaded region is heard through the gold clip'
                      }
                      style={{
                        position: 'absolute',
                        left: ghostLeftPx,
                        width: ghostDisplayWidthPx,
                        top: 5,
                        height: MUSIC_LANE_H - 10,
                        borderRadius: 'var(--r-md)',
                        boxSizing: 'border-box',
                        border: showMusicFileRuler
                          ? '1px solid rgba(232,197,71,0.72)'
                          : '1px solid rgba(232,197,71,0.45)',
                        borderStyle: showMusicFileRuler ? 'solid' : 'dashed',
                        background: showMusicFileRuler
                          ? 'linear-gradient(180deg, rgba(32,28,18,0.96) 0%, rgba(18,16,12,0.98) 100%)'
                          : 'linear-gradient(180deg, rgba(28,24,16,0.88) 0%, rgba(14,12,10,0.92) 100%)',
                        boxShadow: showMusicFileRuler
                          ? '0 0 0 1px rgba(0,0,0,0.5), 0 0 22px rgba(232,197,71,0.18), inset 0 1px 0 rgba(232,197,71,0.12)'
                          : '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(232,197,71,0.08)',
                        pointerEvents: 'none',
                        zIndex: expandMusicGhostForDrag ? 4 : 1,
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: ghostFullWidthPx,
                          height: '100%',
                        }}
                      >
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: `${(musicTrimStartSec / sourceFileDurationSec) * 100}%`,
                          width: `${(Math.min(musicClipLenSec, Math.max(0, sourceFileDurationSec - musicTrimStartSec)) / sourceFileDurationSec) * 100}%`,
                          top: 0,
                          bottom: 13,
                          boxSizing: 'border-box',
                          borderLeft: '1px solid rgba(232,197,71,0.55)',
                          borderRight: '1px solid rgba(232,197,71,0.55)',
                          background: showMusicFileRuler
                            ? 'linear-gradient(180deg, rgba(232,197,71,0.34) 0%, rgba(232,197,71,0.14) 100%)'
                            : 'linear-gradient(180deg, rgba(232,197,71,0.22) 0%, rgba(232,197,71,0.08) 100%)',
                          pointerEvents: 'none',
                          transition: 'background 0.12s ease',
                        }}
                      />
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 13,
                          background: 'linear-gradient(180deg, rgba(6,6,8,0.15) 0%, rgba(4,4,6,0.72) 100%)',
                          borderTop: '1px solid rgba(232,197,71,0.38)',
                          boxSizing: 'border-box',
                        }}
                      >
                        {musicGhostDurationMarks.map(({ sec, kind }) => {
                          const fileDur = sourceFileDurationSec;
                          const pct = (sec / fileDur) * 100;
                          const tickH = kind === 'major' ? 9 : kind === 'mid' ? 6 : 3;
                          const tickW = kind === 'major' ? 1.5 : 1;
                          const label =
                            kind === 'major'
                              ? sec >= 100
                                ? `${Math.round(sec)}s`
                                : sec >= 10
                                  ? `${Math.round(sec)}s`
                                  : `${sec.toFixed(1)}s`
                              : '';
                          return (
                            <div
                              key={`gmk-${sec.toFixed(3)}-${kind}`}
                              style={{
                                position: 'absolute',
                                left: `${pct}%`,
                                bottom: 0,
                                width: 0,
                                height: 13,
                                transform: 'translateX(-0.5px)',
                              }}
                            >
                              {kind === 'major' ? (
                                <span
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    bottom: 11,
                                    transform: 'translateX(-50%)',
                                    fontFamily: 'var(--mono)',
                                    fontSize: 8,
                                    fontWeight: 700,
                                    letterSpacing: '0.02em',
                                    color: 'rgba(252,236,180,0.98)',
                                    whiteSpace: 'nowrap',
                                    textShadow: '0 1px 3px rgba(0,0,0,0.95)',
                                  }}
                                >
                                  {label}
                                </span>
                              ) : null}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  bottom: 0,
                                  width: tickW,
                                  height: tickH,
                                  transform: 'translateX(-50%)',
                                  borderRadius: 0.5,
                                  background:
                                    kind === 'major'
                                      ? 'rgba(252,236,180,0.95)'
                                      : kind === 'mid'
                                        ? 'rgba(232,197,71,0.78)'
                                        : 'rgba(232,197,71,0.45)',
                                  boxShadow:
                                    kind === 'major' ? '0 0 6px rgba(232,197,71,0.35)' : 'none',
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      </div>
                    </div>
                  ) : null}
                  <div
                    data-timeline-no-seek
                    data-music-clip
                    onPointerDown={onMusicClipBodyPointerDown}
                    style={{
                      position: 'absolute',
                      left: clipLeftPx,
                      width: clipWpx,
                      top: 5,
                      height: MUSIC_LANE_H - 10,
                      borderRadius: 'var(--r-md)',
                      boxSizing: 'border-box',
                      border: `2px solid ${TRIM_GOLD}`,
                      boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 6px 18px rgba(0,0,0,0.45)`,
                      background: playing
                        ? `linear-gradient(180deg, ${TRIM_GOLD_DIM} 0%, rgba(196,147,115,0.18) 100%)`
                        : `linear-gradient(180deg, rgba(232,197,71,0.22) 0%, rgba(196,147,115,0.12) 100%)`,
                      touchAction: 'none',
                      zIndex: 2,
                      cursor: dragging ? 'grabbing' : 'grab',
                    }}
                  >
                    <div
                      data-timeline-no-seek
                      data-music-trim
                      onPointerDown={(e) => onClipPointerDown(e, 'trimL')}
                      onPointerMove={onClipPointerMove}
                      onPointerUp={endClipInteraction}
                      onPointerCancel={endClipInteraction}
                      title="Trim clip start on the video timeline"
                      style={{
                        position: 'absolute',
                        left: -14,
                        top: -8,
                        width: 28,
                        height: MUSIC_LANE_H + 4,
                        cursor: 'ew-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 4,
                        touchAction: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: MUSIC_LANE_H - 10,
                          borderRadius: 3,
                          background: TRIM_GOLD,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 40px 0 32px',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--editor-text)',
                          textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                      >
                        {trackLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-timeline-no-seek
                      title="Remove audio"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPatch({
                          backgroundTrackId: null,
                          musicAnchorVideoTime: 0,
                          musicTrimStartSec: 0,
                          musicEndVideoTime: duration,
                        });
                      }}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 22,
                        height: 22,
                        borderRadius: 'var(--r-md)',
                        border: '1px solid rgba(0,0,0,0.35)',
                        background: 'rgba(10,10,12,0.65)',
                        color: 'var(--editor-text)',
                        fontSize: 14,
                        lineHeight: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 4,
                      }}
                    >
                      ×
                    </button>
                    <div
                      data-timeline-no-seek
                      data-music-trim
                      onPointerDown={(e) => onClipPointerDown(e, 'trimR')}
                      onPointerMove={onClipPointerMove}
                      onPointerUp={endClipInteraction}
                      onPointerCancel={endClipInteraction}
                      title="Trim clip end on the video timeline"
                      style={{
                        position: 'absolute',
                        right: -14,
                        top: -8,
                        width: 28,
                        height: MUSIC_LANE_H + 4,
                        cursor: 'ew-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 4,
                        touchAction: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: MUSIC_LANE_H - 10,
                          borderRadius: 3,
                          background: TRIM_GOLD,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  </div>
                  </>
                ) : (
                  <div style={{ position: 'relative', height: '100%' }}>
                    <button
                      ref={audioMenuTriggerRef}
                      type="button"
                      data-timeline-no-seek
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAudioMenuOpen((o) => !o);
                      }}
                      style={{
                        position: 'absolute',
                        inset: 5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        border: `1px dashed ${TRIM_GOLD_DIM}`,
                        borderRadius: 'var(--r-md)',
                        background: 'rgba(232,197,71,0.06)',
                        color: 'var(--editor-text-dim)',
                        fontFamily: 'var(--sans)',
                        fontSize: 13,
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                        zIndex: 3,
                        transition: 'background 160ms, border-color 160ms',
                      }}
                    >
                      <span style={{ fontSize: 18, color: TRIM_GOLD }} aria-hidden>
                        ♪
                      </span>
                      <span style={{ fontWeight: 700, color: TRIM_GOLD }}>Add audio</span>
                    </button>
                  </div>
                )}
              </div>
              {sceneBoundaryMarkers.map((sc) => {
                const globalSec = videoClipStartSec + sc.start;
                const leftPx = globalSec * pxPerSec;
                const lineTop = RULER_H;
                const lineH = FILMSTRIP_H + 4 + VIDEO_LANE_H;
                const hitTop = RULER_H + FILMSTRIP_H + 4;
                return (
                  <div
                    key={`scene-${sc.id}-${sc.start}`}
                    style={{
                      position: 'absolute',
                      left: leftPx,
                      top: 0,
                      width: 0,
                      height: 0,
                      zIndex: 2,
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      aria-hidden
                      title={undefined}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: lineTop,
                        width: 1,
                        height: lineH,
                        transform: 'translateX(-0.5px)',
                        borderRadius: 1,
                        pointerEvents: 'none',
                        background:
                          'linear-gradient(180deg, rgba(158,197,232,0.35) 0%, rgba(158,197,232,0.2) 45%, rgba(158,197,232,0.55) 100%)',
                        boxShadow: `0 0 0 1px ${VIDEO_TRIM_DIM}`,
                      }}
                    />
                    <button
                      type="button"
                      data-timeline-no-seek
                      title={`${sc.label} · ${sc.start.toFixed(1)}s — seek`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSeek(sc.start);
                      }}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: hitTop,
                        width: 14,
                        height: VIDEO_LANE_H,
                        marginLeft: -7,
                        padding: 0,
                        border: 'none',
                        borderRadius: 4,
                        background: 'transparent',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                      }}
                    />
                  </div>
                );
              })}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: playheadLineLeftPx,
                  marginLeft: -1,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  zIndex: 3,
                  pointerEvents: 'none',
                  background:
                    'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.88) 40%, rgba(255,255,255,0.55) 100%)',
                  boxShadow: '0 0 12px rgba(255,255,255,0.3)',
                }}
              />
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: playheadLineLeftPx,
                  top: 2,
                  marginLeft: -5,
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '6px solid rgba(255,255,255,0.95)',
                  zIndex: 3,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                }}
              />
            </div>
            <div style={{ width: padRight, flexShrink: 0 }} aria-hidden />
          </div>
        </div>
        </div>

      </div>

    </div>
    {musicLibraryDrawerEl}
    </>
  );
}

const stepperBtnCompact: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: '1px solid var(--editor-border)',
  background: 'var(--editor-panel)',
  color: 'var(--editor-text)',
  fontSize: 14,
  cursor: 'pointer',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
