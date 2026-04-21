// Safe-zone visualiser — renders a dashed copper rectangle inside the
// Stage showing the resolved keep-clear zone for the current aspect.
// Rendered as a sibling of the Scene inside <Stage>, so it's in stage
// coordinate space (1080×1920) and scales with the stage transform.
//
// Phase 2: editor-only (toggled from the top chrome). Not rendered in
// template previews, export output, or the gallery.
//
// The rectangle has a subtle pulse animation so the guide is visible
// but doesn't compete with the scene content when left on for a while.

import type { AspectRatio } from '../templates/types';
import { useSafeZone } from './safeZones';

type Props = {
  aspect: Pick<AspectRatio, 'width' | 'height'>;
};

export function SafeZoneOverlay({ aspect }: Props) {
  const { key, base, baseW, baseH } = useSafeZone(aspect);

  // Unknown aspect → zero zone → nothing useful to show.
  if (!key) return null;

  // If every margin is zero (e.g. 9:16-no-chrome preset), don't draw —
  // a full-bleed rectangle isn't meaningful feedback.
  if (base.top === 0 && base.bottom === 0 && base.left === 0 && base.right === 0) {
    return null;
  }

  const left = base.left;
  const top = base.top;
  const width = baseW - base.left - base.right;
  const height = baseH - base.top - base.bottom;

  return (
    <>
      <style>{`
        @keyframes safeZonePulse {
          0%, 100% { opacity: 0.75; }
          50%      { opacity: 0.45; }
        }
      `}</style>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          pointerEvents: 'none',
          border: '2px dashed rgba(196, 147, 115, 0.95)',
          zIndex: 1000,
          animation: 'safeZonePulse 2.4s ease-in-out infinite',
          boxSizing: 'border-box',
        }}
      />
      {/* Corner ticks — four 24px L-shaped marks at each corner so the
          zone boundary is readable even when the dashed line is behind
          content. Rendered in the same layer, same copper. */}
      {[
        { top: top - 1, left: left - 1, borderTop: '3px solid', borderLeft: '3px solid' },
        { top: top - 1, left: left + width - 23, borderTop: '3px solid', borderRight: '3px solid' },
        { top: top + height - 23, left: left - 1, borderBottom: '3px solid', borderLeft: '3px solid' },
        { top: top + height - 23, left: left + width - 23, borderBottom: '3px solid', borderRight: '3px solid' },
      ].map((s, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            width: 24,
            height: 24,
            borderColor: 'rgba(196, 147, 115, 0.95)',
            pointerEvents: 'none',
            zIndex: 1000,
            ...s,
          }}
        />
      ))}
      {/* Label — small pill top-left of the zone with the active key so
          Faizan can tell which aspect's zone he's seeing at a glance. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: top + 12,
          left: left + 12,
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
          zIndex: 1001,
        }}
      >
        Safe · {key}
      </div>
    </>
  );
}
