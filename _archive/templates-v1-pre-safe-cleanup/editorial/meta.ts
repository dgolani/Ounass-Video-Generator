import { defaultProps, type EditorialProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<EditorialProps> = {
  id: 'editorial',
  name: 'Editorial — The Edit',
  description:
    'Magazine-style vertical ad: masthead reveal, 2×2 grid of product plates, feature zoom, editor signature sign-off.',
  defaultDuration: 9,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
    { label: '1:1 (Square)', width: 1080, height: 1080 },
  ],
  scenes: [
    { id: 'masthead', label: 'Masthead', start: 0.0, end: 2.0 },
    { id: 'grid', label: 'Grid reveal', start: 1.8, end: 5.6 },
    { id: 'feature', label: 'Feature', start: 5.4, end: 7.6 },
    { id: 'closing', label: 'Signature', start: 7.4, end: 9.0 },
  ],
  defaultProps,
};
