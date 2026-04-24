// New In — schema & defaults.
//
// Mechanic: freshness / dated arrivals ticker. A timestamped header frames
// four just-landed pieces advancing as an editorial filmstrip with index
// pips (01/04 meter), dwelling 1.75s per product, then resolves to a 2x2
// recap grid + CTA.
//
// Ported from the Claude-Design HTML prototype `NewIn.html`. CSS keyframes
// in the prototype are translated to interpolate() calls on
// useTimeline().time at port time. The scene supports theming via a
// `{ light, dark }` colors object.

export type NewInProduct = {
  id: string;
  /** Primary image URL / data URL for the card + recap cell. */
  imageUrl?: string;
  /** Short category chip ("BLOUSE", "TROUSER", …). */
  category: string;
  /** Italic-serif designer/brand line on the card ("Khaite"). */
  brand: string;
  /** Full product name shown under the ticker ("Silk crepe blouse"). */
  name: string;
  /** Price as already-composed string ("2,450 AED"). */
  price: string;
  /** Compact price for the recap cell corner ("2,450"). */
  recapPrice: string;
};

export type NewInPalette = {
  /** Paper tone — the scene backdrop. */
  background: string;
  /** Paper "deep" tone used in the radial gradient edge. */
  backgroundDeep: string;
  /** Card bone / cream panel behind each product. */
  bone: string;
  /** Ink — dominant text colour. */
  ink: string;
  /** Bronze accent — used for the decorative bleed word "new". */
  accent: string;
  /** CTA button background. */
  ctaBg: string;
  /** CTA button text (contrast with ctaBg). */
  ctaText: string;
  /** "JUST IN" ribbon background. */
  ribbonBg: string;
  /** "JUST IN" ribbon text. */
  ribbonText: string;
};

export type NewInProps = {
  // Brand / top chrome
  boutiqueName: string;
  logo?: string;
  /** Backing image — optional. When set, REPLACES the paper gradient
   *  background entirely. Data URL (uploaded via the editor). */
  backgroundImage?: string;

  // Header
  kicker: string;          // e.g. "ARRIVED · THIS WEEK"
  dateLine: string;        // e.g. "24 April  |  Spring Arrivals"

  // Decorative serif "new" word that bleeds across the back.
  bleedWord: string;

  // Products (exactly 4 — the meter / ticker / recap grid are built for 4)
  products: NewInProduct[];

  // Recap header
  recapTitle: string;      // e.g. "The edit"
  recapCount: string;      // e.g. "4 PIECES"

  // CTA + byline
  ctaText: string;         // e.g. "Shop New In"
  byline: string;          // e.g. "Complimentary delivery · Free returns"

  // Themed palette (supportsThemes: true).
  colors: { light: NewInPalette; dark: NewInPalette };
};

const lightPalette: NewInPalette = {
  background: '#F5F0E8',
  backgroundDeep: '#EFE7DA',
  bone: '#E4DED5',
  ink: '#121212',
  accent: '#B87253',
  ctaBg: '#121212',
  ctaText: '#F5F0E8',
  ribbonBg: '#121212',
  ribbonText: '#F5F0E8',
};

const darkPalette: NewInPalette = {
  background: '#0F0E0C',
  backgroundDeep: '#080706',
  bone: '#1A1815',
  ink: '#EDE5D6',
  accent: '#D89A6E',
  // Invert CTA on dark: pale pill, dark text.
  ctaBg: '#EDE5D6',
  ctaText: '#0F0E0C',
  ribbonBg: '#EDE5D6',
  ribbonText: '#0F0E0C',
};

export const defaultProps: NewInProps = {
  boutiqueName: 'Ounass',
  logo: undefined,
  backgroundImage: undefined,

  kicker: 'ARRIVED · THIS WEEK',
  dateLine: '24 April  |  Spring Arrivals',

  bleedWord: 'new',

  products: [
    {
      id: 'p1',
      imageUrl: undefined,
      category: 'BLOUSE',
      brand: 'Khaite',
      name: 'Silk crepe blouse',
      price: '2,450 AED',
      recapPrice: '2,450',
    },
    {
      id: 'p2',
      imageUrl: undefined,
      category: 'TROUSER',
      brand: 'The Row',
      name: 'Pleated wide-leg trouser',
      price: '3,120 AED',
      recapPrice: '3,120',
    },
    {
      id: 'p3',
      imageUrl: undefined,
      category: 'SHOES',
      brand: 'Aeyde',
      name: 'Leather pointed flat',
      price: '2,890 AED',
      recapPrice: '2,890',
    },
    {
      id: 'p4',
      imageUrl: undefined,
      category: 'HANDBAG',
      brand: 'Wandler',
      name: 'Soft structured tote',
      price: '4,680 AED',
      recapPrice: '4,680',
    },
  ],

  recapTitle: 'The edit',
  recapCount: '4 PIECES',

  ctaText: 'Shop New In',
  byline: 'Complimentary delivery · Free returns',

  colors: {
    light: lightPalette,
    dark: darkPalette,
  },
};
