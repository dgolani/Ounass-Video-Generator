// New In — dated arrivals ticker. Four just-landed pieces advance as an
// editorial filmstrip with an index meter (01/04 pips), then resolve to
// a 2x2 recap grid + CTA. Ported from the Claude-Design HTML prototype
// `NewIn.html`; CSS animation-delay / keyframes are translated to
// interpolate() / animate() / clamp() calls on useTimeline().time.
//
// Timeline (matches the HTML comment block):
//   T0.00 – T1.10  Act 0 — Logo + dated header (ARRIVED · THIS WEEK)
//   T1.10 – T2.20  Act 1 — Index pips + 01/04 meter wake up
//   T2.20 – T9.20  Act 2 — Ticker reveal, 4 products, 1.75s each:
//                            01 (T2.20 – T3.95)
//                            02 (T3.95 – T5.70)
//                            03 (T5.70 – T7.45)
//                            04 (T7.45 – T9.20)
//   T9.20 – T10.60 Act 3 — Cards collapse into a 2x2 recap grid
//   T10.60 – T12.0 Act 4 — CTA "Shop New In" + footer byline
//
// Layout note: the HTML's 4:5 variant expresses positions on a 1350-px-tall
// stage. Our h() scales by H/1920, so every y-value for 4:5 must be
// multiplied by 1920/1350 ≈ 1.4222 here so h() produces the same output
// position on a 1350 canvas. Widths / horizontal positions stay identical
// across aspects (both 1080 wide).

import {
  Easing,
  animate,
  clamp,
  interpolate,
  useFieldColor,
  useFieldFormat,
  useSafeZone,
  useThemedColors,
  useTimeline,
} from '../../engine';
import type { NewInProps } from './schema';
import { BoutiqueLogo } from '../BoutiqueLogo';
import { composePrice, useCurrencyForLocale } from '../../lib/price';

const BASE_W = 1080;
const BASE_H = 1920;

type Scale = {
  W: number;
  H: number;
  w: (px: number) => number;
  h: (px: number) => number;
  wh: (px: number) => number;
};

function makeScale(W: number, H: number): Scale {
  const sw = W / BASE_W;
  const sh = H / BASE_H;
  return {
    W,
    H,
    w: (px) => px * sw,
    h: (px) => px * sh,
    wh: (px) => px * Math.min(sw, sh),
  };
}

type SceneProps = {
  props: NewInProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

// Timing constants (seconds at timeScale=1 ≈ 12s)
const LOGO_IN = 0.15;
const LOGO_DUR = 0.6;
const HEADER_IN = 0.55;
const HEADER_DUR = 0.7;
const RULE_IN = 0.75;
const RULE_DUR = 0.7;
const METER_IN = 1.1;
const METER_DUR = 0.6;
// Per-product dwell windows
const PRODUCT_STARTS = [2.2, 3.95, 5.7, 7.45];
const PRODUCT_DWELL = 1.75;
// Ticker step transitions (strip translates between cards)
const TICKER_STEPS = [3.95, 5.7, 7.45]; // at each, transform moves -620
const TICKER_STEP_DUR = 0.6;
// Recap
const RECAP_START = 9.2;
const TICKER_HIDE_DUR = 0.4;
const RECAP_HEAD_IN = 9.2;
const RECAP_HEAD_DUR = 0.7;
const RECAP_GRID_IN = 9.3;
const RECAP_GRID_DUR = 0.9;
const RCELL_STAGGER = 0.15;
const RCELL_BASE = 9.4;
const RCELL_DUR = 0.7;
// CTA
const CTA_IN = 10.6;
const CTA_DUR = 0.7;
const CTA_SHINE_IN = 11.2;
const CTA_SHINE_DUR = 1.6;
const BYLINE_IN = 11.0;
const BYLINE_DUR = 0.6;

export function NewInScene({
  props,
  timeScale = 1,
  width = BASE_W,
  height = BASE_H,
}: SceneProps) {
  const { time: t } = useTimeline();
  const T = (x: number) => x * timeScale;
  const s = makeScale(width, height);
  const { w, h, wh, W } = s;
  const { base: safe } = useSafeZone({ width, height });
  const is45 = Math.abs(width / height - 4 / 5) < 0.01;

  // Theme resolution — this template opts into supportsThemes.
  const colors = useThemedColors(props.colors);

  const {
    boutiqueName,
    logo,
    backgroundImage,
    kicker,
    dateLine,
    bleedWord,
    products,
    recapTitle,
    recapCount,
    ctaText,
    byline,
  } = props;

  // Logo tint override (Aa button on the logo field).
  const logoColor = useFieldColor('logo', colors.ink);

  // ── Per-field format overrides ─────────────────────────────────────
  const kickerStyle = useFieldFormat('kicker', {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: wh(28),
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: colors.ink,
  });
  const dateStyle = useFieldFormat('dateLine', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(42),
    letterSpacing: '-0.01em',
    color: colors.ink,
    opacity: 0.6,
  });
  const recapTitleStyle = useFieldFormat('recapTitle', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(44),
    color: colors.ink,
  });
  const recapCountStyle = useFieldFormat('recapCount', {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: wh(22),
    letterSpacing: '0.3em',
    color: colors.ink,
    opacity: 0.6,
    textTransform: 'uppercase',
  });
  const ctaStyle = useFieldFormat('ctaText', {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: wh(28),
    letterSpacing: '0.36em',
    textTransform: 'uppercase',
    color: colors.ctaText,
  });
  const bylineStyle = useFieldFormat('byline', {
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    fontSize: wh(20),
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
  });
  // BoutiqueLogo's text-fallback footprint is computed from width/height
  // (see Math.min(width/4.2, height*0.9) in BoutiqueLogo.tsx). Picking a
  // representative number here is fine — the editor uses `sizeScale` as a
  // multiplier on this base, so the relative sizing the marketer sets in
  // the Aa drawer is what carries through to the rendered wordmark.
  const boutiqueNameStyle = useFieldFormat('boutiqueName', {
    fontFamily: 'Fraunces, serif',
    fontSize: wh(72),
    fontWeight: 300,
    letterSpacing: '14px',
    color: logoColor,
  });

  // ── Per-product wildcard format overrides ─────────────────────────
  // One hook per logical field; spread at each render site so editor
  // edits in the products.*.X drawers reach every card.
  const productCategoryStyle = useFieldFormat('products.*.category', {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: wh(20),
    letterSpacing: '0.32em',
    color: hexToRgba(colors.ink, 0.6),
  });
  const productBrandStyle = useFieldFormat('products.*.brand', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(26),
    color: hexToRgba(colors.ink, 0.6),
  });
  const productNameStyle = useFieldFormat('products.*.name', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(38),
    letterSpacing: '-0.01em',
    color: colors.ink,
    lineHeight: 1,
  });
  // FieldBaseStyle doesn't carry CSS shorthands like `fontVariantNumeric`
  // — that's a typography polish we keep on the wrapper element rather
  // than the override. The hook only governs the editor-controllable
  // shape (family, size, weight, color, etc.).
  const productPriceStyle = useFieldFormat('products.*.price', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(30),
    color: colors.ink,
    letterSpacing: '0.02em',
  });
  const productRecapPriceStyle = useFieldFormat('products.*.recapPrice', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(26),
    color: colors.ink,
  });

  // Locale-aware currency suffix for the price-composition helper —
  // strips the raw price's hard-coded currency and re-appends the
  // brand-kit's suffix for the active locale.
  const currency = useCurrencyForLocale();

  // The HTML uses --safe-cx (480 on 9:16, 540 on 4:5).
  const safeCX = is45 ? 540 : 480;

  // ── Layout positions (all in 1920-base px) ────────────────────────
  // 4:5 originals were on a 1350 stage; multiply by 1920/1350 ≈ 1.4222
  // so h() produces the right output on a 1350 canvas.
  const logoTop = is45 ? 242 : 290;
  const logoW = is45 ? 380 : 420;
  const headerTop = is45 ? 356 : 410;
  const meterTop = is45 ? 569 : 600;
  const meterWidth = is45 ? 1080 : 960;
  const meterPadX = 60;
  const tickerBandTop = is45 ? 654 : 660;
  const tickerBandHeight = is45 ? 654 : 800;
  const tickerLeft = is45 ? 350 : 260;
  const tcardW = is45 ? 380 : 560;
  const tcardH = is45 ? 654 : 780;
  const tcardGap = is45 ? 60 : 60;
  // Ticker step distance: card + gap
  const stepDistance = tcardW + tcardGap;

  const bleedTop = is45 ? 683 : 680;
  const bleedFont = is45 ? 740 : 640;
  const metaStripTop = is45 ? 1351 : 1470;
  const metaStripWidth = is45 ? 1080 : 960;

  // Recap era positions (bottom-anchored)
  const recapHeadTop = is45 ? 526 : 560;
  const recapHeadLeft = is45 ? 60 : 20;
  const recapHeadWidth = is45 ? 960 : 920;
  const recapTop = is45 ? 611 : 620;
  const recapLeft = is45 ? 60 : 20;
  const recapWidth = is45 ? 960 : 920;
  const recapRowH = is45 ? 427 : 460;
  const recapGap = is45 ? 23 : 20;

  const ctaTop = is45 ? 1422 : 1470;
  const bylineTop = is45 ? 1564 : 1575;

  // Safe-right clamp for the CTA button so it doesn't cross into the
  // IG like-stack zone on 9:16 (safe.right = 120). CTA is centered on
  // safeCX which already respects the safe rect horizontally, but the
  // button width is bounded by max inset — keep the scene structure
  // identical and only shorten the decorative byline if needed.
  const bylineWidth = is45 ? 960 : Math.min(960, BASE_W - safe.right * 2);

  // ── Intro chrome fades ────────────────────────────────────────────
  const logoOpacity = interpolate(
    [T(LOGO_IN), T(LOGO_IN + LOGO_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const logoTx = interpolate(
    [T(LOGO_IN), T(LOGO_IN + LOGO_DUR)],
    [-8, 0],
    Easing.easeOutExpo,
  )(t);
  const headerOpacity = interpolate(
    [T(HEADER_IN), T(HEADER_IN + HEADER_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const headerTy = interpolate(
    [T(HEADER_IN), T(HEADER_IN + HEADER_DUR)],
    [10, 0],
    Easing.easeOutExpo,
  )(t);
  const ruleScaleX = animate({
    from: 0,
    to: 1,
    start: T(RULE_IN),
    end: T(RULE_IN + RULE_DUR),
    ease: Easing.easeOutExpo,
  })(t);

  // Meter fade-in
  const meterOpacityIn = interpolate(
    [T(METER_IN), T(METER_IN + METER_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const meterTy = interpolate(
    [T(METER_IN), T(METER_IN + METER_DUR)],
    [10, 0],
    Easing.easeOutExpo,
  )(t);
  // Meter fades out along with the ticker at T9.20 (metaOut keyframe)
  const meterOpacityOut = interpolate(
    [T(RECAP_START), T(RECAP_START + TICKER_HIDE_DUR)],
    [1, 0],
    Easing.easeInCubic,
  )(t);
  const meterOpacity = meterOpacityIn * meterOpacityOut;

  // Ticker step — translateX accumulates -stepDistance per step.
  let tickerTx = 0;
  for (let i = 0; i < TICKER_STEPS.length; i++) {
    const start = T(TICKER_STEPS[i]);
    const end = T(TICKER_STEPS[i] + TICKER_STEP_DUR);
    const p = clamp((t - start) / (end - start), 0, 1);
    // easing: cubic-bezier(.5,0,.2,1) ≈ easeInOutCubic
    const eased =
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    tickerTx -= stepDistance * eased;
  }
  // Ticker band fades out at recap
  const tickerOpacity = interpolate(
    [T(RECAP_START), T(RECAP_START + TICKER_HIDE_DUR)],
    [1, 0],
    Easing.easeInCubic,
  )(t);

  // Active product index (for meter digit / meta strip / pip highlight)
  function dwellP(i: number): number {
    const start = T(PRODUCT_STARTS[i]);
    const end = T(PRODUCT_STARTS[i] + PRODUCT_DWELL);
    return clamp((t - start) / (end - start), 0, 1);
  }

  // Digit show keyframes: 0→12%→88%→100% (fade-in, hold, fade-out)
  function digitOpacity(i: number): number {
    const p = dwellP(i);
    if (p <= 0 || p >= 1) return 0;
    if (p < 0.12) return p / 0.12;
    if (p < 0.88) return 1;
    return 1 - (p - 0.88) / 0.12;
  }
  function digitTy(i: number): number {
    const p = dwellP(i);
    if (p <= 0) return 6;
    if (p >= 1) return -6;
    if (p < 0.12) return 6 - (p / 0.12) * 6;
    if (p < 0.88) return 0;
    return -((p - 0.88) / 0.12) * 6;
  }

  // Meta row — 15% fade-in, hold, 15% fade-out. Per HTML keyframes.
  function metaOpacity(i: number): number {
    // meta rows delay 0.10s after pip start (HTML: 2.30s vs 2.20s, etc.)
    const start = T(PRODUCT_STARTS[i] + 0.1);
    const end = start + T(PRODUCT_DWELL);
    const p = clamp((t - start) / (end - start), 0, 1);
    if (p <= 0 || p >= 1) return 0;
    if (p < 0.15) return p / 0.15;
    if (p < 0.85) return 1;
    return 1 - (p - 0.85) / 0.15;
  }
  function metaTy(i: number): number {
    const start = T(PRODUCT_STARTS[i] + 0.1);
    const end = start + T(PRODUCT_DWELL);
    const p = clamp((t - start) / (end - start), 0, 1);
    if (p <= 0) return 12;
    if (p >= 1) return -12;
    if (p < 0.15) return 12 - (p / 0.15) * 12;
    if (p < 0.85) return 0;
    return -((p - 0.85) / 0.15) * 12;
  }

  // Pip fill (scaleX 0 → 1 over the 1.75s dwell)
  function pipScaleX(i: number): number {
    return dwellP(i);
  }

  // Recap head + grid
  const recapHeadOpacity = interpolate(
    [T(RECAP_HEAD_IN), T(RECAP_HEAD_IN + RECAP_HEAD_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const recapHeadTy = interpolate(
    [T(RECAP_HEAD_IN), T(RECAP_HEAD_IN + RECAP_HEAD_DUR)],
    [14, 0],
    Easing.easeOutExpo,
  )(t);
  const recapGridOpacity = interpolate(
    [T(RECAP_GRID_IN), T(RECAP_GRID_IN + RECAP_GRID_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  // Per-cell entry (stagger 0.15s starting at 9.40s)
  function rcellState(i: number): { opacity: number; scale: number } {
    const start = T(RCELL_BASE + i * RCELL_STAGGER);
    const end = start + T(RCELL_DUR);
    const p = clamp((t - start) / (end - start), 0, 1);
    if (p <= 0) return { opacity: 0, scale: 0.96 };
    const eased = 1 - Math.pow(1 - p, 3);
    return { opacity: eased, scale: 0.96 + eased * 0.04 };
  }

  // CTA + byline
  const ctaOpacity = interpolate(
    [T(CTA_IN), T(CTA_IN + CTA_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const ctaTy = interpolate(
    [T(CTA_IN), T(CTA_IN + CTA_DUR)],
    [16, 0],
    Easing.easeOutExpo,
  )(t);
  const ctaShineLeft = interpolate(
    [T(CTA_SHINE_IN), T(CTA_SHINE_IN + CTA_SHINE_DUR)],
    [-40, 140],
    Easing.easeOutCubic,
  )(t);
  const bylineOpacity = interpolate(
    [T(BYLINE_IN), T(BYLINE_IN + BYLINE_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);

  // Bleed word drift (12s linear, translateX -40 → 60)
  const bleedTx = interpolate([0, T(12)], [-40, 60])(t);

  // Recap is visible (CSS hides tickerBand and switches to recap grid)
  const inRecap = t >= T(RECAP_START);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: colors.background,
        overflow: 'hidden',
        color: colors.ink,
      }}
    >
      {/* Background — uploaded image replaces the paper gradient */}
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />
      ) : (
        <>
          {/* Paper gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at 50% 40%, ${lighten(colors.background, 0.03)} 0%, ${colors.background} 55%, ${colors.backgroundDeep} 100%)`,
              zIndex: 0,
            }}
          />
          {/* Grain */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.35,
              mixBlendMode: 'multiply',
              backgroundImage: `radial-gradient(${hexToRgba(colors.ink, 0.04)} 1px, transparent 1px), radial-gradient(${hexToRgba(colors.ink, 0.03)} 1px, transparent 1px)`,
              backgroundSize: '3px 3px, 7px 7px',
              backgroundPosition: '0 0, 1px 2px',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* Decorative oversized serif "new" bleed */}
      <div
        style={{
          position: 'absolute',
          top: h(bleedTop),
          left: w(-60),
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: wh(bleedFont),
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: hexToRgba(colors.accent, 0.08),
          pointerEvents: 'none',
          userSelect: 'none',
          transform: `translateX(${w(bleedTx)}px)`,
          zIndex: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {bleedWord}
      </div>

      {/* ── Act 0: logo + dated header ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(logoTop),
          left: w(safeCX),
          width: w(logoW),
          transform: `translate(-50%, ${h(logoTx)}px)`,
          opacity: logoOpacity,
          zIndex: 10,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={logoColor}
          width={w(logoW)}
          height={h(90)}
          fontSize={wh(72)}
          letterSpacing="14px"
          nameStyle={boutiqueNameStyle}
        />
      </div>

      {/* Header: kicker row + italic date line */}
      <div
        style={{
          position: 'absolute',
          top: h(headerTop),
          left: w(safeCX),
          transform: `translate(-50%, ${h(headerTy)}px)`,
          textAlign: 'center',
          opacity: headerOpacity,
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: wh(22),
            ...kickerStyle,
          }}
        >
          <span
            aria-hidden
            style={{
              width: w(72),
              height: 1,
              background: colors.ink,
              transform: `scaleX(${ruleScaleX})`,
              transformOrigin: 'center',
            }}
          />
          <span>{kicker}</span>
          <span
            aria-hidden
            style={{
              width: w(72),
              height: 1,
              background: colors.ink,
              transform: `scaleX(${ruleScaleX})`,
              transformOrigin: 'center',
            }}
          />
        </div>
        <div
          style={{
            marginTop: h(22),
            ...dateStyle,
          }}
        >
          {dateLine}
        </div>
      </div>

      {/* ── Act 1: Index meter (count + pips) ───────────────────────── */}
      {!inRecap || meterOpacity > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            top: h(meterTop),
            left: 0,
            width: w(meterWidth),
            padding: `0 ${w(meterPadX)}px`,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: w(14),
            opacity: meterOpacity,
            transform: `translateY(${h(meterTy)}px)`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: wh(26),
              color: hexToRgba(colors.ink, 0.6),
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              flex: 'none',
              paddingRight: w(16),
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                position: 'relative',
                display: 'inline-block',
                width: `${wh(26) * 2.4}px`,
                height: wh(30),
                textAlign: 'center',
                color: colors.ink,
                fontWeight: 500,
                verticalAlign: 'middle',
              }}
            >
              {products.slice(0, 4).map((_, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    opacity: digitOpacity(i),
                    transform: `translateY(${digitTy(i)}px)`,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              ))}
            </span>
            {'\u00A0/\u00A004'}
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              gap: w(10),
            }}
          >
            {products.slice(0, 4).map((p, i) => (
              <div
                key={p.id}
                style={{
                  flex: 1,
                  height: h(3),
                  background: hexToRgba(colors.ink, 0.12),
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '100%',
                    background: colors.ink,
                    transform: `scaleX(${pipScaleX(i)})`,
                    transformOrigin: 'left center',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Act 2: Ticker band (4 cards) ────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(tickerBandTop),
          left: 0,
          width: W,
          height: h(tickerBandHeight),
          overflow: 'hidden',
          opacity: tickerOpacity,
          zIndex: 5,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: h(10),
            left: w(tickerLeft),
            display: 'flex',
            gap: w(tcardGap),
            transform: `translateX(${w(tickerTx)}px)`,
          }}
        >
          {products.slice(0, 4).map((p) => (
            <div
              key={p.id}
              style={{
                flex: 'none',
                width: w(tcardW),
                height: h(tcardH),
                background: colors.bone,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: `0 ${h(24)}px ${h(50)}px ${h(-18)}px ${hexToRgba(colors.ink, 0.25)}`,
              }}
            >
              {/* Photo fill — either uploaded image or bone placeholder gradient */}
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(180deg, ${lighten(colors.bone, 0.04)} 0%, ${darken(colors.bone, 0.08)} 100%)`,
                  }}
                />
              )}
              {/* Category chip (bottom-left) */}
              <div
                style={{
                  position: 'absolute',
                  left: w(28),
                  bottom: h(24),
                  ...productCategoryStyle,
                }}
              >
                {p.category}
              </div>
              {/* Brand italic (bottom-right) */}
              <div
                style={{
                  position: 'absolute',
                  right: w(28),
                  bottom: h(24),
                  ...productBrandStyle,
                }}
              >
                {p.brand}
              </div>
              {/* JUST IN ribbon (top-right) */}
              <div
                style={{
                  position: 'absolute',
                  top: h(24),
                  right: w(24),
                  padding: `${h(10)}px ${w(18)}px`,
                  background: colors.ribbonBg,
                  color: colors.ribbonText,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: wh(20),
                  letterSpacing: '0.28em',
                  borderRadius: 999,
                }}
              >
                JUST IN
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meta strip (name + price) under the ticker band — only renders
       *  during the ticker phase; hidden once recap takes over. */}
      {!inRecap ? (
        <div
          style={{
            position: 'absolute',
            top: h(metaStripTop),
            left: 0,
            width: w(metaStripWidth),
            padding: `0 ${w(60)}px`,
            boxSizing: 'border-box',
            height: h(60),
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          {products.slice(0, 4).map((p, i) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                inset: 0,
                left: w(60),
                right: w(60),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: metaOpacity(i),
                transform: `translateY(${h(metaTy(i))}px)`,
              }}
            >
              <div style={{ ...productNameStyle }}>
                {p.name}
              </div>
              <div
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  ...productPriceStyle,
                }}
              >
                {composePrice(p.price, currency)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Act 3: Recap head + 2x2 grid ──────────────────────────── */}
      {inRecap ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: h(recapHeadTop),
              left: w(recapHeadLeft),
              width: w(recapHeadWidth),
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              opacity: recapHeadOpacity,
              transform: `translateY(${h(recapHeadTy)}px)`,
              zIndex: 10,
            }}
          >
            <div style={{ ...recapTitleStyle }}>{recapTitle}</div>
            <div style={{ ...recapCountStyle }}>{recapCount}</div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: h(recapTop),
              left: w(recapLeft),
              width: w(recapWidth),
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: `${h(recapRowH)}px ${h(recapRowH)}px`,
              gap: w(recapGap),
              opacity: recapGridOpacity,
              zIndex: 10,
            }}
          >
            {products.slice(0, 4).map((p, i) => {
              const { opacity: cOp, scale } = rcellState(i);
              return (
                <div
                  key={p.id}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: colors.bone,
                    opacity: cOp,
                    transform: `scale(${scale})`,
                  }}
                >
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(180deg, ${lighten(colors.bone, 0.04)} 0%, ${darken(colors.bone, 0.08)} 100%)`,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      left: w(20),
                      bottom: h(18),
                      ...productCategoryStyle,
                    }}
                  >
                    {p.category}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: w(20),
                      bottom: h(18),
                      fontVariantNumeric: 'tabular-nums',
                      ...productRecapPriceStyle,
                    }}
                  >
                    {composePrice(p.recapPrice, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* ── Act 4: CTA + byline ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(ctaTop),
          left: w(safeCX),
          transform: `translate(-50%, ${h(ctaTy)}px)`,
          textAlign: 'center',
          opacity: ctaOpacity,
          zIndex: 20,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            alert('Shopping new in…');
          }}
          style={{
            display: 'inline-block',
            padding: `${h(26)}px ${w(58)}px`,
            background: colors.ctaBg,
            border: 0,
            borderRadius: 999,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            ...ctaStyle,
          }}
        >
          {ctaText}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${ctaShineLeft}%`,
              width: '40%',
              background:
                'linear-gradient(90deg, rgba(245,240,232,0) 0%, rgba(245,240,232,0.35) 50%, rgba(245,240,232,0) 100%)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: h(bylineTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          width: w(bylineWidth),
          textAlign: 'center',
          whiteSpace: 'nowrap',
          zIndex: 20,
          ...bylineStyle,
          opacity: (bylineStyle.opacity ?? 1) * bylineOpacity,
        }}
      >
        {byline}
      </div>
    </div>
  );
}

// ── Tiny color utilities ───────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : c;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(0,0,0,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clampChannel(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lighten(hex: string, amt: number): string {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : c;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  const r = clampChannel(((n >> 16) & 255) + 255 * amt);
  const g = clampChannel(((n >> 8) & 255) + 255 * amt);
  const b = clampChannel((n & 255) + 255 * amt);
  return `rgb(${r}, ${g}, ${b})`;
}

function darken(hex: string, amt: number): string {
  return lighten(hex, -amt);
}
