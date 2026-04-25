// Renders a boutique logo into a fixed-size bounding box, falling
// through three modes:
//
//   1. SVG data URL  → CSS mask-image; fill = `color` prop (recolours
//      to the template's palette, one SVG fits any background).
//   2. Raster data URL (legacy uploads from before SVG-only) → <img>
//      with `objectFit: contain`. Not recoloured; retained so older
//      projects don't break.
//   3. No logo → Fraunces wordmark text fallback.
//
// The wrapper is always the same size (width × height). The logo's
// natural aspect ratio is preserved via `maskSize: 'contain'` or
// `objectFit: 'contain'`.

import type { CSSProperties } from 'react';
import { isSvgDataURL } from '../lib/logo';

type Props = {
  /** Optional logo data URL. When absent, text fallback renders. */
  logo?: string;
  /** Text fallback (boutique name) + alt text. */
  boutiqueName: string;
  /** Color the SVG is recoloured to (and the text fallback uses). */
  color: string;
  /** Bounding box in canvas pixels — use the scene's `w()` / `h()`. */
  width: number;
  height: number;
  /** Text fallback styling. */
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  letterSpacing?: string;
  /** Optional drop-shadow applied via CSS filter (works on SVG mask + text). */
  shadow?: string;
  style?: CSSProperties;
  /** Per-field typography override applied ONLY to the text-fallback
   *  mode (mode 3). Pass the result of
   *  `useFieldFormat('boutiqueName', { fontFamily, fontSize, fontWeight,
   *  letterSpacing, color, … })` so the editor's "Aa" drawer for the
   *  boutique-name field can drive the rendered text. Spread last
   *  inside the text-fallback span so its values win over the
   *  component's defaults. SVG and raster modes ignore this — they
   *  render the uploaded artwork, not text. */
  nameStyle?: CSSProperties;
};

export function BoutiqueLogo({
  logo,
  boutiqueName,
  color,
  width,
  height,
  fontFamily = 'Fraunces, serif',
  fontSize,
  fontWeight = 300,
  letterSpacing = '-0.03em',
  shadow,
  style,
  nameStyle,
}: Props) {
  // Mode 1 — SVG: mask-image with solid fill.
  if (logo && isSvgDataURL(logo)) {
    return (
      <div
        role="img"
        aria-label={boutiqueName}
        style={{
          display: 'inline-block',
          width,
          height,
          backgroundColor: color,
          WebkitMaskImage: `url("${logo}")`,
          maskImage: `url("${logo}")`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          filter: shadow ? `drop-shadow(${shadow})` : undefined,
          ...style,
        }}
      />
    );
  }

  // Mode 2 — raster (legacy upload). Can't recolour; render as-is.
  if (logo) {
    return (
      <img
        src={logo}
        alt={boutiqueName}
        style={{
          display: 'inline-block',
          width,
          height,
          objectFit: 'contain',
          filter: shadow ? `drop-shadow(${shadow})` : undefined,
          ...style,
        }}
      />
    );
  }

  // Mode 3 — text fallback. Scales with the bounding box so the
  // wordmark roughly fills the same footprint the logo would.
  // `nameStyle` (from useFieldFormat('boutiqueName', …)) is spread
  // LAST so the editor's typography drawer wins over the component's
  // and the caller's defaults.
  const textSize = fontSize ?? Math.min(width / 4.2, height * 0.9);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        fontFamily,
        fontSize: textSize,
        fontWeight,
        letterSpacing,
        color,
        lineHeight: 0.9,
        textShadow: shadow ? `0 ${4}px ${24}px rgba(0,0,0,0.4)` : undefined,
        ...style,
        ...nameStyle,
      }}
    >
      {boutiqueName}
    </div>
  );
}
