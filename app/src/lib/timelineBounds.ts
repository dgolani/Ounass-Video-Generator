/** Ruler / track width cap (seconds) — matches timeline UI extent. */
export const MAX_TIMELINE_EXTENT_SEC = 20;

/** Right edge of the editable timeline in seconds (global ruler space). */
export function timelineContentUpperSec(args: {
  duration: number;
  videoClipStartSec: number;
  musicEndVideoTime: number;
}): number {
  const d = args.duration;
  const vs = args.videoClipStartSec;
  const end = args.musicEndVideoTime;
  return Math.max(MAX_TIMELINE_EXTENT_SEC, end, vs + Math.max(d, 0.001));
}
