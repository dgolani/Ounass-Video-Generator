import type { SceneOutline } from '../templates/types';

/**
 * Which `meta.scenes[].id` is active at `timeLocal` (0…duration), using the
 * same segment boundaries as the timeline scene labels (segment i runs from
 * scene[i].start (or 0) to scene[i+1].start or duration).
 */
export function activeSceneIdAtLocalTime(
  scenes: SceneOutline[],
  timeLocal: number,
  duration: number,
  timeScale: number,
): string | null {
  const d = Math.max(0.001, duration);
  const t = Math.min(d, Math.max(0, timeLocal));
  if (!scenes.length) return null;

  const scaled = scenes
    .map((s) => ({
      ...s,
      start: Math.min(d, Math.max(0, s.start * timeScale)),
    }))
    .sort((a, b) => a.start - b.start);

  for (let i = 0; i < scaled.length; i++) {
    const segStart = i === 0 ? 0 : scaled[i].start;
    const segEnd = i + 1 < scaled.length ? scaled[i + 1].start : d;
    const last = i === scaled.length - 1;
    if (last) {
      if (t + 1e-4 >= segStart && t <= d + 1e-4) return scaled[i].id;
    } else if (t + 1e-4 >= segStart && t < segEnd - 1e-4) {
      return scaled[i].id;
    }
  }
  return scaled[scaled.length - 1]?.id ?? null;
}
