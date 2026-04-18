import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Shown in place of the outro wordmark. Transparent PNG recommended.',
  },

  { kind: 'section', label: 'Opening' },
  { kind: 'text', path: 'kicker', label: 'Kicker', sceneIds: ['act-1'] },
  { kind: 'text', path: 'brand', label: 'Brand', sceneIds: ['act-1'] },
  { kind: 'text', path: 'tagline', label: 'Tagline', sceneIds: ['act-1'] },

  { kind: 'section', label: 'Columns act' },
  { kind: 'text', path: 'act2Kicker', label: 'Kicker', sceneIds: ['act-2'] },
  { kind: 'text', path: 'act2TitleLine1', label: 'Title — line 1', sceneIds: ['act-2'] },
  { kind: 'text', path: 'act2TitleLine2', label: 'Title — line 2', sceneIds: ['act-2'] },

  { kind: 'section', label: 'Products' },
  {
    kind: 'productList',
    path: 'products',
    label: 'Products',
    sceneIds: ['act-3'],
    imagePath: 'src',
    addLabel: '+ Add product',
    minProducts: 2,
    maxProducts: 10,
    newProductTemplate: {
      src: '',
      name: 'New product',
      price: '0 AED',
      color: 'Noir',
    },
    productFields: [
      { path: 'name', label: 'Name', kind: 'text' },
      { path: 'price', label: 'Price', kind: 'text' },
      { path: 'color', label: 'Color', kind: 'text' },
    ],
  },

  { kind: 'section', label: 'Outro' },
  { kind: 'text', path: 'outroKicker', label: 'Kicker', sceneIds: ['act-4'] },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['act-4'] },
  { kind: 'text', path: 'boutiqueTagline', label: 'Boutique tagline', sceneIds: ['act-4'] },
  { kind: 'text', path: 'ctaText', label: 'CTA text', sceneIds: ['act-4'] },
  { kind: 'text', path: 'ctaFooter', label: 'CTA footer', sceneIds: ['act-4'] },

  { kind: 'section', label: 'Watermark' },
  {
    kind: 'text',
    path: 'watermark',
    label: 'Boutique signature',
    placeholder: 'Leave blank to hide',
    sceneIds: ['act-4'],
  },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background' },
  { kind: 'color', path: 'colors.paper', label: 'Text / paper' },
  { kind: 'color', path: 'colors.accent', label: 'Accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Accent dark' },
];
