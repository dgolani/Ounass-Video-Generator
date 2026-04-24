import { defaultProps, type HeroProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<HeroProps> = {
  id: 'hero',
  category: 'single',
  name: 'Hero — Single Piece',
  description:
    'One product, full-frame. Slow Ken-Burns zoom through three acts: reveal → copy lockup → CTA. Tests single-product schema (not an array).',
  defaultDuration: 8,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'reveal', label: 'Reveal', start: 0.0, end: 2.2 },
    { id: 'copy', label: 'Copy lockup', start: 2.0, end: 5.2 },
    { id: 'cta', label: 'CTA', start: 5.0, end: 8.0 },
  ],
  defaultProps,
};
