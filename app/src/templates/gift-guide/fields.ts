import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Shown above the opening headline.',
  },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['open'], role: 'body', noTranslate: true },

  { kind: 'section', label: 'Background' },
  {
    kind: 'image',
    path: 'backgroundImage',
    label: 'Custom backdrop',
    aspectRatio: 9 / 16,
    acceptVideo: true,
    hint: 'Upload an image, or paste a hosted video URL (mp4 / webm / mov) below. Videos autoplay muted and loop. Replaces the template backdrop entirely.',
  },

  { kind: 'section', label: 'Opening' },
  { kind: 'text', path: 'kicker', label: 'Kicker', sceneIds: ['open'], role: 'body' },
  { kind: 'text', path: 'headLine1', label: 'Headline — line 1', sceneIds: ['open'], role: 'display' },
  { kind: 'text', path: 'headLine2', label: 'Headline — line 2', sceneIds: ['open'], role: 'display' },

  { kind: 'section', label: 'Gift box' },
  { kind: 'text', path: 'boxLabel', label: 'Lid label (italic)', sceneIds: ['open'], role: 'display' },
  { kind: 'text', path: 'ribbonLabel', label: 'Ribbon tag', sceneIds: ['ribbon'], role: 'body' },

  { kind: 'section', label: 'Gift picks (4)' },
  {
    kind: 'productList',
    path: 'picks',
    label: 'Picks',
    sceneIds: ['picks', 'sparkles'],
    imagePath: 'src',
    addLabel: '+ Add pick',
    minProducts: 4,
    maxProducts: 4,
    newProductTemplate: {
      src: '',
      name: 'Pick',
      sub: 'UNDER 10K AED',
    },
    productFields: [
      { path: 'name', label: 'Name', kind: 'text', sceneIds: ['picks', 'sparkles'], role: 'display' },
      { path: 'sub', label: 'Sub line', kind: 'text', sceneIds: ['picks', 'sparkles'], noTranslate: true },
    ],
  },

  { kind: 'section', label: 'Foot CTA' },
  { kind: 'text', path: 'footKicker', label: 'Kicker', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'footHead', label: 'Headline', sceneIds: ['cta'], role: 'display' },
  { kind: 'text', path: 'ctaButton', label: 'Button label', sceneIds: ['cta'], role: 'body' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background (paper)' },
  { kind: 'color', path: 'colors.ink', label: 'Ink' },
  { kind: 'color', path: 'colors.cream', label: 'Cream' },
  { kind: 'color', path: 'colors.accent', label: 'Copper accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Copper deep' },
];
