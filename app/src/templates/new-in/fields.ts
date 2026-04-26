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
    hint: 'Optional. When set, replaces the paper gradient entirely in BOTH light and dark modes.',
  },

  { kind: 'section', label: 'Header' },
  { kind: 'text', path: 'kicker', label: 'Kicker (e.g. "ARRIVED · THIS WEEK")', sceneIds: ['intro'], role: 'body' },
  { kind: 'text', path: 'dateLine', label: 'Date line (e.g. "24 April | Spring Arrivals")', sceneIds: ['intro'], role: 'display' },

  { kind: 'section', label: 'Decorative bleed word' },
  { kind: 'text', path: 'bleedWord', label: 'Oversized serif word in back', role: 'display' },

  { kind: 'section', label: 'Products (4)' },
  {
    kind: 'productList',
    path: 'products',
    label: 'New-in products',
    sceneIds: ['product-1', 'product-2', 'product-3', 'product-4', 'recap'],
    productRowSceneIds: ['product-1', 'product-2', 'product-3', 'product-4'],
    imagePath: 'imageUrl',
    addLabel: '+ Add product (max 4 supported)',
    minProducts: 4,
    maxProducts: 4,
    newProductTemplate: {
      imageUrl: '',
      category: 'CATEGORY',
      brand: 'Designer',
      name: 'New product',
      price: '0 AED',
      recapPrice: '0',
    },
    productFields: [
      { path: 'category', label: 'Category chip (e.g. BLOUSE)', kind: 'text', role: 'body' },
      { path: 'brand', label: 'Brand / designer', kind: 'text', role: 'display', noTranslate: true },
      { path: 'name', label: 'Product name', kind: 'text', role: 'display' },
      { path: 'price', label: 'Price (with currency)', kind: 'text', role: 'numeric' },
      { path: 'recapPrice', label: 'Recap price (compact)', kind: 'text', role: 'numeric' },
    ],
  },

  { kind: 'section', label: 'Recap header' },
  { kind: 'text', path: 'recapTitle', label: 'Title (e.g. "The edit")', sceneIds: ['recap'], role: 'display' },
  { kind: 'text', path: 'recapCount', label: 'Count (e.g. "4 PIECES")', sceneIds: ['recap'], role: 'body' },

  { kind: 'section', label: 'CTA + byline' },
  { kind: 'text', path: 'ctaText', label: 'CTA button', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'byline', label: 'Footer byline', sceneIds: ['cta'], role: 'body' },

  { kind: 'section', label: 'Light palette' },
  { kind: 'color', path: 'colors.light.background', label: 'Paper' },
  { kind: 'color', path: 'colors.light.backgroundDeep', label: 'Paper edge' },
  { kind: 'color', path: 'colors.light.bone', label: 'Card bone' },
  { kind: 'color', path: 'colors.light.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.light.accent', label: 'Bronze accent' },
  { kind: 'color', path: 'colors.light.ctaBg', label: 'CTA bg' },
  { kind: 'color', path: 'colors.light.ctaText', label: 'CTA text' },
  { kind: 'color', path: 'colors.light.ribbonBg', label: 'Ribbon bg' },
  { kind: 'color', path: 'colors.light.ribbonText', label: 'Ribbon text' },

  { kind: 'section', label: 'Dark palette' },
  { kind: 'color', path: 'colors.dark.background', label: 'Paper (dark)' },
  { kind: 'color', path: 'colors.dark.backgroundDeep', label: 'Paper edge (dark)' },
  { kind: 'color', path: 'colors.dark.bone', label: 'Card bone (dark)' },
  { kind: 'color', path: 'colors.dark.ink', label: 'Ink (dark)' },
  { kind: 'color', path: 'colors.dark.accent', label: 'Bronze accent (dark)' },
  { kind: 'color', path: 'colors.dark.ctaBg', label: 'CTA bg (dark)' },
  { kind: 'color', path: 'colors.dark.ctaText', label: 'CTA text (dark)' },
  { kind: 'color', path: 'colors.dark.ribbonBg', label: 'Ribbon bg (dark)' },
  { kind: 'color', path: 'colors.dark.ribbonText', label: 'Ribbon text (dark)' },
];
