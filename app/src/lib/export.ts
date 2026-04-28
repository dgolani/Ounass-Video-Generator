// Frame-by-frame export pipeline.
//
//   Stage DOM → html-to-image (PNG blob) per frame → ffmpeg.wasm → MP4
//
// Not real-time; we step the timeline controller manually and rasterize
// each frame deterministically. A 9s ad at 30fps = 270 frames, typically
// 30–60s wall time.  ffmpeg.wasm is loaded lazily on first export so the
// initial bundle stays small.

import type { StageController } from '../engine';
import type { ProjectBackground } from '../store/types';

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
  /** Project-level full-bleed background (image OR hosted video URL).
   *  - `kind: 'image'` → no special handling; the image already bakes
   *    into the rasterized PNG sequence.
   *  - `kind: 'video'` → pipeline fetches the video (direct, then via
   *    /api/media-proxy) and uses ffmpeg's overlay filter to paint
   *    the PNG sequence on top of it, with anchor + trim + end
   *    honoured via filter_complex. Sidesteps the canvas-tainting
   *    CORS problem — the rasterized PNGs never contain video frames.
   *  - undefined → no project bg; encode the PNG sequence as today.
   */
  projectBackground?: ProjectBackground;
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
  projectBackground,
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

  // Project-level video bg flows through ffmpeg's overlay filter
  // below — it never lands inside the rasterized canvas, so there's
  // nothing to do here for it. The previous CORS-dance + per-frame
  // <video>.currentTime seek logic for in-canvas videos was deleted
  // when Phase 4 dropped per-template `<video>` elements.

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
    const useBgVideo = !!(
      projectBackground &&
      projectBackground.kind === 'video' &&
      projectBackground.src.trim().length > 0
    );

    if (useAudio && audioUrl) {
      onProgress({ stage: 'loading_audio', message: 'Loading music…' });
      const audioData = await fetchFile(audioUrl);
      await ffmpeg.writeFile('bgm.mp3', audioData);
      abort();
    }

    if (useBgVideo && projectBackground && projectBackground.kind === 'video') {
      onProgress({ stage: 'loading', message: 'Loading background video…' });
      const bgData = await fetchProxiedMedia(
        projectBackground.src,
        fetchFile,
      );
      await ffmpeg.writeFile('bg.mp4', bgData);
      abort();
    }

    // Encode to MP4. libx264 + yuv420p = maximum platform compatibility
    // (IG / TikTok / YouTube / native players). Optional AAC music bed
    // from bgm.mp3, optional looped background video from bg.mp4.
    const encodingMessage = useBgVideo
      ? useAudio
        ? 'Encoding MP4 (video + bg video + music)…'
        : 'Encoding MP4 (video + bg video)…'
      : useAudio
        ? 'Encoding MP4 (video + music)…'
        : 'Encoding MP4…';
    onProgress({ stage: 'encoding', message: encodingMessage });

    // Inputs in order: PNG sequence, [bg.mp4], [bgm.mp3]. Track each
    // input's index so the filter_complex labels stay in sync as the
    // optional inputs come and go.
    const args: string[] = [];
    args.push('-framerate', String(fps), '-i', 'f-%05d.png');
    let nextInputIdx = 1;
    let bgIdx = -1;
    let audIdx = -1;
    if (useBgVideo) {
      args.push('-stream_loop', '-1', '-i', 'bg.mp4');
      bgIdx = nextInputIdx++;
    }
    if (useAudio) {
      args.push('-stream_loop', '-1', '-i', 'bgm.mp3');
      audIdx = nextInputIdx++;
    }

    // Build filter_complex parts.
    const filterParts: string[] = [];
    let videoMapLabel = '0:v'; // PNG sequence by default
    if (useBgVideo) {
      // Scale + crop the bg video to canvas dimensions, force same SAR
      // as the PNG, then overlay the PNG sequence on top. PNGs already
      // have the dim layer baked in (translucent black plane in the
      // alpha channel), so the alpha-blend during overlay darkens the
      // bg video where the dim is, and scene chrome wins where it's
      // opaque on top.
      filterParts.push(
        `[${bgIdx}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[bg]`,
      );
      filterParts.push(`[bg][0:v]overlay=0:0:format=auto[v]`);
      videoMapLabel = '[v]';
    }

    let audioMapLabel: string | null = null;
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
          ? `[${audIdx}:a]atrim=start=${trimStr},asetpts=PTS-STARTPTS,volume=${volStr},adelay=${delayArg}`
          : `[${audIdx}:a]volume=${volStr},adelay=${delayArg}`;
      filterParts.push(
        tailPad
          ? `${base},afade=t=out:st=${fadeSt.toFixed(3)}:d=0.08,apad=whole_len=${wholeSamples}[aout]`
          : `${base}[aout]`,
      );
      audioMapLabel = '[aout]';
    }

    if (filterParts.length > 0) {
      args.push('-filter_complex', filterParts.join(';'));
    }

    args.push('-map', videoMapLabel);
    if (audioMapLabel) args.push('-map', audioMapLabel);

    args.push(
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', String(crf),
    );
    if (audioMapLabel) {
      args.push('-c:a', 'aac', '-b:a', '192k');
    }
    args.push('-movflags', '+faststart');

    // Stop encoding when the PNG sequence ends — the looped bg video
    // and music would otherwise drag past the project duration.
    if (useAudio || useBgVideo) {
      args.push('-shortest');
    }
    args.push('out.mp4');

    await ffmpeg.exec(args);
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

/** Fetch a media file (typically a hosted video) with the same
 *  fallback strategy the editor uses for its compatibility probe:
 *  try the host directly first, then fall through to our same-origin
 *  proxy at `/api/media-proxy?url=…`. The proxy has an allow-list of
 *  hostnames (Pexels, Cloudinary, Coverr, etc.) and adds the CORS
 *  headers that the host doesn't.
 *
 *  Returns the file bytes as a Uint8Array suitable for `ffmpeg.writeFile`.
 *  Throws with a marketer-readable message if neither path works. */
async function fetchProxiedMedia(
  url: string,
  fetchFile: (input: Blob | string) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  // (1) Direct fetch.
  try {
    const r = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (r.ok) {
      return new Uint8Array(await r.arrayBuffer());
    }
  } catch {
    // fall through
  }
  // (2) Same-origin proxy fallback. Re-uses the same allow-list the
  // editor's preview probe uses so behaviour stays consistent.
  try {
    const r = await fetch(
      `/api/media-proxy?url=${encodeURIComponent(url)}`,
      { mode: 'cors', credentials: 'omit' },
    );
    if (r.ok) {
      return new Uint8Array(await r.arrayBuffer());
    }
  } catch {
    // fall through
  }
  // (3) Last-ditch: hand the URL to ffmpeg.fetchFile which uses the
  // same fetch underneath but errors more loudly.
  return fetchFile(url);
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
