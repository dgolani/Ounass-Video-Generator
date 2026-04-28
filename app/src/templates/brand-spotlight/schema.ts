// Brand Spotlight — schema & defaults.
// 15-second designer / house feature: letter-poured wordmark, single hero
// product, a designer quote, a small strip of companion pieces, closing on
// the house monogram hold frame with CTA.

import { photos } from '../../assets/placeholders';

export type SpotlightHero = {
  src: string;
  brandline: string;
  name: string;
  price: string;
};

export type SpotlightColors = {
  background: string;
  backgroundDeep: string;
  cream: string;
  paper: string;
  ink: string;
  accent: string;
  accentDark: string;
};

export type SpotlightProps = {
  // Top
  boutiqueName: string;
  presentsLabel: string;

  // Act 1 — letter reveal
  featuredBrand: string;   // the name that pours in letter-by-letter
  brandTag: string;        // "MILANO · EST. 1978"

  // Act 2 — hero product
  hero: SpotlightHero;

  // Act 3 — quote
  quote: string;           // multi-line OK; use \n in display
  quoteAttrib: string;

  // Small strip of 5 companion pieces
  stripSrcs: string[];

  // Act 4 — final hold
  finalMono: string;       // big italic monogram (e.g. "GA")
  finalKicker: string;
  finalHead: string;
  finalMeta: string;
  ctaButton: string;

  logo?: string;

  /** Optional custom backdrop — image data URL or hosted video URL.
   *  When set, REPLACES the dark background + copper radial. */
  backgroundImage?: string;

  colors: SpotlightColors;
};

export const defaultProps: SpotlightProps = {
  boutiqueName: 'Ounass',
  presentsLabel: 'Ounass presents',

  featuredBrand: 'Armani',
  brandTag: 'Milano · Est. 1978',

  hero: {
    src: photos.outerwear,
    brandline: 'Giorgio Armani',
    name: 'Signature Belted Coat',
    price: '14,200 AED',
  },

  quote:
    '“Elegance is not about being noticed. It’s about being remembered.”',
  quoteAttrib: '— Giorgio Armani',

  stripSrcs: [
    photos.trouser,
    photos.blouse,
    photos.dress,
    photos.knitwear,
    photos.shoes,
  ],

  finalMono: 'GA',
  finalKicker: 'Designer spotlight',
  finalHead: 'Giorgio Armani.',
  finalMeta: '68 new-in pieces · Now at Ounass',
  ctaButton: 'Shop Giorgio Armani',

  logo: undefined,
  backgroundImage: undefined,

  colors: {
    background: '#121212',
    backgroundDeep: '#0F0F0F',
    cream: '#F5F0E8',
    paper: '#EDE9E2',
    ink: '#121212',
    accent: '#B87253',
    accentDark: '#8A4F35',
  },
};
