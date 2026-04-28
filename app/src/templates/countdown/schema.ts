import { salePlaceholder } from '../../assets/placeholders';

export type CountdownColors = {
  background: string;
  paper: string;
  accent: string;
  accentDark: string;
};

export type CountdownProps = {
  kicker: string;
  headline: string;       // e.g. "50% OFF"
  subhead: string;        // e.g. "Everything"
  body: string;           // longer paragraph
  endsText: string;       // e.g. "Ends Sunday"
  terms: string;
  ctaText: string;
  ctaFooter: string;
  accentImage: string;    // optional accent (can be the placeholder)
  boutiqueName: string;
  logo?: string;
  /** Optional custom backdrop — image data URL or hosted video URL.
   *  When set, REPLACES the solid background. */
  backgroundImage?: string;
  colors: CountdownColors;
};

export const defaultProps: CountdownProps = {
  kicker: 'Limited Time',
  headline: '50% OFF',
  subhead: 'The Luxury Edit',
  body:
    'For three days only, handpicked pieces from your favourite designers at their best prices of the season.',
  endsText: 'Ends Sunday',
  terms: 'Selected styles · While stock lasts',
  ctaText: 'Shop the Sale',
  ctaFooter: 'Free 60-minute delivery · Dubai & Abu Dhabi',
  accentImage: salePlaceholder,
  boutiqueName: 'Ounass',
  logo: undefined,
  backgroundImage: undefined,
  colors: {
    background: '#0A0A0A',
    paper: '#F5F3EF',
    accent: '#C49373',
    accentDark: '#9C6B48',
  },
};
