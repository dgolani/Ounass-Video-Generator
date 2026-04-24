import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 5,
    hint: 'SVG preferred — the editor can tint it via the Aa button.',
    svgOnly: true,
  },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['intro'] },

  { kind: 'section', label: 'Background image' },
  {
    kind: 'image',
    path: 'backgroundImage',
    label: 'Custom backdrop',
    aspectRatio: 9 / 16,
    hint: 'Optional. When set, replaces the paper gradient entirely in BOTH light and dark modes.',
  },

  { kind: 'section', label: 'Kicker' },
  { kind: 'text', path: 'kicker', label: 'Top kicker (e.g. "THE PAIRING")', sceneIds: ['intro'], role: 'body' },

  { kind: 'section', label: 'Piece A — left card' },
  {
    kind: 'image',
    path: 'pieceA.imageUrl',
    label: 'Piece A image',
    aspectRatio: 3 / 4,
    hint: 'The left piece (e.g. the dress). Replaces the bone placeholder card.',
  },
  { kind: 'text', path: 'pieceA.eyebrow', label: 'Eyebrow (e.g. "01")', sceneIds: ['piece-a'], role: 'body' },
  { kind: 'text', path: 'pieceA.name', label: 'Name (italic serif)', sceneIds: ['piece-a'], role: 'display', multiline: true },
  { kind: 'text', path: 'pieceA.price', label: 'Price', sceneIds: ['piece-a'], role: 'numeric' },

  { kind: 'section', label: 'Piece B — right card' },
  {
    kind: 'image',
    path: 'pieceB.imageUrl',
    label: 'Piece B image',
    aspectRatio: 3 / 4,
    hint: 'The right piece (e.g. the handbag). Replaces the bone placeholder card.',
  },
  { kind: 'text', path: 'pieceB.eyebrow', label: 'Eyebrow (e.g. "02")', sceneIds: ['piece-b'], role: 'body' },
  { kind: 'text', path: 'pieceB.name', label: 'Name (italic serif)', sceneIds: ['piece-b'], role: 'display', multiline: true },
  { kind: 'text', path: 'pieceB.price', label: 'Price', sceneIds: ['piece-b'], role: 'numeric' },

  { kind: 'section', label: 'Pair lockup' },
  { kind: 'text', path: 'totalLabel', label: 'Total eyebrow (e.g. "THE PAIR")', sceneIds: ['pair'], role: 'body' },
  { kind: 'text', path: 'totalPrice', label: 'Total price (digits only)', sceneIds: ['pair'], role: 'numeric' },
  { kind: 'text', path: 'totalCurrency', label: 'Currency suffix (e.g. "AED")', sceneIds: ['pair'], role: 'body' },
  { kind: 'text', path: 'pairCaption', label: 'Italic caption', sceneIds: ['pair'], role: 'display' },

  { kind: 'section', label: 'CTA + byline' },
  { kind: 'text', path: 'ctaText', label: 'CTA button', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'bylineStart', label: 'Byline first part', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'bylineItalic', label: 'Byline italic tail', sceneIds: ['cta'], role: 'body' },

  { kind: 'section', label: 'Light palette' },
  { kind: 'color', path: 'colors.light.background', label: 'Paper' },
  { kind: 'color', path: 'colors.light.backgroundDeep', label: 'Paper edge (gradient deep)' },
  { kind: 'color', path: 'colors.light.card', label: 'Card stock' },
  { kind: 'color', path: 'colors.light.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.light.accent', label: 'Bronze accent' },
  { kind: 'color', path: 'colors.light.operatorBg', label: 'Operator badge bg' },
  { kind: 'color', path: 'colors.light.operatorInk', label: 'Operator glyph' },
  { kind: 'color', path: 'colors.light.ctaBg', label: 'CTA pill bg' },
  { kind: 'color', path: 'colors.light.ctaText', label: 'CTA pill text' },

  { kind: 'section', label: 'Dark palette' },
  { kind: 'color', path: 'colors.dark.background', label: 'Paper (dark)' },
  { kind: 'color', path: 'colors.dark.backgroundDeep', label: 'Paper edge (dark)' },
  { kind: 'color', path: 'colors.dark.card', label: 'Card stock (dark)' },
  { kind: 'color', path: 'colors.dark.ink', label: 'Ink (light on dark)' },
  { kind: 'color', path: 'colors.dark.accent', label: 'Bronze accent (dark)' },
  { kind: 'color', path: 'colors.dark.operatorBg', label: 'Operator badge bg (dark)' },
  { kind: 'color', path: 'colors.dark.operatorInk', label: 'Operator glyph (dark)' },
  { kind: 'color', path: 'colors.dark.ctaBg', label: 'CTA pill bg (dark)' },
  { kind: 'color', path: 'colors.dark.ctaText', label: 'CTA pill text (dark)' },
];
