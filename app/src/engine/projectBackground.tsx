// Project-level background layer — replaces the per-template
// `backgroundImage` / `videoSrc` fields with a single project-wide
// control that renders OUTSIDE the rasterized scene chrome.
//
// Why: the per-template approach tainted the export canvas (cross-origin
// <video> can't be read into the canvas via toDataURL), required a
// CORS proxy + per-frame seek dance to get usable exports, and
// duplicated the same UI across 6 templates. Lifting the background
// to project level lets us:
//   - render it as a sibling of the rasterized canvas (data-export-ignore)
//     so html-to-image never paints it onto the export canvas
//   - hand it to ffmpeg as a separate input at encode time (Phase 3)
//   - mirror the music-layer's anchor/trim/end semantics for video
//     (Phase 2: drag + trim on the timeline like a music track)
//
// This module exports:
//   - ProjectBackgroundContext: the React context templates read from
//   - useProjectBackground(): hook that returns the current background
//     (or undefined). Templates use this to know whether to render
//     their own opaque backdrop or fall through to transparent.
//   - <ProjectBackgroundLayer>: renders <video> or <img> sized to fill
//     the canvas. Marked data-export-ignore so the rasterizer skips it.
//
// Templates that previously rendered a `<MediaBackground>` for
// `props.backgroundImage` should now check `useProjectBackground()`
// and short-circuit their own backdrop when a project bg is set.

import { createContext, useContext, type CSSProperties } from 'react';
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

/** The actual DOM node that paints the bg into the editor preview.
 *  Marked `data-export-ignore="true"` so the existing rasterizer
 *  filter (export.ts) skips it during MP4 frame capture. The bg
 *  reappears in the export via ffmpeg-side composition (Phase 3). */
export function ProjectBackgroundLayer({ background, width, height }: LayerProps) {
  const { time } = useTimeline();
  const baseStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 0,
    pointerEvents: 'none',
  };
  // Reference width/height to satisfy strict-no-unused — also
  // useful in the future for downscaling when the canvas is huge.
  void width;
  void height;

  // Image branch: the <img> bakes into the rasterized PNG (data URL is
  // same-origin, no canvas taint). The dim layer is also painted into
  // the PNG. So the exported MP4's frames already include image+dim;
  // ffmpeg encodes the PNG sequence as-is, no overlay needed.
  if (background.kind === 'image') {
    return (
      <>
        <img
          data-project-bg-image="true"
          src={background.src}
          alt=""
          style={baseStyle}
        />
        {background.dim > 0 ? (
          <div
            data-project-bg-dim="true"
            style={{
              ...baseStyle,
              background: '#000',
              opacity: background.dim,
              objectFit: undefined,
              zIndex: 0,
            }}
          />
        ) : null}
      </>
    );
  }

  // Video branch: the <video> is `data-export-ignore` because cross-
  // origin video taints the canvas. The export pipeline (export.ts)
  // fetches the video file separately and overlays the PNG sequence
  // on top of it via ffmpeg, so the rendered MP4 still composites
  // bg_video + dim + scene chrome correctly.
  //
  // The dim layer is NOT data-export-ignore — it rasterizes into the
  // PNG as a translucent black plane. When ffmpeg overlays the PNG on
  // bg_video, the dim's alpha blends with the underlying video (=
  // darkens it), and scene chrome (opaque on top of dim in the PNG)
  // wins over both. Mirrors what the editor preview shows.
  //
  // Anchor / trim / end honour the (Phase-2 forthcoming) timeline
  // drag UI: inside [anchor, end] the video plays from
  // `(t - anchor) + trimStartSec` of source; outside that window we
  // hide the layer (and ffmpeg's `enable=between(t,…)` mirrors it).
  const visible = time >= background.anchorVideoTime && time < background.endVideoTime;
  return (
    <>
      <video
        data-export-ignore="true"
        data-project-bg-video="true"
        src={background.src}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        aria-hidden="true"
        style={{
          ...baseStyle,
          opacity: visible ? 1 : 0,
        }}
      />
      {background.dim > 0 ? (
        <div
          data-project-bg-dim="true"
          style={{
            ...baseStyle,
            background: '#000',
            opacity: visible ? background.dim : 0,
            objectFit: undefined,
            zIndex: 0,
          }}
        />
      ) : null}
    </>
  );
}
