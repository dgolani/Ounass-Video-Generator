// Project-background timeline lane — same gestural model as the
// music lane.
//
// Three states:
//   - No background → "Add background" button (opens BackgroundDrawer).
//   - Image background → flat stripe spanning the full duration; no
//     drag (image is static; click to re-open the drawer).
//   - Video background → bordered clip from `anchor` to `end` on the
//     project timeline. Body gestures match the music lane EXACTLY:
//
//       - Quick click / drag on the body → no-op (so the marketer
//         doesn't accidentally slide the clip while trying to scrub).
//       - Long-press body (≥260ms held within 22px) → enters scrub
//         mode. From there, drag updates `trimStartSec` only — anchor
//         and end stay put. Useful when the source is longer than
//         the on-timeline window: scrub through the source to choose
//         which portion plays.
//       - Left handle → drags `anchor` AND shifts `trimStartSec` by
//         the same delta so the visible source frame stays put.
//       - Right handle → drags `endVideoTime` only.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { ProjectBackground } from '../../store/types';

const LANE_H = 36;
/** Bronze accent — distinct from music's gold so the marketer can
 *  tell the lanes apart at a glance. */
const BG_BRONZE = '#B87253';
const BG_BRONZE_DIM = 'rgba(184, 114, 83, 0.28)';
/** Minimum clip width on the timeline (in seconds). */
const MIN_CLIP_SEC = 0.25;
/** Long-press window before body becomes a scrub gesture. Mirrors the
 *  music lane's `LONG_PRESS_MOVE_MS` so muscle memory transfers. */
const LONG_PRESS_MOVE_MS = 260;
/** Slop px before a press cancels into "marketer is moving the
 *  pointer, not pressing". Mirrors the music lane's
 *  `LONG_PRESS_MOVE_SLOP_PX`. Generous so normal hand jitter doesn't
 *  cancel the long-press. */
const LONG_PRESS_MOVE_SLOP_PX = 22;

type Props = {
  background: ProjectBackground | undefined;
  duration: number;
  videoClipStartSec: number;
  /** Pixels per second on the timeline (matches the music lane's
   *  pxPerSec so the clip aligns vertically). */
  pxPerSec: number;
  /** Total lane width in px. Image-kind clips span this width. */
  laneWidthPx: number;
  /** Probed duration of the source video file in seconds. Drives the
   *  source-file ghost ruler (dashed bar showing the full source
   *  beyond the on-timeline window, with seconds tick marks). null
   *  while probe is in flight or fails — ghost simply won't render. */
  sourceDurationSec: number | null;
  onChange: (next: ProjectBackground) => void;
  /** Called when the marketer clicks the "Add background" CTA inside
   *  the empty lane. Parent opens the BackgroundDrawer. */
  onAddClick: () => void;
  /** Called when the marketer clicks the existing clip's label area
   *  (a click without a long-press). Parent opens the drawer. */
  onEditClick: () => void;
};

export function BackgroundLane({
  background,
  duration,
  videoClipStartSec,
  pxPerSec,
  laneWidthPx,
  sourceDurationSec,
  onChange,
  onAddClick,
  onEditClick,
}: Props) {
  return (
    <div
      data-timeline-no-seek
      style={{
        height: LANE_H,
        marginTop: 4,
        borderRadius: 'var(--r-md)',
        background: 'rgba(255,255,255,0.04)',
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'visible',
        zIndex: 1,
        width: laneWidthPx,
      }}
    >
      {!background ? (
        <AddButton onClick={onAddClick} />
      ) : background.kind === 'image' ? (
        <ImageStripe onClick={onEditClick} />
      ) : background.kind === 'color' ? (
        <ColorStripe color={background.color} onClick={onEditClick} />
      ) : (
        <VideoClip
          background={background}
          duration={duration}
          videoClipStartSec={videoClipStartSec}
          pxPerSec={pxPerSec}
          laneWidthPx={laneWidthPx}
          sourceDurationSec={sourceDurationSec}
          onChange={onChange}
          onLabelClick={onEditClick}
        />
      )}
    </div>
  );
}

// ── No background — Add button ──────────────────────────────────

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-timeline-no-seek
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: 'absolute',
        inset: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        border: `1px dashed ${BG_BRONZE_DIM}`,
        borderRadius: 'var(--r-md)',
        background: 'rgba(184,114,83,0.06)',
        color: 'var(--editor-text-dim)',
        fontFamily: 'var(--sans)',
        fontSize: 13,
        letterSpacing: '0.06em',
        cursor: 'pointer',
        zIndex: 3,
        transition: 'background 160ms, border-color 160ms',
      }}
    >
      <span style={{ fontSize: 18, color: BG_BRONZE }} aria-hidden>
        ▦
      </span>
      <span style={{ fontWeight: 700, color: BG_BRONZE }}>Add background</span>
    </button>
  );
}

// ── Image branch — non-draggable stripe ─────────────────────────

function ColorStripe({ color, onClick }: { color: string; onClick: () => void }) {
  // Pick a contrasting label colour from the swatch luminance so the
  // hex code is always legible on whatever shade the marketer chose.
  const labelColor = isLightHex(color) ? '#0A0A0A' : '#F2EFEA';
  return (
    <button
      type="button"
      data-timeline-no-seek
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: 'absolute',
        inset: 5,
        borderRadius: 'var(--r-md)',
        border: `2px solid ${BG_BRONZE}`,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: labelColor,
        fontFamily: 'var(--mono, var(--sans))',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        padding: 0,
        width: `calc(100% - 10px)`,
      }}
    >
      <span aria-hidden style={{ fontSize: 10 }}>●</span>
      <span>{color}</span>
    </button>
  );
}

/** Quick perceived-luminance check (Rec. 709-ish) on a `#RGB`/`#RRGGBB`
 *  hex. Used by the lane stripe to pick a contrasting label colour. */
function isLightHex(hex: string): boolean {
  const m =
    /^#([0-9a-fA-F]{3})$/.exec(hex) || /^#([0-9a-fA-F]{6})/.exec(hex);
  if (!m) return false;
  const h = m[1];
  const expand = h.length === 3
    ? h
        .split('')
        .map((c) => c + c)
        .join('')
    : h;
  const r = parseInt(expand.slice(0, 2), 16);
  const g = parseInt(expand.slice(2, 4), 16);
  const b = parseInt(expand.slice(4, 6), 16);
  // Rec. 709 luma — perceived brightness; > 0.6 reads as "light".
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6;
}

function ImageStripe({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-timeline-no-seek
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: 'absolute',
        inset: 5,
        borderRadius: 'var(--r-md)',
        border: `2px solid ${BG_BRONZE}`,
        background: `linear-gradient(180deg, ${BG_BRONZE_DIM} 0%, rgba(184,114,83,0.10) 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'var(--sans)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        padding: 0,
        width: `calc(100% - 10px)`,
      }}
    >
      Background image · click to edit
    </button>
  );
}

// ── Video branch — long-press scrub + trim handles ──────────────

type VideoBg = Extract<ProjectBackground, { kind: 'video' }>;

/** Pending long-press state — between pointerdown and either timer-fires
 *  (→ scrub) or pointer-moves-past-slop / pointerup (→ no-op click). */
type PendingLongPress = {
  pointerId: number;
  startX: number;
  startY: number;
  timer: number;
};

/** Active scrub state — only set after the long-press timer fires. */
type ScrubState = {
  pointerId: number;
  startX: number;
  trim0: number;
};

/** Active trim state — set on handle pointerdown. */
type TrimState =
  | { kind: 'left'; pointerId: number; startX: number; anchor0: number; trim0: number }
  | { kind: 'right'; pointerId: number; startX: number; end0: number };

function VideoClip({
  background,
  duration,
  videoClipStartSec,
  pxPerSec,
  laneWidthPx,
  sourceDurationSec,
  onChange,
  onLabelClick,
}: {
  background: VideoBg;
  duration: number;
  videoClipStartSec: number;
  pxPerSec: number;
  laneWidthPx: number;
  sourceDurationSec: number | null;
  onChange: (next: ProjectBackground) => void;
  onLabelClick: () => void;
}) {
  void videoClipStartSec; // reserved — could constrain anchor to ≥ this in future
  void laneWidthPx; // reserved — could clamp ghost overflow on right edge

  const [scrubbing, setScrubbing] = useState(false);
  const pendingRef = useRef<PendingLongPress | null>(null);
  const scrubRef = useRef<ScrubState | null>(null);
  const trimRef = useRef<TrimState | null>(null);
  /** Window pointer-event session shared by body, scrub, and handles
   *  so the drag continues even when the pointer leaves the clip's
   *  bounding box (mirrors how the music lane handles this). */
  const sessionRef = useRef<{
    pointerId: number;
    onMove: (e: PointerEvent) => void;
    onUp: (e: PointerEvent) => void;
  } | null>(null);

  // Always read the LATEST background through a ref so the move
  // handlers always see fresh anchor/end/trim/dim values rather than
  // a stale closure capture.
  const bgRef = useRef(background);
  bgRef.current = background;

  // Same trick for the click-through-to-edit callback so the body
  // pointerdown's onWinUp closure always calls the most recent
  // version.
  const onLabelClickRef = useRef(onLabelClick);
  onLabelClickRef.current = onLabelClick;

  const left = background.anchorVideoTime * pxPerSec;
  const width = Math.max(
    MIN_CLIP_SEC * pxPerSec,
    (background.endVideoTime - background.anchorVideoTime) * pxPerSec,
  );

  // ── Source-file ghost geometry ──────────────────────────────────
  // Mirrors the music lane's ghost ruler: a dashed bar showing the
  // FULL source video extent on the same scale as the timeline. The
  // bar maps source-time-0 onto project-time `(anchor - trimStart)`,
  // and extends `sourceDurationSec * pxPerSec` to the right. A
  // shaded sub-region inside the ghost shows which slice of the
  // source maps to the on-timeline clip — moves as the marketer
  // long-press-scrubs trim.
  const showGhost =
    sourceDurationSec != null && sourceDurationSec > 0.2;
  const ghostLeftPx = showGhost
    ? (background.anchorVideoTime - background.trimStartSec) * pxPerSec
    : 0;
  const ghostFullWidthPx = showGhost && sourceDurationSec ? sourceDurationSec * pxPerSec : 0;
  // While long-press-scrubbing, expand the ghost to its full source
  // width so the marketer can see context past the visible clip;
  // otherwise clip the right edge to the on-timeline clip's right
  // edge so it doesn't bleed into the music lane below.
  const expandGhostForDrag = scrubbing;
  const clipRightPx = left + width;
  const ghostDisplayWidthPx = showGhost
    ? expandGhostForDrag
      ? ghostFullWidthPx
      : Math.min(ghostFullWidthPx, Math.max(0, clipRightPx - ghostLeftPx))
    : 0;

  const clipLenSec = Math.max(
    MIN_CLIP_SEC,
    background.endVideoTime - background.anchorVideoTime,
  );

  /** Tick marks on the ghost ruler — same density curve the music
   *  lane uses, so the visual language matches. Memoised on
   *  sourceDurationSec because timeline updates churn the parent at
   *  60fps; the ticks only change on URL swap. */
  const ghostMarks = useMemo<Array<{ sec: number; kind: 'major' | 'mid' | 'minor' }>>(() => {
    if (!showGhost || sourceDurationSec == null || sourceDurationSec < 0.25) {
      return [];
    }
    const D = sourceDurationSec;
    const majorStep = D > 90 ? 15 : D > 45 ? 10 : D > 22 ? 5 : D > 9 ? 2 : 1;
    let minorStep =
      majorStep >= 10 ? majorStep / 5 : majorStep >= 5 ? 1 : majorStep === 2 ? 0.5 : 0.25;
    let nEst = Math.ceil(D / minorStep) + 2;
    while (nEst > 96 && minorStep < majorStep) {
      minorStep *= 2;
      nEst = Math.ceil(D / minorStep) + 2;
    }
    const midStep = majorStep / 2;
    const out: Array<{ sec: number; kind: 'major' | 'mid' | 'minor' }> = [];
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
  }, [showGhost, sourceDurationSec]);

  const detachSession = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    window.removeEventListener('pointermove', s.onMove, true);
    window.removeEventListener('pointerup', s.onUp, true);
    window.removeEventListener('pointercancel', s.onUp, true);
    sessionRef.current = null;
  }, []);

  // ── Body pointerdown — long-press setup ─────────────────────
  // Listens on the entire clip body. Trim handles short-circuit
  // because their pointerdown handlers stop propagation. The label
  // button DOES NOT stop propagation — pressing the label area
  // should also start the long-press timer; if the marketer just
  // taps and releases quickly without enough movement, the
  // button's onClick fires later (browser-level) and opens the
  // drawer for editing.
  const onBodyPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      // Trim handles handle their own gestures.
      const t = e.target as HTMLElement;
      if (t.closest('[data-bg-handle]')) return;
      e.preventDefault();
      e.stopPropagation();
      detachSession();

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;

      pendingRef.current = {
        pointerId,
        startX,
        startY,
        timer: window.setTimeout(() => {
          // Long-press fired without exceeding the slop — flip into
          // scrub mode. Capture the current trim as the baseline so
          // subsequent moves are deltas from press position.
          pendingRef.current = null;
          scrubRef.current = {
            pointerId,
            startX,
            trim0: bgRef.current.trimStartSec,
          };
          setScrubbing(true);
        }, LONG_PRESS_MOVE_MS),
      };

      const onWinMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        // Pending long-press → check slop; if exceeded, cancel.
        const pending = pendingRef.current;
        if (pending) {
          const dx = ev.clientX - pending.startX;
          const dy = ev.clientY - pending.startY;
          if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_SLOP_PX) {
            window.clearTimeout(pending.timer);
            pendingRef.current = null;
          }
          return;
        }
        // Active scrub → move trim by dx.
        const sc = scrubRef.current;
        if (sc) {
          ev.preventDefault();
          const dx = ev.clientX - sc.startX;
          const dt = dx / pxPerSec;
          const nextTrim = Math.max(0, sc.trim0 + dt);
          onChange({ ...bgRef.current, trimStartSec: nextTrim });
        }
      };

      const onWinUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const pending = pendingRef.current;
        const wasPending = pending != null;
        if (pending) {
          window.clearTimeout(pending.timer);
          pendingRef.current = null;
        }
        const wasScrubbing = scrubRef.current != null;
        if (wasScrubbing) {
          scrubRef.current = null;
          setScrubbing(false);
        }
        detachSession();
        // Quick tap (timer was still pending OR canceled by slop, no
        // scrub started) → open the drawer for editing. This makes
        // the clip act like a click-to-edit target the same way the
        // image stripe does. Skip if the press graduated into a scrub.
        if (wasPending && !wasScrubbing) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (Math.hypot(dx, dy) <= LONG_PRESS_MOVE_SLOP_PX) {
            onLabelClickRef.current();
          }
        }
      };

      window.addEventListener('pointermove', onWinMove, true);
      window.addEventListener('pointerup', onWinUp, true);
      window.addEventListener('pointercancel', onWinUp, true);
      sessionRef.current = { pointerId, onMove: onWinMove, onUp: onWinUp };
    },
    [detachSession, onChange, pxPerSec],
  );

  // ── Trim handles ───────────────────────────────────────────
  const onHandlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, kind: 'left' | 'right') => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      detachSession();

      const pointerId = e.pointerId;
      const startX = e.clientX;
      trimRef.current =
        kind === 'left'
          ? {
              kind: 'left',
              pointerId,
              startX,
              anchor0: bgRef.current.anchorVideoTime,
              trim0: bgRef.current.trimStartSec,
            }
          : {
              kind: 'right',
              pointerId,
              startX,
              end0: bgRef.current.endVideoTime,
            };

      const onWinMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const tr = trimRef.current;
        if (!tr) return;
        ev.preventDefault();
        const dx = ev.clientX - tr.startX;
        const dt = dx / pxPerSec;
        if (tr.kind === 'left') {
          const minAnchor = 0;
          const maxAnchor = bgRef.current.endVideoTime - MIN_CLIP_SEC;
          const nextAnchor = Math.min(
            maxAnchor,
            Math.max(minAnchor, tr.anchor0 + dt),
          );
          const trimDelta = nextAnchor - tr.anchor0;
          const nextTrim = Math.max(0, tr.trim0 + trimDelta);
          onChange({
            ...bgRef.current,
            anchorVideoTime: nextAnchor,
            trimStartSec: nextTrim,
          });
        } else {
          const minEnd = bgRef.current.anchorVideoTime + MIN_CLIP_SEC;
          const maxEnd = duration;
          const nextEnd = Math.min(maxEnd, Math.max(minEnd, tr.end0 + dt));
          onChange({ ...bgRef.current, endVideoTime: nextEnd });
        }
      };

      const onWinUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        trimRef.current = null;
        detachSession();
      };

      window.addEventListener('pointermove', onWinMove, true);
      window.addEventListener('pointerup', onWinUp, true);
      window.addEventListener('pointercancel', onWinUp, true);
      sessionRef.current = { pointerId, onMove: onWinMove, onUp: onWinUp };
    },
    [detachSession, duration, onChange, pxPerSec],
  );

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        window.clearTimeout(pendingRef.current.timer);
        pendingRef.current = null;
      }
      detachSession();
    };
  }, [detachSession]);

  return (
    <>
      {/* Source-file ghost ruler — dashed bar showing the full source
       *  duration on the same pxPerSec scale as the timeline. The
       *  shaded sub-region inside marks the slice currently mapped
       *  to the on-timeline clip; that shaded region moves as the
       *  marketer scrubs trim, telling them where in the source they
       *  are. While long-press scrubbing is active, the ghost
       *  expands beyond the on-timeline clip to show full context;
       *  otherwise it's clipped to the clip's right edge. */}
      {showGhost && ghostDisplayWidthPx > 0.5 ? (
        <div
          aria-hidden
          title={
            expandGhostForDrag
              ? 'Source file (full length while scrubbing) — shaded region is what plays through the bronze clip'
              : 'Source file — shaded region is what plays through the bronze clip'
          }
          style={{
            position: 'absolute',
            left: ghostLeftPx,
            width: ghostDisplayWidthPx,
            top: 5,
            height: LANE_H - 10,
            borderRadius: 'var(--r-md)',
            boxSizing: 'border-box',
            border: expandGhostForDrag
              ? `1px solid rgba(184,114,83,0.72)`
              : `1px solid rgba(184,114,83,0.45)`,
            borderStyle: expandGhostForDrag ? 'solid' : 'dashed',
            background: expandGhostForDrag
              ? 'linear-gradient(180deg, rgba(36,24,18,0.96) 0%, rgba(20,14,10,0.98) 100%)'
              : 'linear-gradient(180deg, rgba(28,18,14,0.88) 0%, rgba(14,10,8,0.92) 100%)',
            boxShadow: expandGhostForDrag
              ? '0 0 0 1px rgba(0,0,0,0.5), 0 0 22px rgba(184,114,83,0.18), inset 0 1px 0 rgba(184,114,83,0.12)'
              : '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(184,114,83,0.08)',
            pointerEvents: 'none',
            zIndex: expandGhostForDrag ? 4 : 1,
            transition:
              'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
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
            {/* Shaded slice = current trim window inside the source */}
            {sourceDurationSec ? (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: `${(background.trimStartSec / sourceDurationSec) * 100}%`,
                  width: `${(Math.min(clipLenSec, Math.max(0, sourceDurationSec - background.trimStartSec)) / sourceDurationSec) * 100}%`,
                  top: 0,
                  bottom: 13,
                  boxSizing: 'border-box',
                  borderLeft: '1px solid rgba(184,114,83,0.55)',
                  borderRight: '1px solid rgba(184,114,83,0.55)',
                  background: expandGhostForDrag
                    ? 'linear-gradient(180deg, rgba(184,114,83,0.34) 0%, rgba(184,114,83,0.14) 100%)'
                    : 'linear-gradient(180deg, rgba(184,114,83,0.22) 0%, rgba(184,114,83,0.08) 100%)',
                  pointerEvents: 'none',
                  transition: 'background 0.12s ease',
                }}
              />
            ) : null}
            {/* Tick band */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 13,
                background:
                  'linear-gradient(180deg, rgba(6,6,8,0.15) 0%, rgba(4,4,6,0.72) 100%)',
                borderTop: '1px solid rgba(184,114,83,0.38)',
                boxSizing: 'border-box',
              }}
            >
              {sourceDurationSec
                ? ghostMarks.map(({ sec, kind }) => {
                    const fileDur = sourceDurationSec;
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
                        key={`bg-mk-${sec.toFixed(3)}-${kind}`}
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
                              color: 'rgba(248,224,200,0.98)',
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
                                ? 'rgba(248,224,200,0.95)'
                                : kind === 'mid'
                                  ? 'rgba(184,114,83,0.78)'
                                  : 'rgba(184,114,83,0.45)',
                            boxShadow:
                              kind === 'major'
                                ? '0 0 6px rgba(184,114,83,0.35)'
                                : 'none',
                          }}
                        />
                      </div>
                    );
                  })
                : null}
            </div>
          </div>
        </div>
      ) : null}
      <div
        data-timeline-no-seek
        data-bg-video-clip
        onPointerDown={onBodyPointerDown}
        style={{
          position: 'absolute',
          left,
          width,
          top: 5,
          height: LANE_H - 10,
          borderRadius: 'var(--r-md)',
          boxSizing: 'border-box',
          border: `2px solid ${BG_BRONZE}`,
          boxShadow: scrubbing
            ? '0 0 0 1px rgba(0,0,0,0.5), 0 0 22px rgba(184,114,83,0.45), 0 6px 18px rgba(0,0,0,0.45)'
            : '0 0 0 1px rgba(0,0,0,0.5), 0 6px 18px rgba(0,0,0,0.45)',
          background: scrubbing
            ? `linear-gradient(180deg, ${BG_BRONZE_DIM} 0%, rgba(120,75,55,0.18) 100%)`
            : `linear-gradient(180deg, rgba(184,114,83,0.22) 0%, rgba(120,75,55,0.12) 100%)`,
          touchAction: 'none',
          zIndex: 2,
          // `grab` / `grabbing` matches the music lane so muscle memory
          // transfers. While scrubbing (long-press fired), we keep
          // `grabbing` rather than switching to `col-resize` so the
          // marketer doesn't get a cursor flicker mid-gesture.
          cursor: scrubbing ? 'grabbing' : 'grab',
          transition: 'box-shadow 0.15s ease',
        }}
      >
      <Handle
        side="left"
        onPointerDown={(e) => onHandlePointerDown(e, 'left')}
      />
      <Handle
        side="right"
        onPointerDown={(e) => onHandlePointerDown(e, 'right')}
      />
      {/* Label sits inside the clip body. Pointer-events:none so
       *  presses always pass through to the parent body's
       *  pointerdown handler (which sets up the long-press timer).
       *  Quick "click to edit drawer" is delegated to the body's
       *  pointerup-without-scrub path. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: 'var(--sans)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Background video · {(background.endVideoTime - background.anchorVideoTime).toFixed(1)}s
      </div>
      </div>
    </>
  );
}

function Handle({
  side,
  onPointerDown,
}: {
  side: 'left' | 'right';
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    [side]: -14,
    top: -8,
    width: 28,
    height: LANE_H + 4,
    cursor: 'ew-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    touchAction: 'none',
  };
  return (
    <div
      data-bg-handle
      onPointerDown={onPointerDown}
      title={side === 'left' ? 'Trim from start' : 'Trim from end'}
      style={wrapperStyle}
    >
      <div
        style={{
          width: 6,
          height: LANE_H - 10,
          borderRadius: 3,
          background: BG_BRONZE,
          boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

