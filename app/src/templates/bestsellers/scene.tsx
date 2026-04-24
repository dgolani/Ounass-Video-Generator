// Bestsellers Countdown — ranked 5 → 1 editorial card exchange over a
// giant italic rank numeral, closing on a "Shop the edit" CTA hold.
// Ported from the Claude-Design HTML prototype `01-bestsellers-countdown`;
// motion choreography matches slot-by-slot:
//   entry 0..0.25  slide-in + rotate + fade-in
//   hold  0.25..0.85  subtle sine float
//   exit  0.85..1.0  slide-out + counter-rotate + fade-out

import {
  Easing,
  clamp,
  interpolate,
  useTimeline,
  useSafeZone,
  useFieldColor,
  useFieldFormat,
} from '../../engine';
import { composePrice, useCurrencyForLocale } from '../../lib/price';
import type { BestsellersProps } from './schema';
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
  props: BestsellersProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

// Timing constants (at timeScale = 1 ≈ 14s)
const START = 0.4;
const PER = 1.9;
const SLOTS = 5;
const CTA_IN = START + PER * SLOTS + 0.2; // ≈ 10.1s

export function BestsellersScene({
  props,
  timeScale = 1,
  width = BASE_W,
  height = BASE_H,
}: SceneProps) {
  const { time } = useTimeline();
  const T = (x: number) => x * timeScale;
  const s = makeScale(width, height);
  const { w, h, wh } = s;
  const { base: safe } = useSafeZone({ width, height });
  const currency = useCurrencyForLocale();
  const { colors, products, boutiqueName, headerMeta, kicker, logo } = props;
  const logoColor = useFieldColor('logo', colors.ink);

  // ── Content rect (composition-safe window in output pixels) ───────────
  // When safe enforcement is OFF, margins are 0 so this collapses to the
  // full canvas (no conditional branches needed). When ON, readability-
  // critical content composes against this rect instead of raw canvas
  // edges, so the scene reflows as one unit.
  const contentTop = safe.top;
  const contentBottom = height - safe.bottom;
  const contentLeft = safe.left;
  const contentRight = width - safe.right;
  const contentW = contentRight - contentLeft;
  const contentCY = (contentTop + contentBottom) / 2;

  // Stack layout (from the top of the content rect):
  //   Header    contentTop + 20..148
  //   N° marker contentTop + 160..(160+36)
  //   Kicker    contentTop + 220..(220+30)
  //   Card      contentTop + 290..(290+1040)   ← explicit, NOT flex-centered
  //   Dots      bottom: safe.bottom + 220      (overlaid on card by design)
  //   CTA slab  bottom: safe.bottom            (appears during final phase)
  // Previously the card was flex-centered in a wrapper taller than the
  // card, which made the card's top overflow UP into the header zone
  // (card top ~395 vs header bottom ~398 on 9:16) — so the kicker at
  // y=508 sat VISUALLY ON TOP of the product image. Fixed by giving
  // the card an explicit top + width + height.
  const HEADER_TOP_INSET = h(20);
  const HEADER_H = h(128);
  const MARKER_TOP = HEADER_TOP_INSET + HEADER_H + h(12);
  const MARKER_RIGHT_INSET = w(48);
  const KICKER_INSET_FROM_HEADER = h(72);
  const CARD_TOP = h(290);
  const CARD_W = w(720);
  const CARD_H = h(1040);
  const DOTS_BOTTOM_INSET = h(220);
  const CTA_BOTTOM_INSET = safe.bottom;

  // Per-field format overrides — marketer may have customised these via
  // the Format drawer. Hooks called unconditionally at the top.
  const headerMetaStyle = useFieldFormat('headerMeta', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    // Brand-kit adaptive: use colors.ink at 60% opacity so the chrome
    // stays readable whether the boutique runs a light or dark background.
    // Previously hardcoded rgba(0,0,0,0.60) which vanished on dark palettes.
    color: colors.ink,
    opacity: 0.6,
  });
  const kickerStyle = useFieldFormat('kicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(28),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const ctaKickerStyle = useFieldFormat('ctaKicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 700,
    letterSpacing: '0.4em',
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
  });
  const ctaHeadlineStyle = useFieldFormat('ctaHeadline', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(76),
    fontWeight: 300,
    lineHeight: 1,
    color: colors.ink,
    letterSpacing: '-0.01em',
  });
  const ctaButtonStyle = useFieldFormat('ctaButton', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 800,
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
    // Button text = colors.background so it contrasts with the button's
    // ink-coloured bg. Works both ways: light bg + dark ink → light text
    // on dark button; dark bg + light ink → dark text on light button.
    color: colors.background,
  });
  const productBrandlineStyle = useFieldFormat('products.*.brandline', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: wh(30),
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: colors.ink,
  });
  const productNameStyle = useFieldFormat('products.*.name', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 600,
    color: colors.ink,
    opacity: 0.6,
    letterSpacing: '0.05em',
  });
  const productPriceStyle = useFieldFormat('products.*.price', {
    fontFamily: 'var(--font-numeric)',
    fontSize: wh(26),
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: colors.accent,
  });

  // Only 5 product slots are supported. If more are provided, extra are ignored;
  // if fewer, remaining slots stay blank.
  const slots = products.slice(0, SLOTS);

  // Which slot is currently in view (or -1 if we're in CTA hold)?
  let activeSlot = -1;
  let localT = 0;
  const ctaIn = T(CTA_IN);
  if (time < ctaIn) {
    for (let i = 0; i < SLOTS; i++) {
      const slotStart = T(START + i * PER);
      const lt = time - slotStart;
      if (lt >= 0 && lt <= T(PER)) {
        activeSlot = i;
        localT = lt / T(PER); // normalised 0..1 inside the slot
        break;
      }
    }
  }

  const activeProduct =
    activeSlot >= 0 && activeSlot < slots.length ? slots[activeSlot] : null;
  const activeRank = activeProduct?.rank ?? 1;

  // Background numeral opacity curve: fade-up on slot entry, fade-down on exit.
  let numOp = 0;
  if (activeSlot >= 0) {
    if (localT < 0.25) {
      numOp = interpolate([0, 0.25], [0.02, 0.08], Easing.easeOutCubic)(localT);
    } else if (localT > 0.85) {
      numOp = interpolate([0.85, 1.0], [0.08, 0], Easing.easeInCubic)(localT);
    } else {
      numOp = 0.08;
    }
  }

  // Rank-dot strip active index tracks activeSlot during countdown, goes quiet in CTA.
  const dotActiveIdx = activeSlot >= 0 ? activeSlot : -1;

  // CTA reveal
  const ctaP = clamp((time - ctaIn) / Math.max(T(0.7), 0.01), 0, 1);
  const ctaOp = time >= ctaIn ? interpolate([0, 1], [0, 1], Easing.easeOutCubic)(ctaP) : 0;
  const ctaY = time >= ctaIn ? interpolate([0, 1], [80, 0], Easing.easeOutExpo)(ctaP) : 80;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: colors.background,
        color: colors.ink,
        overflow: 'hidden',
      }}
    >
      {/* Grain / wash overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(ellipse at 50% 90%, rgba(0,0,0,0.08), transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Header row: boutique + header meta */}
      <div
        style={{
          position: 'absolute',
          top: contentTop + HEADER_TOP_INSET,
          left: contentLeft,
          width: contentW,
          height: HEADER_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${w(36)}px`,
          zIndex: 10,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={logoColor}
          width={w(340)}
          height={h(80)}
          fontSize={wh(28)}
          fontWeight={800}
          letterSpacing="0.5em"
        />
        <div style={{ ...headerMetaStyle }}>
          {headerMeta}
        </div>
      </div>

      {/* Kicker — anchored to the top safe zone so it stays clear of
       *  Instagram/TikTok top UI (story progress bar, username chip). */}
      <div
        style={{
          position: 'absolute',
          top: contentTop + HEADER_TOP_INSET + HEADER_H + KICKER_INSET_FROM_HEADER,
          left: contentLeft,
          width: contentW,
          textAlign: 'center',
          zIndex: 10,
          ...kickerStyle,
          // Animation opacity takes precedence over the override's static
          // opacity — multiplied in applyFieldFormat so both compose.
          opacity:
            (kickerStyle.opacity ?? 1) *
            (time < ctaIn
              ? 1
              : interpolate([0, 0.4], [1, 0], Easing.easeInCubic)(time - ctaIn)),
        }}
      >
        {kicker}
      </div>

      {/* Giant background rank numeral */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: contentCY,
          display: 'flex',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: wh(1100),
          lineHeight: 0.78,
          letterSpacing: '-0.06em',
          color: colors.ink,
          opacity: numOp,
          zIndex: 2,
          userSelect: 'none',
          whiteSpace: 'nowrap',
          transform: `translateY(-53%)`,
        }}
      >
        {activeRank}
      </div>

      {/* Product card — only render the active slot for cheap layering.
       *  Explicit top + centered horizontally via a wrapper that's the
       *  same size as the card (no flex-overflow shenanigans). */}
      <div
        style={{
          position: 'absolute',
          top: contentTop + CARD_TOP,
          left: (contentLeft + (contentRight - contentLeft) / 2) - CARD_W / 2,
          width: CARD_W,
          height: CARD_H,
          zIndex: 5,
        }}
      >
        {slots.map((product, i) => {
          if (i !== activeSlot) return null;
          // Derive per-slot transform from localT (0..1)
          let tx = 0;
          let ty = 0;
          let rot = 0;
          let opacity = 1;
          let scale = 1;
          if (localT < 0.25) {
            const p = localT / 0.25;
            tx = interpolate([0, 1], [220, 0], Easing.easeOutExpo)(p);
            opacity = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
            rot = interpolate([0, 1], [6, 0], Easing.easeOutExpo)(p);
            scale = interpolate([0, 1], [0.92, 1], Easing.easeOutExpo)(p);
          } else if (localT > 0.85) {
            const p = (localT - 0.85) / 0.15;
            tx = interpolate([0, 1], [0, -220], Easing.easeInCubic)(p);
            opacity = interpolate([0, 1], [1, 0], Easing.easeInCubic)(p);
            rot = interpolate([0, 1], [0, -6], Easing.easeInCubic)(p);
            scale = interpolate([0, 1], [1, 0.96], Easing.easeInCubic)(p);
          } else {
            const p = (localT - 0.25) / 0.6;
            ty = Math.sin(p * Math.PI) * -8;
          }
          const imageScaleRaw = Number(product.imageScale ?? 1);
          const imageScale = Number.isFinite(imageScaleRaw)
            ? Math.min(1.5, Math.max(0.6, imageScaleRaw))
            : 1;
          const cardScale = scale * imageScale;
          return (
            <div
              key={product.id}
              style={{
                position: 'absolute',
                inset: 0,
                background: colors.paper,
                boxShadow: `0 ${h(20)}px ${h(60)}px rgba(0,0,0,0.18), 0 ${h(4)}px ${h(12)}px rgba(0,0,0,0.08)`,
                overflow: 'hidden',
                opacity,
                transform: `translate(${w(tx)}px, ${h(ty)}px) rotate(${rot}deg) scale(${cardScale})`,
              }}
            >
              <img
                src={product.src}
                alt={product.name}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: w(40),
                  right: w(40),
                  bottom: h(40),
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}
              >
                <div>
                  <div
                    style={{
                      ...productBrandlineStyle,
                    }}
                  >
                    {product.brandline}
                  </div>
                  <div
                    style={{
                      ...productNameStyle,
                      marginTop: h(8),
                    }}
                  >
                    {product.name}
                  </div>
                </div>
                <div
                  style={{
                    ...productPriceStyle,
                  }}
                >
                  {composePrice(product.price, currency)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* N° 0X marker — sits below the header row, top-right of the
       *  product zone. Previously at contentTop + h(48) which put it
       *  right on top of headerMeta "The Edit · Spring" at the same y.
       *  Now clears both the header and the right like-stack. Uses
       *  colors.ink at 60% opacity so it adapts to brand-kit dark
       *  palettes (was hardcoded rgba(0,0,0,0.60), invisible on dark). */}
      <div
        style={{
          position: 'absolute',
          top: contentTop + MARKER_TOP,
          right: safe.right + MARKER_RIGHT_INSET,
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: wh(36),
          color: colors.ink,
          letterSpacing: '0.12em',
          zIndex: 11,
          opacity:
            0.6 *
            (time < ctaIn
              ? 1
              : interpolate([0, 0.4], [1, 0], Easing.easeInCubic)(time - ctaIn)),
        }}
      >
        N° 0{activeRank}
      </div>

      {/* Rank dots — sit just above the CTA slab, but no lower than the
       *  safe-zone bottom edge so they stay visible above the IG caption. */}
      <div
        style={{
          position: 'absolute',
          bottom: safe.bottom + DOTS_BOTTOM_INSET,
          left: contentLeft,
          width: contentW,
          display: 'flex',
          justifyContent: 'center',
          gap: w(12),
          zIndex: 10,
        }}
      >
        {Array.from({ length: SLOTS }).map((_, i) => {
          const active = i === dotActiveIdx;
          return (
            <div
              key={i}
              style={{
                width: active ? w(60) : w(36),
                height: h(3),
                background: active ? colors.accent : colors.ink,
                opacity: active ? 1 : 0.15,
                transition: 'opacity 200ms, width 200ms, background 200ms',
              }}
            />
          );
        })}
      </div>

      {/* CTA slab (bottom) — lifted above the bottom safe zone so its
       *  headline + button sit clear of the IG caption / TikTok tray. */}
      <div
        style={{
          position: 'absolute',
          bottom: CTA_BOTTOM_INSET,
          left: 0,
          right: 0,
          height: h(360),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: h(28),
          background: colors.background,
          zIndex: 20,
          opacity: ctaOp,
          transform: `translateY(${h(ctaY)}px)`,
          paddingLeft: safe.left,
          paddingRight: safe.right,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ ...ctaKickerStyle }}>
          {props.ctaKicker}
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: `0 ${w(60)}px`,
            ...ctaHeadlineStyle,
          }}
        >
          {props.ctaHeadline}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert('Tapping through…');
          }}
          style={{
            padding: `${h(22)}px ${w(56)}px`,
            // Button bg = colors.ink so it's always a strong contrast
            // against the scene background (previously hardcoded #2D2D2D
            // which vanished on dark brand-kit backgrounds).
            background: colors.ink,
            border: 0,
            borderRadius: wh(4),
            cursor: 'pointer',
            ...ctaButtonStyle,
          }}
        >
          {props.ctaButton}
        </button>
      </div>
    </div>
  );
}
