import { defaultProps, type PairingProps } from './schema';
import type { TemplateMeta } from '../types';

export const meta: TemplateMeta<PairingProps> = {
  id: 'the-pairing',
  name: 'The Pairing — Styled Duo',
  description:
    'Two products reveal separately, their prices add up through a "+" that morphs to "=", the cards converge, and a styled pair lockup invites the viewer to shop the duo.',
  defaultDuration: 11.0,
  aspects: [
    { label: '9:16 (Story)', width: 1080, height: 1920 },
    { label: '4:5 (Feed)', width: 1080, height: 1350 },
  ],
  scenes: [
    { id: 'intro', label: 'Logo + kicker', start: 0.0, end: 0.8 },
    { id: 'piece-a', label: 'Piece A reveal', start: 0.8, end: 3.2 },
    { id: 'piece-b', label: 'Piece B reveal', start: 3.2, end: 5.6 },
    { id: 'converge', label: 'Convergence', start: 5.6, end: 7.8 },
    { id: 'pair', label: 'Pair lockup', start: 7.8, end: 9.6 },
    { id: 'cta', label: 'CTA + byline', start: 9.6, end: 11.0 },
  ],
  defaultProps,
  supportsThemes: true,
};
