import { defaultProps, type LookbookProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<LookbookProps> = {
  id: 'lookbook',
  name: 'Lookbook — Quiet Power',
  description:
    'Four-act luxury vertical ad: title whisper, column reveal of five pieces, filmstrip with product details, boutique outro with CTA.',
  defaultDuration: 9,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
    { label: '1:1 (Square)', width: 1080, height: 1080 },
  ],
  scenes: [
    { id: 'act-1', label: 'Title whisper', start: 0.0, end: 2.1 },
    { id: 'act-2', label: 'Column reveal', start: 2.0, end: 4.2 },
    { id: 'act-3', label: 'Filmstrip', start: 4.2, end: 7.2 },
    { id: 'act-4', label: 'Outro & CTA', start: 7.0, end: 9.0 },
  ],
  defaultProps,
};
