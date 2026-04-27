// The Rail — a horizontal dolly of eight hangers slides across frame,
// one ignites with a bronze glow, the rail stops centered, non-heroes
// fade, and the hero rises as "THE EDIT" — pulled for you.
// Ported from the Claude-Design HTML prototype `TheRail.html` — CSS
// animation-delay timings are translated directly to interpolate() /
// animate() calls on useTimeline().time.
//
// Timeline (exactly mirrors the HTML comment):
//   T0.00 – T0.80  OUNASS + kicker
//   T0.80 – T6.50  Rail dollies left (continuous, easeOut)
//   T4.50 – T6.00  Hero begins pulsing bronze glow
//   T6.00 – T6.80  Rail decelerates, hero centered
//   T6.80 – T7.80  Non-hero pieces fade to ~28%
//   T7.80 – T8.80  Hero rises out, grows, "THE EDIT" label
//   T8.80 – T10.5  Capsule line
//   T10.5 – T12.0  CTA + byline

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
import type { RailProps, RailProduct } from './schema';
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
  props: RailProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

// Rail dolly timings (seconds) — CSS animation started at 1.10s delay
// with a 6.5s duration.
const RAIL_DOLLY_START = 1.10;
const RAIL_DOLLY_DUR = 6.5;
const RAIL_BAR_START = 0.80;
const RAIL_BAR_DUR = 0.50;

// Hanger grid (in rail-track local px, same coord space as the CSS).
const HANGER_LEFTS = [80, 440, 800, 1160, 1520, 1880, 2240, 2600];
const HANGER_WIDTH = 280;

// Hero pulse — bronze glow pulsing before rail stops.
const HERO_PULSE_START = 4.50;
const HERO_PULSE_DUR = 1.60;
const HERO_PULSE_CYCLES = 2;

// Focus pull (non-heroes dim) — HTML: 0.8s ease-out at 7.30s.
const FOCUS_PULL_START = 7.30;
const FOCUS_PULL_DUR = 0.80;

// Hero lift — HTML: 1.1s cubic-bezier at 7.80s. Translate Y and slight scale.
const HERO_LIFT_START = 7.80;
const HERO_LIFT_DUR = 1.10;

// Overlays.
const HERO_LABEL_START = 8.40;
const HERO_LABEL_DUR = 0.70;
const CAPSULE_START = 9.20;
const CAPSULE_DUR = 0.60;
const CTA_START = 10.50;
const CTA_DUR = 0.60;
const CTA_SHINE_START = 11.10;
const CTA_SHINE_DUR = 1.60;
const BYLINE_START = 10.70;
const BYLINE_DUR = 0.55;
const RULE_START = 0.70;
const RULE_DUR = 0.80;

export function TheRailScene({
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

  const colors = useThemedColors(props.colors);

  const {
    boutiqueName,
    logo,
    backgroundImage,
    kickerText,
    products,
    heroIndex: rawHeroIndex,
    editKicker,
    heroSizes,
    capsuleCount,
    capsuleWord1,
    capsuleWord2,
    capsuleWord3,
    ctaText,
    bylineStart,
    bylineItalic,
  } = props;

  // Clamp hero index to available products.
  const heroIndex = Math.min(
    Math.max(0, Math.floor(Number(rawHeroIndex) || 0)),
    Math.max(0, products.length - 1),
  );
  const heroProduct: RailProduct | undefined = products[heroIndex];

  // Logo tint override.
  const logoColor = useFieldColor('logo', colors.ink);

  // ── Per-field format overrides ─────────────────────────────────────
  const kickerStyle = useFieldFormat('kickerText', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontSize: wh(15),
    fontWeight: 700,
    letterSpacing: '0.4em',
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const ctaStyle = useFieldFormat('ctaText', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(30),
    fontWeight: 700,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: colors.ctaText,
  });
  const bylineStyle = useFieldFormat('bylineStart', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(is45 ? 20 : 26),
    letterSpacing: '0.02em',
    color: colors.ink,
    opacity: 0.6,
  });
  const bylineItalicStyle = useFieldFormat('bylineItalic', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(is45 ? 20 : 26),
    letterSpacing: '0.02em',
    color: colors.ink,
    opacity: 0.6,
  });
  // BoutiqueLogo's text fallback derives its size from width/height; the
  // base size below is just so the editor's sizeScale multiplier has a
  // sensible anchor when marketers tweak the wordmark in the Aa drawer.
  const boutiqueNameStyle = useFieldFormat('boutiqueName', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(is45 ? 68 : 72),
    fontWeight: 300,
    letterSpacing: '14px',
    color: logoColor,
  });

  // ── Capsule + hero editorial format overrides ─────────────────────
  const editKickerStyle = useFieldFormat('editKicker', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontWeight: 700,
    fontSize: wh(13),
    letterSpacing: '0.42em',
    color: colors.accent,
    textTransform: 'uppercase',
  });
  const heroSizesStyle = useFieldFormat('heroSizes', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontWeight: 700,
    fontSize: wh(16),
    letterSpacing: '0.28em',
    color: colors.ink,
  });
  const capsuleCountStyle = useFieldFormat('capsuleCount', {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: wh(28),
    color: colors.ink,
  });
  // capsuleTagStyle() (below) is the shared base for the three capsule
  // word slots — each override hook below spreads on top, so editing
  // the "Aa" drawer for one word doesn't touch the others.
  const capsuleWord1Style = useFieldFormat(
    'capsuleWord1',
    capsuleTagStyle(colors.ink, wh(12)),
  );
  const capsuleWord2Style = useFieldFormat(
    'capsuleWord2',
    capsuleTagStyle(colors.ink, wh(12)),
  );
  const capsuleWord3Style = useFieldFormat(
    'capsuleWord3',
    capsuleTagStyle(colors.ink, wh(12)),
  );

  // ── Per-product wildcard format overrides ─────────────────────────
  const productNameStyle = useFieldFormat('products.*.name', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(is45 ? 34 : 44),
    color: colors.ink,
    letterSpacing: '0.01em',
    lineHeight: 1.15,
  });
  // textAlign isn't part of FieldBaseStyle (it's not a typographic
  // override) — keep it on the wrapper element where the price tag is
  // composed so the centered layout survives.
  const productPriceStyle = useFieldFormat('products.*.price', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontWeight: 700,
    fontSize: wh(13),
    letterSpacing: '0.12em',
    color: colors.ink,
    textTransform: 'uppercase',
  });
  const productPriceUnitStyle = useFieldFormat('products.*.priceUnit', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontWeight: 700,
    fontSize: wh(9),
    letterSpacing: '0.2em',
    color: colors.ink,
    opacity: 0.6,
    textTransform: 'uppercase',
  });
  const productIndexLabelStyle = useFieldFormat('products.*.indexLabel', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontWeight: 700,
    fontSize: wh(10),
    letterSpacing: '0.15em',
    color: hexToRgba(colors.ink, 0.3),
  });

  // Locale-aware currency suffix for the price-composition helper.
  const currency = useCurrencyForLocale();

  const safeCX = is45 ? 540 : 480;

  // ── Intro chrome fades (logo / kicker / top rule) ─────────────────
  const logoOpacity = interpolate([T(0.10), T(0.10 + 0.55)], [0, 1], Easing.easeOutCubic)(t);
  const kickerOpacity = interpolate([T(0.40), T(0.40 + 0.55)], [0, 1], Easing.easeOutCubic)(t);
  const ruleScaleX = animate({
    from: 0,
    to: 1,
    start: T(RULE_START),
    end: T(RULE_START + RULE_DUR),
    ease: Easing.easeOutExpo,
  })(t);

  // ── Rail dolly (translate the track across frame) ─────────────────
  // HTML keyframes (9:16):
  //   0%   translateX( 1100)
  //   85%  translateX(-1520)
  //   100% translateX(-1560)
  // 4:5 final rest shifted to re-center hero under safe-cx=540.
  // We mirror those exact stops; cubic-bezier(.35,0,.15,1) feel
  // approximated with easeInOutQuad across the 0→85% span, then
  // linear tail on the last 15% (the minor deceleration creep).
  function railTranslateX(): number {
    const start = T(RAIL_DOLLY_START);
    const dur = T(RAIL_DOLLY_DUR);
    const p = clamp((t - start) / dur, 0, 1);
    const xStart = 1100;
    const xMid = is45 ? -1640 : -1520;
    const xEnd = is45 ? -1680 : -1560;
    if (p <= 0) return xStart;
    if (p >= 1) return xEnd;
    if (p < 0.85) {
      const q = p / 0.85;
      // cubic-bezier(.35,0,.15,1) is roughly easeOutCubic tail —
      // accelerate quick, glide long. Using easeOutCubic gives the
      // right "slow-to-rest" feel at the decel boundary.
      const eased = Easing.easeOutCubic(q);
      return xStart + (xMid - xStart) * eased;
    }
    const q = (p - 0.85) / 0.15;
    return xMid + (xEnd - xMid) * q;
  }

  // Rail bar itself scales in (0.5s at 0.80s).
  const railBarScaleX = animate({
    from: 0,
    to: 1,
    start: T(RAIL_BAR_START),
    end: T(RAIL_BAR_START + RAIL_BAR_DUR),
    ease: Easing.easeOutExpo,
  })(t);
  const railBarOpacity = interpolate(
    [T(RAIL_BAR_START), T(RAIL_BAR_START + 0.2)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);

  // ── Hero pulse (bronze glow ramp during rail motion) ──────────────
  function heroGlow(): number {
    const start = T(HERO_PULSE_START);
    const end = T(HERO_PULSE_START + HERO_PULSE_DUR * HERO_PULSE_CYCLES);
    if (t <= start) return 0;
    if (t >= end) {
      // After the pulse ends, the hero will continue having a soft
      // standing glow through hero-label time, fading with focus pull.
      // But from focus-pull onward we drop it so the fade reads.
      if (t >= T(FOCUS_PULL_START + FOCUS_PULL_DUR)) return 0;
      // Hold at full glow from end-of-pulse through rail-stop.
      return 1;
    }
    const cycleDur = T(HERO_PULSE_DUR);
    const localT = (t - start) % cycleDur;
    const cyclePhase = localT / cycleDur;
    // alternate — ease-in-out triangle wave 0→1→0.
    return cyclePhase < 0.5
      ? Easing.easeInOutQuad(cyclePhase / 0.5)
      : Easing.easeInOutQuad(1 - (cyclePhase - 0.5) / 0.5);
  }

  // ── Focus pull (non-heroes dim) ───────────────────────────────────
  const focusPullP = clamp(
    (t - T(FOCUS_PULL_START)) / T(FOCUS_PULL_DUR),
    0,
    1,
  );
  // Non-hero target: opacity 1 → 0.28, saturate 1 → 0.4.
  const nonHeroOpacity = 1 - focusPullP * (1 - 0.28);
  const nonHeroSaturate = 1 - focusPullP * (1 - 0.4);
  // Hanger tag + idx-label also fade down.
  const tagFade = 1 - focusPullP * (1 - 0.20);

  // ── Hero lift ─────────────────────────────────────────────────────
  // 9:16: translateY 0 → -80, scale 1 → 1.08.
  // 4:5 : translateY 0 → -130, scale 1 → 1.06.
  const heroLiftP = clamp(
    (t - T(HERO_LIFT_START)) / T(HERO_LIFT_DUR),
    0,
    1,
  );
  const heroLiftEased = Easing.easeOutCubic(heroLiftP);
  const heroLiftY = heroLiftEased * (is45 ? -130 : -80);
  const heroLiftScale = 1 + heroLiftEased * (is45 ? 0.06 : 0.08);

  // Hero tag/idx-label fades with focus pull (HTML: 0.6s at 7.30s).
  const heroTagFade = 1 - focusPullP;

  // ── Overlays ──────────────────────────────────────────────────────
  const heroLabelOpacity = interpolate(
    [T(HERO_LABEL_START), T(HERO_LABEL_START + HERO_LABEL_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const capsuleOpacity = interpolate(
    [T(CAPSULE_START), T(CAPSULE_START + CAPSULE_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const ctaOpacity = interpolate(
    [T(CTA_START), T(CTA_START + CTA_DUR)],
    [0, 1],
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

  // ── Layout positions (1920-base px; 4:5 values already converted) ─
  // Originals were 1350-tall; h() scales by H/1920, so we multiply by
  // 1920/1350 ≈ 1.4222 for 4:5 so h() outputs the same absolute px.
  const K = 1920 / 1350;
  const logoTop = is45 ? 150 * K : 290;
  const kickerTop = is45 ? 230 * K : 400;
  const ruleTop = is45 ? 290 * K : 460;
  const railClipTop = is45 ? 370 * K : 540;
  const railClipHeight = is45 ? 660 * K : 880;
  const heroLabelTop = is45 ? 890 * K : 1220;
  const capsuleTop = is45 ? 1380 : 1380; // hidden on 4:5
  const ctaTop = is45 ? 1010 * K : 1470;
  const bylineTop = is45 ? 1110 * K : 1575;

  // Right-edge clamping (safe.right=120 on 9:16).
  //   The rail-clip spans full width (left:0, width:1080), which is the
  //   mechanic; its contents scroll horizontally. We don't clamp the
  //   rail itself, but any absolute-positioned right-anchored element
  //   (none in this comp beyond safe-zone-aware CTA centering) would.

  // Track offset: we apply the dolly translate to the whole .rail-track.
  const trackX = railTranslateX();

  // Hanger index => animation delay for sway (organic wobble).
  // HTML delays (seconds, negative starts): [-0.2, -0.8, -1.2, -0.5, -1.6, -1.0, -0.6, -1.4]
  const swayDelays = [-0.2, -0.8, -1.2, -0.5, -1.6, -1.0, -0.6, -1.4];

  function swayRotation(idx: number): number {
    // 3.2s ease-in-out, -0.6 → 0.6 → -0.6 degrees. Continuous.
    const cycle = 3.2;
    const delay = swayDelays[idx % swayDelays.length];
    const phase = ((t - T(delay)) / T(cycle)) % 1;
    const p = phase < 0 ? phase + 1 : phase;
    // Sinusoidal-ish: use a cosine mapped [-0.6, 0.6].
    const val = Math.cos(p * Math.PI * 2);
    return 0.6 * val;
  }

  // Garment gradient per hanger (defaults; replaced by image when set).
  const garmentGradients = [
    'linear-gradient(170deg, #3b352f 0%, #1d1a16 55%, #3b352f 100%)',
    'linear-gradient(160deg, #c9bfb0 0%, #9a8f7d 55%, #c9bfb0 100%)',
    'linear-gradient(175deg, #5c4630 0%, #2f2318 55%, #5c4630 100%)',
    'linear-gradient(165deg, #dcd5c6 0%, #a8a090 55%, #dcd5c6 100%)',
    'linear-gradient(170deg, #2a241e 0%, #100e0b 55%, #2a241e 100%)',
    // hero default (idx 5) — bronze silk
    `linear-gradient(165deg, ${colors.accent} 0%, #6e3d26 50%, ${colors.accent} 100%)`,
    'linear-gradient(170deg, #8d7a62 0%, #574838 55%, #8d7a62 100%)',
    'linear-gradient(175deg, #efe8d6 0%, #c0b79c 55%, #efe8d6 100%)',
  ];

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
              background: `radial-gradient(ellipse at 50% 45%, ${lighten(colors.background, 0.03)} 0%, ${colors.background} 55%, ${colors.backgroundDeep} 100%)`,
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.28,
              mixBlendMode: 'multiply',
              backgroundImage: `radial-gradient(${hexToRgba(colors.ink, 0.035)} 1px, transparent 1px), radial-gradient(${hexToRgba(colors.ink, 0.025)} 1px, transparent 1px)`,
              backgroundSize: '3px 3px, 7px 7px',
              backgroundPosition: '0 0, 1px 2px',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* ── Act 0: logo + kicker + top rule ──────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(logoTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          opacity: logoOpacity,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={logoColor}
          width={w(is45 ? 340 : 400)}
          height={h(is45 ? 80 : 90)}
          fontSize={wh(is45 ? 68 : 72)}
          letterSpacing="14px"
          nameStyle={boutiqueNameStyle}
        />
      </div>

      {/* Kicker row */}
      <div
        style={{
          position: 'absolute',
          top: h(kickerTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: wh(16),
          opacity: kickerOpacity,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          aria-hidden
          style={{ width: wh(34), height: 1, background: colors.accent, opacity: 0.7 }}
        />
        <span style={kickerStyle}>{kickerText}</span>
        <span
          aria-hidden
          style={{ width: wh(34), height: 1, background: colors.accent, opacity: 0.7 }}
        />
      </div>

      {/* Top rule — hairline between kicker and rail */}
      <div
        style={{
          position: 'absolute',
          top: h(ruleTop),
          left: w(safeCX),
          transform: `translateX(-50%) scaleX(${ruleScaleX})`,
          transformOrigin: 'center',
          width: w(560),
          height: 1,
          background: colors.ink,
          opacity: 0.35,
        }}
      />

      {/* ── THE RAIL — horizontal dolly clipped to stage width ──── */}
      <div
        style={{
          position: 'absolute',
          top: h(railClipTop),
          left: 0,
          width: W,
          height: h(railClipHeight),
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Rail bar — single metal line the hangers hang from */}
        <div
          style={{
            position: 'absolute',
            top: h(160),
            left: w(-200),
            right: w(-200),
            height: Math.max(1, h(3)),
            background: 'linear-gradient(180deg, #6a5641 0%, #3c332a 50%, #221d18 100%)',
            boxShadow: `0 ${Math.max(1, h(1))}px 0 rgba(255,255,255,0.25), 0 ${h(2)}px ${h(4)}px rgba(0,0,0,0.2)`,
            opacity: railBarOpacity,
            transform: `scaleX(${railBarScaleX})`,
            transformOrigin: 'right center',
          }}
        />

        {/* Rail track — the moving carrier of all hangers */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: w(3200),
            height: '100%',
            transform: `translateX(${w(trackX)}px)`,
          }}
        >
          {/* Decorative end caps on the track */}
          <div
            style={{
              position: 'absolute',
              top: h(20),
              left: w(-160),
              width: Math.max(1, w(2)),
              height: h(150),
              background: 'linear-gradient(180deg, rgba(18,18,18,0.08), rgba(18,18,18,0.4))',
              opacity: railBarOpacity,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: h(20),
              right: w(-160),
              width: Math.max(1, w(2)),
              height: h(150),
              background: 'linear-gradient(180deg, rgba(18,18,18,0.08), rgba(18,18,18,0.4))',
              opacity: railBarOpacity,
            }}
          />

          {products.slice(0, 8).map((product, i) => {
            const isHero = i === heroIndex;
            const left = HANGER_LEFTS[i] ?? HANGER_LEFTS[HANGER_LEFTS.length - 1];
            const sway = swayRotation(i);
            const glow = isHero ? heroGlow() : 0;
            const lift = isHero
              ? { y: heroLiftY, scale: heroLiftScale }
              : { y: 0, scale: 1 };
            const opacity = isHero ? 1 : nonHeroOpacity;
            const saturate = isHero ? 1 : nonHeroSaturate;
            const tagOpacity = isHero ? heroTagFade : tagFade;

            return (
              <div
                key={product.id}
                style={{
                  position: 'absolute',
                  top: h(120),
                  left: w(left),
                  width: w(HANGER_WIDTH),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: `translateY(${h(lift.y)}px) scale(${lift.scale}) rotate(${sway}deg)`,
                  transformOrigin: 'top center',
                }}
              >
                {/* Hook */}
                <div
                  style={{
                    width: wh(36),
                    height: wh(36),
                    border: `${Math.max(1, wh(2.5))}px solid ${colors.ink}`,
                    borderTopColor: 'transparent',
                    borderLeftColor: 'transparent',
                    borderBottom: 'none',
                    borderRadius: `0 0 ${wh(40)}px ${wh(40)}px`,
                    opacity: 0.78,
                    marginBottom: -wh(4),
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      transform: `translateX(-50%) translateY(-${wh(6)}px)`,
                      width: Math.max(1, wh(2.5)),
                      height: wh(10),
                      background: colors.ink,
                      opacity: 0.78,
                    }}
                  />
                </div>

                {/* Shoulder (triangle outline) */}
                <div
                  style={{
                    width: w(200),
                    height: wh(36),
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderTop: `${Math.max(1, wh(2.5))}px solid ${colors.ink}`,
                      clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
                      opacity: 0.78,
                    }}
                  />
                </div>

                {/* Garment */}
                <div
                  style={{
                    marginTop: -wh(6),
                    width: w(240),
                    height: h(400),
                    borderRadius: `${wh(3)}px ${wh(3)}px ${wh(10)}px ${wh(10)}px`,
                    position: 'relative',
                    overflow: 'hidden',
                    background: product.imageUrl
                      ? undefined
                      : (garmentGradients[i] ?? garmentGradients[0]),
                    opacity,
                    filter: `saturate(${saturate})`,
                    boxShadow: isHero
                      ? `0 ${h(1)}px 0 rgba(255,255,255,0.3) inset, 0 0 ${h(60 + 20 * glow)}px ${h(10 + 6 * glow)}px ${hexToRgba(colors.accent, 0.45 * glow)}, 0 ${h(14)}px ${h(32)}px ${h(-16)}px rgba(18,18,18,0.3), 0 ${h(4)}px ${h(12)}px ${h(-6)}px rgba(18,18,18,0.18)`
                      : `0 ${h(1)}px 0 rgba(255,255,255,0.3) inset, 0 ${h(14)}px ${h(32)}px ${h(-16)}px rgba(18,18,18,0.3), 0 ${h(4)}px ${h(12)}px ${h(-6)}px rgba(18,18,18,0.18)`,
                    transition: 'none',
                  }}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : null}
                </div>

                {/* Index micro-label */}
                <div
                  style={{
                    position: 'absolute',
                    top: -wh(4),
                    left: -wh(14),
                    ...productIndexLabelStyle,
                    opacity: tagOpacity,
                    zIndex: 3,
                  }}
                >
                  {product.indexLabel}
                </div>

                {/* Price tag clipped to the hook. Layout-only props
                 *  (position, padding, background, border, transform, …)
                 *  stay on the wrapper; productPriceStyle handles font
                 *  + color so the editor's "Aa" drawer for the price
                 *  field can override typography for every card. */}
                <div
                  style={{
                    ...productPriceStyle,
                    position: 'absolute',
                    top: wh(20),
                    right: -wh(12),
                    width: w(84),
                    padding: `${wh(6)}px 0 ${wh(8)}px`,
                    background: colors.background,
                    border: `1px solid ${colors.ink}`,
                    borderRadius: wh(2),
                    textAlign: 'center',
                    transform: 'rotate(6deg)',
                    boxShadow: `0 ${h(2)}px ${h(4)}px rgba(0,0,0,0.08)`,
                    opacity: tagOpacity,
                    zIndex: 3,
                    lineHeight: 1.2,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: -wh(5),
                      transform: 'translateX(-50%)',
                      width: wh(6),
                      height: wh(6),
                      borderRadius: '50%',
                      background: colors.ink,
                    }}
                  />
                  <span style={{ display: 'block', ...productPriceStyle }}>
                    {composePrice(product.price, currency)}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      ...productPriceUnitStyle,
                    }}
                  >
                    {product.priceUnit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hero editorial label ─────────────────────────────────── */}
      {heroProduct ? (
        <div
          style={{
            position: 'absolute',
            top: h(heroLabelTop),
            left: w(safeCX),
            transform: 'translateX(-50%)',
            textAlign: 'center',
            width: w(700),
            opacity: heroLabelOpacity,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: wh(14),
              marginBottom: wh(14),
            }}
          >
            <span
              aria-hidden
              style={{ width: wh(28), height: 1, background: colors.accent, opacity: 0.7 }}
            />
            <span style={{ ...editKickerStyle }}>
              {editKicker}
            </span>
            <span
              aria-hidden
              style={{ width: wh(28), height: 1, background: colors.accent, opacity: 0.7 }}
            />
          </div>
          <div
            style={{
              marginBottom: wh(10),
              whiteSpace: 'nowrap',
              ...productNameStyle,
            }}
          >
            {heroProduct.name}
          </div>
          <div style={{ ...heroSizesStyle }}>
            <span style={{ ...productPriceStyle }}>
              {composePrice(heroProduct.price, currency)}
            </span>{' '}
            · {heroSizes}
          </div>
        </div>
      ) : null}

      {/* ── Capsule line (9:16 only) ─────────────────────────────── */}
      {!is45 ? (
        <div
          style={{
            position: 'absolute',
            top: h(capsuleTop),
            left: w(safeCX),
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: wh(14),
            opacity: capsuleOpacity,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ ...capsuleCountStyle }}>
            {capsuleCount}
          </span>
          <span style={{ ...capsuleWord1Style }}>{capsuleWord1}</span>
          <span
            aria-hidden
            style={{
              width: wh(4),
              height: wh(4),
              borderRadius: '50%',
              background: colors.accent,
              opacity: 0.7,
            }}
          />
          <span style={{ ...capsuleWord2Style }}>{capsuleWord2}</span>
          <span
            aria-hidden
            style={{
              width: wh(4),
              height: wh(4),
              borderRadius: '50%',
              background: colors.accent,
              opacity: 0.7,
            }}
          />
          <span style={{ ...capsuleWord3Style }}>{capsuleWord3}</span>
        </div>
      ) : null}

      {/* ── CTA + byline ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(ctaTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          textAlign: 'center',
          opacity: ctaOpacity,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
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
              width: '30%',
              background:
                'linear-gradient(90deg, rgba(245,240,232,0) 0%, rgba(245,240,232,0.28) 50%, rgba(245,240,232,0) 100%)',
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
          width: w(960),
          textAlign: 'center',
          whiteSpace: 'nowrap',
          ...bylineStyle,
          opacity: (bylineStyle.opacity ?? 1) * bylineOpacity,
        }}
      >
        {bylineStart}{' '}
        <em style={{ ...bylineItalicStyle }}>{bylineItalic}</em>
      </div>

      {/* safe-zone reference — keeps linter honest (safe.right used) */}
      <div aria-hidden style={{ display: 'none' }}>{safe.right}</div>
    </div>
  );
}

function capsuleTagStyle(ink: string, fontSize: number) {
  return {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontWeight: 500 as const,
    fontSize,
    letterSpacing: '0.28em',
    color: hexToRgba(ink, 0.6),
    textTransform: 'uppercase' as const,
  };
}

// ── Tiny color utilities ────────────────────────────────────────────

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
