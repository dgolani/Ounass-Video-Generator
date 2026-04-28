/** Load `<video>` metadata only — returns the source duration in
 *  seconds, or null if the URL fails to load / has no playable video.
 *  Mirrors `probeAudioDurationSec` so the timeline lanes can show
 *  source-file ghost rulers for both audio and video tracks.
 *
 *  Cross-origin URLs work without CORS — we only need duration, not
 *  canvas access. The element auto-removes from memory after the
 *  promise resolves. */
export function probeVideoDurationSec(resolvedUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    const done = (val: number | null) => {
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
      } catch {
        /* ignore */
      }
      resolve(val);
    };
    const onMeta = () => {
      const d = v.duration;
      done(Number.isFinite(d) && d > 0 ? d : null);
    };
    const onErr = () => done(null);
    v.addEventListener('loadedmetadata', onMeta, { once: true });
    v.addEventListener('error', onErr, { once: true });
    v.src = resolvedUrl;
  });
}
