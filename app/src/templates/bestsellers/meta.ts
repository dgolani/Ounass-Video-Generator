import { defaultProps, type BestsellersProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<BestsellersProps> = {
  id: 'bestsellers',
  category: 'edit',
  name: 'Bestsellers — Top 5 Countdown',
  description:
    'Ranked 5 → 1 editorial card exchange over a giant italic rank numeral. 14s total with a CTA hold.',
  defaultDuration: 14,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'slot-1', label: 'N° 05', start: 0.4, end: 2.3 },
    { id: 'slot-2', label: 'N° 04', start: 2.3, end: 4.2 },
    { id: 'slot-3', label: 'N° 03', start: 4.2, end: 6.1 },
    { id: 'slot-4', label: 'N° 02', start: 6.1, end: 8.0 },
    { id: 'slot-5', label: 'N° 01', start: 8.0, end: 9.9 },
    { id: 'cta', label: 'CTA hold', start: 9.9, end: 14.0 },
  ],
  defaultProps,
};
