// The Reel — schema & defaults.
//
// Mechanic: full-bleed B-roll plays behind 4 editorial overlays cut to
// a 12-second timeline:
//   Scene 1 — OUNASS wordmark fades in (per-letter stagger)
//   Scene 2 — Phone slides up + product image swipes in (4 entry variants)
//   Scene 3 — Two USP lines flash one after another
//   Scene 4 — "DISCOVER ON" + huge OUNASS wordmark + Shop Now CTA
//
// Ported from the Claude-Design HTML prototype `The Reel.html` (handoff
// bundle video-ads-new). The CSS keyframe choreography is translated to
// interpolate() / clamp() calls on `useTimeline().time` at port time.
//
// Theme: single dark palette (the video provides most of the colour
// surface; templates avoid `supportsThemes: true` here because the dim
// overlay is what controls legibility, not a theme swap).

export type ReelPhoneAnim = 'iris' | 'streak' | 'drop' | 'tilt';

export type ReelPalette = {
  /** Bronze accent — used for streak / iris bloom / progress fill. */
  accent: string;
  /** Bronze deep — used inside the iris bloom inner ring. */
  accentDeep: string;
  /** Pale cream — used in the iris bloom inner glow + scene-4 shimmer. */
  accentLight: string;
  /** Phone body fill (the dark frame around the screen). */
  phoneFrame: string;
  /** Phone screen base colour (visible briefly before product image). */
  phoneScreen: string;
};

export type ReelProps = {
  // Brand chrome — the wordmark renders BoutiqueLogo (uploaded SVG or
  // text fallback) in both scene 1 and scene 4. The text fallback per
  // scene is editable so the marketer can tune the typography for each
  // moment independently (small intro mark vs huge outro mark).
  logo?: string;
  boutiqueName: string;

  // Scene 1
  s1Mark: string;
  s1Tag: string;

  // Background video — pasted CDN URL (mp4 / webm / mov). Plays
  // muted + looped + inline behind every scene. A still image works
  // too for static social posts.
  videoSrc: string;
  /** Black overlay opacity (0–0.85). Higher = darker → more legible
   *  text. The marketer tunes per project. */
  videoDim: number;

  // Scene 2 — Phone reveal
  /** Entry choreography for the phone body. The screen interior
   *  reveals via either iris / streak / drop / tilt — each variant is
   *  a distinct CSS animation in the prototype, translated 1:1 here. */
  s2Anim: ReelPhoneAnim;
  /** The image that lives INSIDE the phone screen — the marketer's
   *  product photo. Treated as a single product image (not a
   *  productList) — one upload per project. Swipes in from the right
   *  after the phone settles. */
  productImage?: string;

  // Scene 3 — USP flashes
  s3Eyebrow: string;
  s3Line1: string;
  s3Line2: string;

  // Scene 4 — Discover + huge wordmark + CTA
  s4Pre: string;
  s4Mark: string;
  s4Cta: string;

  colors: ReelPalette;
};

const palette: ReelPalette = {
  accent: '#B87253',
  accentDeep: '#D89A6E',
  accentLight: '#FFE5C8',
  phoneFrame: '#0A0A0A',
  phoneScreen: '#1A1A1A',
};

export const defaultProps: ReelProps = {
  logo: undefined,
  boutiqueName: 'OUNASS',

  s1Mark: 'OUNASS',
  s1Tag: 'The Edit',

  videoSrc: 'https://www.pexels.com/download/video/15439741/',
  videoDim: 0.24,

  s2Anim: 'iris',
  productImage: undefined,

  s3Eyebrow: 'WHY OUNASS',
  s3Line1: '2-Hour or Same Day Delivery',
  s3Line2: 'Curated for you',

  s4Pre: 'DISCOVER ON',
  s4Mark: 'OUNASS',
  s4Cta: 'Shop Now',

  colors: palette,
};
