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
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['lockup'], noTranslate: true },

  { kind: 'section', label: 'Collaborator' },
  {
    kind: 'image',
    path: 'collabLogo',
    label: 'Collaborator logo',
    aspectRatio: 16 / 5,
    hint: 'SVG preferred — tintable via the Aa button. When absent, the collaborator name renders as a wordmark.',
    svgOnly: true,
  },
  { kind: 'text', path: 'collabName', label: 'Collaborator name (fallback)', sceneIds: ['lockup'], role: 'display', noTranslate: true },

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
  { kind: 'text', path: 'kicker', label: 'Kicker (top of frame)', sceneIds: ['kicker'], role: 'body' },

  { kind: 'section', label: 'Edit label' },
  { kind: 'text', path: 'editSmallLeft', label: 'Left small (e.g. "The Edit")', sceneIds: ['edit'], role: 'body' },
  { kind: 'text', path: 'editMain', label: 'Main italic (e.g. "An Exclusive Capsule")', sceneIds: ['edit'], role: 'display' },
  { kind: 'text', path: 'editSmallRight', label: 'Right small (e.g. "April MMXXVI")', sceneIds: ['edit'], role: 'body' },

  { kind: 'section', label: 'Products (3)' },
  {
    kind: 'productList',
    path: 'products',
    label: 'Product trio',
    sceneIds: ['products'],
    imagePath: 'image',
    addLabel: '+ Add piece (max 3 supported)',
    minProducts: 3,
    maxProducts: 3,
    newProductTemplate: {
      category: 'Piece',
      name: 'New Piece',
      price: '0 AED',
    },
    productFields: [
      { path: 'category', label: 'Category (small caps)', kind: 'text', role: 'body' },
      { path: 'name', label: 'Name', kind: 'text', role: 'display' },
      { path: 'price', label: 'Price', kind: 'text', role: 'numeric' },
    ],
  },

  { kind: 'section', label: 'Capsule line' },
  { kind: 'text', path: 'capsuleNumber', label: 'Number (e.g. "14")', sceneIds: ['capsule'], role: 'display' },
  { kind: 'text', path: 'capsuleTag1', label: 'Tag 1 (e.g. "Pieces")', sceneIds: ['capsule'], role: 'body' },
  { kind: 'text', path: 'capsuleTag2', label: 'Tag 2 (e.g. "Online Only")', sceneIds: ['capsule'], role: 'body' },
  { kind: 'text', path: 'capsuleTag3', label: 'Tag 3 (e.g. "Ounass.ae")', sceneIds: ['capsule'], role: 'body' },

  { kind: 'section', label: 'CTA + byline' },
  { kind: 'text', path: 'ctaText', label: 'CTA button', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'bylineStart', label: 'Byline first part', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'bylineItalic', label: 'Byline italic tail', sceneIds: ['cta'], role: 'display' },

  { kind: 'section', label: 'Light palette' },
  { kind: 'color', path: 'colors.light.background', label: 'Paper' },
  { kind: 'color', path: 'colors.light.backgroundDeep', label: 'Paper edge (gradient deep)' },
  { kind: 'color', path: 'colors.light.bone', label: 'Card placeholder bone' },
  { kind: 'color', path: 'colors.light.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.light.accent', label: 'Bronze accent' },
  { kind: 'color', path: 'colors.light.foil', label: 'Foil highlight' },

  { kind: 'section', label: 'Dark palette' },
  { kind: 'color', path: 'colors.dark.background', label: 'Paper (dark)' },
  { kind: 'color', path: 'colors.dark.backgroundDeep', label: 'Paper edge (dark)' },
  { kind: 'color', path: 'colors.dark.bone', label: 'Card placeholder (dark)' },
  { kind: 'color', path: 'colors.dark.ink', label: 'Ink (light on dark)' },
  { kind: 'color', path: 'colors.dark.accent', label: 'Bronze accent (dark)' },
  { kind: 'color', path: 'colors.dark.foil', label: 'Foil highlight (dark)' },
];
