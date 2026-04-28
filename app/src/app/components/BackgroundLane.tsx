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
      ) : (
        <VideoClip
          background={background}
          duration={duration}
          videoClipStartSec={videoClipStartSec}
          pxPerSec={pxPerSec}
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
  onChange,
  onLabelClick,
}: {
  background: VideoBg;
  duration: number;
  videoClipStartSec: number;
  pxPerSec: number;
  onChange: (next: ProjectBackground) => void;
  onLabelClick: () => void;
}) {
  void videoClipStartSec; // reserved — could constrain anchor to ≥ this in future

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

  const left = background.anchorVideoTime * pxPerSec;
  const width = Math.max(
    MIN_CLIP_SEC * pxPerSec,
    (background.endVideoTime - background.anchorVideoTime) * pxPerSec,
  );

  const detachSession = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    window.removeEventListener('pointermove', s.onMove, true);
    window.removeEventListener('pointerup', s.onUp, true);
    window.removeEventListener('pointercancel', s.onUp, true);
    sessionRef.current = null;
  }, []);

  // ── Body pointerdown — long-press setup ─────────────────────
  const onBodyPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      // Don't intercept presses on the trim handles or the label
      // button — they have their own handlers.
      const t = e.target as HTMLElement;
      if (t.closest('[data-bg-handle]')) return;
      if (t.closest('[data-bg-label]')) return;
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
        if (pending) {
          window.clearTimeout(pending.timer);
          pendingRef.current = null;
        }
        if (scrubRef.current) {
          scrubRef.current = null;
          setScrubbing(false);
        }
        detachSession();
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
        cursor: scrubbing ? 'col-resize' : 'pointer',
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
      <button
        type="button"
        data-timeline-no-seek
        data-bg-label
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLabelClick();
        }}
        title="Edit background"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
          background: 'transparent',
          border: 0,
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          // Long-press scrub bypasses this button via the body's
          // pointerdown handler (which short-circuits if the press
          // hits a `[data-bg-label]` element). The only way to reach
          // onClick is a quick tap with no movement — that opens the
          // drawer for editing.
          pointerEvents: scrubbing ? 'none' : 'auto',
        }}
      >
        Background video · {(background.endVideoTime - background.anchorVideoTime).toFixed(1)}s
      </button>
    </div>
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

