// Safe-zone visualiser — camera-viewfinder / QR-scanner pattern.
//
// Instead of drawing a border around the safe zone, we dim the UNSAFE
// regions (top / bottom / left / right strips) so the inside stays at
// full opacity and the outside fades. The marketer immediately sees
// "content I place here is in the clear, content out there gets clipped"
// — same UX vocabulary every phone camera / scanner uses.
//
// Rendered as a sibling of the Scene inside <Stage>, so it's in stage
// coordinate space (1080 × 1920) and scales with the stage transform.
// Editor-only; not rendered in template previews or the gallery
// (`showSafeZones` toggle gates the render in Editor.tsx).
//
// Export safety: every overlay node carries `data-export-ignore="true"`.
// The MP4 pipeline in `lib/export.ts` filters nodes with this attribute
// out of the rasterized frames, so even if the marketer forgets to
// toggle safe zones off before exporting, the dim strips and the pill
// physically cannot land in the output video. Belt-and-braces — the
// in-editor toggle is still the primary UX, this is the safety net.

import type { AspectRatio } from '../templates/types';
import { useSafeZone } from './safeZones';
import { isRTL, useLocale } from './locale';

type Props = {
  aspect: Pick<AspectRatio, 'width' | 'height'>;
};

/** How much the outside gets dimmed. 0 = no dim (useless); 1 = pitch black.
 *  0.58 is the sweet spot: clearly "off-limits" but the content behind is
 *  still visible enough to reposition by eye. */
const DIM_ALPHA = 0.58;

/** Thin accent edge inside the safe-zone boundary. Not pulsing — the
 *  contrast between dim and clear is the primary signal now. */
const EDGE_COLOR = 'rgba(196, 147, 115, 0.7)';

export function SafeZoneOverlay({ aspect }: Props) {
  const { key, base, baseW, baseH } = useSafeZone(aspect);
  const rtl = isRTL(useLocale());

  // Unknown aspect → zero zone → nothing useful to show.
  if (!key) return null;

  // If every margin is zero (e.g. 9:16-no-chrome preset), the whole
  // canvas is the safe zone — nothing to dim, nothing to frame.
  if (base.top === 0 && base.bottom === 0 && base.left === 0 && base.right === 0) {
    return null;
  }

  const safeLeft = base.left;
  const safeTop = base.top;
  const safeRight = baseW - base.right;
  const safeBottom = baseH - base.bottom;
  const safeWidth = safeRight - safeLeft;
  const safeHeight = safeBottom - safeTop;

  const dimBg = `rgba(0,0,0,${DIM_ALPHA})`;
  const common = {
    position: 'absolute' as const,
    background: dimBg,
    pointerEvents: 'none' as const,
    zIndex: 1000,
  };

  // Shared flag that the export pipeline's `html-to-image` filter looks
  // for. Attaching it to every node inside the overlay — not just a
  // parent wrapper — keeps us safe even if someone later flattens the
  // structure or moves a node out.
  const exportIgnore = { 'data-export-ignore': 'true' } as const;

  return (
    <>
      {/* Four dim strips covering the unsafe regions. Corners are
       *  covered by the top + bottom strips (which span full-width)
       *  so the left + right strips only need to fill the middle band. */}
      {/* Top strip (full width, 0 → safeTop) */}
      {base.top > 0 && (
        <div
          aria-hidden
          {...exportIgnore}
          style={{
            ...common,
            left: 0,
            top: 0,
            width: baseW,
            height: safeTop,
          }}
        />
      )}
      {/* Bottom strip (full width, safeBottom → baseH) */}
      {base.bottom > 0 && (
        <div
          aria-hidden
          {...exportIgnore}
          style={{
            ...common,
            left: 0,
            top: safeBottom,
            width: baseW,
            height: baseH - safeBottom,
          }}
        />
      )}
      {/* Left strip (just the middle band, between the top + bottom) */}
      {base.left > 0 && (
        <div
          aria-hidden
          {...exportIgnore}
          style={{
            ...common,
            left: 0,
            top: safeTop,
            width: safeLeft,
            height: safeHeight,
          }}
        />
      )}
      {/* Right strip (just the middle band, between the top + bottom) */}
      {base.right > 0 && (
        <div
          aria-hidden
          {...exportIgnore}
          style={{
            ...common,
            left: safeRight,
            top: safeTop,
            width: baseW - safeRight,
            height: safeHeight,
          }}
        />
      )}

      {/* Precise 1px copper edge along the safe-zone boundary.
       *  Not dashed, not pulsing — the dim-to-clear transition already
       *  creates a strong boundary; this adds just a hairline of colour
       *  to reinforce where the zone is, especially at high-contrast
       *  areas where the dim alone might not read cleanly. */}
      <div
        aria-hidden
        {...exportIgnore}
        style={{
          position: 'absolute',
          left: safeLeft,
          top: safeTop,
          width: safeWidth,
          height: safeHeight,
          border: `1px solid ${EDGE_COLOR}`,
          boxSizing: 'border-box',
          pointerEvents: 'none',
          zIndex: 1001,
        }}
      />

      {/* Label pill — anchored to the inside-top corner that matches the
       *  current text direction. LTR → top-left. RTL (Arabic) → top-right,
       *  mirroring the natural reading flow so the pill doesn't fight the
       *  scene's content direction. */}
      <div
        aria-hidden
        {...exportIgnore}
        style={{
          position: 'absolute',
          top: safeTop + 12,
          left: rtl ? undefined : safeLeft + 12,
          right: rtl ? baseW - safeRight + 12 : undefined,
          padding: '6px 12px',
          background: 'rgba(196, 147, 115, 0.95)',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          borderRadius: 4,
          pointerEvents: 'none',
          zIndex: 1002,
          direction: 'ltr', // keep the "Safe · 9:16" tech label LTR even in RTL scenes
        }}
      >
        Safe · {key}
      </div>
    </>
  );
}
