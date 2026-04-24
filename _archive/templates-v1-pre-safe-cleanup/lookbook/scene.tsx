import { useEffect, useState } from 'react';
import {
  Easing,
  animate,
  clamp,
  interpolate,
  useFieldColor,
  useFieldFormat,
  useSafeZone,
  useTimeline,
} from '../../engine';
import { composePrice, useCurrencyForLocale } from '../../lib/price';
import type { LookbookProps } from './schema';
import { BoutiqueLogo } from '../BoutiqueLogo';

// Base canvas — the choreography was designed on 1080×1920. All pixel
// literals below refer to this base. Scaling to any other canvas comes
// from the ratio helpers (w, h, wh) threaded through Act components.
const BASE_W = 1080;
const BASE_H = 1920;

type Scale = {
  W: number;
  H: number;
  w: (px: number) => number;
  h: (px: number) => number;
  /** Smaller of the two scales — for things like fontSize that should be
   *  bound by the tighter dimension so they don't overflow. */
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
  props: LookbookProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

type ActProps = {
  props: LookbookProps;
  T: (x: number) => number;
  s: Scale;
  /** Resolved safe zone for the current aspect (top/bottom/left/right
   *  in output pixels). Threaded from the root so safe-layer elements
   *  like the outro CTA and watermark stay clear of platform chrome. */
  safe: { top: number; bottom: number; left: number; right: number };
};

// ── Act 1 — title whisper over darkness ────────────────────────────────
function Act1Title({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { colors, kicker, brand, tagline } = props;
  const { h, wh } = s;

  const kickerStyle = useFieldFormat('kicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: `${wh(6)}px`,
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const brandStyle = useFieldFormat('brand', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(96),
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    color: colors.paper,
  });
  const taglineStyle = useFieldFormat('tagline', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(32),
    fontWeight: 300,
    letterSpacing: '0.01em',
    color: 'rgba(245,243,239,0.6)',
  });

  const lineH = animate({
    from: 0,
    to: h(BASE_W), // 1080 on base → full width scaled
    start: T(0.1),
    end: T(0.9),
    ease: Easing.easeOutExpo,
  })(t);
  const titleOpacity = interpolate(
    [T(0.4), T(0.8), T(1.8), T(2.1)],
    [0, 1, 1, 0],
    Easing.easeInOutCubic,
  )(t);
  const titleY = interpolate([T(0.4), T(0.8)], [wh(16), 0], Easing.easeOutCubic)(t);
  const subOpacity = interpolate(
    [T(0.6), T(1.0), T(1.8), T(2.1)],
    [0, 1, 1, 0],
    Easing.easeInOutCubic,
  )(t);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1,
          height: lineH,
          background: `linear-gradient(to bottom, rgba(196,147,115,0), ${colors.accent} 20%, ${colors.accent} 80%, rgba(196,147,115,0))`,
          transform: 'translate(-0.5px, -50%)',
          opacity: t < T(2.0) ? 1 : interpolate([T(2.0), T(2.2)], [1, 0])(t),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(780),
          textAlign: 'center',
          ...kickerStyle,
          opacity: (kickerStyle.opacity ?? 1) * subOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(870),
          textAlign: 'center',
          ...brandStyle,
          opacity: (brandStyle.opacity ?? 1) * titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {brand}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(990),
          textAlign: 'center',
          ...taglineStyle,
          opacity: (taglineStyle.opacity ?? 1) * subOpacity,
        }}
      >
        {tagline}
      </div>
    </>
  );
}

// ── Act 2 — columns slide up ───────────────────────────────────────────
function Act2Columns({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { products, colors, act2Kicker, act2TitleLine1, act2TitleLine2 } = props;
  const { h, wh, W, H } = s;
  const colW = W / products.length;

  const act2KickerStyle = useFieldFormat('act2Kicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: `${wh(4)}px`,
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const act2TitleStyle = useFieldFormat('act2TitleLine1', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(64),
    fontWeight: 300,
    lineHeight: 1.05,
    letterSpacing: '-0.01em',
    color: colors.paper,
  });

  return (
    <>
      {products.map((p, i) => {
        const start = T(2.0) + i * T(0.09);
        const riseT = interpolate(
          [start, start + T(0.8)],
          [0, 1],
          Easing.easeOutExpo,
        )(t);
        const y = (1 - riseT) * H;

        const driftT = clamp((t - (start + T(0.8))) / T(1.6), 0, 1);
        const drift = driftT * (i % 2 === 0 ? -wh(12) : wh(12));

        const exitStart = T(3.8);
        const exitT = interpolate(
          [exitStart, T(4.2)],
          [0, 1],
          Easing.easeInCubic,
        )(t);
        const centerOffset = (i - (products.length - 1) / 2) * colW;
        const exitX = -centerOffset * exitT;
        const exitScaleX = 1 - exitT * 0.85;
        const exitOpacity = 1 - exitT;

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: i * colW,
              top: 0,
              width: colW,
              height: H,
              transform: `translate(${exitX}px, ${y + drift}px) scaleX(${exitScaleX})`,
              transformOrigin: 'center center',
              opacity: exitOpacity,
              overflow: 'hidden',
              willChange: 'transform, opacity',
            }}
          >
            {p.src ? (
              <img
                src={p.src}
                alt=""
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: W,
                  height: h(1620),
                  transform: `translate(${-i * colW - colW / 2 + W / 2}px, -50%)`,
                  objectFit: 'cover',
                  filter: 'saturate(1.05) contrast(1.03)',
                }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `repeating-linear-gradient(135deg, rgba(196,147,115,0.2) 0 ${wh(16)}px, rgba(196,147,115,0.08) ${wh(16)}px ${wh(32)}px)`,
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(${
                  i % 2 === 0 ? '180deg' : '0deg'
                }, rgba(0,0,0,0.25), transparent 40%, transparent 70%, rgba(0,0,0,0.35))`,
              }}
            />
            {i < products.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: 'rgba(10,10,10,0.4)',
                }}
              />
            )}
          </div>
        );
      })}

      {t >= T(2.4) && t < T(4.0) && (() => {
        const capIn = interpolate(
          [T(2.4), T(2.9)],
          [0, 1],
          Easing.easeOutExpo,
        )(t);
        const capOut = interpolate(
          [T(3.6), T(4.0)],
          [1, 0],
          Easing.easeInCubic,
        )(t);
        const op = capIn * capOut;
        return (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: h(860),
              textAlign: 'center',
              opacity: op,
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: `${wh(18)}px ${wh(36)}px`,
                background: 'rgba(10,10,10,0.78)',
                backdropFilter: 'blur(6px)',
                border: `1px solid rgba(196,147,115,0.4)`,
              }}
            >
              <div style={{ marginBottom: wh(14), ...act2KickerStyle }}>
                {act2Kicker}
              </div>
              <div style={{ ...act2TitleStyle }}>
                {act2TitleLine1}
                <br />
                <em style={{ fontWeight: act2TitleStyle.fontWeight ?? 300 }}>{act2TitleLine2}</em>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ── Act 3 — filmstrip ──────────────────────────────────────────────────
type Act3Props = ActProps & {
  focusOverride: number | null;
  onFocusClick: (i: number) => void;
};

function Act3Filmstrip({ props, T, s, safe, focusOverride, onFocusClick }: Act3Props) {
  const { time: t } = useTimeline();
  const { products, colors, brand } = props;
  const { w, h, wh, W, H } = s;
  const currency = useCurrencyForLocale();

  const cycleStart = T(4.3);
  const perProduct = T(0.55);
  const autoIdx = Math.floor(
    clamp((t - cycleStart) / perProduct, 0, products.length - 0.01),
  );
  const focusIdx = focusOverride != null ? focusOverride : autoIdx;

  const stripIn = interpolate([T(4.2), T(4.7)], [0, 1], Easing.easeOutExpo)(t);
  const stripOut = interpolate([T(7.0), T(7.4)], [1, 0], Easing.easeInCubic)(t);
  const stripOpacity = stripIn * stripOut;

  if (stripOpacity <= 0) return null;

  const heroW = w(720);
  const heroH = h(1080);
  const heroX = (W - heroW) / 2;
  const heroY = (H - heroH) / 2 - h(60);

  const product = products[focusIdx];
  if (!product) return null;
  const countLabel = `0${focusIdx + 1} / ${String(products.length).padStart(2, '0')}`;

  return (
    <div style={{ opacity: stripOpacity }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: product.src ? `url(${product.src})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) brightness(0.35) saturate(1.2)',
          transform: 'scale(1.2)',
          transition: 'background-image 0.3s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.2) 40%, rgba(10,10,10,0.85) 100%)',
        }}
      />

      <div
        key={product.id}
        style={{
          position: 'absolute',
          left: heroX,
          top: heroY,
          width: heroW,
          height: heroH,
          overflow: 'hidden',
          boxShadow: `0 ${wh(40)}px ${wh(120)}px rgba(0,0,0,0.7)`,
          animation: 'heroIn 0.45s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {product.src ? (
          <img
            src={product.src}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(180deg, ${colors.accentDark}, ${colors.background})`,
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            left: wh(28),
            bottom: wh(28),
            padding: `${wh(18)}px ${wh(24)}px`,
            background: 'rgba(245,243,239,0.95)',
            minWidth: wh(320),
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: wh(20),
              letterSpacing: `${wh(3)}px`,
              color: colors.accentDark,
              textTransform: 'uppercase',
              marginBottom: wh(10),
            }}
          >
            {brand} · {product.color}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: wh(34),
              lineHeight: 1.1,
              color: '#1A1A1A',
              letterSpacing: '-0.01em',
              marginBottom: wh(10),
            }}
          >
            {product.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-numeric)',
              fontWeight: 700,
              fontSize: wh(28),
              color: '#1A1A1A',
            }}
          >
            {composePrice(product.price, currency)}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          // Filmstrip thumbnails are tappable — keep them above the
          // bottom safe zone so the IG caption doesn't block interaction.
          bottom: Math.max(h(140), safe.bottom + h(20)),
          display: 'flex',
          justifyContent: 'center',
          gap: wh(10),
          padding: `0 ${w(40)}px`,
        }}
      >
        {products.map((p, i) => {
          const isActive = i === focusIdx;
          return (
            <div
              key={p.id}
              onClick={(e) => {
                e.stopPropagation();
                onFocusClick(i);
              }}
              style={{
                width: isActive ? wh(110) : wh(90),
                height: isActive ? wh(150) : wh(124),
                overflow: 'hidden',
                border: isActive
                  ? `2px solid ${colors.accent}`
                  : '2px solid rgba(245,243,239,0.25)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(.2,.8,.2,1)',
                transform: isActive ? `translateY(${-wh(6)}px)` : 'translateY(0)',
                boxShadow: isActive
                  ? `0 ${wh(10)}px ${wh(30)}px rgba(0,0,0,0.5)`
                  : 'none',
              }}
            >
              {p.src ? (
                <img
                  src={p.src}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: isActive ? 'none' : 'brightness(0.65)',
                    transition: 'filter 0.25s',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: colors.accentDark,
                    opacity: isActive ? 1 : 0.65,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(100),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `0 ${w(60)}px`,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: wh(34),
            color: colors.paper,
            letterSpacing: '-0.01em',
          }}
        >
          {props.boutiqueName}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: wh(22),
            letterSpacing: `${wh(3)}px`,
            color: colors.accent,
            textTransform: 'uppercase',
          }}
        >
          {countLabel}
        </div>
      </div>
    </div>
  );
}

// ── Act 4 — outro ──────────────────────────────────────────────────────
function Act4Outro({ props, T, s, safe }: ActProps) {
  const { time: t } = useTimeline();
  const {
    colors,
    outroKicker,
    boutiqueName,
    boutiqueTagline,
    ctaText,
    ctaFooter,
    logo,
  } = props;
  const logoColor = useFieldColor('logo', colors.paper);
  const { w, h, wh, W, H } = s;

  const outroKickerStyle = useFieldFormat('outroKicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: `${wh(8)}px`,
    color: colors.accent,
    textTransform: 'uppercase',
  });
  const ctaFooterStyle = useFieldFormat('ctaFooter', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: `${wh(3)}px`,
    color: 'rgba(245,243,239,0.5)',
    textTransform: 'uppercase',
  });

  const ctaTextStyle = useFieldFormat('ctaText', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 700,
    letterSpacing: `${wh(5)}px`,
    textTransform: 'uppercase',
    color: colors.background,
  });
  const boutiqueTaglineStyle = useFieldFormat('boutiqueTagline', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(36),
    fontWeight: 300,
    letterSpacing: '0.01em',
    color: 'rgba(245,243,239,0.72)',
  });

  if (t < T(7.0)) return null;

  const wipeT = interpolate([T(7.0), T(7.5)], [0, 1], Easing.easeInOutCubic)(t);
  const wipeOutT = interpolate([T(7.5), T(8.0)], [0, 1], Easing.easeInOutCubic)(t);
  const wordmarkOp = interpolate([T(7.7), T(8.2)], [0, 1], Easing.easeOutCubic)(t);
  const wordmarkY = interpolate([T(7.7), T(8.2)], [wh(20), 0], Easing.easeOutCubic)(t);
  const tagOp = interpolate([T(8.0), T(8.4)], [0, 1], Easing.easeOutCubic)(t);
  const ctaOp = interpolate([T(8.3), T(8.7)], [0, 1], Easing.easeOutCubic)(t);
  const ctaY = interpolate([T(8.3), T(8.7)], [wh(16), 0], Easing.easeOutCubic)(t);
  const underT = interpolate([T(8.6), T(9.2)], [0, 1], Easing.easeInOutCubic)(t);

  const slashTranslate = Math.max(W, H) * 2;
  const slash1X = (1 - wipeT) * -slashTranslate + wipeOutT * slashTranslate;
  const slash2X = (1 - wipeT) * slashTranslate + wipeOutT * -slashTranslate;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.background,
          opacity: wipeT,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(196,147,115,0.14), transparent 60%)',
          opacity: wipeT * (1 - wipeOutT * 0.3),
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: slashTranslate,
          height: slashTranslate * 1.2,
          background: `linear-gradient(90deg, transparent 0%, ${colors.accentDark} 40%, ${colors.accent} 50%, ${colors.accentDark} 60%, transparent 100%)`,
          transformOrigin: 'top left',
          transform: `translate(${slash1X}px, ${-h(400)}px) rotate(18deg)`,
          opacity: 1 - wipeOutT,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: slashTranslate,
          height: slashTranslate * 1.2,
          background:
            'linear-gradient(90deg, transparent 0%, #7A5238 40%, #9C6B48 50%, #7A5238 60%, transparent 100%)',
          transformOrigin: 'top right',
          transform: `translate(${slash2X}px, ${-h(400)}px) rotate(-18deg)`,
          opacity: 1 - wipeOutT,
        }}
      />

      {wipeT > 0.9 && (
        <div
          style={{
            position: 'absolute',
            left: w(80),
            right: w(80),
            top: h(220),
            bottom: h(220),
            border: `1px solid rgba(196,147,115,0.3)`,
            opacity: wordmarkOp,
          }}
        />
      )}

      {/* Lockup: kicker, then either logo (if set) or wordmark text */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(640),
          textAlign: 'center',
          opacity: wordmarkOp,
          transform: `translateY(${wordmarkY}px)`,
        }}
      >
        <div
          style={{
            marginBottom: wh(40),
            ...outroKickerStyle,
          }}
        >
          {outroKicker}
        </div>

        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={logoColor}
          width={w(720)}
          height={h(360)}
          fontSize={wh(180)}
          shadow="0 4px 24px rgba(0,0,0,0.4)"
        />

        <div
          style={{
            marginTop: wh(28),
            ...boutiqueTaglineStyle,
            opacity: (boutiqueTaglineStyle.opacity ?? 1) * tagOp,
          }}
        >
          {boutiqueTagline}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          // CTA anchored to the bottom safe zone so it clears the IG
          // caption area while staying below the outro wordmark block.
          bottom: Math.max(h(260), safe.bottom + h(60)),
          textAlign: 'center',
          opacity: ctaOp,
          transform: `translateY(${ctaY}px)`,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert('Tapping through to boutique…');
          }}
          style={{
            background: colors.accent,
            border: 0,
            padding: `${wh(32)}px ${wh(80)}px`,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            ...ctaTextStyle,
          }}
        >
          {ctaText}
          <span
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              height: wh(3),
              width: `${underT * 100}%`,
              background: colors.paper,
            }}
          />
        </button>

        <div style={{ marginTop: wh(30), ...ctaFooterStyle }}>
          {ctaFooter}
        </div>
      </div>
    </>
  );
}

// ── Root scene ─────────────────────────────────────────────────────────
export function LookbookScene({
  props,
  timeScale = 1,
  width = BASE_W,
  height = BASE_H,
}: SceneProps) {
  const { time, duration, compositionStartSec } = useTimeline();
  const T = (x: number) => x * timeScale;
  const s = makeScale(width, height);
  const { w, h, wh } = s;
  const { base: safe } = useSafeZone({ width, height });

  const { colors, watermark } = props;
  const watermarkStyle = useFieldFormat('watermark', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(34),
    fontWeight: 300,
    letterSpacing: '-0.01em',
    color: 'rgba(245,243,239,0.85)',
  });
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [tapMark, setTapMark] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (time < T(4.2) || time > T(7.2)) setFocusIdx(null);
  }, [time, timeScale]);

  const onCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = width / rect.width;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sx;
    setTapMark({ x, y });
    setTimeout(() => setTapMark(null), 700);
  };

  return (
    <div
      onClick={onCanvasClick}
      style={{
        position: 'absolute',
        inset: 0,
        background: colors.background,
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes heroIn {
          from { transform: scale(1.04) translateX(14px); opacity: 0.4; }
          to { transform: scale(1) translateX(0); opacity: 1; }
        }
        @keyframes tapRipple {
          from { transform: translate(-50%,-50%) scale(0.2); opacity: 0.8; }
          to { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
      `}</style>

      <Act1Title props={props} T={T} s={s} safe={safe} />
      <Act2Columns props={props} T={T} s={s} safe={safe} />
      <Act3Filmstrip
        props={props}
        T={T}
        s={s}
        safe={safe}
        focusOverride={focusIdx}
        onFocusClick={(i) => setFocusIdx(i)}
      />
      <Act4Outro props={props} T={T} s={s} safe={safe} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.35) 100%)',
          mixBlendMode: 'multiply',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: w(40),
          right: w(40),
          top: h(48),
          height: wh(2),
          background: 'rgba(245,243,239,0.12)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamp((time - compositionStartSec) / duration, 0, 1) * 100}%`,
            background: colors.accent,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {watermark && time >= T(2.0) && time < T(7.0) && (
        <div
          style={{
            position: 'absolute',
            left: w(60),
            bottom: h(60),
            pointerEvents: 'none',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            ...watermarkStyle,
          }}
        >
          {watermark}
        </div>
      )}

      {tapMark && (
        <div
          style={{
            position: 'absolute',
            left: tapMark.x,
            top: tapMark.y,
            width: wh(80),
            height: wh(80),
            borderRadius: '50%',
            border: `2px solid ${colors.accent}`,
            pointerEvents: 'none',
            animation: 'tapRipple 700ms cubic-bezier(.2,.8,.2,1) forwards',
          }}
        />
      )}
    </div>
  );
}
