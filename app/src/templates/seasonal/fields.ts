import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Shown centred in the top bar.',
  },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name' },
  { kind: 'text', path: 'sideEditorialLine', label: 'Side editorial line (e.g. "Vol. XII · SS26")' },

  { kind: 'section', label: 'Typographic refrain' },
  { kind: 'text', path: 'word1', label: 'Word 1 (e.g. "Summer")' },
  { kind: 'text', path: 'word2', label: 'Word 2 (e.g. "in bloom")' },
  { kind: 'text', path: 'word3', label: 'Word 3 (e.g. "is here")' },

  { kind: 'section', label: 'Floating products' },
  {
    kind: 'productList',
    path: 'products',
    label: 'Products',
    imagePath: 'src',
    addLabel: '+ Add floating product',
    minProducts: 2,
    maxProducts: 8,
    newProductTemplate: {
      src: '',
      x: 300,
      y: 800,
      rotation: 0,
      size: 0.9,
    },
    productFields: [
      { path: 'x', label: 'X (base 1080)', kind: 'text' },
      { path: 'y', label: 'Y (base 1920)', kind: 'text' },
      { path: 'rotation', label: 'Rotation (deg)', kind: 'text' },
      { path: 'size', label: 'Size (0.7–1.0)', kind: 'text' },
    ],
  },

  { kind: 'section', label: 'Final frame' },
  { kind: 'text', path: 'seasonChip', label: 'Season chip (e.g. "26")' },
  { kind: 'text', path: 'finalKicker', label: 'Kicker' },
  { kind: 'text', path: 'finalHeadline', label: 'Headline' },
  { kind: 'text', path: 'finalSubline', label: 'Subline' },
  { kind: 'text', path: 'ctaButton', label: 'Button label' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background (cream)' },
  { kind: 'color', path: 'colors.backgroundDeep', label: 'Background deep (bone)' },
  { kind: 'color', path: 'colors.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.inkDeep', label: 'Ink deep (final BG)' },
  { kind: 'color', path: 'colors.accent', label: 'Copper accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Copper deep' },
];
