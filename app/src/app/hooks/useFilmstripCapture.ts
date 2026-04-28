import { useEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { StageController } from '../../engine';

type Status = 'idle' | 'capturing' | 'ready' | 'error';

type Params = {
  canvasRef: RefObject<HTMLElement | null>;
  duration: number;
  controller: StageController;
  /** Bump when layout or creative content should refresh thumbnails */
  revision: string;
  aspectW: number;
  aspectH: number;
  enabled: boolean;
  /** Solid backing for JPEG thumbnails (scene may be transparent in places) */
  captureBackground?: string;
};

const FRAME_MIN = 8;
const FRAME_MAX = 20;

function doubleRaf() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

/** Ensure the stage has committed the new time before we rasterize (RAF alone is not enough in React 18/19).
 *  Also waits for any project-bg `<video>` elements to finish seeking
 *  to the source frame matching the new timeline position — otherwise
 *  the filmstrip captures a stale video frame from the previous
 *  source time, producing the "ghost frames" the marketer reported. */
async function settleFrameAfterSeek(setTime: (t: number) => void, t: number) {
  flushSync(() => {
    setTime(t);
  });
  await doubleRaf();
  await new Promise<void>((r) => setTimeout(r, 48));
  await waitForMediaSettled();
}

/** Resolve once every visible `<video data-project-bg-video>` is no
 *  longer in the `seeking=true` state. Has a 600ms safety timeout
 *  per video so a stuck decode doesn't stall the entire filmstrip. */
async function waitForMediaSettled(): Promise<void> {
  const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>('video[data-project-bg-video]'),
  );
  if (videos.length === 0) return;
  await Promise.all(
    videos.map((v) => {
      if (!v.seeking) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          v.removeEventListener('seeked', finish);
          v.removeEventListener('error', finish);
          resolve();
        };
        v.addEventListener('seeked', finish, { once: true });
        v.addEventListener('error', finish, { once: true });
        setTimeout(finish, 600);
      });
    }),
  );
}

/** Stage can be 0×0 for a few frames while the flex layout settles — rasterizers need real bounds. */
async function waitForCanvasLayout(
  getEl: () => HTMLElement | null,
  signal: AbortSignal,
  maxMs = 10000,
): Promise<HTMLElement | null> {
  const t0 = performance.now();
  while (performance.now() - t0 < maxMs) {
    if (signal.aborted) return null;
    const el = getEl();
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width >= 8 && r.height >= 8) return el;
    }
    await new Promise<void>((res) => requestAnimationFrame(() => res()));
  }
  return null;
}

export function useFilmstripCapture({
  canvasRef,
  duration,
  controller,
  revision,
  aspectW,
  aspectH,
  enabled,
  captureBackground = '#0a0a0a',
}: Params) {
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<string[]>([]);
  const ctrlRef = useRef(controller);
  ctrlRef.current = controller;
  const captureBgRef = useRef(captureBackground);
  captureBgRef.current = captureBackground;

  const revokeAll = () => {
    for (const u of urlsRef.current) {
      URL.revokeObjectURL(u);
    }
    urlsRef.current = [];
  };

  useEffect(() => {
    revokeAll();
    setImages([]);
    setError(null);
    if (!enabled || duration <= 0 || aspectW <= 0 || aspectH <= 0) {
      setStatus('idle');
      return;
    }

    const t = window.setTimeout(() => {
      void (async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const canvas = await waitForCanvasLayout(() => canvasRef.current, ac.signal);
        if (!canvas || ac.signal.aborted) {
          if (!ac.signal.aborted) setStatus('idle');
          return;
        }

        const ctrl = ctrlRef.current;
        const wasPlaying = ctrl.playing;
        const origTime = ctrl.time;
        ctrl.setPlaying(false);

        const n = Math.min(
          FRAME_MAX,
          Math.max(FRAME_MIN, Math.ceil(duration * 1.8)),
        );
        const nextUrls: string[] = [];

        try {
          setStatus('capturing');
          setError(null);
          revokeAll();

          const { domToBlob } = await import('modern-screenshot');
          if (ac.signal.aborted) return;

          const thumbH = 52;
          const thumbW = Math.max(32, Math.round((aspectW / aspectH) * thumbH));
          /** Rasterize at native stage resolution, then scale down — tiny width/height breaks 1080p layout in the cloner. */
          const outScale = thumbW / aspectW;

          for (let i = 0; i < n; i++) {
            if (ac.signal.aborted) throw new DOMException('aborted', 'AbortError');
            const u = n === 1 ? 0 : i / (n - 1);
            const sampleT = u >= 1 ? Math.max(0, duration - 0.02) : u * duration;
            await settleFrameAfterSeek(ctrl.setTime, sampleT);

            const blob = await domToBlob(canvas, {
              width: aspectW,
              height: aspectH,
              scale: outScale,
              type: 'image/jpeg',
              quality: 0.78,
              backgroundColor: captureBgRef.current,
              style: { transform: 'none' },
              font: false,
              drawImageInterval: 150,
            });
            if (!blob || blob.size < 120) throw new Error(`Filmstrip frame ${i} failed`);
            const url = URL.createObjectURL(blob);
            nextUrls.push(url);
          }

          if (ac.signal.aborted) {
            for (const u of nextUrls) URL.revokeObjectURL(u);
            return;
          }

          urlsRef.current = nextUrls;
          setImages(nextUrls);
          setStatus('ready');
        } catch (e) {
          if ((e as DOMException)?.name === 'AbortError') {
            for (const u of nextUrls) URL.revokeObjectURL(u);
            setStatus('idle');
            return;
          }
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Filmstrip failed');
          for (const u of nextUrls) URL.revokeObjectURL(u);
        } finally {
          const c = ctrlRef.current;
          c.setTime(origTime);
          c.setPlaying(wasPlaying);
        }
      })();
    }, 280);

    return () => {
      window.clearTimeout(t);
      abortRef.current?.abort();
      revokeAll();
      setImages([]);
      setStatus('idle');
    };
  }, [revision, duration, aspectW, aspectH, enabled, canvasRef]);

  return { images, status, error };
}
