import { defaultProps, type ReelModularProps } from './schema';
import type { TemplateMeta } from '../types';

/** Total duration is dynamic — recomputed each render from the four
 *  `*Dur` fields. The static value here is only used as the project's
 *  initial duration when a new project is created from this template
 *  (matches the sum of the schema defaults). */
export const meta: TemplateMeta<ReelModularProps> = {
  id: 'the-reel-modular',
  category: 'edit',
  name: 'The Reel — Modular',
  description:
    'Same 4-scene editorial spot as The Reel, but each scene slot exposes a variant selector. Today scene 2 (content) has four variants — phone-preview, heading-products, vouri-plp, gravity-collapse — and each variant exposes its own field set. Other slots are single-variant for now; the architecture is wired so adding new variants later is a one-line schema + scene branch change.',
  defaultDuration: 12.0,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 's1', label: 'Intro', start: 0.0, end: 2.5 },
    { id: 's2', label: 'Content', start: 2.5, end: 6.5 },
    { id: 's3', label: 'USPs', start: 6.5, end: 9.0 },
    { id: 's4', label: 'Finale', start: 9.0, end: 12.0 },
  ],
  defaultProps,
};
