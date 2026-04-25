// The Pairing — two products reveal separately, their prices add via a
// "+" glyph that morphs to "=", cards converge, the total reveals and a
// CTA invites the viewer to shop the styled duo. Ported from the
// Claude-Design HTML prototype `ThePairing.html`; CSS animation-delay
// timings are translated directly to interpolate() / animate() calls on
// useTimeline().time.
//
// Timeline (exactly mirrors the HTML comment block):
//   T0.00 – T0.80   Act 0 — Logo + kicker intro
//   T0.80 – T3.20   Act 1 — Piece A slides in from left, label rolls up
//   T3.20 – T5.60   Act 2 — Piece B slides in from right, label rolls up
//   T5.60 – T7.80   Act 3 — Convergence, operator drifts, labels fade
//   T7.80 – T9.60   Act 4 — Pair lockup + digit slam
//   T9.60 – T11.0   Act 5 — CTA + byline

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
import type { PairingProps } from './schema';
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
  props: PairingProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

// Timing constants (seconds at timeScale = 1). Match the HTML exactly.
const LOGO_START = 0.15;
const LOGO_DUR = 0.7;
const KICKER_START = 0.45;
const KICKER_DUR = 0.6;
const RULE_START = 0.55;
const RULE_DUR = 0.7;

const CARD_A_START = 0.95;
const CARD_A_DUR = 1.0;
const LABEL_A_START = 1.60;
const LABEL_A_DUR = 0.7;

const OP_IN_START = 2.60;
const OP_IN_DUR = 0.6;
const OP_BEAT_START = 5.00;
const OP_BEAT_DUR = 0.5;
const OP_MORPH_START = 5.50;
const OP_MORPH_DUR = 0.4;
const OP_DRIFT_START = 6.20;
const OP_DRIFT_DUR = 1.4;

const CARD_B_START = 3.35;
const CARD_B_DUR = 1.0;
const LABEL_B_START = 4.00;
const LABEL_B_DUR = 0.7;

const CONVERGE_START = 5.60;
const CONVERGE_DUR = 1.6;
const LABEL_OUT_START = 5.60;
const LABEL_OUT_DUR = 0.5;

const PAIR_START = 7.80;
const PAIR_DUR = 0.9;
const DIGIT_FIRST_START = 8.10;
const DIGIT_STEP = 0.08;
const DIGIT_DUR = 0.55;
const AED_START = 8.70;

const CTA_START = 9.60;
const CTA_DUR = 0.7;
const CTA_SHINE_START = 10.2;
const CTA_SHINE_DUR = 1.6;
const BYLINE_START = 10.0;
const BYLINE_DUR = 0.6;

export function ThePairingScene({
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

  // Theme resolution — supportsThemes: true.
  const colors = useThemedColors(props.colors);

  const {
    boutiqueName,
    logo,
    backgroundImage,
    kicker,
    pieceA,
    pieceB,
    totalLabel,
    totalPrice,
    totalCurrency,
    pairCaption,
    ctaText,
    bylineStart,
    bylineItalic,
  } = props;

  // Logo tint override (Aa button on the logo field).
  const logoColor = useFieldColor('logo', colors.ink);

  // ── Per-field format overrides ────────────────────────────────────
  const kickerStyle = useFieldFormat('kicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(28),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: colors.ink,
  });
  const eyebrowBaseStyle = {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: '0.36em',
    textTransform: 'uppercase' as const,
    color: colors.accent,
  };
  const nameBaseStyle = {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic' as const,
    fontWeight: 300,
    fontSize: wh(44),
    letterSpacing: '-0.01em',
    lineHeight: 1.05,
    color: colors.ink,
  };
  const priceBaseStyle = {
    fontFamily: 'var(--font-numeric)',
    fontWeight: 400,
    fontSize: wh(38),
    letterSpacing: '0.02em',
    color: colors.ink,
    fontVariantNumeric: 'tabular-nums' as const,
  };
  const pieceAEyebrowStyle = useFieldFormat('pieceA.eyebrow', eyebrowBaseStyle);
  const pieceANameStyle = useFieldFormat('pieceA.name', nameBaseStyle);
  const pieceAPriceStyle = useFieldFormat('pieceA.price', priceBaseStyle);
  const pieceBEyebrowStyle = useFieldFormat('pieceB.eyebrow', eyebrowBaseStyle);
  const pieceBNameStyle = useFieldFormat('pieceB.name', nameBaseStyle);
  const pieceBPriceStyle = useFieldFormat('pieceB.price', priceBaseStyle);

  const totalLabelStyle = useFieldFormat('totalLabel', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(is45 ? 20 : 24),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
  });
  const pairCaptionStyle = useFieldFormat('pairCaption', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(is45 ? 30 : 38),
    letterSpacing: '-0.01em',
    lineHeight: 1.15,
    color: colors.ink,
  });
  const ctaStyle = useFieldFormat('ctaText', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(28),
    fontWeight: 700,
    letterSpacing: '0.36em',
    textTransform: 'uppercase',
    color: colors.ctaText,
  });
  const bylineStyle = useFieldFormat('bylineStart', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(20),
    fontWeight: 500,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
  });
  // Currency-suffix label that trails the total price ("AED" / "د.إ.").
  // Was hardcoded inline; surface it via the Aa drawer.
  const totalCurrencyStyle = useFieldFormat('totalCurrency', {
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    fontSize: wh(is45 ? 24 * (1920 / 1350) : 28),
    letterSpacing: '0.18em',
    color: hexToRgba(colors.ink, 0.6),
  });
  // Boutique-name text-fallback typography (mode-3 of <BoutiqueLogo>).
  const boutiqueNameStyle = useFieldFormat('boutiqueName', {
    fontFamily: 'Fraunces, serif',
    fontWeight: 300,
    fontSize: wh(72),
    letterSpacing: '14px',
    color: logoColor,
  });

  // Locale-aware currency suffix — strips any built-in currency from the
  // raw price strings and re-applies the brand-kit's locale-mapped one
  // (`AED` for en, `د.إ.` for ar, …) so language toggles reflow prices
  // without per-field edits.
  const currency = useCurrencyForLocale();

  // The HTML uses --safe-cx (480 on 9:16, 540 on 4:5) as the
  // horizontal centering anchor. 9:16 has safe.right=120, so cx sits
  // at the midpoint of the safe area, not canvas center.
  const safeCX = is45 ? 540 : 480;

  // ── Layout positions (all in 1920-base px; h() scales to output) ──
  // The 4:5 originals from the HTML were expressed on a 1350-tall stage;
  // those values are multiplied by 1920/1350 ≈ 1.4222 here so h()
  // produces the same absolute output position on a 1350px canvas.
  const CONV = 1920 / 1350;
  const logoTop = is45 ? 150 * CONV : 290;
  const logoW = is45 ? 380 : 460;
  const logoH = is45 ? 80 : 80;
  const kickerTop = is45 ? 250 * CONV : 430;

  const cardTop = is45 ? 330 * CONV : 620;
  const cardW = is45 ? 360 : 420;
  const cardH = is45 ? 480 * CONV : 560;
  // Horizontal positions of the cards, in canvas-base px from center.
  // 9:16: card-a left=20, card-b right=140 → with safe.right=120 that
  // clears the Instagram like-stack zone by 20px. 4:5: both 100px in.
  const cardALeft = is45 ? 100 : 20;
  const cardBRight = is45 ? 100 : 140;

  const labelTop = is45 ? 830 * CONV : 1210;
  const labelW = is45 ? 360 : 420;

  const operatorTop = is45 ? 570 * CONV : 870;
  const operatorSize = is45 ? 120 * CONV : 120;

  const pairTop = is45 ? 790 * CONV : 1170;
  const pairW = is45 ? 880 : 900;
  const totalFontSize = is45 ? 88 * CONV : 112;
  // aedFontSize was inlined; the totalCurrency span now picks fontSize from
  // useFieldFormat('totalCurrency', …) via the Aa drawer.

  const ctaTop = is45 ? 1010 * CONV : 1470;
  const bylineTop = is45 ? 1120 * CONV : 1575;

  // 9:16 safe.right is 120 (Instagram like-stack tap zone). Any
  // right-anchored element must clear that. Card B's default inset is
  // 140 on 9:16 which already clears it; on 4:5 safe.right=0 so 100 is
  // fine. But if brand overrides push safe.right wider, seal against it.
  const sealedCardBRight = Math.max(safe.right + 20, cardBRight);
  // Label B sits under card B so it inherits the sealed inset.
  const sealedLabelBRight = sealedCardBRight;

  // ── Act 0: intro chrome (logo / kicker / rules) ───────────────────
  const logoOpacity = interpolate(
    [T(LOGO_START), T(LOGO_START + LOGO_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const logoY = interpolate(
    [T(LOGO_START), T(LOGO_START + LOGO_DUR)],
    [-8, 0],
    Easing.easeOutCubic,
  )(t);
  const kickerOpacity = interpolate(
    [T(KICKER_START), T(KICKER_START + KICKER_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const ruleScaleX = animate({
    from: 0,
    to: 1,
    start: T(RULE_START),
    end: T(RULE_START + RULE_DUR),
    ease: Easing.easeOutExpo,
  })(t);

  // ── Card A slide-in (0.95s), rests at rotate(-1.2deg).
  //   0%   translateX(-900) rot(-2)
  //   65%  translateX(30)   rot(-1.2)
  //   100% translateX(0)    rot(-1.2)
  function cardATransform(): { tx: number; ty: number; rot: number; scale: number } {
    const start = T(CARD_A_START);
    const dur = T(CARD_A_DUR);
    const p = clamp((t - start) / dur, 0, 1);
    let tx: number;
    let rot: number;
    if (p <= 0) {
      tx = -900;
      rot = -2;
    } else if (p < 0.65) {
      const q = p / 0.65;
      const eased = 1 - Math.pow(1 - q, 3);
      tx = -900 + (30 - -900) * eased;
      rot = -2 + (-1.2 - -2) * eased;
    } else if (p < 1) {
      const q = (p - 0.65) / 0.35;
      const eased = 1 - Math.pow(1 - q, 3);
      tx = 30 + (0 - 30) * eased;
      rot = -1.2;
    } else {
      tx = 0;
      rot = -1.2;
    }
    // Convergence: translate(170, -20), rot(0), scale(0.92)
    const cStart = T(CONVERGE_START);
    const cDur = T(CONVERGE_DUR);
    const cp = clamp((t - cStart) / cDur, 0, 1);
    const ce = easeInOutQuad(cp);
    const ctx = tx + (170 - 0) * ce;
    const cty = 0 + (-20 - 0) * ce;
    const cRot = rot + (0 - rot) * ce;
    const cScale = 1 + (0.92 - 1) * ce;
    return { tx: ctx, ty: cty, rot: cRot, scale: cScale };
  }

  // ── Card B slide-in (3.35s), rests at rotate(1.2deg).
  //   0%   translateX(900)  rot(2)
  //   65%  translateX(-30)  rot(1.2)
  //   100% translateX(0)    rot(1.2)
  function cardBTransform(): { tx: number; ty: number; rot: number; scale: number } {
    const start = T(CARD_B_START);
    const dur = T(CARD_B_DUR);
    const p = clamp((t - start) / dur, 0, 1);
    let tx: number;
    let rot: number;
    if (p <= 0) {
      tx = 900;
      rot = 2;
    } else if (p < 0.65) {
      const q = p / 0.65;
      const eased = 1 - Math.pow(1 - q, 3);
      tx = 900 + (-30 - 900) * eased;
      rot = 2 + (1.2 - 2) * eased;
    } else if (p < 1) {
      const q = (p - 0.65) / 0.35;
      const eased = 1 - Math.pow(1 - q, 3);
      tx = -30 + (0 - -30) * eased;
      rot = 1.2;
    } else {
      tx = 0;
      rot = 1.2;
    }
    // Convergence: translate(-170, -20), rot(0), scale(0.92)
    const cStart = T(CONVERGE_START);
    const cDur = T(CONVERGE_DUR);
    const cp = clamp((t - cStart) / cDur, 0, 1);
    const ce = easeInOutQuad(cp);
    const ctx = tx + (-170 - 0) * ce;
    const cty = 0 + (-20 - 0) * ce;
    const cRot = rot + (0 - rot) * ce;
    const cScale = 1 + (0.92 - 1) * ce;
    return { tx: ctx, ty: cty, rot: cRot, scale: cScale };
  }

  function easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  // ── Label fades ────────────────────────────────────────────────────
  function labelFade(start: number, dur: number): { opacity: number; ty: number } {
    const p = clamp((t - T(start)) / T(dur), 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const inOpacity = eased;
    const inTy = 10 - 10 * eased;
    // Fade out during convergence.
    const op = clamp((t - T(LABEL_OUT_START)) / T(LABEL_OUT_DUR), 0, 1);
    const outOpacity = 1 - op;
    const outTy = -10 * op;
    return {
      opacity: inOpacity * outOpacity,
      ty: inTy + outTy,
    };
  }
  const labelAFade = labelFade(LABEL_A_START, LABEL_A_DUR);
  const labelBFade = labelFade(LABEL_B_START, LABEL_B_DUR);

  // ── Operator badge ─────────────────────────────────────────────────
  //   In at 2.60s (opacity 0→1, scale 0.4→1.12→1)
  //   Beat at 5.00s (scale 1→1.18→1)
  //   Morph at 5.50s (plus fades out, equals fades in)
  //   Drift at 6.20s (translate Y up 310, scale down 0.55, fade to 0)
  const opInP = clamp((t - T(OP_IN_START)) / T(OP_IN_DUR), 0, 1);
  let opOpacity = 0;
  let opScale = 0.4;
  if (opInP > 0) {
    if (opInP < 0.6) {
      const q = opInP / 0.6;
      opOpacity = q;
      opScale = 0.4 + (1.12 - 0.4) * q;
    } else {
      const q = (opInP - 0.6) / 0.4;
      opOpacity = 1;
      opScale = 1.12 + (1 - 1.12) * q;
    }
  }
  // Beat
  const beatP = clamp((t - T(OP_BEAT_START)) / T(OP_BEAT_DUR), 0, 1);
  if (beatP > 0 && beatP < 1) {
    if (beatP < 0.5) {
      opScale += (1.18 - 1) * (beatP / 0.5);
    } else {
      opScale += (1.18 - 1) * (1 - (beatP - 0.5) / 0.5);
    }
  }
  // Drift
  const driftP = clamp((t - T(OP_DRIFT_START)) / T(OP_DRIFT_DUR), 0, 1);
  const driftTy = driftP > 0 ? -310 * easeInOutQuad(driftP) : 0;
  if (driftP > 0) {
    // Scale down during drift.
    opScale = opScale + (0.55 - opScale) * easeInOutQuad(driftP);
    // Fade out after 60% through drift.
    if (driftP > 0.6) {
      opOpacity = opOpacity * (1 - (driftP - 0.6) / 0.4);
    }
  }
  // Morph: plus fades out 5.50-5.90, equals fades in 5.55-5.95
  const plusMorph = clamp((t - T(OP_MORPH_START)) / T(OP_MORPH_DUR), 0, 1);
  const equalMorph = clamp((t - T(OP_MORPH_START + 0.05)) / T(OP_MORPH_DUR), 0, 1);
  const plusOpacity = 1 - plusMorph;
  const plusScale = 1 - 0.7 * plusMorph;
  const plusRot = 90 * plusMorph;
  const equalOpacity = equalMorph;
  const equalScale = 0.3 + 0.7 * equalMorph;
  const equalRot = -90 + 90 * equalMorph;

  // ── Pair lockup ────────────────────────────────────────────────────
  const pairOpacity = interpolate(
    [T(PAIR_START), T(PAIR_START + PAIR_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const pairTy = interpolate(
    [T(PAIR_START), T(PAIR_START + PAIR_DUR)],
    [20, 0],
    Easing.easeOutCubic,
  )(t);

  // Digit-slam: each character of totalPrice rolls up staggered.
  // We render each character in a span; its index × DIGIT_STEP adds to
  // DIGIT_FIRST_START. The HTML hardcodes 5 digits — we generalise to
  // totalPrice.length so "12,500" (6 chars) and "900" (3 chars) both work.
  function digitFade(idx: number): { opacity: number; ty: number } {
    const start = T(DIGIT_FIRST_START + idx * DIGIT_STEP);
    const dur = T(DIGIT_DUR);
    const p = clamp((t - start) / dur, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    return { opacity: eased, ty: 40 * (1 - eased) };
  }
  const aedFade = (() => {
    const p = clamp((t - T(AED_START)) / T(DIGIT_DUR), 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    return { opacity: eased, ty: 20 * (1 - eased) };
  })();

  // ── CTA + byline ───────────────────────────────────────────────────
  const ctaOpacity = interpolate(
    [T(CTA_START), T(CTA_START + CTA_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const ctaTy = interpolate(
    [T(CTA_START), T(CTA_START + CTA_DUR)],
    [16, 0],
    Easing.easeOutCubic,
  )(t);
  const ctaShineLeft = interpolate(
    [T(CTA_SHINE_START), T(CTA_SHINE_START + CTA_SHINE_DUR)],
    [-40, 140],
    Easing.easeOutCubic,
  )(t);
  const bylineOpacity = interpolate(
    [T(BYLINE_START), T(BYLINE_START + BYLINE_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const bylineTy = interpolate(
    [T(BYLINE_START), T(BYLINE_START + BYLINE_DUR)],
    [16, 0],
    Easing.easeOutCubic,
  )(t);

  const cardA = cardATransform();
  const cardB = cardBTransform();

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
      {/* Background — either uploaded image (replaces gradient) or paper + grain */}
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
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at 50% 40%, ${lighten(colors.background, 0.03)} 0%, ${colors.background} 55%, ${colors.backgroundDeep} 100%)`,
              zIndex: 0,
            }}
          />
          {/* Subtle grain */}
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
          {/* Decorative oversized "&" glyph bleeding outside safe zone */}
          <div
            style={{
              position: 'absolute',
              top: h(-260),
              left: w(-180),
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: wh(1400),
              lineHeight: 1,
              letterSpacing: '-0.06em',
              color: hexToRgba(colors.accent, 0.09),
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0,
            }}
          >
            &amp;
          </div>
        </>
      )}

      {/* ── Act 0: logo ──────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(logoTop),
          left: w(safeCX),
          transform: `translateX(-50%) translateY(${h(logoY)}px)`,
          opacity: logoOpacity,
          zIndex: 2,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={logoColor}
          width={w(logoW)}
          height={h(logoH)}
          fontSize={wh(72)}
          letterSpacing="14px"
          nameStyle={boutiqueNameStyle}
        />
      </div>

      {/* Kicker row with rules on each side */}
      <div
        style={{
          position: 'absolute',
          top: h(kickerTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: wh(20),
          opacity: kickerOpacity,
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}
      >
        <span
          aria-hidden
          style={{
            width: wh(80),
            height: 1,
            background: colors.ink,
            transform: `scaleX(${ruleScaleX})`,
            transformOrigin: 'center',
          }}
        />
        <span style={kickerStyle}>{kicker}</span>
        <span
          aria-hidden
          style={{
            width: wh(80),
            height: 1,
            background: colors.ink,
            transform: `scaleX(${ruleScaleX})`,
            transformOrigin: 'center',
          }}
        />
      </div>

      {/* ── Card A (left) ────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(cardTop),
          left: w(cardALeft),
          width: w(cardW),
          height: h(cardH),
          background: colors.card,
          borderRadius: wh(2),
          overflow: 'hidden',
          transform: `translate(${w(cardA.tx)}px, ${h(cardA.ty)}px) rotate(${cardA.rot}deg) scale(${cardA.scale})`,
          boxShadow: `0 1px 0 ${hexToRgba(colors.ink, 0.04)}, 0 ${h(30)}px ${h(60)}px ${h(-20)}px ${hexToRgba(colors.ink, 0.25)}`,
          zIndex: 3,
        }}
      >
        <PieceImage
          imageUrl={pieceA.imageUrl}
          label={pieceA.eyebrow}
          placeholderBg={colors.card}
          ink={colors.ink}
        />
      </div>

      {/* Label A — under card A */}
      <div
        style={{
          position: 'absolute',
          top: h(labelTop),
          left: w(cardALeft),
          width: w(labelW),
          textAlign: 'center',
          opacity: labelAFade.opacity,
          transform: `translateY(${h(labelAFade.ty)}px)`,
          zIndex: 3,
        }}
      >
        <div style={{ ...pieceAEyebrowStyle, marginBottom: h(14) }}>{pieceA.eyebrow}</div>
        <div style={{ ...pieceANameStyle, marginBottom: h(14), whiteSpace: 'pre-line' }}>
          {pieceA.name}
        </div>
        <div style={pieceAPriceStyle}>{composePrice(pieceA.price, currency)}</div>
      </div>

      {/* ── Card B (right) ────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(cardTop),
          right: w(sealedCardBRight),
          width: w(cardW),
          height: h(cardH),
          background: colors.card,
          borderRadius: wh(2),
          overflow: 'hidden',
          transform: `translate(${w(cardB.tx)}px, ${h(cardB.ty)}px) rotate(${cardB.rot}deg) scale(${cardB.scale})`,
          boxShadow: `0 1px 0 ${hexToRgba(colors.ink, 0.04)}, 0 ${h(30)}px ${h(60)}px ${h(-20)}px ${hexToRgba(colors.ink, 0.25)}`,
          zIndex: 3,
        }}
      >
        <PieceImage
          imageUrl={pieceB.imageUrl}
          label={pieceB.eyebrow}
          placeholderBg={colors.card}
          ink={colors.ink}
        />
      </div>

      {/* Label B — under card B */}
      <div
        style={{
          position: 'absolute',
          top: h(labelTop),
          right: w(sealedLabelBRight),
          width: w(labelW),
          textAlign: 'center',
          opacity: labelBFade.opacity,
          transform: `translateY(${h(labelBFade.ty)}px)`,
          zIndex: 3,
        }}
      >
        <div style={{ ...pieceBEyebrowStyle, marginBottom: h(14) }}>{pieceB.eyebrow}</div>
        <div style={{ ...pieceBNameStyle, marginBottom: h(14), whiteSpace: 'pre-line' }}>
          {pieceB.name}
        </div>
        <div style={pieceBPriceStyle}>{composePrice(pieceB.price, currency)}</div>
      </div>

      {/* ── Operator badge (center, between cards) ───────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(operatorTop),
          left: w(safeCX),
          width: wh(operatorSize),
          height: wh(operatorSize),
          borderRadius: '50%',
          background: colors.operatorBg,
          color: colors.operatorInk,
          transform: `translate(-50%, calc(-50% + ${h(driftTy)}px)) scale(${opScale})`,
          opacity: opOpacity,
          boxShadow: `0 ${h(16)}px ${h(40)}px ${h(-8)}px ${hexToRgba(colors.ink, 0.5)}`,
          zIndex: 6,
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            fontSize: wh(90),
            lineHeight: 1,
            opacity: plusOpacity,
            transform: `scale(${plusScale}) rotate(${plusRot}deg)`,
          }}
        >
          +
        </span>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            fontSize: wh(90),
            lineHeight: 1,
            opacity: equalOpacity,
            transform: `scale(${equalScale}) rotate(${equalRot}deg)`,
          }}
        >
          =
        </span>
      </div>

      {/* ── Act 4: Pair lockup ───────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(pairTop),
          left: w(safeCX),
          width: w(pairW),
          textAlign: 'center',
          transform: `translateX(-50%) translateY(${h(pairTy)}px)`,
          opacity: pairOpacity,
          zIndex: 4,
        }}
      >
        <div style={{ ...totalLabelStyle, marginBottom: h(is45 ? 20 : 42) }}>{totalLabel}</div>
        <div
          style={{
            fontFamily: 'var(--font-numeric)',
            fontWeight: 500,
            fontSize: wh(totalFontSize),
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: colors.ink,
            fontVariantNumeric: 'tabular-nums',
            marginBottom: h(is45 ? 16 : 36),
            display: 'flex',
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: wh(10),
            overflow: 'hidden',
            paddingTop: h(12),
          }}
        >
          {/* Digit-slam over the numeric portion only — `totalPrice`
           *  on the schema is digits-only (e.g. "7,930"). The currency
           *  suffix renders separately below in its own span so it
           *  can size and animate independently. Wrapping with
           *  `composePrice` here would double-emit the suffix because
           *  the trailing span already covers it. */}
          {Array.from(totalPrice).map((ch, i) => {
            const { opacity, ty } = digitFade(i);
            return (
              <span
                key={`d-${i}`}
                style={{
                  display: 'inline-block',
                  opacity,
                  transform: `translateY(${h(ty)}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
          <span
            style={{
              alignSelf: 'flex-start',
              marginTop: h(8),
              marginLeft: wh(12),
              transform: `translateY(${h(aedFade.ty)}px)`,
              display: 'inline-block',
              ...totalCurrencyStyle,
              // Multiply animation opacity onto whatever the Aa drawer
              // resolved (defaults to undefined → 1).
              opacity: (totalCurrencyStyle.opacity ?? 1) * aedFade.opacity,
            }}
          >
            {totalCurrency}
          </span>
        </div>
        <div style={pairCaptionStyle}>{pairCaption}</div>
      </div>

      {/* ── Act 5: CTA ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(ctaTop),
          left: w(safeCX),
          transform: `translateX(-50%) translateY(${h(ctaTy)}px)`,
          textAlign: 'center',
          opacity: ctaOpacity,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: `${h(26)}px ${w(58)}px`,
            background: colors.ctaBg,
            borderRadius: 999,
            position: 'relative',
            overflow: 'hidden',
            ...ctaStyle,
          }}
        >
          {ctaText}
          {/* CTA shimmer — sweeps across once at T10.2 */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${ctaShineLeft}%`,
              width: '40%',
              background: `linear-gradient(90deg, ${hexToRgba(colors.ctaText, 0)} 0%, ${hexToRgba(colors.ctaText, 0.35)} 50%, ${hexToRgba(colors.ctaText, 0)} 100%)`,
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* ── Byline below CTA ─────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(bylineTop),
          left: w(safeCX),
          transform: `translateX(-50%) translateY(${h(bylineTy)}px)`,
          width: w(960),
          textAlign: 'center',
          whiteSpace: 'nowrap',
          ...bylineStyle,
          opacity: (bylineStyle.opacity ?? 1) * bylineOpacity,
          zIndex: 5,
        }}
      >
        {bylineStart}
        {bylineItalic ? (
          <>
            {' · '}
            <em style={{ fontStyle: 'italic' }}>{bylineItalic}</em>
          </>
        ) : null}
      </div>

      {/* Suppress the unused-warning for W — this keeps the hook path
          traced even when the scene only reads it indirectly. */}
      <span aria-hidden style={{ display: 'none' }}>{W}</span>
    </div>
  );
}

// ── Piece image helper ───────────────────────────────────────────────
// Renders a product photo cropped to the card. If no image is provided,
// renders a soft gradient stock with a category eyebrow as placeholder.
function PieceImage({
  imageUrl,
  label,
  placeholderBg,
  ink,
}: {
  imageUrl?: string;
  label: string;
  placeholderBg: string;
  ink: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={label}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${lighten(placeholderBg, 0.04)} 0%, ${darken(placeholderBg, 0.06)} 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: '10%',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: hexToRgba(ink, 0.4),
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Tiny color utilities (same as The Stack) ───────────────────────
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
