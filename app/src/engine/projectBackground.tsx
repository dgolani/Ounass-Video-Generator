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

  if (background.kind === 'image') {
    return (
      <>
        <img
          data-export-ignore="true"
          src={background.src}
          alt=""
          style={baseStyle}
        />
        {background.dim > 0 ? (
          <div
            data-export-ignore="true"
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

  // Video — honour anchor/trim/end so the timeline UI (Phase 2) can
  // drag + trim it. Inside [anchor, end], the video plays starting
  // from `(t - anchor) + trimStartSec` of source. Outside that
  // window, hide the layer.
  const visible = time >= background.anchorVideoTime && time < background.endVideoTime;
  return (
    <>
      <video
        data-export-ignore="true"
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
          data-export-ignore="true"
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
