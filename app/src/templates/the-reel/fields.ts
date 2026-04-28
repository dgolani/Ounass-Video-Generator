import type { FieldDescriptor } from '../fields';

export const fields: FieldDescriptor[] = [
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Used for the wordmarks in Scene 1 and Scene 4. Transparent SVG recommended; a raster image works too. When unset, the boutique name renders as serif text.',
  },
  {
    kind: 'text',
    path: 'boutiqueName',
    label: 'Boutique name (text fallback)',
    role: 'display',
    noTranslate: true,
    sceneIds: ['s1', 's4'],
  },

  { kind: 'section', label: 'Background video' },
  {
    kind: 'image',
    path: 'videoSrc',
    label: 'Background video URL',
    aspectRatio: 9 / 16,
    acceptVideo: true,
    hint: 'Paste a hosted video URL (mp4 / webm / mov). Plays full-bleed, muted, looped. A still image works too.',
  },
  {
    kind: 'slider',
    path: 'videoDim',
    label: 'Video dim',
    min: 0,
    max: 0.85,
    step: 0.01,
    precision: 2,
    hint: 'Black overlay opacity layered over the video. Raise it for legibility when the footage is bright; lower it to let the video breathe.',
  },

  { kind: 'section', label: 'Scene 1 — Wordmark' },
  {
    kind: 'text',
    path: 's1Mark',
    label: 'Wordmark text',
    role: 'display',
    sceneIds: ['s1'],
    noTranslate: true,
  },
  {
    kind: 'text',
    path: 's1Tag',
    label: 'Tagline (under the mark)',
    role: 'body',
    sceneIds: ['s1'],
  },

  { kind: 'section', label: 'Scene 2 — Phone reveal' },
  {
    kind: 'select',
    path: 's2Anim',
    label: 'Phone entry animation',
    options: [
      { value: 'iris', label: 'Iris-in (camera shutter)' },
      { value: 'streak', label: 'Light streak (top to bottom)' },
      { value: 'drop', label: 'Drop-in (from above, settle)' },
      { value: 'tilt', label: 'Tilt-down (place from above)' },
    ],
  },
  {
    kind: 'image',
    path: 'productImage',
    label: 'Phone screen product image',
    aspectRatio: 1 / 2,
    hint: 'Fills the phone screen. Portrait works best.',
  },

  { kind: 'section', label: 'Scene 3 — USP flashes' },
  { kind: 'text', path: 's3Eyebrow', label: 'Eyebrow', role: 'body', sceneIds: ['s3'] },
  { kind: 'text', path: 's3Line1', label: 'USP 1', role: 'display', sceneIds: ['s3'] },
  { kind: 'text', path: 's3Line2', label: 'USP 2', role: 'display', sceneIds: ['s3'] },

  { kind: 'section', label: 'Scene 4 — Discover + CTA' },
  { kind: 'text', path: 's4Pre', label: 'Pre-line ("DISCOVER ON")', role: 'body', sceneIds: ['s4'] },
  { kind: 'text', path: 's4Mark', label: 'Wordmark text', role: 'display', sceneIds: ['s4'], noTranslate: true },
  { kind: 'text', path: 's4Cta', label: 'CTA label', role: 'body', sceneIds: ['s4'] },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.accent', label: 'Bronze accent' },
  { kind: 'color', path: 'colors.accentDeep', label: 'Bronze deep' },
  { kind: 'color', path: 'colors.accentLight', label: 'Bronze light (cream)' },
  { kind: 'color', path: 'colors.phoneFrame', label: 'Phone frame (body)' },
  { kind: 'color', path: 'colors.phoneScreen', label: 'Phone screen base' },
];
