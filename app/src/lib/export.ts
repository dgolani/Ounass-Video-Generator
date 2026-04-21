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

    // One-off diagnostic at export start. Emits the state of the stage DOM
    // at time-zero so "safe zones were on but the MP4 shows no margins"
    // reports can be triaged from a single console read. Specifically:
    //   • Whether the SafeZoneOverlay is in the tree (→ the toggle was ON).
    //   • The canvas's rasterize dims (catches custom aspects that don't
    //     resolve to a preset key and therefore zero the safe zone).
    //   • A sample of how far the first absolutely-positioned element that
    //     uses a `bottom` value sits from the canvas bottom — lets you
    //     eyeball whether content actually shifted.
    try {
      // Sample at 85% through so the outro / CTA act is mounted — at t=0
      // many templates return null for late-act components and the scan
      // would miss the elements most likely to expose a safe-zone issue.
      controller.setTime(duration * 0.85);
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const overlayPresent = !!canvasEl.querySelector('[data-export-ignore]');
      const absChildren = Array.from(
        canvasEl.querySelectorAll<HTMLElement>('*'),
      ).filter((el) => {
        const s = getComputedStyle(el);
        return s.position === 'absolute' && s.bottom && s.bottom !== 'auto';
      });
      const sampleBottoms = absChildren
        .slice(0, 6)
        .map((el) => {
          const s = getComputedStyle(el);
          const text = (el.textContent || '').slice(0, 28).replace(/\s+/g, ' ').trim();
          return `${s.bottom}${text ? ` [${text}]` : ''}`;
        });
      console.info(
        '[Export] rasterize start | canvas %dx%d | safe-zone overlay present: %s',
        width,
        height,
        overlayPresent,
      );
      if (sampleBottoms.length) {
        console.info(
          '[Export] first 6 absolutely-positioned `bottom` values in the live DOM:\n  ' +
            sampleBottoms.join('\n  '),
        );
      }
      console.info(
        '[Export] If "safe zones" was ON when you clicked Export, the above should show the overlay present AND bottom values reflecting the keep-clear margins (e.g., 360px at 9:16 for a CTA instead of 300px).',
      );
    } catch (diagErr) {
      // Diagnostics must never break the export
      console.warn('[Export] diagnostic scan skipped:', diagErr);
    }

    // Render each frame.
    const totalFrames = Math.ceil(duration * fps);
    for (let i = 0; i < totalFrames; i++) {
      abort();
      const t = Math.min(duration, i / fps);
      controller.setTime(t);

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
    controller.setPlaying(wasPlaying);
  }
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
