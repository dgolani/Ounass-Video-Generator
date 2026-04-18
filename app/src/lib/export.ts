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

    // Encode to MP4. libx264 + yuv420p = maximum platform compatibility
    // (IG / TikTok / YouTube / native players).
    onProgress({ stage: 'encoding', message: 'Encoding MP4…' });
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
