import { defaultProps, type SpotlightProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<SpotlightProps> = {
  id: 'brand-spotlight',
  category: 'single',
  name: 'Brand Spotlight — Designer Feature',
  description:
    'Letter-poured wordmark, single hero coat, a designer quote, closing on the house monogram.',
  defaultDuration: 15,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'letters', label: 'Letters pour in', start: 0.0, end: 3.5 },
    { id: 'hero', label: 'Hero product', start: 3.5, end: 8.0 },
    { id: 'strip', label: 'Companion strip', start: 5.5, end: 7.9 },
    { id: 'quote', label: 'Designer quote', start: 8.0, end: 11.5 },
    { id: 'final', label: 'Monogram hold', start: 11.5, end: 15.0 },
  ],
  defaultProps,
};
