// Lookbook template — schema & default props.
// 4-act vertical: title whisper → column reveal → filmstrip → boutique outro.

import { photos } from '../../assets/placeholders';

export type LookbookProduct = {
  id: string;
  src: string;
  name: string;
  price: string;
  color: string;
};

export type LookbookColors = {
  background: string;
  paper: string;
  accent: string;
  accentDark: string;
};

export type LookbookProps = {
  // Act 1 — title whisper
  kicker: string;
  brand: string;
  tagline: string;

  // Act 2 — columns caption
  act2Kicker: string;
  act2TitleLine1: string;
  act2TitleLine2: string;

  // Products (used by Acts 2 & 3)
  products: LookbookProduct[];

  // Act 4 — outro + CTA
  outroKicker: string;
  boutiqueName: string;
  boutiqueTagline: string;
  ctaText: string;
  ctaFooter: string;

  /** Optional boutique logo (data URL). When present, Act 4 renders it in
   *  place of the Fraunces wordmark text. */
  logo?: string;

  colors: LookbookColors;
};

export const defaultProps: LookbookProps = {
  kicker: "Spring · 2026",
  brand: 'Atelier',
  tagline: 'a study in quiet power',

  act2Kicker: 'Five Pieces · One Mood',
  act2TitleLine1: 'The Considered',
  act2TitleLine2: 'Wardrobe',

  products: [
    { id: 'p1', src: photos.dress,     name: 'Silk Slip Dress',          price: '4,280 AED', color: 'Midnight' },
    { id: 'p2', src: photos.trouser,   name: 'Wide-leg Wool Trouser',    price: '1,890 AED', color: 'Ivory' },
    { id: 'p3', src: photos.blouse,    name: 'Sculpted Shoulder Blouse', price: '2,120 AED', color: 'Noir' },
    { id: 'p4', src: photos.outerwear, name: 'Belted Camel Coat',        price: '4,920 AED', color: 'Camel' },
    { id: 'p5', src: photos.handbag,   name: 'Pashli Mini Bag',          price: '3,650 AED', color: 'Indigo' },
  ],

  outroKicker: '— Exclusively at —',
  boutiqueName: 'Ounass',
  boutiqueTagline: 'The definitive home of luxury.',
  ctaText: 'Shop the Lookbook',
  ctaFooter: 'Tap · Delivered in 60 minutes · Dubai & Abu Dhabi',

  logo: undefined,

  colors: {
    background: '#0A0A0A',
    paper: '#F5F3EF',
    accent: '#C49373',
    accentDark: '#9C6B48',
  },
};
