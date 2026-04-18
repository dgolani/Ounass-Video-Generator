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
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['word-1', 'word-2', 'word-3', 'products'] },
  { kind: 'text', path: 'sideEditorialLine', label: 'Side editorial line (e.g. "Vol. XII · SS26")', sceneIds: ['word-1', 'word-2', 'word-3', 'products'] },

  { kind: 'section', label: 'Typographic refrain' },
  { kind: 'text', path: 'word1', label: 'Word 1 (e.g. "Summer")', sceneIds: ['word-1'] },
  { kind: 'text', path: 'word2', label: 'Word 2 (e.g. "in bloom")', sceneIds: ['word-2'] },
  { kind: 'text', path: 'word3', label: 'Word 3 (e.g. "is here")', sceneIds: ['word-3'] },

  { kind: 'section', label: 'Floating products' },
  {
    kind: 'productList',
    path: 'products',
    label: 'Products',
    sceneIds: ['products'],
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
      { path: 'x', label: 'X (base 1080)', kind: 'text', sceneIds: ['products'] },
      { path: 'y', label: 'Y (base 1920)', kind: 'text', sceneIds: ['products'] },
      { path: 'rotation', label: 'Rotation (deg)', kind: 'text', sceneIds: ['products'] },
      { path: 'size', label: 'Size (0.7–1.0)', kind: 'text', sceneIds: ['products'] },
    ],
  },

  { kind: 'section', label: 'Final frame' },
  { kind: 'text', path: 'seasonChip', label: 'Season chip (e.g. "26")', sceneIds: ['final'] },
  { kind: 'text', path: 'finalKicker', label: 'Kicker', sceneIds: ['final'] },
  { kind: 'text', path: 'finalHeadline', label: 'Headline', sceneIds: ['final'] },
  { kind: 'text', path: 'finalSubline', label: 'Subline', sceneIds: ['final'] },
  { kind: 'text', path: 'ctaButton', label: 'Button label', sceneIds: ['final'] },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background (cream)' },
  { kind: 'color', path: 'colors.backgroundDeep', label: 'Background deep (bone)' },
  { kind: 'color', path: 'colors.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.inkDeep', label: 'Ink deep (final BG)' },
  { kind: 'color', path: 'colors.accent', label: 'Copper accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Copper deep' },
];
