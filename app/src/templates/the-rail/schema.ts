// The Rail — schema & defaults.
//
// Mechanic: a horizontal continuous dolly. A hanger rail slides from
// right to left across frame carrying 8 garments. Mid-flight, one
// garment ignites with a bronze glow, the rail slows to a stop with
// that piece centered, non-heroes fade, and the hero rises out of
// the rail line as "THE EDIT" — pulled for you.
//
// Ported from the Claude-Design HTML prototype `TheRail.html`. The
// choreography there was built with CSS animation-delay; we translate
// every keyframe to interpolate() / animate() calls on
// useTimeline().time at port time.

export type RailProduct = {
  id: string;
  /** Display name shown on the hero editorial card (e.g. "The Ember Silk Slip"). */
  name: string;
  /** Garment price text (e.g. "5,680"). */
  price: string;
  /** Price unit suffix (e.g. "AED"). */
  priceUnit: string;
  /** Two-digit index label shown on the hanger tag (e.g. "01"). */
  indexLabel: string;
  /** Optional garment crop. When present, replaces the silhouette SVG
   *  inside the hanger's garment box. */
  imageUrl?: string;
};

export type RailPalette = {
  /** Paper tone — the scene backdrop. */
  background: string;
  /** Paper "deep" tone used in the radial gradient edge. */
  backgroundDeep: string;
  /** Bone — secondary paper tone / hanger tag fill on dark theme. */
  bone: string;
  /** Ink — dominant text colour. */
  ink: string;
  /** Bronze accent — kicker, tick, dot, hero glow. */
  accent: string;
  /** Foil highlight colour. */
  foil: string;
  /** Cta button background. */
  ctaBg: string;
  /** Cta button text. */
  ctaText: string;
};

export type RailProps = {
  // Brand / top chrome
  boutiqueName: string;
  logo?: string;
  /** Backing image — optional. When set, REPLACES the paper gradient
   *  background entirely. Data URL (uploaded via the editor). */
  backgroundImage?: string;

  // Kicker row
  kickerText: string; // e.g. "The Rail · April Edit"

  // Products — 5 to 8 hangers on the rail. The hero is always index 5
  // of the set (mechanic is built around the middle-of-eight landing
  // under safe-cx). When fewer than 6 products are provided, the hero
  // index is clamped to the last one.
  products: RailProduct[];
  /** Zero-based index of the hero product within `products`. */
  heroIndex: number;

  // Hero editorial label
  editKicker: string;   // e.g. "Chosen For You"
  heroSizes: string;    // e.g. "Size S M L" — joined with price on hero card

  // Capsule line (9:16 only)
  capsuleCount: string; // e.g. "20"
  capsuleWord1: string; // e.g. "Pieces"
  capsuleWord2: string; // e.g. "April Rail"
  capsuleWord3: string; // e.g. "Ounass.ae"

  // CTA + byline
  ctaText: string;
  bylineStart: string;
  bylineItalic: string;

  // Themed palette (supportsThemes: true).
  colors: { light: RailPalette; dark: RailPalette };
};

const lightPalette: RailPalette = {
  background: '#F5F0E8',
  backgroundDeep: '#E8DFD0',
  bone: '#E8E1D4',
  ink: '#121212',
  accent: '#B87253',
  foil: '#C89466',
  ctaBg: '#121212',
  ctaText: '#F5F0E8',
};

const darkPalette: RailPalette = {
  background: '#0F0E0C',
  backgroundDeep: '#080706',
  bone: '#1A1815',
  ink: '#EDE5D6',
  accent: '#D89A6E',
  foil: '#E0AB7D',
  // On dark the HTML keeps ink-on-cream CTA behaviour (bone pill, ink text).
  ctaBg: '#EDE5D6',
  ctaText: '#0F0E0C',
};

export const defaultProps: RailProps = {
  boutiqueName: 'Ounass',
  logo: undefined,
  backgroundImage: undefined,

  kickerText: 'The Rail · April Edit',

  products: [
    { id: 'r1', name: 'Tailored Wool Coat',    price: '2,890', priceUnit: 'AED', indexLabel: '01' },
    { id: 'r2', name: 'Satin Slip Dress',      price: '1,450', priceUnit: 'AED', indexLabel: '02' },
    { id: 'r3', name: 'Belted Trench',         price: '3,120', priceUnit: 'AED', indexLabel: '03' },
    { id: 'r4', name: 'Pleated Midi Skirt',    price: '980',   priceUnit: 'AED', indexLabel: '04' },
    { id: 'r5', name: 'Wide-Leg Trouser',      price: '4,340', priceUnit: 'AED', indexLabel: '05' },
    { id: 'r6', name: 'The Ember Silk Slip',   price: '5,680', priceUnit: 'AED', indexLabel: '06' },
    { id: 'r7', name: 'Ribbed Cashmere Knit',  price: '2,220', priceUnit: 'AED', indexLabel: '07' },
    { id: 'r8', name: 'Poplin Shirt',          price: '1,780', priceUnit: 'AED', indexLabel: '08' },
  ],
  heroIndex: 5,

  editKicker: 'Chosen For You',
  heroSizes: 'Size S M L',

  capsuleCount: '20',
  capsuleWord1: 'Pieces',
  capsuleWord2: 'April Rail',
  capsuleWord3: 'Ounass.ae',

  ctaText: 'Shop The Rail',
  bylineStart: 'Twenty pieces.',
  bylineItalic: "One editor's eye.",

  colors: {
    light: lightPalette,
    dark: darkPalette,
  },
};
