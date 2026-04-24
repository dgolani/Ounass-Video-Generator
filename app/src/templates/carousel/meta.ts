import { defaultProps, type CarouselProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<CarouselProps> = {
  id: 'carousel',
  name: 'Category Carousel — 3D Edit',
  description:
    '3D-lane carousel through a category edit, each piece settling into focus before the copper-stamped CTA bloom.',
  defaultDuration: 13,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'opening', label: 'Title + rail opens', start: 0.0, end: 1.5 },
    { id: 'cycle', label: 'Carousel cycle', start: 1.5, end: 10.5 },
    { id: 'final', label: 'Copper-stamped CTA', start: 10.5, end: 13.0 },
  ],
  defaultProps,
};
