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
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['intro'], noTranslate: true },

  { kind: 'section', label: 'Background image' },
  {
    kind: 'image',
    path: 'backgroundImage',
    label: 'Custom backdrop',
    aspectRatio: 9 / 16,
    acceptVideo: true,
    hint: 'Upload an image, or paste a hosted video URL (mp4 / webm / mov) below. Videos autoplay muted and loop. Replaces the paper gradient entirely in BOTH light and dark modes.',
  },

  { kind: 'section', label: 'Kicker' },
  { kind: 'text', path: 'kickerText', label: 'Kicker (e.g. "The Rail · April Edit")', sceneIds: ['intro'], role: 'body' },

  { kind: 'section', label: 'Rail (5–8 garments)' },
  {
    kind: 'productList',
    path: 'products',
    label: 'Garments on the rail',
    sceneIds: ['rail-dolly', 'rail-stop', 'focus-pull', 'hero-lift'],
    imagePath: 'imageUrl',
    addLabel: '+ Add garment',
    minProducts: 5,
    maxProducts: 8,
    newProductTemplate: {
      name: 'New Garment',
      price: '1,000',
      priceUnit: 'AED',
      indexLabel: '09',
      imageUrl: undefined,
    },
    productFields: [
      { path: 'name', label: 'Garment name', kind: 'text', role: 'display' },
      { path: 'price', label: 'Price (number)', kind: 'text', role: 'numeric', noTranslate: true },
      { path: 'priceUnit', label: 'Price unit (e.g. AED)', kind: 'text', role: 'body', noTranslate: true },
      { path: 'indexLabel', label: 'Index (e.g. 06)', kind: 'text', role: 'body', noTranslate: true },
    ],
  },
  { kind: 'text', path: 'heroIndex', label: 'Hero index (0-based)', sceneIds: ['hero-lift'], role: 'numeric', noTranslate: true },

  { kind: 'section', label: 'Hero editorial label' },
  { kind: 'text', path: 'editKicker', label: 'Edit kicker (e.g. "Chosen For You")', sceneIds: ['hero-lift'], role: 'body' },
  { kind: 'text', path: 'heroSizes', label: 'Sizes (e.g. "Size S M L")', sceneIds: ['hero-lift'], role: 'body' },

  { kind: 'section', label: 'Capsule line (9:16 only)' },
  { kind: 'text', path: 'capsuleCount', label: 'Capsule count', sceneIds: ['capsule'], role: 'display', noTranslate: true },
  { kind: 'text', path: 'capsuleWord1', label: 'Word 1 (e.g. Pieces)', sceneIds: ['capsule'], role: 'body' },
  { kind: 'text', path: 'capsuleWord2', label: 'Word 2 (e.g. April Rail)', sceneIds: ['capsule'], role: 'body' },
  { kind: 'text', path: 'capsuleWord3', label: 'Word 3 (e.g. Ounass.ae)', sceneIds: ['capsule'], role: 'body', noTranslate: true },

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
