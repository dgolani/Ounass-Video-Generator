// Shared full-bleed media renderer for template backdrops. Auto-detects
// whether the URL points at a video or an image and renders the right
// element. For video, autoplays muted-and-looped inline so it behaves
// like a moving wallpaper inside the canvas (no controls, no audio,
// no user gesture required on most browsers).
//
// All five "backdrop" templates (new-in, the-rail, the-stack,
// the-pairing, the-collab) used to inline the same `<img src={…}
// objectFit:cover />` block. They now delegate to this component so
// adding video support is a one-line swap per template.

import type { CSSProperties } from 'react';
import { isVideoUrl } from '../lib/media';

type Props = {
  /** Image data URL, video data URL, or http(s) URL. */
  src?: string;
  /** Optional style overrides merged on top of the default full-bleed
   *  cover layout. Templates use this to tweak zIndex or add a filter. */
  style?: CSSProperties;
  /** Aria-label or empty alt text for the image branch. Default ''. */
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

/** Renders the backdrop. If src is empty, renders nothing (template
 *  fallback gradient takes over). */
export function MediaBackground({ src, style, alt = '' }: Props) {
  if (!src) return null;
  const merged: CSSProperties = { ...BASE_STYLE, ...style };
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        // disablePictureInPicture + controls={false} keep it inert in editor
        // and final exports. Native attribute, no React noise.
        controls={false}
        style={merged}
        aria-hidden="true"
      />
    );
  }
  return <img src={src} alt={alt} style={merged} />;
}
