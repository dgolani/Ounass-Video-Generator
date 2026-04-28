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
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['letters', 'hero', 'strip'], role: 'body', noTranslate: true },
  { kind: 'text', path: 'presentsLabel', label: 'Presents label (top bar)', sceneIds: ['letters', 'hero', 'strip'], role: 'body' },

  { kind: 'section', label: 'Background' },
  {
    kind: 'image',
    path: 'backgroundImage',
    label: 'Custom backdrop',
    aspectRatio: 9 / 16,
    acceptVideo: true,
    hint: 'Upload an image, or paste a hosted video URL (mp4 / webm / mov) below. Videos autoplay muted and loop. Replaces the template backdrop entirely.',
  },

  { kind: 'section', label: 'Featured designer' },
  { kind: 'text', path: 'featuredBrand', label: 'Designer name (letter reveal)', sceneIds: ['letters'], role: 'display' },
  { kind: 'text', path: 'brandTag', label: 'Tag line', sceneIds: ['letters'], role: 'body' },

  { kind: 'section', label: 'Hero product' },
  { kind: 'text', path: 'hero.brandline', label: 'Brand / designer', sceneIds: ['hero', 'strip'], role: 'display' },
  { kind: 'text', path: 'hero.name', label: 'Product name', sceneIds: ['hero', 'strip'], role: 'body' },
  { kind: 'text', path: 'hero.price', label: 'Price', sceneIds: ['hero', 'strip'], role: 'numeric' },

  { kind: 'section', label: 'Quote' },
  { kind: 'text', path: 'quote', label: 'Quote', multiline: true, sceneIds: ['quote'], role: 'display' },
  { kind: 'text', path: 'quoteAttrib', label: 'Attribution', sceneIds: ['quote'], role: 'body' },

  { kind: 'section', label: 'Final hold' },
  { kind: 'text', path: 'finalMono', label: 'Monogram (e.g. "GA")', sceneIds: ['final'], role: 'display' },
  { kind: 'text', path: 'finalKicker', label: 'Kicker', sceneIds: ['final'], role: 'body' },
  { kind: 'text', path: 'finalHead', label: 'Headline', sceneIds: ['final'], role: 'display' },
  { kind: 'text', path: 'finalMeta', label: 'Meta line', sceneIds: ['final'], role: 'body' },
  { kind: 'text', path: 'ctaButton', label: 'Button label', sceneIds: ['final'], role: 'body' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background (ink)' },
  { kind: 'color', path: 'colors.backgroundDeep', label: 'Background deep' },
  { kind: 'color', path: 'colors.cream', label: 'Cream' },
  { kind: 'color', path: 'colors.paper', label: 'Hero paper' },
  { kind: 'color', path: 'colors.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.accent', label: 'Copper accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Copper deep' },
];
