import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Shown in the header in place of the text wordmark.',
  },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', role: 'body', noTranslate: true },
  { kind: 'text', path: 'headerMeta', label: 'Header line (e.g. "The Edit · Spring")', role: 'body' },

  { kind: 'section', label: 'Opening' },
  { kind: 'text', path: 'kicker', label: 'Kicker', sceneIds: ['slot-1'], role: 'body' },

  { kind: 'section', label: 'Products (ranked 5 → 1)' },
  {
    kind: 'productList',
    path: 'products',
    label: 'Ranked products',
    productRowSceneIds: ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5'],
    imagePath: 'src',
    addLabel: '+ Add product',
    minProducts: 5,
    maxProducts: 5,
    newProductTemplate: {
      src: '',
      rank: 1,
      brandline: 'Designer',
      name: 'New product',
      price: '0 AED',
    },
    productFields: [
      { path: 'brandline', label: 'Designer / brand', kind: 'text', noTranslate: true },
      { path: 'name', label: 'Name', kind: 'text' },
      { path: 'price', label: 'Price', kind: 'text', noTranslate: true },
    ],
  },

  { kind: 'section', label: 'Closing CTA' },
  { kind: 'text', path: 'ctaKicker', label: 'Kicker', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'ctaHeadline', label: 'Headline', sceneIds: ['cta'], role: 'display' },
  { kind: 'text', path: 'ctaButton', label: 'Button label', sceneIds: ['cta'], role: 'body' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background (paper)' },
  { kind: 'color', path: 'colors.paper', label: 'Card cream' },
  { kind: 'color', path: 'colors.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.accent', label: 'Copper accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Copper deep' },
];
