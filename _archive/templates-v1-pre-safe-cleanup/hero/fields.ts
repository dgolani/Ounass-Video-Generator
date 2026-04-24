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
  { kind: 'text', path: 'preTitle', label: 'Pre-title', sceneIds: ['reveal'], role: 'body' },
  { kind: 'text', path: 'headlineLine1', label: 'Headline — line 1', sceneIds: ['copy'], role: 'display' },
  { kind: 'text', path: 'headlineLine2', label: 'Headline — line 2 (italic)', sceneIds: ['copy'], role: 'display' },
  { kind: 'text', path: 'subhead', label: 'Subhead', sceneIds: ['copy'], role: 'display' },

  { kind: 'section', label: 'The Product' },
  {
    kind: 'image',
    path: 'product.image',
    label: 'Product image',
    aspectRatio: 2 / 3,
    hint: 'Full-frame hero. Drop a studio shot at 1080×1620 or similar.',
  },
  { kind: 'text', path: 'product.name', label: 'Product name', sceneIds: ['copy'], role: 'body' },
  { kind: 'text', path: 'product.category', label: 'Category', sceneIds: ['copy'], role: 'body' },
  { kind: 'text', path: 'product.price', label: 'Price', sceneIds: ['copy'], role: 'numeric' },

  { kind: 'section', label: 'CTA' },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'ctaText', label: 'CTA text', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'ctaFooter', label: 'CTA footer', sceneIds: ['cta'], role: 'body' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background' },
  { kind: 'color', path: 'colors.paper', label: 'Text / paper' },
  { kind: 'color', path: 'colors.accent', label: 'Accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Accent dark' },
];
