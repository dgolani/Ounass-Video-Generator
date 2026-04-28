// Project-background timeline lane — visual + drag/trim parity with
// the music lane. Renders directly above the music row in
// EditorTimelineDock when `project.background` is set.
//
// Behaviour:
//   - Image bg → flat stripe spanning the full duration. No drag
//     handles (image is static; anchor/end/trim don't apply).
//   - Video bg → bordered clip from `anchor` to `end` on the project
//     timeline. Body drag moves both endpoints (preserves length).
//     Left handle drags `anchor` (and shifts `trimStartSec` so the
//     visible source frame stays put). Right handle drags `end`
//     (independent of trim).
//
// Pointer math mirrors the music lane's onMusicClipBodyPointerDown
// + onClipPointerDown 'trimL'/'trimR' handlers; cloned here as a
// self-contained component so the 2500-line EditorTimelineDock
// doesn't grow further.

import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { ProjectBackground } from '../../store/types';

const LANE_H = 36;
/** Bronze accent — distinct from music's gold so the marketer can
 *  tell the lanes apart at a glance. */
const BG_BRONZE = '#B87253';
const BG_BRONZE_DIM = 'rgba(184, 114, 83, 0.28)';
/** Minimum clip width on the timeline (in seconds). */
const MIN_CLIP_SEC = 0.25;

type Props = {
  background: ProjectBackground | undefined;
  duration: number;
  /** Pixels per second on the timeline (matches the music lane's
   *  pxPerSec so the clip aligns vertically). */
  pxPerSec: number;
  /** Total lane width in px. Image-kind clips span this width. */
  laneWidthPx: number;
  onChange: (next: ProjectBackground) => void;
};

export function BackgroundLane({
  background,
  duration,
  pxPerSec,
  laneWidthPx,
  onChange,
}: Props) {
  if (!background) return null;
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
      {background.kind === 'image' ? (
        <ImageStripe />
      ) : (
        <VideoClip
          background={background}
          duration={duration}
          pxPerSec={pxPerSec}
          onChange={onChange}
        />
      )}
    </div>
  );
}

// ── Image branch — non-draggable stripe ─────────────────────────

function ImageStripe() {
  return (
    <div
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
        pointerEvents: 'none',
      }}
    >
      Background image
    </div>
  );
}

// ── Video branch — draggable clip with trim handles ─────────────

type VideoBg = Extract<ProjectBackground, { kind: 'video' }>;

type DragState =
  | null
  | { mode: 'body'; startX: number; anchor0: number; end0: number }
  | { mode: 'trimL'; startX: number; anchor0: number; trim0: number }
  | { mode: 'trimR'; startX: number; end0: number };

function VideoClip({
  background,
  duration,
  pxPerSec,
  onChange,
}: {
  background: VideoBg;
  duration: number;
  pxPerSec: number;
  onChange: (next: ProjectBackground) => void;
}) {
  const [dragging, setDragging] = useState<DragState>(null);
  const dragRef = useRef<DragState>(null);
  dragRef.current = dragging;

  const left = background.anchorVideoTime * pxPerSec;
  const width = Math.max(
    MIN_CLIP_SEC * pxPerSec,
    (background.endVideoTime - background.anchorVideoTime) * pxPerSec,
  );

  const beginDrag = (e: PointerEvent<HTMLDivElement>, state: DragState) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(state);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const cur = dragRef.current;
    if (!cur) return;
    const dx = e.clientX - cur.startX;
    const dt = dx / pxPerSec;

    if (cur.mode === 'body') {
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

    if (cur.mode === 'trimL') {
      // Dragging the left handle moves anchor on the timeline. To
      // keep the visible source frame in place, trimStartSec moves
      // by the same delta. Bound by [0, end - MIN_CLIP_SEC] on the
      // timeline and [0, +∞) for trim.
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
  };

  const cursor = dragging?.mode === 'body' ? 'grabbing' : 'grab';

  return (
    <div
      data-timeline-no-seek
      data-bg-video-clip
      onPointerDown={(e) =>
        beginDrag(e, {
          mode: 'body',
          startX: e.clientX,
          anchor0: background.anchorVideoTime,
          end0: background.endVideoTime,
        })
      }
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
        boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 6px 18px rgba(0,0,0,0.45)',
        background: dragging
          ? `linear-gradient(180deg, ${BG_BRONZE_DIM} 0%, rgba(120,75,55,0.18) 100%)`
          : `linear-gradient(180deg, rgba(184,114,83,0.22) 0%, rgba(120,75,55,0.12) 100%)`,
        touchAction: 'none',
        zIndex: 2,
        cursor,
      }}
    >
      {/* Left trim handle */}
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

      {/* Right trim handle */}
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

      {/* Centered label */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Background video · {(background.endVideoTime - background.anchorVideoTime).toFixed(1)}s
        </span>
      </div>
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
