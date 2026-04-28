// Shared full-bleed image renderer for template backdrops. Used by
// templates as a backwards-compat fallback for projects whose
// `props.backgroundImage` was set under the legacy per-template
// "Custom backdrop" field — those projects auto-migrate to
// `project.background` on load (see `normalizeBackground` in
// `store/projects.ts`), but until that write lands, the template
// still renders the legacy bg via this component.
//
// Video is no longer handled here. Project-level video bgs flow
// through `engine/projectBackground.tsx` → `<ProjectBackgroundLayer>`
// (sibling to scene chrome, ffmpeg-overlaid at export time). Keeping
// MediaBackground image-only removes the `<video>` element from any
// rasterized canvas, which removes the entire CORS-tainting class of
// bugs by construction.

import type { CSSProperties } from 'react';

type Props = {
  /** Image URL — typically a data URL from the legacy upload path. */
  src?: string;
  /** Optional style overrides merged on top of the default full-bleed
   *  cover layout. Templates use this to tweak zIndex or add a filter. */
  style?: CSSProperties;
  /** Empty alt text for decorative usage. */
  alt?: string;
};

const BASE_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  zIndex: 0,
};

/** Renders an image backdrop. If src is empty, renders nothing
 *  (template fallback gradient / paper texture takes over). */
export function MediaBackground({ src, style, alt = '' }: Props) {
  if (!src) return null;
  const merged: CSSProperties = { ...BASE_STYLE, ...style };
  return <img src={src} alt={alt} style={merged} />;
}
