import { defaultProps, type NewInProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<NewInProps> = {
  id: 'new-in',
  name: 'New In — Dated Arrivals',
  description:
    'Dated arrivals ticker: four just-landed pieces advance as an editorial filmstrip with an index meter, then resolve to a 2x2 recap grid and CTA.',
  defaultDuration: 12.0,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'intro', label: 'Logo + dated header', start: 0.0, end: 1.1 },
    { id: 'meter', label: 'Index meter wake', start: 1.1, end: 2.2 },
    { id: 'product-1', label: '01 — Product one', start: 2.2, end: 3.95 },
    { id: 'product-2', label: '02 — Product two', start: 3.95, end: 5.7 },
    { id: 'product-3', label: '03 — Product three', start: 5.7, end: 7.45 },
    { id: 'product-4', label: '04 — Product four', start: 7.45, end: 9.2 },
    { id: 'recap', label: 'Recap grid', start: 9.2, end: 10.6 },
    { id: 'cta', label: 'CTA + byline', start: 10.6, end: 12.0 },
  ],
  defaultProps,
  supportsThemes: true,
};
