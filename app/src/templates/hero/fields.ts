import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Optional — shown in the closing CTA. Transparent PNG recommended.',
  },

  { kind: 'section', label: 'Opening' },
  { kind: 'text', path: 'preTitle', label: 'Pre-title' },
  { kind: 'text', path: 'headlineLine1', label: 'Headline — line 1' },
  { kind: 'text', path: 'headlineLine2', label: 'Headline — line 2 (italic)' },
  { kind: 'text', path: 'subhead', label: 'Subhead' },

  { kind: 'section', label: 'The Product' },
  {
    kind: 'image',
    path: 'product.image',
    label: 'Product image',
    aspectRatio: 2 / 3,
    hint: 'Full-frame hero. Drop a studio shot at 1080×1620 or similar.',
  },
  { kind: 'text', path: 'product.name', label: 'Product name' },
  { kind: 'text', path: 'product.category', label: 'Category' },
  { kind: 'text', path: 'product.price', label: 'Price' },

  { kind: 'section', label: 'CTA' },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name' },
  { kind: 'text', path: 'ctaText', label: 'CTA text' },
  { kind: 'text', path: 'ctaFooter', label: 'CTA footer' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background' },
  { kind: 'color', path: 'colors.paper', label: 'Text / paper' },
  { kind: 'color', path: 'colors.accent', label: 'Accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Accent dark' },
];
