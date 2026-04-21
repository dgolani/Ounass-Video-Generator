// Bestsellers Countdown — ranked 5 → 1 editorial card exchange over a
// giant italic rank numeral, closing on a "Shop the edit" CTA hold.
// Ported from the Claude-Design HTML prototype `01-bestsellers-countdown`;
// motion choreography matches slot-by-slot:
//   entry 0..0.25  slide-in + rotate + fade-in
//   hold  0.25..0.85  subtle sine float
//   exit  0.85..1.0  slide-out + counter-rotate + fade-out

import { Easing, clamp, interpolate, useTimeline } from '../../engine';
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
  const { colors, products, boutiqueName, headerMeta, kicker, logo } = props;

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
          top: 0,
          left: 0,
          right: 0,
          height: h(160),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${w(64)}px`,
          zIndex: 10,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={colors.ink}
          width={w(340)}
          height={h(80)}
          fontSize={wh(28)}
          fontWeight={800}
          letterSpacing="0.5em"
        />
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: wh(22),
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.60)',
          }}
        >
          {headerMeta}
        </div>
      </div>

      {/* Kicker */}
      <div
        style={{
          position: 'absolute',
          top: h(220),
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          fontSize: wh(28),
          fontWeight: 700,
          letterSpacing: '0.5em',
          textTransform: 'uppercase',
          color: colors.accent,
          zIndex: 10,
          opacity: time < ctaIn ? 1 : interpolate([0, 0.4], [1, 0], Easing.easeInCubic)(time - ctaIn),
        }}
      >
        {kicker}
      </div>

      {/* Giant background rank numeral */}
      <div
        style={{
          position: 'absolute',
          top: h(170),
          left: '50%',
          transform: 'translateX(-50%)',
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
        }}
      >
        {activeRank}
      </div>

      {/* Product card — only render the active slot for cheap layering */}
      <div
        style={{
          position: 'absolute',
          top: h(330),
          left: 0,
          right: 0,
          bottom: h(320),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
          return (
            <div
              key={product.id}
              style={{
                position: 'absolute',
                width: w(720),
                height: h(1080),
                background: colors.paper,
                boxShadow: `0 ${h(20)}px ${h(60)}px rgba(0,0,0,0.18), 0 ${h(4)}px ${h(12)}px rgba(0,0,0,0.08)`,
                overflow: 'hidden',
                opacity,
                transform: `translate(${w(tx)}px, ${h(ty)}px) rotate(${rot}deg) scale(${scale})`,
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
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: wh(30),
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: colors.ink,
                    }}
                  >
                    {product.brandline}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: wh(22),
                      fontWeight: 600,
                      color: 'rgba(0,0,0,0.60)',
                      letterSpacing: '0.05em',
                      marginTop: h(8),
                    }}
                  >
                    {product.name}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontSize: wh(26),
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: colors.accent,
                  }}
                >
                  {product.price}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* N° 0X marker, top-right */}
      <div
        style={{
          position: 'absolute',
          top: h(48),
          right: w(48),
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: wh(36),
          color: 'rgba(0,0,0,0.60)',
          letterSpacing: '0.12em',
          zIndex: 11,
          opacity: time < ctaIn ? 1 : interpolate([0, 0.4], [1, 0], Easing.easeInCubic)(time - ctaIn),
        }}
      >
        N° 0{activeRank}
      </div>

      {/* Rank dots */}
      <div
        style={{
          position: 'absolute',
          bottom: h(220),
          left: 0,
          right: 0,
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

      {/* CTA slab (bottom) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
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
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: wh(26),
            fontWeight: 700,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.60)',
          }}
        >
          {props.ctaKicker}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: wh(76),
            lineHeight: 1,
            color: colors.ink,
            letterSpacing: '-0.01em',
            textAlign: 'center',
            padding: `0 ${w(60)}px`,
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
            background: '#2D2D2D',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: wh(26),
            fontWeight: 800,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            border: 0,
            borderRadius: wh(4),
            cursor: 'pointer',
          }}
        >
          {props.ctaButton}
        </button>
      </div>
    </div>
  );
}
