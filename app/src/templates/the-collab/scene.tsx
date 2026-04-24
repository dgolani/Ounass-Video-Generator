// The Collab — co-signed partnership mechanic.
//
// Two wordmarks (Ounass + Collaborator) drift in from opposite sides,
// a bronze-foil × stamps between them, a hairline draws beneath, and
// 3 pieces fan in from below. Ported from the Claude-Design HTML
// prototype `TheCollab.html`.
//
// Timeline (mirrors the HTML comment, with T(x) = x * timeScale):
//   T0.00 – T0.80  Kicker appears
//   T0.80 – T2.00  Ounass (left) drifts in from LEFT
//   T1.20 – T2.40  Collaborator (right) drifts in from RIGHT
//   T2.40 – T3.20  Bronze × stamps in (scale 2.4 → 1.0, rot -18 → 0)
//   T3.20 – T4.00  Hairline draws under lockup
//   T3.60 – T4.20  Edit label fades in
//   T4.20 – T6.80  3 product cards fan in (bag → loafer → foulard)
//   T6.80 – T8.40  Capsule line "14 · Pieces · Online Only"
//   T8.40 – T11.0  CTA + byline

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
import type { CollabProps } from './schema';
import { BoutiqueLogo } from '../BoutiqueLogo';

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
  props: CollabProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

// 4:5 → 9:16 y-scale. Original HTML expresses 4:5 values on a
// 1350-px stage; our h() scales by H/1920, so 4:5 y-values must be
// pre-multiplied by 1920/1350 before being passed to h().
const Y45 = 1920 / 1350; // ≈ 1.4222

// Timing constants (seconds) — match the HTML's animation-delay values.
const KICKER_START = 0.10;
const KICKER_DUR = 0.55;

const LEFT_IN_START = 0.80;
const LEFT_IN_DUR = 1.00;
const RIGHT_IN_START = 1.20;
const RIGHT_IN_DUR = 1.00;

const X_STAMP_START = 2.40;
const X_STAMP_DUR = 0.55;

const RULE_START = 3.20;
const RULE_DUR = 0.80;

const EDIT_START = 3.60;
const EDIT_DUR = 0.60;

const CARD_START = [4.20, 4.55, 4.90];
const CARD_DUR = 0.75;

const CAPSULE_START = 6.80;
const CAPSULE_DUR = 0.60;

const CTA_START = 8.40;
const CTA_DUR = 0.60;
const CTA_SHINE_START = 9.00;
const CTA_SHINE_DUR = 1.60;

const BYLINE_START = 8.60;
const BYLINE_DUR = 0.55;

// Per-card settle rotation (after translateY lands): -1°, 0°, +1° (HTML).
const CARD_TILT_ENTRY = [-2, 0, 2];
const CARD_TILT_SETTLE = [-1, 0, 1];
// Card 2 starts from y+100 rather than y+80 in the HTML — we match that.
const CARD_ENTRY_TY = [80, 100, 80];

export function TheCollabScene({
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

  // Theme
  const colors = useThemedColors(props.colors);

  // Destructure before hooks so brand-color edits re-trigger deps.
  const {
    boutiqueName,
    logo,
    collabName,
    backgroundImage,
    kicker,
    editSmallLeft,
    editMain,
    editSmallRight,
    products,
    capsuleNumber,
    capsuleTag1,
    capsuleTag2,
    capsuleTag3,
    ctaText,
    bylineStart,
    bylineItalic,
  } = props;

  const logoColor = useFieldColor('logo', colors.ink);

  // ── Per-field format overrides ─────────────────────────────────────
  const kickerStyle = useFieldFormat('kicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: '0.4em',
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const collabNameStyle = useFieldFormat('collabName', {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: wh(96),
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: colors.ink,
    lineHeight: 1,
  });
  const editSmallStyle = useFieldFormat('editSmallLeft', {
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    fontSize: wh(20),
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
  });
  const editMainStyle = useFieldFormat('editMain', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(38),
    letterSpacing: '0.01em',
    color: colors.ink,
  });
  const capsuleNumberStyle = useFieldFormat('capsuleNumber', {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: wh(44),
    color: colors.ink,
  });
  const capsuleTagStyle = useFieldFormat('capsuleTag1', {
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    fontSize: wh(18),
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
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
    fontSize: wh(34),
    letterSpacing: '0.02em',
    color: colors.ink,
    opacity: 0.6,
  });

  // Horizontal center anchor — HTML uses --safe-cx (480 / 540).
  const safeCX = is45 ? 540 : 480;

  // ── Animated values ────────────────────────────────────────────────
  const kickerOp = interpolate(
    [T(KICKER_START), T(KICKER_START + KICKER_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);

  // Left mark slides from x=-180 to 0 with opacity 0→1.
  const leftP = clamp((t - T(LEFT_IN_START)) / Math.max(T(LEFT_IN_DUR), 0.01), 0, 1);
  const leftTx = interpolate([0, 1], [-180, 0], Easing.easeOutCubic)(leftP);
  const leftOp = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(leftP);

  // Right mark slides from x=+180 to 0 with opacity 0→1.
  const rightP = clamp((t - T(RIGHT_IN_START)) / Math.max(T(RIGHT_IN_DUR), 0.01), 0, 1);
  const rightTx = interpolate([0, 1], [180, 0], Easing.easeOutCubic)(rightP);
  const rightOp = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(rightP);

  // × stamp — scale 2.4→1.0, rot -18→0, opacity 0→1 (via 60% mark).
  const stampP = clamp((t - T(X_STAMP_START)) / Math.max(T(X_STAMP_DUR), 0.01), 0, 1);
  const stampScale = interpolate([0, 1], [2.4, 1], Easing.easeOutCubic)(stampP);
  const stampRot = interpolate([0, 1], [-18, 0], Easing.easeOutCubic)(stampP);
  const stampOp = stampP < 0.6 ? stampP / 0.6 : 1;

  // Hairline rule draws L→R (scaleX 0→1).
  const ruleScaleX = animate({
    from: 0,
    to: 1,
    start: T(RULE_START),
    end: T(RULE_START + RULE_DUR),
    ease: Easing.easeOutExpo,
  })(t);

  // Edit label fade
  const editOp = interpolate(
    [T(EDIT_START), T(EDIT_START + EDIT_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);

  // Product cards: fade + translateY(80/100→0) + rotate(tilt→settle).
  function cardTransform(i: number) {
    const start = T(CARD_START[i] ?? CARD_START[0]);
    const dur = T(CARD_DUR);
    const p = clamp((t - start) / Math.max(dur, 0.01), 0, 1);
    const entryTy = CARD_ENTRY_TY[i] ?? 80;
    const ty = interpolate([0, 1], [entryTy, 0], Easing.easeOutCubic)(p);
    const rot = interpolate(
      [0, 1],
      [CARD_TILT_ENTRY[i] ?? 0, CARD_TILT_SETTLE[i] ?? 0],
      Easing.easeOutCubic,
    )(p);
    const op = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
    return { ty, rot, opacity: op };
  }

  // Capsule, CTA, byline
  const capsuleOp = interpolate(
    [T(CAPSULE_START), T(CAPSULE_START + CAPSULE_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const ctaOp = interpolate(
    [T(CTA_START), T(CTA_START + CTA_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const ctaShineLeft = interpolate(
    [T(CTA_SHINE_START), T(CTA_SHINE_START + CTA_SHINE_DUR)],
    [-40, 140],
    Easing.easeOutCubic,
  )(t);
  const bylineOp = interpolate(
    [T(BYLINE_START), T(BYLINE_START + BYLINE_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);

  // ── Layout positions ───────────────────────────────────────────────
  // Every 4:5 y value is multiplied by Y45 so h() produces the same
  // absolute output position on a 1350-tall canvas. 9:16 values stay raw.
  const kickerTop = is45 ? 165 * Y45 : 290;
  const lockupTop = is45 ? 320 * Y45 : 500;
  const lockupH = is45 ? 140 * Y45 : 180;
  const ruleTop = is45 ? 490 * Y45 : 700;
  const editTop = is45 ? 505 * Y45 : 715;
  const productsTop = is45 ? 580 * Y45 : 820;
  const productsH = is45 ? 430 * Y45 : 520;
  const capsuleTop = is45 ? 890 * Y45 : 1390;
  const ctaTop = is45 ? 970 * Y45 : 1470;
  const bylineTop = is45 ? 1115 * Y45 : 1575;

  // Lockup internal sizing — left SVG wordmark + right serif word.
  const lockupW = is45 ? 960 : 840;
  const leftMarkW = is45 ? 320 : 300;
  const leftMarkH = is45 ? 68 : 64;
  const leftMarkGap = is45 ? 90 : 80; // each side's gap from centre
  const collabFontSize = is45 ? 90 : 96;
  const xStampSize = is45 ? 95 : 120;

  // Card dimensions (HTML base px)
  const cardW = is45 ? 240 : 264;
  const cardImgH = is45 ? 320 : 360;
  const cardNameSize = is45 ? 28 : 32;
  const cardGap = 20;

  // Right-anchored inset clamp (safe.right=120 on 9:16). The lockup,
  // rule, edit, products, capsule, cta and byline are all center-anchored
  // via translateX(-50%) from safeCX, so they don't need right clamping.
  // But we still compute it for any right-edge decorations.
  // (kept as a guard; not actively used for center-anchored rows)
  // const rightInset = Math.max(safe.right + 20, is45 ? 60 : 80);

  // ── Paper gradient background ──────────────────────────────────────
  const paperGradient = `radial-gradient(ellipse at 50% 38%, ${lighten(colors.background, 0.03)} 0%, ${colors.background} 55%, ${colors.backgroundDeep} 100%)`;

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
      {/* Background — either uploaded image or paper + grain */}
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
              background: paperGradient,
              zIndex: 0,
            }}
          />
          {/* Subtle grain */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.3,
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

      {/* ── KICKER ──────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(kickerTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: wh(16),
          opacity: kickerOp,
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}
      >
        <span
          aria-hidden
          style={{
            width: wh(34),
            height: 1,
            background: colors.accent,
            opacity: 0.7,
          }}
        />
        <span style={kickerStyle}>{kicker}</span>
        <span
          aria-hidden
          style={{
            width: wh(34),
            height: 1,
            background: colors.accent,
            opacity: 0.7,
          }}
        />
      </div>

      {/* ── LOCKUP: boutique × collab ───────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(lockupTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          width: w(lockupW),
          height: h(lockupH),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
        }}
      >
        {/* Left mark — boutique logo / wordmark */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            marginRight: w(leftMarkGap),
            opacity: leftOp,
            transform: `translateX(${w(leftTx)}px)`,
          }}
        >
          <BoutiqueLogo
            logo={logo}
            boutiqueName={boutiqueName}
            color={logoColor}
            width={w(leftMarkW)}
            height={h(leftMarkH)}
            fontSize={wh(is45 ? 64 : 60)}
            fontWeight={300}
            letterSpacing="0.14em"
          />
        </div>

        {/* Right mark — collaborator display serif */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            marginLeft: w(leftMarkGap),
            opacity: rightOp,
            transform: `translateX(${w(rightTx)}px)`,
          }}
        >
          <span
            style={{
              ...collabNameStyle,
              fontSize: wh(collabFontSize),
            }}
          >
            {collabName}
          </span>
        </div>

        {/* × stamp — absolute, centred on the lockup */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: wh(xStampSize),
            height: wh(xStampSize),
            transform: `translate(-50%, -50%) scale(${stampScale}) rotate(${stampRot}deg)`,
            opacity: stampOp,
            pointerEvents: 'none',
          }}
        >
          <svg
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <defs>
              <radialGradient id="collab-foil-grad" cx="35%" cy="35%" r="80%">
                <stop offset="0%" stopColor={lighten(colors.foil, 0.2)} />
                <stop offset="55%" stopColor={colors.accent} />
                <stop offset="100%" stopColor={darken(colors.accent, 0.45)} />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="90" fill="url(#collab-foil-grad)" />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.5}
            />
            <circle
              cx="100"
              cy="100"
              r="76"
              fill="none"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth={1}
            />
            <text
              x="100"
              y="138"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontStyle="italic"
              fontWeight={400}
              fontSize={120}
              fill={colors.background}
            >
              ×
            </text>
          </svg>
        </div>
      </div>

      {/* ── Hairline rule beneath lockup ────────────────────────────── */}
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
          zIndex: 2,
        }}
      />

      {/* ── Edit label: "The Edit · An Exclusive Capsule · April MMXXVI" */}
      <div
        style={{
          position: 'absolute',
          top: h(editTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'baseline',
          gap: wh(14),
          opacity: editOp,
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}
      >
        <span style={editSmallStyle}>{editSmallLeft}</span>
        <span
          aria-hidden
          style={{
            width: wh(4),
            height: wh(4),
            borderRadius: '50%',
            background: colors.accent,
            alignSelf: 'center',
          }}
        />
        <span style={editMainStyle}>{editMain}</span>
        <span
          aria-hidden
          style={{
            width: wh(4),
            height: wh(4),
            borderRadius: '50%',
            background: colors.accent,
            alignSelf: 'center',
          }}
        />
        <span style={editSmallStyle}>{editSmallRight}</span>
      </div>

      {/* ── PRODUCT TRIO ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(productsTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          width: w(is45 ? 760 : 824),
          height: h(productsH),
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: w(cardGap),
          zIndex: 2,
        }}
      >
        {products.slice(0, 3).map((product, i) => {
          const { ty, rot, opacity } = cardTransform(i);
          return (
            <div
              key={product.id}
              style={{
                width: w(cardW),
                opacity,
                transform: `translateY(${h(ty)}px) rotate(${rot}deg)`,
              }}
            >
              <div
                style={{
                  width: w(cardW),
                  height: h(cardImgH),
                  background:
                    i === 0
                      ? 'linear-gradient(155deg, #4a3a2e 0%, #2b1f16 55%, #6a4f36 100%)'
                      : i === 1
                        ? 'linear-gradient(165deg, #3d2a24 0%, #5c3b2a 50%, #2a1d16 100%)'
                        : 'linear-gradient(145deg, #8b6b4e 0%, #6a4f36 50%, #3d2a1c 100%)',
                  borderRadius: wh(2),
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: `0 1px 0 rgba(255,255,255,0.4) inset, 0 ${h(18)}px ${h(40)}px ${h(-20)}px ${hexToRgba(colors.ink, 0.35)}, 0 ${h(4)}px ${h(12)}px ${h(-6)}px ${hexToRgba(colors.ink, 0.15)}`,
                }}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <>
                    {/* Horizon band */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '8%',
                        right: '8%',
                        bottom: '18%',
                        height: 1,
                        background: 'rgba(245,240,232,0.18)',
                      }}
                    />
                    {/* Silhouette placeholder (per-card) */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        viewBox="0 0 220 220"
                        style={{
                          width: '62%',
                          height: 'auto',
                          opacity: 0.35,
                          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
                        }}
                        fill={colors.background}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {i === 0 && (
                          <>
                            <path
                              d="M 40 70 L 160 70 Q 175 70 175 85 L 175 175 Q 175 190 160 190 L 40 190 Q 25 190 25 175 L 25 85 Q 25 70 40 70 Z"
                              opacity={0.9}
                            />
                            <path
                              d="M 60 70 Q 60 38 100 38 Q 140 38 140 70"
                              fill="none"
                              stroke={colors.background}
                              strokeWidth={3}
                              opacity={0.7}
                            />
                          </>
                        )}
                        {i === 1 && (
                          <>
                            <path
                              d="M 30 110 Q 35 85 70 80 L 160 78 Q 200 78 210 105 Q 215 125 205 140 L 195 150 Q 185 155 170 153 L 50 153 Q 32 152 28 138 Q 25 124 30 110 Z"
                              opacity={0.9}
                            />
                            <rect
                              x={110}
                              y={100}
                              width={45}
                              height={6}
                              rx={2}
                              opacity={0.55}
                            />
                          </>
                        )}
                        {i === 2 && (
                          <>
                            <path
                              d="M 40 50 L 170 40 L 180 170 L 50 180 Z"
                              opacity={0.9}
                            />
                            <path
                              d="M 60 70 L 160 62 M 65 100 L 165 94 M 68 130 L 167 124 M 70 155 L 168 150"
                              stroke={colors.accent}
                              strokeWidth={1}
                              fill="none"
                              opacity={0.5}
                            />
                          </>
                        )}
                      </svg>
                    </div>
                  </>
                )}
              </div>
              {/* Category (small caps) */}
              <div
                style={{
                  marginTop: h(18),
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: wh(15),
                  letterSpacing: '0.3em',
                  color: hexToRgba(colors.ink, 0.6),
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {product.category}
              </div>
              {/* Name */}
              <div
                style={{
                  marginTop: h(6),
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  fontSize: wh(cardNameSize),
                  color: colors.ink,
                  letterSpacing: '0.01em',
                  textAlign: 'center',
                  lineHeight: 1.15,
                }}
              >
                {product.name}
              </div>
              {/* Price */}
              <div
                style={{
                  marginTop: h(8),
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: wh(18),
                  letterSpacing: '0.2em',
                  color: colors.accent,
                  textAlign: 'center',
                }}
              >
                {product.price}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Capsule line ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(capsuleTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: wh(14),
          opacity: capsuleOp,
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}
      >
        <span style={capsuleNumberStyle}>{capsuleNumber}</span>
        <span style={capsuleTagStyle}>{capsuleTag1}</span>
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
        <span style={capsuleTagStyle}>{capsuleTag2}</span>
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
        <span style={capsuleTagStyle}>{capsuleTag3}</span>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(ctaTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          textAlign: 'center',
          opacity: ctaOp,
          zIndex: 2,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            alert('Shopping the capsule…');
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

      {/* ── Byline ─────────────────────────────────────────────────── */}
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
          opacity: (bylineStyle.opacity ?? 1) * bylineOp,
          zIndex: 2,
        }}
      >
        {bylineStart}{' '}
        <em style={{ fontStyle: 'italic' }}>{bylineItalic}</em>
      </div>

      {/* keep safe reference to suppress unused warnings while remaining
       *  a useful hook for future right-edge decorations. */}
      <span style={{ display: 'none' }} data-safe-right={safe.right} />
      <span style={{ display: 'none' }} data-base-w={W} />
    </div>
  );
}

// ── Tiny color utilities (mirrors the-stack/scene.tsx) ─────────────
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
