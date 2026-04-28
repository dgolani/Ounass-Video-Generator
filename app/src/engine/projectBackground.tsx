// Project-level background layer — replaces the per-template
// `backgroundImage` / `videoSrc` fields with a single project-wide
// control that renders OUTSIDE the rasterized scene chrome.
//
// Why: the per-template approach tainted the export canvas (cross-origin
// <video> can't be read into the canvas via toDataURL), required a
// CORS proxy + per-frame seek dance to get usable exports, and
// duplicated the same UI across 6 templates. Lifting the background
// to project level lets us:
//   - render it as a sibling of the rasterized canvas (data-export-ignore
//     for the export-pipeline rasterizer; freely rasterizable for the
//     filmstrip-thumbnail rasterizer)
//   - hand it to ffmpeg as a separate input at encode time (Phase 3)
//   - mirror the music-layer's anchor/trim/end semantics for video
//
// To make the editor's filmstrip thumbnails capture the bg video too,
// we eagerly fetch hosted video URLs into a same-origin blob URL the
// moment the marketer pastes them. Cross-origin video can't be read
// from canvas (taints it); blob URLs are same-origin so the canvas
// painter can read pixels cleanly.
//
// This module exports:
//   - ProjectBackgroundContext: the React context templates read from
//   - useProjectBackground(): hook that returns the current background
//     (or undefined). Templates use this to know whether to render
//     their own opaque backdrop or fall through to transparent.
//   - <ProjectBackgroundLayer>: renders <video> or <img> sized to fill
//     the canvas. Marked data-export-ignore on the video element so
//     the export-side rasterizer skips it.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
} from 'react';
import type { ProjectBackground } from '../store/types';
import { useTimeline } from './timeline';

export const ProjectBackgroundContext = createContext<ProjectBackground | undefined>(undefined);

/** Read the project's background from context. Templates use this to
 *  decide whether to render their own opaque backdrop or fall through
 *  to transparent so the project layer shows through. Returns
 *  `undefined` outside the editor (e.g. in template gallery
 *  thumbnails) so the template's default backdrop renders. */
export function useProjectBackground(): ProjectBackground | undefined {
  return useContext(ProjectBackgroundContext);
}

/** Boolean shorthand — templates often only need to know "is there
 *  ANY project background?" not which kind. */
export function useHasProjectBackground(): boolean {
  return useContext(ProjectBackgroundContext) !== undefined;
}

type LayerProps = {
  background: ProjectBackground;
  /** Canvas pixel width — same as Stage's `width` prop. */
  width: number;
  /** Canvas pixel height — same as Stage's `height` prop. */
  height: number;
};

const BASE_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  zIndex: 0,
  pointerEvents: 'none',
};

/** The actual DOM node that paints the bg into the editor preview.
 *  The video element carries `data-export-ignore="true"` so the
 *  export-pipeline's rasterizer filter skips it (the export pipeline
 *  composites bg via ffmpeg instead). The filmstrip-thumbnail
 *  rasterizer runs WITHOUT a filter, so it captures the bg too —
 *  provided the source is canvas-readable (data URL, blob URL, or
 *  CORS-friendly external URL). */
export function ProjectBackgroundLayer({ background, width, height }: LayerProps) {
  void width;
  void height;

  if (background.kind === 'image') {
    return <ImageBackground background={background} />;
  }
  return <VideoBackground background={background} />;
}

// ── Image branch ────────────────────────────────────────────────

function ImageBackground({
  background,
}: {
  background: Extract<ProjectBackground, { kind: 'image' }>;
}) {
  return (
    <>
      <img
        data-project-bg-image="true"
        src={background.src}
        alt=""
        style={BASE_STYLE}
      />
      {background.dim > 0 ? (
        <div
          data-project-bg-dim="true"
          style={{
            ...BASE_STYLE,
            background: '#000',
            opacity: background.dim,
            objectFit: undefined,
          }}
        />
      ) : null}
    </>
  );
}

// ── Video branch ────────────────────────────────────────────────

function VideoBackground({
  background,
}: {
  background: Extract<ProjectBackground, { kind: 'video' }>;
}) {
  const { time } = useTimeline();
  /** The URL we actually feed to <video src=…>. Starts as the raw
   *  source so the editor preview is responsive while we async-fetch
   *  a same-origin blob URL behind the scenes. */
  const [renderSrc, setRenderSrc] = useState<string>(background.src);

  // Eagerly fetch hosted video URLs into a same-origin blob URL so
  // the filmstrip thumbnailer can read pixels from the <video>
  // element. data: + blob: URLs are already same-origin → skip.
  useEffect(() => {
    setRenderSrc(background.src);
    if (!background.src) return;
    if (background.src.startsWith('data:') || background.src.startsWith('blob:')) {
      return;
    }
    if (!/^https?:\/\//i.test(background.src)) return;

    const ctrl = new AbortController();
    let createdBlobUrl: string | null = null;
    let cancelled = false;

    (async () => {
      let blob: Blob | null = null;
      // (1) Try direct fetch — works on CORS-friendly hosts.
      try {
        const r = await fetch(background.src, {
          mode: 'cors',
          credentials: 'omit',
          signal: ctrl.signal,
        });
        if (r.ok) blob = await r.blob();
      } catch { /* fall through */ }
      // (2) Same-origin proxy fallback — covers Pexels & other
      //     allow-listed hosts whose direct CORS isn't enabled.
      if (!blob && !cancelled) {
        try {
          const r2 = await fetch(
            `/api/media-proxy?url=${encodeURIComponent(background.src)}`,
            { mode: 'cors', credentials: 'omit', signal: ctrl.signal },
          );
          if (r2.ok) blob = await r2.blob();
        } catch { /* fall through */ }
      }
      if (cancelled) return;
      if (blob) {
        createdBlobUrl = URL.createObjectURL(blob);
        setRenderSrc(createdBlobUrl);
      }
      // If both paths fail, leave renderSrc on the original URL —
      // the video still plays in the editor (cross-origin playback
      // is fine), it just won't appear in canvas-painted thumbnails.
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [background.src]);

  const visible = time >= background.anchorVideoTime && time < background.endVideoTime;
  // Only mark the element as anonymous-CORS once the source is
  // same-origin (data: or blob:). On the brief initial render before
  // the blob fetch completes, renderSrc is still the original hosted
  // URL — setting crossOrigin there would BLOCK playback for hosts
  // that don't return CORS headers (Pexels, etc.). When we fall back
  // to playing the original URL, leaving crossOrigin off gives us
  // playback at the cost of not being able to canvas-paint it (which
  // is acceptable: the export pipeline goes through ffmpeg, and the
  // filmstrip thumbnailer just doesn't include the bg in that case).
  const isSameOriginSrc =
    renderSrc.startsWith('blob:') || renderSrc.startsWith('data:');

  return (
    <>
      <video
        data-export-ignore="true"
        data-project-bg-video="true"
        src={renderSrc}
        crossOrigin={isSameOriginSrc ? 'anonymous' : undefined}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        aria-hidden="true"
        style={{
          ...BASE_STYLE,
          opacity: visible ? 1 : 0,
        }}
      />
      {background.dim > 0 ? (
        <div
          data-project-bg-dim="true"
          style={{
            ...BASE_STYLE,
            background: '#000',
            opacity: visible ? background.dim : 0,
            objectFit: undefined,
          }}
        />
      ) : null}
    </>
  );
}
