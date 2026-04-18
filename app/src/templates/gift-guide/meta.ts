import { defaultProps, type GiftGuideProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<GiftGuideProps> = {
  id: 'gift-guide',
  name: 'Gift Guide — Wrapped Reveal',
  description:
    'Black gift box opens, reveals four curated picks, sparkles pop, copper ribbon ties the frame before the CTA lands.',
  defaultDuration: 11,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
    { label: '1:1 (Square)', width: 1080, height: 1080 },
  ],
  scenes: [
    { id: 'open', label: 'Title + lid opens', start: 0.0, end: 2.2 },
    { id: 'picks', label: 'Picks stagger in', start: 2.2, end: 5.5 },
    { id: 'sparkles', label: 'Sparkles', start: 3.2, end: 5.5 },
    { id: 'ribbon', label: 'Ribbon ties shut', start: 7.5, end: 8.5 },
    { id: 'cta', label: 'Foot CTA', start: 8.2, end: 11.0 },
  ],
  defaultProps,
};
