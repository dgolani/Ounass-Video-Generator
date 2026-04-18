import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Shown in the top bar.',
  },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['letters', 'hero', 'strip'] },
  { kind: 'text', path: 'presentsLabel', label: 'Presents label (top bar)', sceneIds: ['letters', 'hero', 'strip'] },

  { kind: 'section', label: 'Featured designer' },
  { kind: 'text', path: 'featuredBrand', label: 'Designer name (letter reveal)', sceneIds: ['letters'] },
  { kind: 'text', path: 'brandTag', label: 'Tag line', sceneIds: ['letters'] },

  { kind: 'section', label: 'Hero product' },
  { kind: 'text', path: 'hero.brandline', label: 'Brand / designer', sceneIds: ['hero', 'strip'] },
  { kind: 'text', path: 'hero.name', label: 'Product name', sceneIds: ['hero', 'strip'] },
  { kind: 'text', path: 'hero.price', label: 'Price', sceneIds: ['hero', 'strip'] },

  { kind: 'section', label: 'Quote' },
  { kind: 'text', path: 'quote', label: 'Quote', multiline: true, sceneIds: ['quote'] },
  { kind: 'text', path: 'quoteAttrib', label: 'Attribution', sceneIds: ['quote'] },

  { kind: 'section', label: 'Final hold' },
  { kind: 'text', path: 'finalMono', label: 'Monogram (e.g. "GA")', sceneIds: ['final'] },
  { kind: 'text', path: 'finalKicker', label: 'Kicker', sceneIds: ['final'] },
  { kind: 'text', path: 'finalHead', label: 'Headline', sceneIds: ['final'] },
  { kind: 'text', path: 'finalMeta', label: 'Meta line', sceneIds: ['final'] },
  { kind: 'text', path: 'ctaButton', label: 'Button label', sceneIds: ['final'] },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background (ink)' },
  { kind: 'color', path: 'colors.backgroundDeep', label: 'Background deep' },
  { kind: 'color', path: 'colors.cream', label: 'Cream' },
  { kind: 'color', path: 'colors.paper', label: 'Hero paper' },
  { kind: 'color', path: 'colors.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.accent', label: 'Copper accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Copper deep' },
];
