import { heroSilhouette } from '../../assets/placeholders';

export type HeroProduct = {
  image: string;
  name: string;
  category: string;
  price: string;
};

export type HeroColors = {
  background: string;
  paper: string;
  accent: string;
  accentDark: string;
};

export type HeroProps = {
  preTitle: string;
  headlineLine1: string;
  headlineLine2: string;
  subhead: string;
  product: HeroProduct;
  boutiqueName: string;
  ctaText: string;
  ctaFooter: string;
  logo?: string;
  /** Optional custom backdrop — image data URL or hosted video URL.
   *  When set, REPLACES the solid background. */
  backgroundImage?: string;
  colors: HeroColors;
};

export const defaultProps: HeroProps = {
  preTitle: "Arriving now",
  headlineLine1: 'A Singular',
  headlineLine2: 'Silhouette',
  subhead: 'Spring ready-to-wear, one piece at a time.',
  product: {
    image: heroSilhouette,
    name: 'The Column Dress',
    category: 'Ready-to-wear',
    price: '4,280 AED',
  },
  boutiqueName: 'Ounass',
  ctaText: 'Shop Now',
  ctaFooter: 'Delivered in 60 minutes · Dubai & Abu Dhabi',
  logo: undefined,
  backgroundImage: undefined,
  colors: {
    background: '#0F0C0A',
    paper: '#F5F3EF',
    accent: '#C49373',
    accentDark: '#9C6B48',
  },
};
