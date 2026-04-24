// Category Carousel — schema & defaults.
// 13-second 3D-lane carousel through a category edit (e.g. "The Accessories
// Edit"), cards rotate past the camera settling into focus at the center
// before the final copper-stamped CTA bloom.

import { photos } from '../../assets/placeholders';

export type CarouselItem = {
  id: string;
  src: string;
  brandline: string;
  name: string;
  price: string;
};

export type CarouselColors = {
  background: string;
  card: string;
  ink: string;
  accent: string;
  accentDark: string;
};

export type CarouselProps = {
  // Header
  boutiqueName: string;
  categoryLabel: string;

  // Title
  titleKicker: string;
  titleLine1: string;
  titleLine2: string; // rendered italic under line 1

  // Carousel items (3–8 works well)
  items: CarouselItem[];

  // Final frame
  finalStat: string;        // "120+" — stamp content
  finalKicker: string;
  finalHeadline: string;
  finalSubline: string;
  ctaButton: string;

  logo?: string;

  colors: CarouselColors;
};

export const defaultProps: CarouselProps = {
  boutiqueName: 'Ounass',
  categoryLabel: 'Accessories',

  titleKicker: 'The Accessories Edit',
  titleLine1: 'Carry it',
  titleLine2: 'beautifully.',

  items: [
    { id: 'c1', src: photos.handbag,    brandline: 'Saint Laurent',  name: 'Manhattan Tote',       price: '9,750 AED' },
    { id: 'c2', src: photos.sunglasses, brandline: 'Celine',         name: 'Round Acetate Frames', price: '1,890 AED' },
    { id: 'c3', src: photos.watch,      brandline: 'Cartier',        name: 'Tank Française',       price: '32,500 AED' },
    { id: 'c4', src: photos.jewellery,  brandline: 'Tiffany & Co.',  name: 'Solitaire Ring',       price: '14,200 AED' },
    { id: 'c5', src: photos.shoes,      brandline: 'Jimmy Choo',     name: 'Romy Patent Pump',     price: '3,480 AED' },
    { id: 'c6', src: photos.handbag,    brandline: 'Bottega Veneta', name: 'Andiamo Leather',      price: '11,900 AED' },
  ],

  finalStat: '120+',
  finalKicker: 'The Accessories Edit',
  finalHeadline: 'Curated. Carried.',
  finalSubline: '120+ new-in pieces',
  ctaButton: 'Shop accessories',

  logo: undefined,

  colors: {
    background: '#121212',
    card: '#F5F0E8',
    ink: '#121212',
    accent: '#B87253',
    accentDark: '#8A4F35',
  },
};
