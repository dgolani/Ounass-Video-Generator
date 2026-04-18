// Bestsellers Countdown — schema & defaults.
// 14-second ranked countdown: 5 ranked products slide through against a
// giant italic rank numeral, closing on a "Shop the edit" CTA hold.

import { photos } from '../../assets/placeholders';

export type BestsellersProduct = {
  id: string;
  src: string;
  /** Rank number (shown top-right + as the giant background numeral). */
  rank: number;
  /** Designer / brand name (italic serif line). */
  brandline: string;
  /** Product name (smaller sans line under the brand). */
  name: string;
  /** Price string with currency (e.g. "4,850 AED"). */
  price: string;
};

export type BestsellersColors = {
  background: string;
  paper: string;
  ink: string;
  accent: string;
  accentDark: string;
};

export type BestsellersProps = {
  // Header
  boutiqueName: string;
  headerMeta: string;
  kicker: string;

  // Products in countdown order (first shown = highest rank number)
  products: BestsellersProduct[];

  // Final CTA
  ctaKicker: string;
  ctaHeadline: string;
  ctaButton: string;

  /** Optional boutique logo (data URL). When set, replaces the text
   *  `boutiqueName` in the header. */
  logo?: string;

  colors: BestsellersColors;
};

export const defaultProps: BestsellersProps = {
  boutiqueName: 'Ounass',
  headerMeta: 'The Edit · Spring',
  kicker: 'Bestsellers — Top 5',

  products: [
    { id: 'p5', rank: 5, src: photos.knitwear,   brandline: 'Brunello Cucinelli', name: 'Ribbed Cashmere Knit',   price: '4,850 AED' },
    { id: 'p4', rank: 4, src: photos.sunglasses, brandline: 'Celine',             name: 'Oversized Round Frames', price: '1,890 AED' },
    { id: 'p3', rank: 3, src: photos.outerwear,  brandline: 'Max Mara',           name: 'Belted Wool Trench',     price: '12,400 AED' },
    { id: 'p2', rank: 2, src: photos.handbag,    brandline: 'Saint Laurent',      name: 'Manhattan Leather Tote', price: '9,750 AED' },
    { id: 'p1', rank: 1, src: photos.dress,      brandline: 'The Row',            name: 'Silk Column Gown',       price: '18,200 AED' },
  ],

  ctaKicker: 'The Edit · 2026',
  ctaHeadline: 'Shop the full top 5',
  ctaButton: 'Shop the edit',

  logo: undefined,

  colors: {
    background: '#EDE9E2',     // paper
    paper: '#F5F0E8',          // cream card
    ink: '#121212',
    accent: '#B87253',         // copper
    accentDark: '#8A4F35',
  },
};
