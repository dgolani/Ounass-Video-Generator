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
