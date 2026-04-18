import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Optional — used in the closing signature. Transparent PNG recommended.',
  },

  { kind: 'section', label: 'Masthead' },
  { kind: 'text', path: 'masthead', label: 'Masthead' },
  { kind: 'text', path: 'issueDate', label: 'Issue date' },

  { kind: 'section', label: 'Headline' },
  { kind: 'text', path: 'headlineLine1', label: 'Line 1 (serif)' },
  { kind: 'text', path: 'headlineLine2', label: 'Line 2 (italic)' },
  { kind: 'text', path: 'byline', label: 'Byline' },

  { kind: 'section', label: 'Products (2×2 grid)' },
  {
    kind: 'productList',
    path: 'products',
    label: 'Products',
    imagePath: 'src',
    addLabel: '+ Add product',
    minProducts: 4,
    maxProducts: 4,
    newProductTemplate: {
      src: '',
      name: 'New product',
      category: 'Category',
    },
    productFields: [
      { path: 'name', label: 'Name', kind: 'text' },
      { path: 'category', label: 'Category', kind: 'text' },
    ],
  },

  { kind: 'section', label: 'Feature caption' },
  {
    kind: 'text',
    path: 'featureCaption',
    label: 'Caption',
    multiline: true,
  },

  { kind: 'section', label: 'Closing' },
  { kind: 'text', path: 'closingKicker', label: 'Kicker' },
  { kind: 'text', path: 'signatureText', label: 'Signature' },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name' },
  { kind: 'text', path: 'ctaText', label: 'CTA text' },
  { kind: 'text', path: 'ctaFooter', label: 'CTA footer' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.paper', label: 'Paper (background)' },
  { kind: 'color', path: 'colors.ink', label: 'Ink (text)' },
  { kind: 'color', path: 'colors.accent', label: 'Accent' },
  { kind: 'color', path: 'colors.rule', label: 'Rule / divider' },
];
