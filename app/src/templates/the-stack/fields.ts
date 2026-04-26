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
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['intro', 'seal'], noTranslate: true },

  { kind: 'section', label: 'Background image' },
  {
    kind: 'image',
    path: 'backgroundImage',
    label: 'Custom backdrop',
    aspectRatio: 9 / 16,
    hint: 'Optional. When set, replaces the paper gradient entirely in BOTH light and dark modes.',
  },

  { kind: 'section', label: 'Kicker row' },
  { kind: 'text', path: 'kickerSmall', label: 'Left label (e.g. "April")', sceneIds: ['intro'], role: 'body' },
  { kind: 'text', path: 'kickerMain', label: 'Middle label (e.g. "Four Houses")', sceneIds: ['intro'], role: 'body' },
  { kind: 'text', path: 'kickerSmallRight', label: 'Right label (e.g. "Weight")', sceneIds: ['intro'], role: 'body' },

  { kind: 'section', label: 'Plates (4)' },
  {
    kind: 'productList',
    path: 'plates',
    label: 'Brand plates',
    sceneIds: ['plate-1', 'plate-2', 'plate-3', 'plate-4'],
    // plates are text-only — no image key wired in so no drop-zone renders.
    addLabel: '+ Add plate (max 4 supported)',
    minProducts: 4,
    maxProducts: 4,
    newProductTemplate: {
      brand: 'New Brand',
      indexLabel: '05',
      origin: 'City',
      yearRoman: 'MMXXVI',
      subheading: 'SS CAMPAIGN',
    },
    productFields: [
      { path: 'brand', label: 'Brand name', kind: 'text', role: 'display', noTranslate: true },
      { path: 'indexLabel', label: 'Index (e.g. 01)', kind: 'text', role: 'body', noTranslate: true },
      { path: 'origin', label: 'Origin city', kind: 'text', role: 'body', noTranslate: true },
      { path: 'yearRoman', label: 'Year (Roman)', kind: 'text', role: 'body', noTranslate: true },
      { path: 'subheading', label: 'Subheading', kind: 'text', role: 'body' },
    ],
  },

  { kind: 'section', label: 'Bronze foil seal' },
  { kind: 'text', path: 'sealWord1', label: 'Line 1 (italic)', sceneIds: ['seal'], role: 'display' },
  { kind: 'text', path: 'sealWord2', label: 'Line 2 (small caps)', sceneIds: ['seal'], role: 'body' },
  { kind: 'text', path: 'sealWord3', label: 'Line 3 (boutique)', sceneIds: ['seal'], role: 'display', noTranslate: true },

  { kind: 'section', label: 'CTA + byline' },
  { kind: 'text', path: 'ctaText', label: 'CTA button', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'bylineStart', label: 'Byline first part', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'bylineItalic', label: 'Byline italic tail', sceneIds: ['cta'], role: 'display' },

  { kind: 'section', label: 'Light palette' },
  { kind: 'color', path: 'colors.light.background', label: 'Paper' },
  { kind: 'color', path: 'colors.light.backgroundDeep', label: 'Paper edge (gradient deep)' },
  { kind: 'color', path: 'colors.light.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.light.accent', label: 'Bronze accent' },
  { kind: 'color', path: 'colors.light.foil', label: 'Foil highlight' },

  { kind: 'section', label: 'Dark palette' },
  { kind: 'color', path: 'colors.dark.background', label: 'Paper (dark)' },
  { kind: 'color', path: 'colors.dark.backgroundDeep', label: 'Paper edge (dark)' },
  { kind: 'color', path: 'colors.dark.ink', label: 'Ink (light on dark)' },
  { kind: 'color', path: 'colors.dark.accent', label: 'Bronze accent (dark)' },
  { kind: 'color', path: 'colors.dark.foil', label: 'Foil highlight (dark)' },
];
