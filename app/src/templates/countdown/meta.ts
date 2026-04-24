import { defaultProps, type CountdownProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<CountdownProps> = {
  id: 'countdown',
  category: 'moment',
  name: 'Sale Countdown — Blowout',
  description:
    'Bold promo ad: kicker → slammed headline → body + terms → CTA. No product list — copy, one accent image, logo.',
  defaultDuration: 7,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'hook', label: 'Hook', start: 0.0, end: 2.2 },
    { id: 'body', label: 'Body', start: 2.0, end: 5.0 },
    { id: 'cta', label: 'CTA', start: 4.8, end: 7.0 },
  ],
  defaultProps,
};
