// The Stack — schema & defaults.
//
// Mechanic: four luxury houses drop into frame as metallic bullion
// plates, stacking with gravity. Each landing compresses the stack
// below. Final plate locks with a bronze-foil SEAL stamp. No imagery,
// no products — just material weight and the names of the houses.
//
// Ported from the Claude-Design HTML prototype `The Stack.html`
// (handoff bundle video-ads-new). The choreography there was built
// with CSS animation-delay; we translate every keyframe to
// interpolate() calls on useTimeline().time at port time.

export type StackPlate = {
  id: string;
  /** Big engraved brand name on the plate (e.g. "Valentino"). */
  brand: string;
  /** Tiny "01 · Rome" metadata on the left. */
  indexLabel: string;
  origin: string;
  /** Right-side stamp metadata (e.g. "MMXXVI" over "SS CAMPAIGN"). */
  yearRoman: string;
  subheading: string;
};

export type StackPalette = {
  /** Paper tone — the scene backdrop. */
  background: string;
  /** Paper "deep" tone used in the radial gradient edge. */
  backgroundDeep: string;
  /** Ink — dominant text colour. */
  ink: string;
  /** Plate metal gradient colours. Stored as 5 stops for the main
   *  metal body; order is light→dark→mid→dark→deepest. */
  metalLight: string;
  metalMid: string;
  metalDark: string;
  metalDeepest: string;
  /** Text engraved onto each plate. */
  engraved: string;
  /** Bronze accent — rule, dot, seal foil. */
  accent: string;
  /** Foil highlight colour used in the seal stamp. */
  foil: string;
  /** Cta button background. On dark theme this becomes the light bone. */
  ctaBg: string;
  /** Cta button text. Contrasts with ctaBg. */
  ctaText: string;
};

export type StackProps = {
  // Brand / top chrome
  boutiqueName: string;
  logo?: string;
  /** Backing image — optional. When set, REPLACES the paper gradient
   *  background entirely. Data URL (uploaded via the editor). */
  backgroundImage?: string;

  // Kicker row (top of safe zone)
  kickerSmall: string;      // e.g. "April"
  kickerMain: string;       // e.g. "Four Houses"
  kickerSmallRight: string; // e.g. "Weight"

  // Four plates — always 4 (the mechanic is built around 4 drops)
  plates: StackPlate[];

  // Bronze foil seal copy
  sealWord1: string;        // e.g. "sealed"
  sealWord2: string;        // e.g. "BY"
  sealWord3: string;        // e.g. "OUNASS"

  // CTA + byline
  ctaText: string;
  bylineStart: string;      // e.g. "Four houses. One season."
  bylineItalic: string;     // e.g. "Weight, held."

  // Themed palette (supportsThemes: true).
  colors: { light: StackPalette; dark: StackPalette };
};

const lightPalette: StackPalette = {
  background: '#F5F0E8',
  backgroundDeep: '#E8DFD0',
  ink: '#121212',
  metalLight: '#6A5641',
  metalMid: '#3C332A',
  metalDark: '#2A2520',
  metalDeepest: '#221D18',
  engraved: '#F5F0E8',
  accent: '#B87253',
  foil: '#C89466',
  ctaBg: '#121212',
  ctaText: '#F5F0E8',
};

const darkPalette: StackPalette = {
  background: '#0F0E0C',
  backgroundDeep: '#080706',
  ink: '#EDE5D6',
  // Darker metal so plates still read on the deep bg (plates are light
  // against a darker stage; we nudge the mid-tones a touch warmer).
  metalLight: '#7A6547',
  metalMid: '#48392D',
  metalDark: '#2F251C',
  metalDeepest: '#1A130E',
  engraved: '#EDE5D6',
  accent: '#D89A6E',
  foil: '#E0AB7D',
  // On dark scene, CTA inverts: pale pill, dark text.
  ctaBg: '#EDE5D6',
  ctaText: '#0F0E0C',
};

export const defaultProps: StackProps = {
  boutiqueName: 'Ounass',
  logo: undefined,
  backgroundImage: undefined,

  kickerSmall: 'April',
  kickerMain: 'Four Houses',
  kickerSmallRight: 'Weight',

  plates: [
    {
      id: 's1',
      brand: 'Valentino',
      indexLabel: '01',
      origin: 'Rome',
      yearRoman: 'MMXXVI',
      subheading: 'SS CAMPAIGN',
    },
    {
      id: 's2',
      brand: 'Saint Laurent',
      indexLabel: '02',
      origin: 'Paris',
      yearRoman: 'MMXXVI',
      subheading: 'SS CAMPAIGN',
    },
    {
      id: 's3',
      brand: 'Bottega Veneta',
      indexLabel: '03',
      origin: 'Vicenza',
      yearRoman: 'MMXXVI',
      subheading: 'SS CAMPAIGN',
    },
    {
      id: 's4',
      brand: 'Chloé',
      indexLabel: '04',
      origin: 'Paris',
      yearRoman: 'MMXXVI',
      subheading: 'SS CAMPAIGN',
    },
  ],

  sealWord1: 'sealed',
  sealWord2: 'BY',
  sealWord3: 'OUNASS',

  ctaText: 'Enter The Houses',
  bylineStart: 'Four houses. One season.',
  bylineItalic: 'Weight, held.',

  colors: {
    light: lightPalette,
    dark: darkPalette,
  },
};
