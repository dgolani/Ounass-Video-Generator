// Gift Guide — schema & defaults.
// 11-second gift-box reveal: lid tilts open, 4 curated picks stagger into
// a 2×2 grid with sparkles popping, copper ribbon slides across and ties
// the frame shut before the CTA lands.

import { photos } from '../../assets/placeholders';

export type GiftPick = {
  id: string;
  src: string;
  name: string;
  /** Small caption under the pick name (e.g. "UNDER 15K AED"). */
  sub: string;
};

export type GiftGuideColors = {
  background: string;
  ink: string;
  cream: string;
  accent: string;
  accentDark: string;
};

export type GiftGuideProps = {
  // Header
  boutiqueName: string;
  kicker: string;
  headLine1: string;
  headLine2: string;

  // Gift box lid
  boxLabel: string; // shown in italic on the lid

  // Picks (4 works best — 2×2 grid)
  picks: GiftPick[];

  // Ribbon tag
  ribbonLabel: string;

  // Foot CTA
  footKicker: string;
  footHead: string;
  ctaButton: string;

  logo?: string;

  colors: GiftGuideColors;
};

export const defaultProps: GiftGuideProps = {
  boutiqueName: 'Ounass',
  kicker: 'The Gift Edit',
  headLine1: 'For',
  headLine2: 'her, with love.',

  boxLabel: 'Ounass',

  picks: [
    { id: 'g1', src: photos.jewellery,  name: 'Solitaire', sub: 'UNDER 15K AED' },
    { id: 'g2', src: photos.sunglasses, name: 'Frames',    sub: 'UNDER 2K AED' },
    { id: 'g3', src: photos.watch,      name: 'Timepiece', sub: 'UNDER 35K AED' },
    { id: 'g4', src: photos.handbag,    name: 'Leather',   sub: 'UNDER 10K AED' },
  ],

  ribbonLabel: 'Gifted',

  footKicker: 'Complimentary gift wrap',
  footHead: 'Wrap it beautifully.',
  ctaButton: 'Shop the gift edit',

  logo: undefined,

  colors: {
    background: '#EDE9E2',
    ink: '#121212',
    cream: '#F5F0E8',
    accent: '#B87253',
    accentDark: '#8A4F35',
  },
};
