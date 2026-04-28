// Shared helpers for media URLs (image or video) used by template
// background fields. The runtime auto-detects video vs image so a single
// "Custom backdrop" field can accept either kind of asset.
//
// Storage budget: project state lives in localStorage (~5 MB ceiling).
// Data URLs inflate by ~33%. We cap raw video uploads at 3 MB so a single
// backdrop video stays under ~4 MB encoded, leaving room for the rest of
// the project. Marketers wanting longer/heavier loops should host the
// video on a CDN and paste the URL — the runtime accepts http(s) URLs as
// readily as data URLs.

/** Cap for inline video uploads (raw file bytes). 3 MB → ~4 MB after
 *  base64 encoding, which keeps the project's localStorage payload under
 *  the typical 5 MB browser limit. */
export const MAX_VIDEO_FILE_BYTES = 3 * 1024 * 1024;

/** Mime types we accept in the dropzone when a field opts in via
 *  `acceptVideo: true`. Aligned with what HTML <video> can decode in
 *  evergreen browsers. */
export const ACCEPTED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-m4v',
  'video/ogg',
];

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|ogg)$/i;

/** Heuristic: does this URL refer to a video asset?
 *  - data:video/* prefix (uploaded videos)
 *  - common video file extension (CDN URLs, query string tolerated)
 *  Pure function, no side effects. */
export function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  // Strip query string + hash before extension check
  const path = url.split('?')[0].split('#')[0];
  return VIDEO_EXT_RE.test(path);
}

/** True when the File is a video by MIME or extension. */
export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  return VIDEO_EXT_RE.test(file.name);
}

/** Read an arbitrary file as a base64 data URL. Used for video uploads
 *  (no resize step — videos are stored verbatim). */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file as data URL'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

/** Format a byte count for the "video too large" error message. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
