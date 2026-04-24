// Seasonal Campaign — schema & defaults.
// 16-second SS-style editorial: three-word typographic refrain over a warm
// cream wash with floating product vignettes; closes on a dark hold frame
// with a glowing copper "sun" and a discover-the-collection CTA.

import { photos } from '../../assets/placeholders';

export type SeasonalProduct = {
  id: string;
  src: string;
  /** Position on base 1080×1920 canvas (top-left of the vignette box). */
  x: number;
  y: number;
  /** Rotation in degrees (slight off-axis editorial tilt). */
  rotation: number;
  /** Scale multiplier (0.7–1.0 range). */
  size: number;
};

export type SeasonalColors = {
  background: string;
  backgroundDeep: string;
  cream: string;
  ink: string;
  inkDeep: string;
  accent: string;
  accentDark: string;
};

export type SeasonalProps = {
  // Header
  boutiqueName: string;
  sideEditorialLine: string;

  // Ticker (scrolling top strip)
  tickerItems: string[];

  // Three-word typographic refrain
  word1: string;
  word2: string;
  word3: string;

  // Floating products
  products: SeasonalProduct[];

  // Final frame
  seasonChip: string;         // shown inside the glowing sun disc
  finalKicker: string;
  finalHeadline: string;      // big italic refrain (e.g. "In bloom.")
  finalSubline: string;
  ctaButton: string;

  logo?: string;

  colors: SeasonalColors;
};

export const defaultProps: SeasonalProps = {
  boutiqueName: 'Ounass',
  sideEditorialLine: 'Vol. XII · SS26',

  tickerItems: [
    'Spring / Summer ’26',
    'New in',
    'Discover the edit',
    'DXB · Riyadh · Doha',
    'Vol. XII',
  ],

  word1: 'Summer',
  word2: 'in bloom',
  word3: 'is here',

  products: [
    { id: 'f1', src: photos.blouse,     x: 120, y: 340,  rotation: -8, size: 1.0 },
    { id: 'f2', src: photos.sunglasses, x: 640, y: 380,  rotation: 10, size: 0.85 },
    { id: 'f3', src: photos.handbag,    x: 180, y: 1080, rotation: 6,  size: 0.95 },
    { id: 'f4', src: photos.shoes,      x: 640, y: 1100, rotation: -5, size: 0.90 },
    { id: 'f5', src: photos.jewellery,  x: 370, y: 720,  rotation: 0,  size: 0.75 },
  ],

  seasonChip: '26',
  finalKicker: 'Spring / Summer ’26',
  finalHeadline: 'In bloom.',
  finalSubline: 'Now landed in boutique',
  ctaButton: 'Discover the collection',

  logo: undefined,

  colors: {
    background: '#F5F0E8',       // cream
    backgroundDeep: '#E4DED5',   // bone (gradient deep)
    cream: '#F5F0E8',
    ink: '#121212',
    inkDeep: '#0A0A0A',
    accent: '#B87253',
    accentDark: '#8A4F35',
  },
};
