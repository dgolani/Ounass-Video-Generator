// The Pairing — schema & defaults.
//
// Mechanic: complementarity / styling. Two products reveal separately
// (Piece A left, Piece B right), their prices roll up, a "+" glyph
// beats in between them, morphs to "=", then the cards converge and
// a pair lockup reveals the total. Closes on a CTA that invites the
// viewer to shop the styled pair.
//
// Ported from the Claude-Design HTML prototype `ThePairing.html`
// (handoff bundle video-ads-new). CSS animation-delay choreography
// is translated to interpolate() / animate() calls on
// useTimeline().time at port time.

export type PairingPiece = {
  id: string;
  /** Display kicker above the name — e.g. "01" or "DRESS" */
  eyebrow: string;
  /** Italic serif name line, can contain <br/> via newline. */
  name: string;
  /** Price as a plain string (e.g. "4,280 AED"). */
  price: string;
  /** Product image URL / data URL. When absent, a soft bone
   *  card with the eyebrow as a placeholder label renders. */
  imageUrl?: string;
};

export type PairingPalette = {
  /** Paper tone — the scene backdrop. */
  background: string;
  /** Paper "deep" tone used in the radial gradient edge. */
  backgroundDeep: string;
  /** Card stock tone — the bone behind each piece photo. */
  card: string;
  /** Ink — dominant text colour. */
  ink: string;
  /** Bronze accent — eyebrow copper, decorative glyph tint. */
  accent: string;
  /** Operator badge fill (the "+ / =" circle). */
  operatorBg: string;
  /** Operator badge glyph colour. */
  operatorInk: string;
  /** CTA pill background. On dark theme this inverts to bone. */
  ctaBg: string;
  /** CTA pill text colour — contrasts with ctaBg. */
  ctaText: string;
};

export type PairingProps = {
  // Brand / top chrome
  boutiqueName: string;
  logo?: string;
  /** Backing image — optional. When set, REPLACES the paper gradient
   *  background entirely. Data URL (uploaded via the editor). */
  backgroundImage?: string;

  // Kicker (top of safe zone — e.g. "THE PAIRING")
  kicker: string;

  // The two pieces that make the pair.
  pieceA: PairingPiece;
  pieceB: PairingPiece;

  // Pair lockup
  /** Small eyebrow above the total (e.g. "THE PAIR"). */
  totalLabel: string;
  /** Numeric total price (e.g. "7,930"). Renders with a small AED
   *  superscript next to it; the caller precomputes the sum. */
  totalPrice: string;
  /** Currency suffix rendered to the right of the total digits. */
  totalCurrency: string;
  /** Italic serif caption under the total (e.g. "Styled for evening."). */
  pairCaption: string;

  // CTA + byline
  ctaText: string;
  bylineStart: string;   // e.g. "Complimentary delivery"
  bylineItalic: string;  // e.g. "Free returns"

  // Themed palette (supportsThemes: true).
  colors: { light: PairingPalette; dark: PairingPalette };
};

const lightPalette: PairingPalette = {
  background: '#F5F0E8',
  backgroundDeep: '#EFE7DA',
  card: '#E4DED5',
  ink: '#121212',
  accent: '#B87253',
  operatorBg: '#121212',
  operatorInk: '#F5F0E8',
  ctaBg: '#121212',
  ctaText: '#F5F0E8',
};

const darkPalette: PairingPalette = {
  background: '#0F0E0C',
  backgroundDeep: '#080706',
  // Slightly lifted tone so the card still reads against the deep bg.
  card: '#1A1815',
  ink: '#EDE5D6',
  accent: '#D89A6E',
  // Dark-mode operator: pale bone circle with ink glyph so the "+" reads.
  operatorBg: '#EDE5D6',
  operatorInk: '#0F0E0C',
  // CTA flips on dark: pale pill with dark text.
  ctaBg: '#EDE5D6',
  ctaText: '#0F0E0C',
};

export const defaultProps: PairingProps = {
  boutiqueName: 'Ounass',
  logo: undefined,
  backgroundImage: undefined,

  kicker: 'THE PAIRING',

  pieceA: {
    id: 'a',
    eyebrow: '01',
    name: 'Bias-cut\nsatin gown',
    price: '4,280 AED',
    imageUrl: undefined,
  },
  pieceB: {
    id: 'b',
    eyebrow: '02',
    name: 'Top-handle\nleather tote',
    price: '3,650 AED',
    imageUrl: undefined,
  },

  totalLabel: 'THE PAIR',
  totalPrice: '7,930',
  totalCurrency: 'AED',
  pairCaption: 'Styled for evening.',

  ctaText: 'Shop The Pair',
  bylineStart: 'Complimentary delivery',
  bylineItalic: 'Free returns',

  colors: {
    light: lightPalette,
    dark: darkPalette,
  },
};
