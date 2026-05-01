import type { FieldDescriptor } from '../fields';

// Variant gates — keyed off the corresponding type discriminator. Each
// predicate is called with the live props blob, so the helpers can
// inspect any field. PropertiesPanel skips fields where the predicate
// returns false.
const isContent = (kind: string) => (p: Record<string, unknown>) => p.contentType === kind;

export const fields: FieldDescriptor[] = [
  // ── Brand ─────────────────────────────────────────────────────
  { kind: 'section', label: 'Brand' },
  {
    kind: 'image',
    path: 'logo',
    label: 'Boutique logo',
    aspectRatio: 16 / 9,
    hint: 'Used as the wordmark in scene 1 and scene 4. Transparent SVG recommended.',
  },
  {
    kind: 'text',
    path: 'boutiqueName',
    label: 'Boutique name (text fallback)',
    role: 'display',
    noTranslate: true,
    sceneIds: ['s1', 's4'],
  },

  // ── Per-scene type + duration ─────────────────────────────────
  { kind: 'section', label: 'Scene 1 — Intro' },
  {
    kind: 'select',
    path: 'introType',
    label: 'Variant',
    options: [{ value: 'wordmark', label: 'OUNASS wordmark' }],
    hint: 'More intro variants will appear here as they ship.',
  },
  {
    kind: 'slider',
    path: 'introDur',
    label: 'Duration (s)',
    min: 0.5,
    max: 6.0,
    step: 0.1,
    precision: 1,
  },
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

  // ── Scene 2 — Content (variant + per-variant fields) ──────────
  { kind: 'section', label: 'Scene 2 — Content' },
  {
    kind: 'select',
    path: 'contentType',
    label: 'Variant',
    options: [
      { value: 'phone-preview', label: 'Phone preview' },
      { value: 'heading-products', label: 'Heading + Products' },
      { value: 'vouri-plp', label: 'Phone-preview PLP' },
      { value: 'gravity-collapse', label: 'Gravity collapse' },
    ],
    hint: 'Switching the variant changes which fields below appear.',
  },
  // Manual duration is hidden for heading-products (auto-computed
  // from product count). Visible for everything else.
  {
    kind: 'slider',
    path: 'contentDur',
    label: 'Duration (s)',
    min: 0.5,
    max: 12.0,
    step: 0.1,
    precision: 1,
    showWhen: (p) => p.contentType !== 'heading-products',
  },

  // phone-preview variant
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
    showWhen: isContent('phone-preview'),
  },
  {
    kind: 'image',
    path: 'productImage',
    label: 'Phone screen image',
    aspectRatio: 1 / 2,
    hint: 'Fills the phone screen. Portrait orientation works best.',
    showWhen: isContent('phone-preview'),
  },

  // heading-products variant
  {
    kind: 'text',
    path: 's2hpHeading',
    label: 'Headline',
    role: 'display',
    sceneIds: ['s2'],
    showWhen: isContent('heading-products'),
  },
  {
    kind: 'slider',
    path: 's2hpCount',
    label: 'Number of products',
    min: 1,
    max: 6,
    step: 1,
    precision: 0,
    hint: 'Each product adds 2.2s of runtime; total Scene 2 duration auto-scales.',
    showWhen: isContent('heading-products'),
  },
  {
    kind: 'productList',
    path: 's2hpProducts',
    label: 'Products',
    imagePath: 'imageUrl',
    minProducts: 1,
    maxProducts: 6,
    addLabel: '+ Add product',
    newProductTemplate: { brand: 'BRAND', price: '0 AED' },
    productFields: [
      { kind: 'text', path: 'brand', label: 'Brand', role: 'display', noTranslate: true },
      { kind: 'text', path: 'price', label: 'Price', role: 'numeric', noTranslate: true },
    ],
    showWhen: isContent('heading-products'),
  },

  // vouri-plp variant
  {
    kind: 'text',
    path: 's2vpHeading',
    label: 'Eyebrow heading (e.g. "INTRODUCING")',
    role: 'body',
    sceneIds: ['s2'],
    showWhen: isContent('vouri-plp'),
  },
  {
    kind: 'text',
    path: 's2vpSub',
    label: 'Eyebrow brand name',
    role: 'display',
    sceneIds: ['s2'],
    noTranslate: true,
    showWhen: isContent('vouri-plp'),
  },
  {
    kind: 'text',
    path: 's2vpTitle',
    label: 'Page title (top of phone)',
    role: 'body',
    sceneIds: ['s2'],
    showWhen: isContent('vouri-plp'),
  },
  {
    kind: 'text',
    path: 's2vpBrandChip',
    label: 'Brand filter chip',
    role: 'body',
    sceneIds: ['s2'],
    showWhen: isContent('vouri-plp'),
  },
  {
    kind: 'text',
    path: 's2vpResults',
    label: 'Result count',
    role: 'numeric',
    sceneIds: ['s2'],
    noTranslate: true,
    showWhen: isContent('vouri-plp'),
  },
  {
    kind: 'productList',
    path: 's2vpTiles',
    label: 'PLP tiles (8)',
    imagePath: 'imageUrl',
    minProducts: 8,
    maxProducts: 8,
    addLabel: '+ Tile',
    newProductTemplate: { brand: 'REFORMATION', name: 'New product', price: '0 AED' },
    productFields: [
      { kind: 'text', path: 'brand', label: 'Brand', role: 'display', noTranslate: true },
      { kind: 'text', path: 'name', label: 'Name', role: 'body' },
      { kind: 'text', path: 'price', label: 'Price', role: 'numeric', noTranslate: true },
      { kind: 'text', path: 'was', label: 'Strikethrough was-price', role: 'numeric', noTranslate: true },
      { kind: 'text', path: 'off', label: 'Discount tag (e.g. "20% OFF")', role: 'body', noTranslate: true },
      { kind: 'text', path: 'tag', label: 'Promo tag (e.g. "WONDER WEEK")', role: 'body', noTranslate: true },
    ],
    showWhen: isContent('vouri-plp'),
  },

  // gravity-collapse variant
  {
    kind: 'text',
    path: 's2gcImgs',
    label: 'Tile image URLs (comma-separated, 8)',
    role: 'body',
    multiline: true,
    sceneIds: ['s2'],
    noTranslate: true,
    showWhen: isContent('gravity-collapse'),
  },

  // ── Scene 3 — USPs ────────────────────────────────────────────
  { kind: 'section', label: 'Scene 3 — USPs' },
  {
    kind: 'select',
    path: 'uspsType',
    label: 'Variant',
    options: [{ value: 'two-flash', label: 'Two-line flash' }],
  },
  {
    kind: 'slider',
    path: 'uspsDur',
    label: 'Duration (s)',
    min: 0.5,
    max: 6.0,
    step: 0.1,
    precision: 1,
  },
  { kind: 'text', path: 's3Eyebrow', label: 'Eyebrow', role: 'body', sceneIds: ['s3'] },
  { kind: 'text', path: 's3Line1', label: 'USP 1', role: 'display', sceneIds: ['s3'] },
  { kind: 'text', path: 's3Line2', label: 'USP 2', role: 'display', sceneIds: ['s3'] },

  // ── Scene 4 — Finale ──────────────────────────────────────────
  { kind: 'section', label: 'Scene 4 — Finale' },
  {
    kind: 'select',
    path: 'finaleType',
    label: 'Variant',
    options: [{ value: 'discover-shimmer', label: 'Discover + Shimmer logo' }],
  },
  {
    kind: 'slider',
    path: 'finaleDur',
    label: 'Duration (s)',
    min: 0.5,
    max: 6.0,
    step: 0.1,
    precision: 1,
  },
  { kind: 'text', path: 's4Pre', label: 'Pre-line ("DISCOVER ON")', role: 'body', sceneIds: ['s4'] },
  { kind: 'text', path: 's4Mark', label: 'Wordmark text', role: 'display', sceneIds: ['s4'], noTranslate: true },
  { kind: 'text', path: 's4Cta', label: 'CTA label', role: 'body', sceneIds: ['s4'] },

  // ── Colors ────────────────────────────────────────────────────
  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.accent', label: 'Bronze accent' },
  { kind: 'color', path: 'colors.accentDeep', label: 'Bronze deep' },
  { kind: 'color', path: 'colors.accentLight', label: 'Bronze light (cream)' },
  { kind: 'color', path: 'colors.phoneFrame', label: 'Phone frame (body)' },
  { kind: 'color', path: 'colors.phoneScreen', label: 'Phone screen base' },
];
