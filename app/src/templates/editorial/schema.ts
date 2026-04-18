import { photos } from '../../assets/placeholders';

export type EditorialProduct = {
  id: string;
  src: string;
  name: string;
  category: string;
};

export type EditorialColors = {
  paper: string;
  ink: string;
  accent: string;
  rule: string;
};

export type EditorialProps = {
  // Masthead
  masthead: string;
  issueDate: string;

  // Headline
  headlineLine1: string;
  headlineLine2: string;
  byline: string;

  // Grid: always 4 products in a 2×2
  products: EditorialProduct[];

  // Feature (the zoom on Product 1)
  featureCaption: string;

  // Closing
  closingKicker: string;
  signatureText: string;
  boutiqueName: string;
  ctaText: string;
  ctaFooter: string;

  logo?: string;
  colors: EditorialColors;
};

export const defaultProps: EditorialProps = {
  masthead: 'Volume XII',
  issueDate: "Autumn · 2026",

  headlineLine1: 'The Considered',
  headlineLine2: 'Edit',
  byline: 'Four pieces · One story',

  products: [
    { id: 'e1', src: photos.dress,    name: 'Silk Slip Dress',          category: 'Dress' },
    { id: 'e2', src: photos.trouser,  name: 'Wide-leg Trouser',         category: 'Tailoring' },
    { id: 'e3', src: photos.blouse,   name: 'Sculpted Shoulder Blouse', category: 'Top' },
    { id: 'e4', src: photos.handbag,  name: 'Pashli Mini Bag',          category: 'Accessory' },
  ],

  featureCaption: "A study in restraint — soft fabrics, deliberate lines, a quiet confidence that carries the season.",

  closingKicker: 'Available now at',
  signatureText: "The Editors",
  boutiqueName: 'Ounass',
  ctaText: 'Shop the Edit',
  ctaFooter: 'Delivered in 60 minutes · Dubai & Abu Dhabi',

  logo: undefined,

  colors: {
    paper: '#F6F3EF',
    ink: '#1A1A1A',
    accent: '#9C6B48',
    rule: '#BBBBBB',
  },
};
