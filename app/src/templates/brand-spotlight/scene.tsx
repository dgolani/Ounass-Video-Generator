// Brand Spotlight — designer-feature story in 4 acts:
//   Act 1 (0.0–3.5) : letters of the designer name pour in, tag fades in
//   Act 2 (3.7–8.0) : hero product card with companion strip at the bottom
//   Act 3 (8.2–11.5): designer quote, large italic serif
//   Act 4 (11.5+)   : monogram hold frame with CTA
// Ported from the Claude-Design HTML prototype `05-brand-spotlight`.

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
import type { SpotlightProps } from './schema';
import { BoutiqueLogo } from '../BoutiqueLogo';
import { MediaBackground } from '../MediaBackground';

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
  props: SpotlightProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

export function BrandSpotlightScene({
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

  // Destructure before hooks so bases reference live brand values.
  const {
    colors,
    boutiqueName,
    presentsLabel,
    featuredBrand,
    brandTag,
    hero,
    quote,
    quoteAttrib,
    stripSrcs,
    finalMono,
    finalKicker,
    finalHead,
    finalMeta,
    ctaButton,
    logo,
    backgroundImage,
  } = props;
  const logoColor = useFieldColor('logo', '#fff');

  const featuredBrandStyle = useFieldFormat('featuredBrand', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(290),
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    color: colors.cream,
  });
  const brandTagStyle = useFieldFormat('brandTag', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const quoteStyle = useFieldFormat('quote', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(68),
    fontWeight: 300,
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
    color: colors.cream,
  });
  const finalHeadStyle = useFieldFormat('finalHead', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(82),
    letterSpacing: '-0.02em',
    color: '#fff',
  });
  const ctaButtonStyle = useFieldFormat('ctaButton', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 800,
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
    color: '#fff',
  });
  const presentsLabelStyle = useFieldFormat('presentsLabel', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  });
  const heroBrandlineStyle = useFieldFormat('hero.brandline', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(32),
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: colors.ink,
  });
  const heroNameStyle = useFieldFormat('hero.name', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 600,
    color: 'rgba(0,0,0,0.60)',
    letterSpacing: '0.08em',
  });
  const heroPriceStyle = useFieldFormat('hero.price', {
    fontFamily: 'var(--font-numeric)',
    fontSize: wh(26),
    fontWeight: 700,
    color: colors.accent,
    letterSpacing: '0.08em',
  });
  const quoteAttribStyle = useFieldFormat('quoteAttrib', {
    fontFamily: 'var(--font-body)',
    fontStyle: 'normal',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: '0.5em',
    color: colors.accent,
    textTransform: 'uppercase',
  });
  const finalKickerStyle = useFieldFormat('finalKicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: '0.5em',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  });
  const finalMetaStyle = useFieldFormat('finalMeta', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 600,
    letterSpacing: '0.35em',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  });
  const boutiqueNameStyle = useFieldFormat('boutiqueName', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(22),
    fontWeight: 300,
    letterSpacing: '-0.03em',
  });

  const letters = featuredBrand.split('');

  // Tag fade-in and fade-out
  let tagOp = 0;
  if (time < T(1.8)) {
    tagOp = 0;
  } else if (time < T(3.3)) {
    const p = clamp((time - T(1.8)) / Math.max(T(0.6), 0.01), 0, 1);
    tagOp = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
  } else {
    const p = clamp((time - T(3.3)) / Math.max(T(0.5), 0.01), 0, 1);
    tagOp = interpolate([0, 1], [1, 0], Easing.easeInCubic)(p);
  }

  // Hero product card
  let heroOp = 0;
  let heroTy = 60;
  let heroScale = 0.92;
  if (time < T(3.7)) {
    heroOp = 0;
  } else if (time < T(8.0)) {
    const p = clamp((time - T(3.7)) / Math.max(T(0.8), 0.01), 0, 1);
    heroOp = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
    heroTy = interpolate([0, 1], [60, 0], Easing.easeOutExpo)(p);
    heroScale = interpolate([0, 1], [0.92, 1], Easing.easeOutExpo)(p);
    if (time > T(7.5)) {
      const ex = clamp((time - T(7.5)) / Math.max(T(0.5), 0.01), 0, 1);
      heroOp = interpolate([0, 1], [heroOp, 0], Easing.easeInCubic)(ex);
      heroTy = interpolate([0, 1], [0, -30], Easing.easeInCubic)(ex);
      heroScale = interpolate([0, 1], [1, 0.96], Easing.easeInCubic)(ex);
    } else {
      heroTy += Math.sin((time / Math.max(timeScale, 0.01) - 4.5) * 1.2) * 4;
    }
  } else {
    heroOp = 0;
  }

  // Quote
  let quoteOp = 0;
  let quoteTy = 40;
  if (time >= T(8.2) && time < T(11.5)) {
    const p = clamp((time - T(8.2)) / Math.max(T(1.0), 0.01), 0, 1);
    quoteOp = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
    quoteTy = interpolate([0, 1], [40, 0], Easing.easeOutExpo)(p);
    if (time > T(11.0)) {
      const ex = clamp((time - T(11.0)) / Math.max(T(0.4), 0.01), 0, 1);
      quoteOp = interpolate([0, 1], [quoteOp, 0], Easing.easeInCubic)(ex);
    }
  }

  // Final CTA
  let finalOp = 0;
  let monoScale = 0.85;
  if (time >= T(11.5)) {
    const p = clamp((time - T(11.5)) / Math.max(T(0.8), 0.01), 0, 1);
    finalOp = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
    monoScale = interpolate([0, 1], [0.85, 1], Easing.easeOutExpo)(p);
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: backgroundImage ? 'transparent' : colors.background,
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {backgroundImage ? (
        <MediaBackground src={backgroundImage} />
      ) : (
        /* Background copper radial */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 30%, rgba(184,114,83,0.12), transparent 55%), linear-gradient(180deg, ${colors.backgroundDeep} 0%, #151515 100%)`,
            zIndex: 0,
          }}
        />
      )}

      {/* Top — "OUNASS PRESENTS" pinned below the top safe zone so the
       *  IG progress bar / username chip doesn't cover it. */}
      <div
        style={{
          position: 'absolute',
          top: Math.max(h(60), safe.top),
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          ...presentsLabelStyle,
          opacity: (presentsLabelStyle.opacity ?? 1) * (1 - finalOp),
        }}
      >
        {/* When a logo is set, show logo + "presents"; otherwise show boutique name + "presents" */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: w(16) }}>
          <BoutiqueLogo
            logo={logo}
            boutiqueName={boutiqueName}
            color={logoColor}
            width={w(260)}
            height={h(48)}
            fontSize={wh(22)}
            fontWeight={800}
            letterSpacing="0.5em"
            nameStyle={boutiqueNameStyle}
          />
          <span>{presentsLabel.replace(new RegExp(boutiqueName, 'i'), '').trim() || 'presents'}</span>
        </div>
      </div>

      {/* Act 1 — letters */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            whiteSpace: 'nowrap',
            textAlign: 'center',
            display: 'flex',
            gap: w(6),
            ...featuredBrandStyle,
          }}
        >
          {letters.map((ch, i) => {
            const inAt = T(0.25 + i * 0.18);
            const inDur = T(0.9);
            let op = 0;
            let ty = 120;
            let sc = 1.3;
            let rot = -8;
            if (time >= inAt) {
              const p = clamp((time - inAt) / Math.max(inDur, 0.01), 0, 1);
              op = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
              ty = interpolate([0, 1], [120, 0], Easing.easeOutExpo)(p);
              sc = interpolate([0, 1], [1.3, 1], Easing.easeOutExpo)(p);
              rot = interpolate([0, 1], [-8, 0], Easing.easeOutExpo)(p);
              if (time > T(3.3)) {
                const exP = clamp((time - T(3.3)) / Math.max(T(0.6), 0.01), 0, 1);
                op = interpolate([0, 1], [op, 0], Easing.easeInCubic)(exP);
                ty = interpolate([0, 1], [0, -60], Easing.easeInCubic)(exP);
                sc = interpolate([0, 1], [1, 0.9], Easing.easeInCubic)(exP);
              }
            }
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: op,
                  transform: `translateY(${h(ty)}px) scale(${sc}) rotate(${rot}deg)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>

      {/* Brand tag under the letters */}
      <div
        style={{
          position: 'absolute',
          top: '58%',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 6,
          ...brandTagStyle,
          opacity: (brandTagStyle.opacity ?? 1) * tagOp,
        }}
      >
        {brandTag}
      </div>

      {/* Act 2 — hero product */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 6,
          pointerEvents: 'none',
          opacity: heroOp > 0 ? 1 : 0,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: w(760),
            height: h(1140),
            background: colors.paper,
            boxShadow: `0 ${h(40)}px ${h(100)}px rgba(0,0,0,0.6)`,
            overflow: 'hidden',
            opacity: heroOp,
            transform: `translateY(${h(heroTy)}px) scale(${heroScale})`,
          }}
        >
          <img
            src={hero.src}
            alt={hero.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: wh(18),
              border: '1px solid rgba(0,0,0,0.15)',
              pointerEvents: 'none',
            }}
          />
          {/* Copper badge */}
          <div
            style={{
              position: 'absolute',
              top: wh(32),
              right: wh(32),
              width: wh(72),
              height: wh(72),
              borderRadius: '50%',
              background: colors.accent,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: wh(40),
            }}
          >
            01
          </div>
          {/* Label */}
          <div
            style={{
              position: 'absolute',
              left: w(40),
              right: w(40),
              bottom: h(40),
            }}
          >
            <div style={{ ...heroBrandlineStyle }}>
              {hero.brandline}
            </div>
            <div
              style={{
                ...heroNameStyle,
                marginTop: h(6),
              }}
            >
              {hero.name}
            </div>
            <div
              style={{
                ...heroPriceStyle,
                marginTop: h(10),
              }}
            >
              {composePrice(hero.price, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Companion strip — lifted above the bottom safe zone so the
       *  tile row stays visible over the IG caption area. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Math.max(h(280), safe.bottom + h(40)),
          height: h(180),
          display: 'flex',
          justifyContent: 'center',
          gap: w(20),
          zIndex: 7,
          pointerEvents: 'none',
        }}
      >
        {stripSrcs.slice(0, 5).map((src, i) => {
          const inAt = T(5.5 + i * 0.1);
          let op = 0;
          let ty = 30;
          if (time < inAt) {
            op = 0;
          } else if (time < T(7.5)) {
            const p = clamp((time - inAt) / Math.max(T(0.6), 0.01), 0, 1);
            op = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
            ty = interpolate([0, 1], [30, 0], Easing.easeOutExpo)(p);
          } else {
            const ex = clamp((time - T(7.5)) / Math.max(T(0.4), 0.01), 0, 1);
            op = interpolate([0, 1], [1, 0], Easing.easeInCubic)(ex);
            ty = interpolate([0, 1], [0, -20], Easing.easeInCubic)(ex);
          }
          return (
            <div
              key={i}
              style={{
                position: 'relative',
                width: w(140),
                height: h(180),
                background: colors.paper,
                overflow: 'hidden',
                boxShadow: `0 ${h(10)}px ${h(30)}px rgba(0,0,0,0.4)`,
                opacity: op,
                transform: `translateY(${h(ty)}px)`,
              }}
            >
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          );
        })}
      </div>

      {/* Act 3 — quote */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: '40%',
          textAlign: 'center',
          zIndex: 8,
          pointerEvents: 'none',
          ...quoteStyle,
          opacity: (quoteStyle.opacity ?? 1) * quoteOp,
          transform: `translateY(${h(quoteTy)}px)`,
        }}
      >
        {quote}
        <span
          style={{
            display: 'block',
            marginTop: h(28),
            ...quoteAttribStyle,
          }}
        >
          {quoteAttrib}
        </span>
      </div>

      {/* Act 4 — final monogram + CTA */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: h(26),
          opacity: finalOp,
          pointerEvents: finalOp > 0.5 ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: wh(170),
            lineHeight: 1,
            color: colors.accent,
            letterSpacing: '-0.03em',
            transform: `scale(${monoScale})`,
          }}
        >
          {finalMono}
        </div>
        <div style={{ ...finalKickerStyle }}>
          {finalKicker}
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: `0 ${w(60)}px`,
            ...finalHeadStyle,
          }}
        >
          {finalHead}
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: `0 ${w(40)}px`,
            ...finalMetaStyle,
          }}
        >
          {finalMeta}
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
            marginTop: h(18),
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
