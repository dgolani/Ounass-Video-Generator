// Phillip Lim template — schema & default props.
// Phase 0: types + defaults only. Phase 1 reads this to generate the editor panel.

import skirt from './images/skirt.png';
import trouser from './images/trouser.png';
import top from './images/top.png';
import denim from './images/denim.png';
import dress from './images/dress.png';

export type PhillipLimProduct = {
  id: string;
  src: string;
  name: string;
  price: string;
  color: string;
};

export type PhillipLimColors = {
  background: string;
  paper: string;
  accent: string;
  accentDark: string;
};

export type PhillipLimProps = {
  // Act 1 — title whisper
  kicker: string;
  brand: string;
  tagline: string;

  // Act 2 — columns caption
  act2Kicker: string;
  act2TitleLine1: string;
  act2TitleLine2: string;

  // Products (used by Acts 2 & 3)
  products: PhillipLimProduct[];

  // Act 4 — outro + CTA
  outroKicker: string;
  boutiqueName: string;
  boutiqueTagline: string;
  ctaText: string;
  ctaFooter: string;

  // Social-UI chrome
  igHandle: string;
  igSubtitle: string;
  watermark: string;

  /** Optional boutique logo (data URL). When present, Act 4 renders it in
   *  place of the Fraunces wordmark text. */
  logo?: string;

  colors: PhillipLimColors;
};

export const defaultProps: PhillipLimProps = {
  kicker: "On Ounass · Spring '26",
  brand: '3.1 Phillip Lim',
  tagline: 'a study in quiet power',

  act2Kicker: 'Five Pieces · One Mood',
  act2TitleLine1: 'The Considered',
  act2TitleLine2: 'Wardrobe',

  products: [
    { id: 'skirt',   src: skirt,   name: 'Eyelet Wrap Midi Skirt',      price: '2,480 AED', color: 'Midnight' },
    { id: 'trouser', src: trouser, name: 'Drawstring Wide-leg Trouser', price: '1,890 AED', color: 'Ivory' },
    { id: 'top',     src: top,     name: 'Structured Shoulder Top',     price: '2,120 AED', color: 'Noir' },
    { id: 'denim',   src: denim,   name: 'Pashli Denim Mini Bag',       price: '3,650 AED', color: 'Indigo' },
    { id: 'dress',   src: dress,   name: 'Printed Silk Midi Dress',     price: '4,280 AED', color: 'Emerald' },
  ],

  outroKicker: '— Exclusively at —',
  boutiqueName: 'Ounass',
  boutiqueTagline: 'The definitive home of luxury.',
  ctaText: 'Shop 3.1 Phillip Lim',
  ctaFooter: 'Tap · Delivered in 60 minutes · Dubai & Abu Dhabi',

  igHandle: 'ounass',
  igSubtitle: 'Sponsored · Shop now',
  watermark: 'Ounass',

  logo: undefined,

  colors: {
    background: '#0A0A0A',
    paper: '#F5F3EF',
    accent: '#C49373',
    accentDark: '#9C6B48',
  },
};
