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

  { kind: 'section', label: 'Hook' },
  { kind: 'text', path: 'kicker', label: 'Kicker' },
  { kind: 'text', path: 'headline', label: 'Headline' },
  { kind: 'text', path: 'subhead', label: 'Subhead' },

  { kind: 'section', label: 'Body' },
  { kind: 'text', path: 'body', label: 'Body', multiline: true },
  { kind: 'text', path: 'endsText', label: 'Ends text' },
  { kind: 'text', path: 'terms', label: 'Terms' },

  { kind: 'section', label: 'Accent image' },
  {
    kind: 'image',
    path: 'accentImage',
    label: 'Accent image',
    aspectRatio: 2 / 3,
    hint: 'Optional background accent. Replace with a campaign shot for bigger impact.',
  },

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
