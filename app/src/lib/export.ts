// Frame-by-frame export pipeline.
//
//   Stage DOM → html-to-image (PNG blob) per frame → ffmpeg.wasm → MP4
//
// Not real-time; we step the timeline controller manually and rasterize
// each frame deterministically. A 9s ad at 30fps = 270 frames, typically
// 30–60s wall time.  ffmpeg.wasm is loaded lazily on first export so the
// initial bundle stays small.

import type { StageController } from '../engine';

// Bundle ffmpeg core with the app. `?url` gives us stable same-origin
// URLs for the web worker to load. We use the **ESM** variant
// (`@ffmpeg/core`'s default import) because the ffmpeg worker runs as
// a module worker: `importScripts()` fails → it falls back to dynamic
// `import()`, which requires an ESM URL.
import ffmpegCoreURL from '@ffmpeg/core?url';
import ffmpegWasmURL from '@ffmpeg/core/wasm?url';

export type ExportProgress =
  | { stage: 'loading'; message: string }
  | { stage: 'fonts'; message: string }
  | { stage: 'rendering'; frame: number; total: number }
  | { stage: 'loading_audio'; message: string }
  | { stage: 'encoding'; message: string }
  | { stage: 'done' };

export type ExportOptions = {
  canvasEl: HTMLElement;
  controller: StageController;
  width: number;
  height: number;
  duration: number;
  fps?: number;
  crf?: number;
  /** Fetched into ffmpeg and muxed; omit or null = video-only */
  audioUrl?: string | null;
  /** 0–1; values below ~0.001 skip the audio track */
  audioVolume?: number;
  /** Seconds of silence at the start of the output timeline before the bed enters */
  musicAnchorVideoTime?: number;
  /** Seconds to skip from the beginning of the source file */
  musicTrimStartSec?: number;
  /** Video timeline second where music should be silent after (≤ duration) */
  musicEndVideoTime?: number;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
};

export async function exportVideoToMP4({
  canvasEl,
  controller,
  width,
  height,
  duration,
  fps = 30,
  crf = 22,
  audioUrl = null,
  audioVolume = 0.35,
  musicAnchorVideoTime = 0,
  musicTrimStartSec = 0,
  musicEndVideoTime = 0,
  onProgress = () => {},
  signal,
}: ExportOptions): Promise<Blob> {
  const abort = () => {
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
  };

  onProgress({ stage: 'loading', message: 'Loading encoder…' });

  // Lazy-load heavy deps so the initial app bundle stays slim.
  const [{ FFmpeg }, { fetchFile }, htmlToImage] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
    import('html-to-image'),
  ]);
  abort();

  // Hand the Vite-served ESM core directly to ffmpeg. The worker tries
  // `importScripts()` first (fails silently on module workers), then
  // falls back to `import()` which loads the ESM core from its
  // same-origin URL.
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: ffmpegCoreURL,
    wasmURL: ffmpegWasmURL,
  });
  abort();

  // Pause autoplay while we step through frames manually.
  const wasPlaying = controller.playing;
  controller.setPlaying(false);

  // Pre-process cross-origin <video> sources so canvas rasterization
  // doesn't taint the export canvas. For each external video URL:
  //   1. Try fetch(url) — if the host supports CORS, we get a blob,
  //      convert it to a same-origin blob: URL, swap it onto the
  //      element with crossOrigin="anonymous". The canvas paint of
  //      that frame is now allowed.
  //   2. If fetch fails (CORS-restricted host like Pexels' /download/
  //      endpoint), tag the element `data-export-ignore="true"` so
  //      the rasterizer skips it. The export still succeeds; the
  //      video layer is missing in the rendered frames.
  // All swaps are reverted in the finally block so the editor returns
  // to its original state regardless of how export ended.
  const { restorations: videoRestorations, seekFrame: seekVideosToTime } =
    await prepareVideosForExport(canvasEl, abort);

  try {
    // Embed any fonts currently used on the page so the rasterized
    // frames render with Fraunces / Nunito Sans instead of falling back
    // to serif / sans-serif defaults.
    onProgress({ stage: 'fonts', message: 'Embedding fonts…' });
    let fontEmbedCSS = '';
    try {
      fontEmbedCSS = await htmlToImage.getFontEmbedCSS(canvasEl);
    } catch {
      // If font fetching fails (CORS etc), fall back to system fonts.
      fontEmbedCSS = '';
    }
    abort();

    // Render each frame.
    const totalFrames = Math.ceil(duration * fps);
    for (let i = 0; i < totalFrames; i++) {
      abort();
      const t = Math.min(duration, i / fps);
      controller.setTime(t);

      // Seek every <video> to the matching timeline position. Without
      // this, each video keeps playing at wall-clock real-time during
      // the export — wall-clock is slower than the rendering loop, so
      // the captured frames sample many seconds of source video into
      // each output second, producing the "super-fast" playback the
      // marketer reported. Seeking deterministically + waiting for
      // `seeked` makes the video frame match the timeline exactly,
      // so the exported MP4 plays the source at 1× speed.
      await seekVideosToTime(t);

      // Two RAFs: ensures React commits + browser paints before we capture.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      const blob = await htmlToImage.toBlob(canvasEl, {
        pixelRatio: 1,
        width,
        height,
        cacheBust: false,
        fontEmbedCSS,
        // Skip any node tagged `data-export-ignore="true"` — today that's
        // the editor's safe-zone overlay (SafeZoneOverlay.tsx), so the
        // dim strips + the "Safe · 9:16" pill never bake into the
        // rasterized frame even if the user kept the overlay visible
        // while clicking Export. Future editor-only chrome can opt out
        // by setting the same attribute.
        filter: (node) => node.dataset?.exportIgnore !== 'true',
        style: {
          // Neutralise the auto-fit transform so we rasterize at native res.
          transform: 'none',
        },
      });
      if (!blob) throw new Error(`Failed to rasterize frame ${i}`);

      const data = await fetchFile(blob);
      const name = `f-${String(i).padStart(5, '0')}.png`;
      await ffmpeg.writeFile(name, data);

      onProgress({ stage: 'rendering', frame: i + 1, total: totalFrames });
    }
    abort();

    const vol = Math.min(1, Math.max(0, audioVolume));
    const useAudio = Boolean(audioUrl?.trim()) && vol >= 0.001;

    if (useAudio && audioUrl) {
      onProgress({ stage: 'loading_audio', message: 'Loading music…' });
      const audioData = await fetchFile(audioUrl);
      await ffmpeg.writeFile('bgm.mp3', audioData);
      abort();
    }

    // Encode to MP4. libx264 + yuv420p = maximum platform compatibility
    // (IG / TikTok / YouTube / native players). Optional AAC bed from bgm.mp3.
    onProgress({
      stage: 'encoding',
      message: useAudio ? 'Encoding MP4 (video + music)…' : 'Encoding MP4…',
    });

    if (useAudio) {
      const volStr = vol.toFixed(4);
      const trim = Math.min(120, Math.max(0, musicTrimStartSec));
      const anchor = Math.min(Math.max(0, musicAnchorVideoTime), Math.max(0, duration - 0.01));
      const end = Math.min(
        duration,
        Math.max(anchor + 0.12, musicEndVideoTime > 0 ? musicEndVideoTime : duration),
      );
      const trimStr = trim.toFixed(3);
      const delayMs = Math.round(anchor * 1000);
      const delayArg = `${delayMs}|${delayMs}`;
      const fadeSt = Math.max(0, end - 0.1);
      const wholeSamples = Math.max(4800, Math.round(duration * 48000));
      const tailPad = end < duration - 0.03;
      const base =
        trim > 0.0005
          ? `[1:a]atrim=start=${trimStr},asetpts=PTS-STARTPTS,volume=${volStr},adelay=${delayArg}`
          : `[1:a]volume=${volStr},adelay=${delayArg}`;
      const filter = tailPad
        ? `${base},afade=t=out:st=${fadeSt.toFixed(3)}:d=0.08,apad=whole_len=${wholeSamples}[aout]`
        : `${base}[aout]`;
      await ffmpeg.exec([
        '-framerate',
        String(fps),
        '-i',
        'f-%05d.png',
        '-stream_loop',
        '-1',
        '-i',
        'bgm.mp3',
        '-filter_complex',
        filter,
        '-map',
        '0:v',
        '-map',
        '[aout]',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'fast',
        '-crf',
        String(crf),
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
        '-shortest',
        'out.mp4',
      ]);
    } else {
      await ffmpeg.exec([
        '-framerate',
        String(fps),
        '-i',
        'f-%05d.png',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'fast',
        '-crf',
        String(crf),
        '-movflags',
        '+faststart',
        'out.mp4',
      ]);
    }
    abort();

    const data = await ffmpeg.readFile('out.mp4');
    const mp4 = new Blob(
      [data instanceof Uint8Array ? data : new TextEncoder().encode(data)],
      { type: 'video/mp4' },
    );

    onProgress({ stage: 'done' });
    return mp4;
  } finally {
    // Restore every video element we touched (blob URL → original src,
    // crossOrigin removed, export-ignore flag cleared) BEFORE handing
    // playback back to the controller, so the editor never sees a
    // stale state.
    for (const restore of videoRestorations) {
      try { restore(); } catch { /* swallow — restore is best-effort */ }
    }
    controller.setPlaying(wasPlaying);
  }
}

/** Walk the export tree, find every `<video>`, and prepare it for
 *  canvas rasterization:
 *
 *   1. CORS dance — swap external sources to a same-origin blob URL
 *      (or fall back to skipping if neither direct fetch nor proxy
 *      reaches the host). Without this, the canvas is tainted and
 *      `toDataURL()` refuses to read pixels.
 *
 *   2. Pause autoplay — the editor sets `autoPlay loop muted playsInline`
 *      on the element, so it's playing at wall-clock real-time. We need
 *      it stopped so we can deterministically seek per frame.
 *
 *  Returns:
 *   - `restorations`: callbacks the caller MUST run in `finally` to
 *     return the editor to its original state.
 *   - `seekFrame(t)`: at each export frame, call this with the
 *     timeline second; it seeks every video to `t mod duration`
 *     (videos loop) and resolves once the seek lands. Without this,
 *     videos drift forward at wall-clock speed during the rendering
 *     loop and play back several × too fast in the exported MP4.
 */
async function prepareVideosForExport(
  root: HTMLElement,
  abort: () => void,
): Promise<{
  restorations: Array<() => void>;
  seekFrame: (t: number) => Promise<void>;
}> {
  const restorations: Array<() => void> = [];
  /** Videos whose CORS dance succeeded — these get seeked per-frame.
   *  Skipped videos (`data-export-ignore="true"`) aren't included here
   *  since they don't participate in the rasterized frame anyway. */
  const seekableVideos: HTMLVideoElement[] = [];
  const videos = Array.from(root.querySelectorAll('video'));
  for (const v of videos) {
    abort();
    const originalSrc = v.currentSrc || v.src;
    if (!originalSrc) continue;
    // data: + blob: URLs are already same-origin → no taint risk.
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) continue;
    // Only http(s) URLs need special handling.
    if (!/^https?:\/\//i.test(originalSrc)) continue;

    let blob: Blob | null = null;
    try {
      // (1) Direct fetch with CORS. Works for hosts that send the
      //     Access-Control-Allow-Origin header (most modern CDNs).
      const r = await fetch(originalSrc, { mode: 'cors', credentials: 'omit' });
      if (!r.ok) throw new Error('direct fetch returned ' + r.status);
      blob = await r.blob();
    } catch {
      // (2) Same-origin proxy fallback. The dev server (vite.config.ts)
      //     and the Vercel serverless function at api/media-proxy.ts
      //     both expose `/api/media-proxy?url=<target>` — they fetch
      //     the asset server-side (no browser CORS check) and re-emit
      //     it from our origin with `Access-Control-Allow-Origin: *`.
      //     The marketer's video host doesn't need to support CORS for
      //     this to work, as long as it appears in our proxy's
      //     allow-list (Pexels, Cloudinary, Coverr, etc.).
      try {
        const proxied = `/api/media-proxy?url=${encodeURIComponent(originalSrc)}`;
        const r2 = await fetch(proxied, { mode: 'cors', credentials: 'omit' });
        if (!r2.ok) throw new Error('proxy fetch returned ' + r2.status);
        blob = await r2.blob();
      } catch {
        blob = null;
      }
    }

    if (!blob) {
      // Both direct fetch + proxy failed. Skip the video from the
      // rasterized frame so the export still succeeds; the user gets
      // an MP4 with the dim layer + scenes on a black backdrop where
      // the video would have been.
      v.dataset.exportIgnore = 'true';
      restorations.push(() => {
        delete v.dataset.exportIgnore;
      });
      continue;
    }

    try {
      const blobUrl = URL.createObjectURL(blob);

      // Save state we're about to mutate.
      const prevCrossOrigin = v.getAttribute('crossorigin');
      const prevSrc = v.getAttribute('src');
      const prevPaused = v.paused;
      const prevTime = v.currentTime;

      v.crossOrigin = 'anonymous';
      v.src = blobUrl;

      // Wait for the new source to load enough that drawImage works.
      await new Promise<void>((resolve, reject) => {
        const ok = () => {
          v.removeEventListener('loadeddata', ok);
          v.removeEventListener('error', err);
          resolve();
        };
        const err = () => {
          v.removeEventListener('loadeddata', ok);
          v.removeEventListener('error', err);
          reject(new Error('video failed to load blob source'));
        };
        v.addEventListener('loadeddata', ok, { once: true });
        v.addEventListener('error', err, { once: true });
        // Belt + braces — kick the load.
        v.load();
        setTimeout(() => err(), 12000);
      });

      // Keep the video paused during export — the seekFrame loop
      // below will advance it deterministically per output frame so
      // playback in the rendered MP4 matches source 1:1. Without
      // this pause, the element keeps drifting at wall-clock real-
      // time and the captured frames sample many seconds of source
      // into each output second.
      v.pause();
      seekableVideos.push(v);

      restorations.push(() => {
        URL.revokeObjectURL(blobUrl);
        if (prevSrc !== null) v.setAttribute('src', prevSrc);
        else v.removeAttribute('src');
        if (prevCrossOrigin !== null) v.setAttribute('crossorigin', prevCrossOrigin);
        else v.removeAttribute('crossorigin');
        v.load();
        try { v.currentTime = prevTime; } catch { /* swallow */ }
        if (!prevPaused) v.play().catch(() => {});
      });
    } catch {
      // CORS-restricted host (Pexels' /download/ endpoint, etc.) — fall
      // back to skipping this video from the rasterized frame so the
      // export still succeeds. The user will see a black/dim layer
      // where the video would have been; we surface this trade-off in
      // The Reel's field hint.
      v.dataset.exportIgnore = 'true';
      restorations.push(() => {
        delete v.dataset.exportIgnore;
      });
    }
  }

  const seekFrame = async (t: number): Promise<void> => {
    if (seekableVideos.length === 0) return;
    await Promise.all(seekableVideos.map((v) => seekVideoTo(v, t)));
  };

  return { restorations, seekFrame };
}

/** Seek a paused `<video>` to the given timeline second (looped to
 *  fit within the source duration) and resolve once the new frame is
 *  decoded. Used by the export loop so each rasterized frame samples
 *  a deterministic source frame. */
async function seekVideoTo(v: HTMLVideoElement, time: number): Promise<void> {
  const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
  if (!duration) return;
  // Loop the source — the editor's <video> has `loop` set, and the
  // export should mirror that behaviour for projects whose timeline
  // is longer than the source clip.
  const target = ((time % duration) + duration) % duration;
  if (Math.abs(v.currentTime - target) < 0.005) return;
  await new Promise<void>((resolve) => {
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
    try {
      v.currentTime = target;
    } catch {
      finish();
      return;
    }
    // Safety: if `seeked` never fires (decoder hiccup), don't stall
    // the export loop forever.
    setTimeout(finish, 1500);
  });
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
