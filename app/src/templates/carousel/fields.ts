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
  { kind: 'text', path: 'boutiqueName', label: 'Boutique name' },
  { kind: 'text', path: 'categoryLabel', label: 'Category label (top-right)' },

  { kind: 'section', label: 'Opening title' },
  { kind: 'text', path: 'titleKicker', label: 'Kicker' },
  { kind: 'text', path: 'titleLine1', label: 'Headline — line 1' },
  { kind: 'text', path: 'titleLine2', label: 'Headline — line 2 (italic)' },

  { kind: 'section', label: 'Carousel items' },
  {
    kind: 'productList',
    path: 'items',
    label: 'Items',
    imagePath: 'src',
    addLabel: '+ Add item',
    minProducts: 3,
    maxProducts: 8,
    newProductTemplate: {
      src: '',
      brandline: 'Designer',
      name: 'Product name',
      price: '0 AED',
    },
    productFields: [
      { path: 'brandline', label: 'Designer', kind: 'text' },
      { path: 'name', label: 'Name', kind: 'text' },
      { path: 'price', label: 'Price', kind: 'text' },
    ],
  },

  { kind: 'section', label: 'Final frame' },
  { kind: 'text', path: 'finalStat', label: 'Stat stamp (e.g. "120+")' },
  { kind: 'text', path: 'finalKicker', label: 'Kicker' },
  { kind: 'text', path: 'finalHeadline', label: 'Headline' },
  { kind: 'text', path: 'finalSubline', label: 'Subline' },
  { kind: 'text', path: 'ctaButton', label: 'Button label' },

  { kind: 'section', label: 'Colors' },
  { kind: 'color', path: 'colors.background', label: 'Background (ink)' },
  { kind: 'color', path: 'colors.card', label: 'Card cream' },
  { kind: 'color', path: 'colors.ink', label: 'Card ink' },
  { kind: 'color', path: 'colors.accent', label: 'Copper accent' },
  { kind: 'color', path: 'colors.accentDark', label: 'Copper deep' },
];
