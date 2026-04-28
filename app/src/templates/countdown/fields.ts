import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Optional — shown in the CTA act. Transparent PNG recommended.',
  },

  { kind: 'section', label: 'Background' },
  {
    kind: 'image',
    path: 'backgroundImage',
    label: 'Custom backdrop',
    aspectRatio: 9 / 16,
    acceptVideo: true,
    hint: 'Upload an image, or paste a hosted video URL (mp4 / webm / mov) below. Videos autoplay muted and loop. Replaces the template backdrop entirely.',
  },

  { kind: 'section', label: 'Hook' },
  { kind: 'text', path: 'kicker', label: 'Kicker', sceneIds: ['hook'], role: 'body' },
  { kind: 'text', path: 'headline', label: 'Headline', sceneIds: ['hook'], role: 'display' },
  { kind: 'text', path: 'subhead', label: 'Subhead', sceneIds: ['hook'], role: 'display' },

  { kind: 'section', label: 'Body' },
  { kind: 'text', path: 'body', label: 'Body', multiline: true, sceneIds: ['body'], role: 'display' },
  { kind: 'text', path: 'endsText', label: 'Ends text', sceneIds: ['body'], role: 'body' },
  { kind: 'text', path: 'terms', label: 'Terms', sceneIds: ['body'], role: 'body' },

  { kind: 'section', label: 'Accent image' },
  {
    kind: 'image',
    path: 'accentImage',
    label: 'Accent image',
    aspectRatio: 2 / 3,
    hint: 'Optional background accent. Replace with a campaign shot for bigger impact.',
  },

  { kind: 'section', label: 'CTA' },
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name', sceneIds: ['cta'], role: 'body', noTranslate: true },
  { kind: 'text', path: 'ctaText', label: 'CTA text', sceneIds: ['cta'], role: 'body' },
  { kind: 'text', path: 'ctaFooter', label: 'CTA footer', sceneIds: ['cta'], role: 'body' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background' },
  { kind: 'color', path: 'colors.paper', label: 'Text / paper' },
  { kind: 'color', path: 'colors.accent', label: 'Accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Accent dark' },
];
