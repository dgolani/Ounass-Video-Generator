// Shared helpers for media URLs (image or video) used by template
// background fields. Templates render the URL through `MediaBackground`,
// which auto-detects video vs image and chooses the right element.
//
// Storage policy: videos are NOT uploaded into the project. They are
// hosted externally (CDN, S3, the marketer's video host) and the URL is
// pasted into the editor. This keeps the project under the ~5 MB
// localStorage ceiling regardless of clip length, and the runtime can
// stream the video on demand. Image uploads remain the same as before.

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|ogg)$/i;

/** Known video-host URL patterns where the path itself doesn't carry a
 *  file extension. Pexels is the most common — its `/download/video/<id>/`
 *  endpoint 302-redirects to an mp4 but the URL the marketer pastes has
 *  no extension, so the extension regex misses it. Add new hosts here as
 *  they come up; this is intentionally a small allow-list rather than
 *  any open content-type sniff. */
const VIDEO_HOST_RE = /(?:pexels\.com\/(?:download\/)?video\/|coverr\.co\/|cloudinary\.com\/.*\/video\/|cdn\.cloudflare\.com\/.*\.m3u8|videos?\.cdn\.)/i;

/** Heuristic: does this URL refer to a video asset?
 *  - data:video/* prefix (legacy uploaded videos, kept for backwards
 *    compatibility with any project saved while the upload path
 *    briefly existed)
 *  - common video file extension on the path (CDN URLs, query string
 *    + hash tolerated)
 *  - known video-host URL pattern (Pexels download endpoint, etc.)
 *    where the path lacks an explicit extension
 *  Pure function, no side effects. */
export function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  // Strip query string + hash before pattern checks.
  const path = url.split('?')[0].split('#')[0];
  if (VIDEO_EXT_RE.test(path)) return true;
  if (VIDEO_HOST_RE.test(path)) return true;
  return false;
}

/** Does this video URL survive the export pipeline (canvas needs CORS
 *  to read pixels)?
 *
 *   'direct' — host serves Access-Control-Allow-Origin → exports cleanly
 *   'proxy'  — host doesn't, but our `/api/media-proxy` allow-lists
 *              this host → exports cleanly via the same-origin proxy
 *   'skip'   — neither path works → export will fall back to skipping
 *              the video (black backdrop in the rendered MP4)
 *   'na'     — URL isn't a video (image / data URL / blank), no probe
 *              needed
 *
 *  Mirrors the runtime decision tree in `export.ts:prepareVideosForExport`.
 *  Pure HTTP probes — uses HEAD so no body is downloaded.
 */
export type VideoExportability = 'direct' | 'proxy' | 'skip' | 'na';

const exportProbeCache = new Map<string, VideoExportability>();

export async function checkVideoExportable(
  url: string | undefined | null,
  options: { signal?: AbortSignal } = {},
): Promise<VideoExportability> {
  if (!url) return 'na';
  if (url.startsWith('data:') || url.startsWith('blob:')) return 'direct';
  if (!/^https?:\/\//i.test(url)) return 'na';
  if (!isVideoUrl(url)) return 'na';

  const cached = exportProbeCache.get(url);
  if (cached) return cached;

  const { signal } = options;

  // (1) Direct CORS probe.
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
      signal,
    });
    if (r.ok) {
      exportProbeCache.set(url, 'direct');
      return 'direct';
    }
  } catch {
    // CORS preflight or network failure — fall through to proxy probe.
  }

  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

  // (2) Same-origin proxy probe.
  try {
    const r = await fetch(`/api/media-proxy?url=${encodeURIComponent(url)}`, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
      signal,
    });
    if (r.ok) {
      exportProbeCache.set(url, 'proxy');
      return 'proxy';
    }
  } catch {
    // proxy unreachable too
  }

  exportProbeCache.set(url, 'skip');
  return 'skip';
}

/** Forget any cached probe for this URL — call after the user pastes
 *  a new URL into a field so the next probe runs fresh. */
export function clearVideoProbeCache(url?: string): void {
  if (url) exportProbeCache.delete(url);
  else exportProbeCache.clear();
}
