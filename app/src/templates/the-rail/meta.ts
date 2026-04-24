import { defaultProps, type RailProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<RailProps> = {
  id: 'the-rail',
  category: 'edit',
  name: 'The Rail — Editor Pick',
  description:
    'A horizontal dolly of eight hangers slides across frame; one ignites with a bronze glow, the rail stops centered, non-heroes fade, and the hero rises as "THE EDIT" — pulled for you.',
  defaultDuration: 12.0,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'intro', label: 'Logo + kicker', start: 0.0, end: 0.8 },
    { id: 'rail-dolly', label: 'Rail dollies across', start: 0.8, end: 6.0 },
    { id: 'rail-stop', label: 'Rail decelerates', start: 6.0, end: 6.8 },
    { id: 'focus-pull', label: 'Non-heroes fade', start: 6.8, end: 7.8 },
    { id: 'hero-lift', label: 'Hero rises + label', start: 7.8, end: 8.8 },
    { id: 'capsule', label: 'Capsule line', start: 8.8, end: 10.5 },
    { id: 'cta', label: 'CTA + byline', start: 10.5, end: 12.0 },
  ],
  defaultProps,
  supportsThemes: true,
};
