import { defaultProps, type StackProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<StackProps> = {
  id: 'the-stack',
  name: 'The Stack — Four Houses',
  description:
    'Four luxury houses drop as metallic bullion plates, stacking with gravity; the stack compresses on each landing and locks with a bronze-foil seal stamp.',
  defaultDuration: 10.5,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'intro', label: 'Logo + kicker', start: 0.0, end: 0.9 },
    { id: 'plate-1', label: 'Plate 01', start: 0.9, end: 2.1 },
    { id: 'plate-2', label: 'Plate 02', start: 2.1, end: 3.3 },
    { id: 'plate-3', label: 'Plate 03', start: 3.3, end: 4.5 },
    { id: 'plate-4', label: 'Plate 04', start: 4.5, end: 5.7 },
    { id: 'index', label: 'Index column', start: 5.7, end: 7.3 },
    { id: 'seal', label: 'Foil seal', start: 7.3, end: 8.4 },
    { id: 'cta', label: 'CTA + byline', start: 8.4, end: 10.5 },
  ],
  defaultProps,
  supportsThemes: true,
};
