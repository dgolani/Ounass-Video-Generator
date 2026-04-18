import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Shown above the opening headline.',
  },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name' },

  { kind: 'section', label: 'Opening' },
  { kind: 'text', path: 'kicker', label: 'Kicker' },
  { kind: 'text', path: 'headLine1', label: 'Headline — line 1' },
  { kind: 'text', path: 'headLine2', label: 'Headline — line 2' },

  { kind: 'section', label: 'Gift box' },
  { kind: 'text', path: 'boxLabel', label: 'Lid label (italic)' },
  { kind: 'text', path: 'ribbonLabel', label: 'Ribbon tag' },

  { kind: 'section', label: 'Gift picks (4)' },
  {
    kind: 'productList',
    path: 'picks',
    label: 'Picks',
    imagePath: 'src',
    addLabel: '+ Add pick',
    minProducts: 4,
    maxProducts: 4,
    newProductTemplate: {
      src: '',
      name: 'Pick',
      sub: 'UNDER 10K AED',
    },
    productFields: [
      { path: 'name', label: 'Name', kind: 'text' },
      { path: 'sub', label: 'Sub line', kind: 'text' },
    ],
  },

  { kind: 'section', label: 'Foot CTA' },
  { kind: 'text', path: 'footKicker', label: 'Kicker' },
  { kind: 'text', path: 'footHead', label: 'Headline' },
  { kind: 'text', path: 'ctaButton', label: 'Button label' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background (paper)' },
  { kind: 'color', path: 'colors.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.cream', label: 'Cream' },
  { kind: 'color', path: 'colors.accent', label: 'Copper accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Copper deep' },
];
