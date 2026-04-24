// Category Carousel — 3D-lane edit carousel + copper-stamped CTA bloom.
// Ported from the Claude-Design HTML prototype `03-category-carousel`.
// Each card slides along the lane with perspective depth + rotateY,
// settling into center focus before handing off to the next; final frame
// blooms a rotating dashed stamp + CTA.

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
import type { CarouselProps } from './schema';
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
  props: CarouselProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

const CAROUSEL_END = 10.5;

export function CarouselScene({
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

  // Content-rect anchors (always-safe regime). See SAFE_ZONE_PATTERNS.md.
  // Only the ones actually read; the final-CTA centring uses padded-flex
  // on safe.* directly so no contentCX needed.
  const contentTop = safe.top;
  const contentLeft = safe.left;
  const contentRight = width - safe.right;

  // Colours first so per-field format hooks can close over live brand values.
  const {
    colors,
    items,
    boutiqueName,
    categoryLabel,
    titleKicker,
    titleLine1,
    titleLine2,
    finalStat,
    finalKicker,
    finalHeadline,
    finalSubline,
    ctaButton,
    logo,
  } = props;
  // Scene is dark-themed: `colors.card` is the light surface tone used
  // for both the item cards AND any light text over the dark scene bg.
  // If the boutique edits `colors.card` per-project, scene chrome adapts.
  const lightText = colors.card;

  // Per-field format overrides.
  const titleKickerStyle = useFieldFormat('titleKicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: '0.45em',
    textTransform: 'uppercase',
    color: lightText,
    opacity: 0.55,
  });
  const titleLineStyle = useFieldFormat('titleLine1', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(150),
    fontWeight: 300,
    lineHeight: 0.95,
    letterSpacing: '-0.03em',
    color: lightText,
  });
  const finalHeadlineStyle = useFieldFormat('finalHeadline', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(120),
    lineHeight: 1,
    color: lightText,
    letterSpacing: '-0.02em',
  });
  const ctaButtonStyle = useFieldFormat('ctaButton', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 800,
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
    color: lightText,
  });
  const logoColor = useFieldColor('logo', lightText);

  const N = items.length;
  const carouselEnd = T(CAROUSEL_END);
  const perStep = carouselEnd / Math.max(N, 1);
  const finalT = time - carouselEnd;
  const finalP = clamp(finalT / Math.max(T(0.9), 0.01), 0, 1);
  const finalOp = time >= carouselEnd
    ? interpolate([0, 1], [0, 1], Easing.easeOutCubic)(finalP)
    : 0;

  // Active index + fractional position inside the step
  let idx = 0;
  let eased = 0;
  if (time < carouselEnd) {
    const prog = time / perStep;
    idx = Math.floor(prog);
    const frac = clamp(prog - idx, 0, 1);
    eased = frac < 0.5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2;
  }

  // Build lane placements for each card — offset can be fractional
  function placeStyle(offset: number) {
    const absOff = Math.abs(offset);
    if (absOff >= 2.5) return { opacity: 0, transform: '', filter: '', zIndex: 0 };
    const tx = offset * w(380);
    const tz = -absOff * wh(240);
    const ry = offset * -18;
    const scale = 1 - Math.min(absOff, 2) * 0.12;
    const opacity = absOff < 0.05 ? 1 : interpolate([0, 2.2], [1, 0], Easing.easeInCubic)(absOff);
    const blur = Math.min(absOff * 1.5, 3);
    const bright = 1 - Math.min(absOff * 0.18, 0.45);
    return {
      opacity,
      transform: `translate3d(${tx}px, 0, ${tz}px) rotateY(${ry}deg) scale(${scale})`,
      filter: `blur(${blur}px) brightness(${bright})`,
      zIndex: Math.round(100 - absOff * 10),
    };
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: colors.background,
        color: lightText,
        overflow: 'hidden',
      }}
    >
      {/* Ambient copper radial */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse ${w(700)}px ${h(900)}px at 50% 50%, rgba(184,114,83,0.22), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.04), transparent 70%)`,
          zIndex: 0,
        }}
      />

      {/* Top bar — logo + category label. Anchored inside the content
       *  rect so both edges respect safe.right on 9:16. */}
      <div
        style={{
          position: 'absolute',
          top: contentTop,
          left: contentLeft,
          right: width - contentRight,
          height: h(120),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: w(64),
          paddingRight: w(64),
          boxSizing: 'border-box',
          zIndex: 10,
          opacity: 1 - finalOp,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={logoColor}
          width={w(320)}
          height={h(60)}
          fontSize={wh(28)}
          fontWeight={800}
          letterSpacing="0.5em"
        />
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: wh(22),
            fontWeight: 700,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: colors.accent,
          }}
        >
          {categoryLabel}
        </div>
      </div>

      {/* Title block — below the top bar, inside the content rect. */}
      <div
        style={{
          position: 'absolute',
          top: contentTop + h(150),
          left: contentLeft,
          right: width - contentRight,
          textAlign: 'center',
          zIndex: 9,
          color: lightText,
          opacity: 1 - finalOp,
          padding: `0 ${w(40)}px`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ marginBottom: h(22), ...titleKickerStyle }}>
          {titleKicker}
        </div>
        <div style={{ ...titleLineStyle }}>
          {titleLine1}
          <br />
          <em>{titleLine2}</em>
        </div>
      </div>

      {/* 3D rail wrap */}
      <div
        style={{
          position: 'absolute',
          top: h(620),
          left: 0,
          right: 0,
          height: h(900),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: `${wh(2400)}px`,
          zIndex: 5,
          opacity: 1 - finalOp,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: w(1080),
            height: h(900),
            transformStyle: 'preserve-3d',
          }}
        >
          {items.map((it, i) => {
            const offset = i - idx - eased;
            const st = placeStyle(offset);
            return (
              <div
                key={it.id}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: w(520),
                  height: h(780),
                  marginTop: -h(390),
                  marginLeft: -w(260),
                  background: colors.card,
                  overflow: 'hidden',
                  boxShadow: `0 ${h(30)}px ${h(80)}px rgba(0,0,0,0.55)`,
                  opacity: st.opacity,
                  transform: st.transform,
                  filter: st.filter,
                  zIndex: st.zIndex,
                }}
              >
                <img
                  src={it.src}
                  alt={it.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: w(32),
                    right: w(32),
                    bottom: h(32),
                    color: colors.ink,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: wh(28),
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {it.brandline}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: wh(20),
                      fontWeight: 600,
                      color: colors.ink,
                      opacity: 0.6,
                      marginTop: h(4),
                      letterSpacing: '0.04em',
                    }}
                  >
                    {it.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-numeric)',
                      fontSize: wh(22),
                      fontWeight: 700,
                      color: colors.accent,
                      letterSpacing: '0.08em',
                      marginTop: h(8),
                    }}
                  >
                    {composePrice(it.price, currency)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The "01 / 06" counter chip that lived here was removed
       *  2026-04-25 — the 3D carousel's motion already conveys
       *  position without a numeric badge, and removing it cleans up
       *  the lower third so the card captions + prices read better. */}

      {/* Final CTA — rotating dashed ring + stat stamp + CTA button.
       *  Padded-flex pattern (§4 Option A) so the stack centres on the
       *  content rect (not canvas centre, which would list right on 9:16). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: h(32),
          paddingTop: safe.top,
          paddingBottom: safe.bottom,
          paddingLeft: safe.left,
          paddingRight: safe.right,
          boxSizing: 'border-box',
          opacity: finalOp,
          pointerEvents: finalOp > 0.5 ? 'auto' : 'none',
        }}
      >
        <style>{`
          @keyframes carouselSpin { to { transform: rotate(360deg); } }
        `}</style>
        <div
          style={{
            position: 'relative',
            width: wh(220),
            height: wh(220),
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: wh(260),
              height: wh(260),
              borderRadius: '50%',
              border: `1px dashed ${colors.accent}`,
              animation: 'carouselSpin 14s linear infinite',
            }}
          />
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: wh(58),
              color: colors.accent,
              letterSpacing: '-0.02em',
            }}
          >
            {finalStat}
          </div>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: wh(26),
            fontWeight: 700,
            letterSpacing: '0.5em',
            color: lightText,
            opacity: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {finalKicker}
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: `0 ${w(60)}px`,
            ...finalHeadlineStyle,
          }}
        >
          {finalHeadline}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: wh(24),
            letterSpacing: '0.25em',
            color: lightText,
            opacity: 0.55,
            textTransform: 'uppercase',
          }}
        >
          {finalSubline}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert('Tapping through…');
          }}
          style={{
            padding: `${h(22)}px ${w(64)}px`,
            background: colors.accent,
            border: 0,
            borderRadius: wh(4),
            marginTop: h(14),
            cursor: 'pointer',
            ...ctaButtonStyle,
          }}
        >
          {ctaButton}
        </button>
      </div>
    </div>
  );
}
