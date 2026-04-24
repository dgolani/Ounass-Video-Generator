import { defaultProps, type SeasonalProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<SeasonalProps> = {
  id: 'seasonal',
  name: 'Seasonal Campaign — SS Editorial',
  description:
    'Three-word typographic refrain with floating product vignettes, closing on a sun-lit dark hold frame.',
  defaultDuration: 16,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'word-1', label: 'Word 1', start: 0, end: 3.0 },
    { id: 'word-2', label: 'Word 2', start: 3.0, end: 6.0 },
    { id: 'word-3', label: 'Word 3', start: 6.0, end: 9.0 },
    { id: 'products', label: 'Products float', start: 1.0, end: 10.3 },
    { id: 'final', label: 'Sun-lit hold', start: 11.5, end: 16.0 },
  ],
  defaultProps,
};
