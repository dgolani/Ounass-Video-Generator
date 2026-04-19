/** Load `<audio>` metadata only — returns duration in seconds or null. */
export function probeAudioDurationSec(resolvedUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    const a = document.createElement('audio');
    a.preload = 'metadata';
    const done = (v: number | null) => {
      try {
        a.pause();
        a.removeAttribute('src');
        a.load();
      } catch {
        /* ignore */
      }
      resolve(v);
    };
    const onMeta = () => {
      const d = a.duration;
      done(Number.isFinite(d) && d > 0 ? d : null);
    };
    const onErr = () => done(null);
    a.addEventListener('loadedmetadata', onMeta, { once: true });
    a.addEventListener('error', onErr, { once: true });
    a.src = resolvedUrl;
  });
}
