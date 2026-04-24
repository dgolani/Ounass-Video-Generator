import { defaultProps, type CollabProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<CollabProps> = {
  id: 'the-collab',
  category: 'lockup',
  name: 'The Collab — Two Houses',
  description:
    'Co-signed partnership: two wordmarks drift in from opposite sides, a bronze-foil × stamps between them, three pieces fan in below, then CTA.',
  defaultDuration: 11.0,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'kicker', label: 'Kicker', start: 0.0, end: 0.8 },
    { id: 'lockup', label: 'Lockup (× stamp)', start: 0.8, end: 3.2 },
    { id: 'edit', label: 'Edit label', start: 3.2, end: 4.2 },
    { id: 'products', label: 'Product trio', start: 4.2, end: 6.8 },
    { id: 'capsule', label: 'Capsule line', start: 6.8, end: 8.4 },
    { id: 'cta', label: 'CTA + byline', start: 8.4, end: 11.0 },
  ],
  defaultProps,
  supportsThemes: true,
};
