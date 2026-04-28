import { defaultProps, type ReelProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<ReelProps> = {
  id: 'the-reel',
  category: 'edit',
  name: 'The Reel — Video Reel',
  description:
    'Full-bleed B-roll video plays behind four editorial overlays: a wordmark intro, a phone reveal with the product image swiping in, two USP flashes, and a Discover-on-Ounass CTA.',
  defaultDuration: 12.0,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 's1', label: 'Wordmark', start: 0.0, end: 2.5 },
    { id: 's2', label: 'Phone reveal', start: 2.5, end: 6.5 },
    { id: 's3', label: 'USP flashes', start: 6.5, end: 9.0 },
    { id: 's4', label: 'Discover + CTA', start: 9.0, end: 12.0 },
  ],
  defaultProps,
};
