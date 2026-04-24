// The Collab — schema & defaults.
//
// Mechanic: co-signed partnership. Two wordmarks (Ounass + Collaborator)
// converge from opposite sides, a bronze-foil "×" stamps between them,
// and 3 pieces from the collaboration fan in beneath. The × is the hero.
//
// Ported from the Claude-Design HTML prototype `TheCollab.html`.

export type CollabProduct = {
  id: string;
  /** Category micro-label above the name (e.g. "Handbag"). */
  category: string;
  /** Product display name (e.g. "The Horsebit Shoulder"). */
  name: string;
  /** Displayed price string (e.g. "8,400 AED"). */
  price: string;
  /** Optional hero image — data URL or path. When absent a gradient
   *  placeholder renders in its place (matches the HTML prototype). */
  image?: string;
};

export type CollabPalette = {
  /** Paper tone — the scene backdrop. */
  background: string;
  /** Paper "deep" tone used in the radial gradient edge. */
  backgroundDeep: string;
  /** Bone — product card placeholder tone. */
  bone: string;
  /** Ink — dominant text colour. */
  ink: string;
  /** Bronze accent — rule, dot, ticks, price text. */
  accent: string;
  /** Foil highlight used in the × stamp. */
  foil: string;
  /** CTA background. On dark theme: bone on dark bg. */
  ctaBg: string;
  /** CTA text. Contrasts with ctaBg. */
  ctaText: string;
};

export type CollabProps = {
  // Boutique (left mark)
  boutiqueName: string;
  logo?: string;

  // Collaborator (right mark). Prefers an uploaded SVG logo; falls back
  // to rendering the collabName as a wordmark. Same BoutiqueLogo pattern
  // as the left mark, so the "Aa" tint button works on the collab logo
  // too — editable, per-project, overridable via the editor.
  collabName: string;
  collabLogo?: string;

  /** Optional backdrop image — when set, REPLACES the paper gradient
   *  entirely in BOTH light and dark modes. Data URL. */
  backgroundImage?: string;

  // Top kicker row (e.g. "An Exclusive Collaboration")
  kicker: string;

  // Edit label beneath the lockup rule
  editSmallLeft: string;   // e.g. "The Edit"
  editMain: string;        // e.g. "An Exclusive Capsule"
  editSmallRight: string;  // e.g. "April MMXXVI"

  // Product trio — always 3 (matches the fan-in mechanic)
  products: CollabProduct[];

  // Capsule line under the products
  capsuleNumber: string;   // e.g. "14"
  capsuleTag1: string;     // e.g. "Pieces"
  capsuleTag2: string;     // e.g. "Online Only"
  capsuleTag3: string;     // e.g. "Ounass.ae"

  // CTA + byline
  ctaText: string;
  bylineStart: string;     // e.g. "Two houses."
  bylineItalic: string;    // e.g. "One exclusive capsule."

  // Themed palette (supportsThemes: true).
  colors: { light: CollabPalette; dark: CollabPalette };
};

const lightPalette: CollabPalette = {
  background: '#F5F0E8',
  backgroundDeep: '#E8DFD0',
  bone: '#E8E1D4',
  ink: '#121212',
  accent: '#B87253',
  foil: '#C89466',
  ctaBg: '#121212',
  ctaText: '#F5F0E8',
};

const darkPalette: CollabPalette = {
  background: '#0F0E0C',
  backgroundDeep: '#080706',
  bone: '#1A1815',
  ink: '#EDE5D6',
  accent: '#D89A6E',
  foil: '#E0AB7D',
  // On dark scene, CTA inverts: pale pill, dark text.
  ctaBg: '#EDE5D6',
  ctaText: '#0F0E0C',
};

export const defaultProps: CollabProps = {
  boutiqueName: 'OUNASS',
  logo: undefined,
  collabName: 'Gucci',
  collabLogo: undefined,
  backgroundImage: undefined,

  kicker: 'An Exclusive Collaboration',

  editSmallLeft: 'The Edit',
  editMain: 'An Exclusive Capsule',
  editSmallRight: 'April MMXXVI',

  products: [
    {
      id: 'c1',
      category: 'Handbag',
      name: 'The Horsebit Shoulder',
      price: '8,400 AED',
    },
    {
      id: 'c2',
      category: 'Footwear',
      name: 'The Horsebit Loafer',
      price: '3,650 AED',
    },
    {
      id: 'c3',
      category: 'Accessory',
      name: 'The Silk Foulard',
      price: '1,290 AED',
    },
  ],

  capsuleNumber: '14',
  capsuleTag1: 'Pieces',
  capsuleTag2: 'Online Only',
  capsuleTag3: 'Ounass.ae',

  ctaText: 'Shop The Capsule',
  bylineStart: 'Two houses.',
  bylineItalic: 'One exclusive capsule.',

  colors: {
    light: lightPalette,
    dark: darkPalette,
  },
};
