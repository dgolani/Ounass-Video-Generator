/** Curated beds for export (served from `public/audio/`). Add rows as you drop in licensed MP3s. */

export type MusicTrack = {
  id: string;
  label: string;
  /** Site-root path, e.g. `/audio/foo.mp3` */
  src: string;
  /** Shown under the picker in Export — keep attribution required by the license */
  attribution?: string;
};

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'placeholder-bed',
    label: 'Luxury instrumental — demo bed',
    src: '/audio/placeholder-bed.mp3',
  },
];

export function getMusicTrack(id: string | null): MusicTrack | null {
  if (!id) return null;
  return MUSIC_TRACKS.find((t) => t.id === id) ?? null;
}

export function resolveAudioUrl(src: string): string {
  if (
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('http://') ||
    src.startsWith('https://')
  ) {
    return src;
  }
  if (typeof window !== 'undefined') {
    return new URL(src, window.location.origin).href;
  }
  return src;
}
