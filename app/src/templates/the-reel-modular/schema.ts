// The Reel — Modular. A scene-by-scene configurable version of The
// Reel. Same architecture (4-scene editorial spot, video bg + dim,
// safe zones, BoutiqueLogo wordmarks) but each scene slot exposes a
// `*Type` discriminator that selects which variant renders. The
// fields panel uses `showWhen` predicates so per-variant fields only
// appear for the active variant.
//
// Today: scene 2 (content) has 4 variants — phone-preview,
// heading-products, vouri-plp, gravity-collapse. Scenes 1/3/4 each
// have a single variant; the discriminator is wired so adding new
// variants later is a no-code-change for the editor (just new
// schema + scene branch + showWhen predicates in fields.ts).
//
// Ported from the Claude-Design HTML prototype `The Reel - Modular.html`
// in the video-ads-new handoff bundle.

export type IntroType = 'wordmark';
export type ContentType =
  | 'phone-preview'
  | 'heading-products'
  | 'vouri-plp'
  | 'gravity-collapse';
export type UspsType = 'two-flash';
export type FinaleType = 'discover-shimmer';

export type ReelPhoneAnim = 'iris' | 'streak' | 'drop' | 'tilt';

export type ReelModularPalette = {
  accent: string;
  accentDeep: string;
  accentLight: string;
  phoneFrame: string;
  phoneScreen: string;
};

/** Per-product slot for the heading-products variant (scene 2). */
export type HpProduct = {
  imageUrl?: string;
  brand: string;
  price: string;
};

/** Per-tile slot for the vouri-plp variant (scene 2). */
export type VpTile = {
  imageUrl?: string;
  brand: string;
  name: string;
  price: string;
  was?: string;
  off?: string;
  tag?: string;
};

export type ReelModularProps = {
  // Brand chrome
  logo?: string;
  boutiqueName: string;

  // Background video — same field as The Reel's, kept here so that
  // existing migrations work and so the project-bg layer behaves the
  // same (videoSrc → project.background on load).
  videoSrc: string;
  videoDim: number;

  // Per-scene type selectors + durations
  introType: IntroType;
  introDur: number;

  contentType: ContentType;
  /** Manual duration for content variants other than heading-products.
   *  Heading-products auto-scales: (productCount + 1) × 2.2s. */
  contentDur: number;

  uspsType: UspsType;
  uspsDur: number;

  finaleType: FinaleType;
  finaleDur: number;

  // Scene 1 — wordmark variant
  s1Mark: string;
  s1Tag: string;

  // Scene 2 — phone-preview variant
  s2Anim: ReelPhoneAnim;
  /** Image inside the phone screen (phone-preview variant). */
  productImage?: string;

  // Scene 2 — heading-products variant
  s2hpHeading: string;
  /** 1–6 product slots. The list length itself drives the render
   *  count and the auto-computed Scene 2 duration; there's no
   *  separate count slider so the marketer can't desync them. */
  s2hpProducts: HpProduct[];

  // Scene 2 — vouri-plp variant
  s2vpHeading: string;
  s2vpSub: string;
  s2vpTitle: string;
  s2vpBrandChip: string;
  s2vpResults: string;
  s2vpTiles: VpTile[];

  // Scene 2 — gravity-collapse variant
  /** Comma-separated image URLs for the 8 falling tiles. */
  s2gcImgs: string;

  // Scene 3 — two-flash variant
  s3Eyebrow: string;
  s3Line1: string;
  s3Line2: string;

  // Scene 4 — discover-shimmer variant
  s4Pre: string;
  s4Mark: string;
  s4Cta: string;

  colors: ReelModularPalette;
};

const palette: ReelModularPalette = {
  accent: '#B87253',
  accentDeep: '#D89A6E',
  accentLight: '#FFE5C8',
  phoneFrame: '#0A0A0A',
  phoneScreen: '#1A1A1A',
};

const defaultHpProducts: HpProduct[] = [
  { brand: 'NEEDLE & THREAD', price: '4,250 AED' },
  { brand: 'STAUD', price: '1,350 AED' },
  { brand: 'ZIMMERMANN', price: '3,890 AED' },
  { brand: 'KHAITE', price: '5,120 AED' },
  { brand: 'TOTEME', price: '2,640 AED' },
  { brand: 'THE ROW', price: '6,820 AED' },
];

const defaultVpTiles: VpTile[] = [
  {
    brand: 'REFORMATION',
    name: 'Nolyn Top in Wool Blend',
    price: '640 AED',
    was: '800 AED',
    off: '20% OFF',
    tag: 'WONDER WEEK',
  },
  {
    brand: 'REFORMATION',
    name: 'Carla Low-waist Mini Skirt',
    price: '380 AED',
    was: '475 AED',
    off: '20% OFF',
    tag: 'WONDER WEEK',
  },
  { brand: 'REFORMATION', name: 'Sequin Halter Dress', price: '1,890 AED' },
  { brand: 'REFORMATION', name: 'Pearl Skirt', price: '1,420 AED' },
  { brand: 'REFORMATION', name: 'Wool Crewneck', price: '1,980 AED' },
  { brand: 'REFORMATION', name: 'Tailored Wide Trouser', price: '2,340 AED' },
  {
    brand: 'REFORMATION',
    name: 'Wrap Blouse',
    price: '1,640 AED',
    was: '2,050 AED',
    off: '20% OFF',
    tag: 'WONDER WEEK',
  },
  { brand: 'REFORMATION', name: 'Belted Shirt Dress', price: '1,720 AED' },
];

export const defaultProps: ReelModularProps = {
  logo: undefined,
  boutiqueName: 'OUNASS',

  videoSrc: 'https://www.pexels.com/download/video/15439741/',
  videoDim: 0.24,

  introType: 'wordmark',
  introDur: 2.5,

  contentType: 'heading-products',
  contentDur: 4.0,

  uspsType: 'two-flash',
  uspsDur: 2.5,

  finaleType: 'discover-shimmer',
  finaleDur: 3.0,

  s1Mark: 'OUNASS',
  s1Tag: 'The Edit',

  s2Anim: 'iris',
  productImage: undefined,

  s2hpHeading: 'TAILORED TO YOUR TASTE',
  s2hpProducts: defaultHpProducts.slice(0, 4),

  s2vpHeading: 'INTRODUCING',
  s2vpSub: 'Vuori',
  s2vpTitle: 'Co-ord Sets',
  s2vpBrandChip: 'Saint Laurent',
  s2vpResults: '1,018',
  s2vpTiles: defaultVpTiles,

  s2gcImgs: '',

  s3Eyebrow: 'WHY OUNASS',
  s3Line1: '2-Hour or Same Day Delivery',
  s3Line2: 'Curated for you',

  s4Pre: 'DISCOVER ON',
  s4Mark: 'OUNASS',
  s4Cta: 'Shop Now',

  colors: palette,
};

/** Per-frame slice for the heading-products variant. */
export const HP_FRAME_SLICE = 2.2;

/** Compute the in/out times for each scene from the props' duration
 *  fields. heading-products auto-scales: (productCount + 1) × 2.2s.
 *  Returns total runtime in seconds — the editor reads this through
 *  `meta.computeDuration` to auto-extend the project's stored
 *  duration whenever the marketer changes anything that affects
 *  total runtime. */
export function computeTimeline(p: ReelModularProps) {
  const d1 = Math.max(0.1, p.introDur);
  let d2: number;
  if (p.contentType === 'heading-products') {
    const count = Math.max(1, Math.min(6, p.s2hpProducts?.length ?? 1));
    d2 = (count + 1) * HP_FRAME_SLICE;
  } else {
    d2 = Math.max(0.1, p.contentDur);
  }
  const d3 = Math.max(0.1, p.uspsDur);
  const d4 = Math.max(0.1, p.finaleDur);
  const s1In = 0;
  const s1Out = s1In + d1;
  const s2In = s1Out;
  const s2Out = s2In + d2;
  const s3In = s2Out;
  const s3Out = s3In + d3;
  const s4In = s3Out;
  const s4Out = s4In + d4;
  return { s1In, s1Out, s2In, s2Out, s3In, s3Out, s4In, s4Out, total: s4Out };
}
