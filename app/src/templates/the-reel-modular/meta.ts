import { computeTimeline, defaultProps, type ReelModularProps } from './schema';
import type { TemplateMeta } from '../types';

/** Total duration is dynamic — `computeDuration` is read by the editor
 *  on every props change and used to auto-sync the project's stored
 *  duration so the full template runtime always fits. The static
 *  defaultDuration below is only the initial value when a new
 *  project is created (= sum of the schema defaults). */
export const meta: TemplateMeta<ReelModularProps> = {
  id: 'the-reel-modular',
  category: 'edit',
  name: 'The Reel — Modular',
  description:
    'Same 4-scene editorial spot as The Reel, but each scene slot exposes a variant selector. Scene 2 (content) currently has four variants — phone-preview, heading-products, vouri-plp, gravity-collapse — and each variant exposes its own field set. Total runtime is dynamic; the editor auto-syncs the project duration so the full template fits regardless of variant or product count.',
  defaultDuration: computeTimeline(defaultProps).total,
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
  computeDuration: (props) => computeTimeline(props).total,
};
