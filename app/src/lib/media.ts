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

/** Heuristic: does this URL refer to a video asset?
 *  - data:video/* prefix (legacy uploaded videos, kept for backwards
 *    compatibility with any project saved while the upload path
 *    briefly existed)
 *  - common video file extension on the path (CDN URLs, query string
 *    + hash tolerated)
 *  Pure function, no side effects. */
export function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  // Strip query string + hash before extension check.
  const path = url.split('?')[0].split('#')[0];
  return VIDEO_EXT_RE.test(path);
}
