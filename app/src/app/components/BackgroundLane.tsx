// Project-background timeline lane — visual + drag/trim parity with
// the music lane. Renders directly above the music row in
// EditorTimelineDock; always present as long as the dock has space
// for it.
//
// Three states:
//   - No background → "Add background" button (opens BackgroundDrawer).
//   - Image background → flat stripe spanning the full duration
//     (no drag — image is static).
//   - Video background → bordered clip from `anchor` to `end` on the
//     project timeline. Same gestures as the music lane:
//       * Body drag (quick) → moves both endpoints (preserves length).
//       * Body drag (long-press, ≥320ms held still) → scrubs the
//         visible source frame by adjusting `trimStartSec` only;
//         anchor/end stay put. Mirrors music's long-press scrub.
//       * Left handle → drags `anchor` AND shifts `trimStartSec`
//         by the same delta (keeps the visible source frame in
//         place, exactly like music's left trim handle).
//       * Right handle → drags `endVideoTime` only.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import type { ProjectBackground } from '../../store/types';

const LANE_H = 36;
/** Bronze accent — distinct from music's gold so the marketer can
 *  tell the lanes apart at a glance. */
const BG_BRONZE = '#B87253';
const BG_BRONZE_DIM = 'rgba(184, 114, 83, 0.28)';
/** Minimum clip width on the timeline (in seconds). */
const MIN_CLIP_SEC = 0.25;
/** How long the marketer must hold the body still before a body drag
 *  becomes a long-press scrub instead of a slide. Matches the music
 *  lane's threshold. */
const LONG_PRESS_MS = 320;
/** Movement (px) past which a press counts as a slide rather than
 *  a long-press scrub. */
const LONG_PRESS_SLOP_PX = 4;

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
  /** Called when the marketer clicks the existing clip's gear / label
   *  area to re-open the drawer. */
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

// ── Video branch — draggable clip with trim handles ─────────────

type VideoBg = Extract<ProjectBackground, { kind: 'video' }>;

type DragState =
  | null
  | {
      mode: 'body';
      startX: number;
      anchor0: number;
      end0: number;
      /** Source-time offset at press, captured for long-press scrub. */
      trim0: number;
    }
  | { mode: 'scrub'; startX: number; trim0: number }
  | { mode: 'trimL'; startX: number; anchor0: number; trim0: number }
  | { mode: 'trimR'; startX: number; end0: number };

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
  const [dragging, setDragging] = useState<DragState>(null);
  const dragRef = useRef<DragState>(null);
  dragRef.current = dragging;
  const longPressTimerRef = useRef<number | null>(null);

  const left = background.anchorVideoTime * pxPerSec;
  const width = Math.max(
    MIN_CLIP_SEC * pxPerSec,
    (background.endVideoTime - background.anchorVideoTime) * pxPerSec,
  );

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current != null) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const beginDrag = (e: PointerEvent<HTMLDivElement>, state: DragState) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(state);
  };

  const onBodyPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const anchor0 = background.anchorVideoTime;
    const end0 = background.endVideoTime;
    const trim0 = background.trimStartSec;
    beginDrag(e, { mode: 'body', startX, anchor0, end0, trim0 });

    // Schedule the long-press trigger. If the marketer hasn't moved
    // past LONG_PRESS_SLOP_PX before LONG_PRESS_MS elapses, flip the
    // drag mode to 'scrub' (adjust trimStartSec only).
    if (longPressTimerRef.current != null) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      const cur = dragRef.current;
      if (cur && cur.mode === 'body') {
        setDragging({ mode: 'scrub', startX, trim0 });
      }
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const cur = dragRef.current;
    if (!cur) return;
    const dx = e.clientX - cur.startX;
    const dt = dx / pxPerSec;

    if (cur.mode === 'body') {
      // If the marketer has moved past the slop while the long-press
      // timer is still pending, this is a slide — cancel the timer.
      if (Math.abs(dx) > LONG_PRESS_SLOP_PX && longPressTimerRef.current != null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      const len = cur.end0 - cur.anchor0;
      const maxAnchor = Math.max(0, duration - len);
      const nextAnchor = Math.min(maxAnchor, Math.max(0, cur.anchor0 + dt));
      const nextEnd = nextAnchor + len;
      onChange({
        ...background,
        anchorVideoTime: nextAnchor,
        endVideoTime: nextEnd,
      });
      return;
    }

    if (cur.mode === 'scrub') {
      // Long-press scrub: anchor + end stay put; only trimStartSec
      // moves. Positive drag (right) increases trim, scrubbing forward
      // through the source. Lower bound is 0 (can't go below source
      // start); upper bound is unbounded — the marketer can scrub
      // past the end of the clip's natural source span.
      const nextTrim = Math.max(0, cur.trim0 + dt);
      onChange({
        ...background,
        trimStartSec: nextTrim,
      });
      return;
    }

    if (cur.mode === 'trimL') {
      const minAnchor = 0;
      const maxAnchor = background.endVideoTime - MIN_CLIP_SEC;
      const nextAnchor = Math.min(maxAnchor, Math.max(minAnchor, cur.anchor0 + dt));
      const trimDelta = nextAnchor - cur.anchor0;
      const nextTrim = Math.max(0, cur.trim0 + trimDelta);
      onChange({
        ...background,
        anchorVideoTime: nextAnchor,
        trimStartSec: nextTrim,
      });
      return;
    }

    if (cur.mode === 'trimR') {
      const minEnd = background.anchorVideoTime + MIN_CLIP_SEC;
      const maxEnd = duration;
      const nextEnd = Math.min(maxEnd, Math.max(minEnd, cur.end0 + dt));
      onChange({
        ...background,
        endVideoTime: nextEnd,
      });
      return;
    }
  };

  const endDrag = () => {
    setDragging(null);
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const cursor =
    dragging?.mode === 'body'
      ? 'grabbing'
      : dragging?.mode === 'scrub'
        ? 'col-resize'
        : 'grab';

  return (
    <div
      data-timeline-no-seek
      data-bg-video-clip
      onPointerDown={onBodyPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        position: 'absolute',
        left,
        width,
        top: 5,
        height: LANE_H - 10,
        borderRadius: 'var(--r-md)',
        boxSizing: 'border-box',
        border: `2px solid ${BG_BRONZE}`,
        boxShadow:
          dragging?.mode === 'scrub'
            ? '0 0 0 1px rgba(0,0,0,0.5), 0 0 22px rgba(184,114,83,0.45), 0 6px 18px rgba(0,0,0,0.45)'
            : '0 0 0 1px rgba(0,0,0,0.5), 0 6px 18px rgba(0,0,0,0.45)',
        background: dragging
          ? `linear-gradient(180deg, ${BG_BRONZE_DIM} 0%, rgba(120,75,55,0.18) 100%)`
          : `linear-gradient(180deg, rgba(184,114,83,0.22) 0%, rgba(120,75,55,0.12) 100%)`,
        touchAction: 'none',
        zIndex: 2,
        cursor,
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <Handle
        side="left"
        onPointerDown={(e) =>
          beginDrag(e, {
            mode: 'trimL',
            startX: e.clientX,
            anchor0: background.anchorVideoTime,
            trim0: background.trimStartSec,
          })
        }
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <Handle
        side="right"
        onPointerDown={(e) =>
          beginDrag(e, {
            mode: 'trimR',
            startX: e.clientX,
            end0: background.endVideoTime,
          })
        }
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <button
        type="button"
        data-timeline-no-seek
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
          // Drag still works because the click only fires on a clean
          // press without movement. Pointer move events bubble to
          // the parent's onPointerMove via React's event propagation.
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
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  side: 'left' | 'right';
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLDivElement>) => void;
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
