import { useEffect, useState } from 'react';
import {
  Easing,
  animate,
  clamp,
  interpolate,
  useTimeline,
} from '../../engine';
import type { PhillipLimProps } from './schema';

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
  props: PhillipLimProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

type ActProps = {
  props: PhillipLimProps;
  T: (x: number) => number;
  s: Scale;
};

// ── Act 1 — title whisper over darkness ────────────────────────────────
function Act1Title({ props, T, s }: ActProps) {
  const { time: t } = useTimeline();
  const { colors, kicker, brand, tagline } = props;
  const { h, wh } = s;

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
          color: colors.accent,
          fontFamily: 'Nunito Sans, sans-serif',
          fontWeight: 700,
          fontSize: wh(18),
          letterSpacing: `${wh(6)}px`,
          textTransform: 'uppercase',
          opacity: subOpacity,
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
          color: colors.paper,
          fontFamily: 'Fraunces, serif',
          fontWeight: 300,
          fontSize: wh(96),
          letterSpacing: '-0.02em',
          lineHeight: 1,
          opacity: titleOpacity,
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
          color: 'rgba(245,243,239,0.6)',
          fontFamily: 'Fraunces, serif',
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: wh(32),
          letterSpacing: '0.01em',
          opacity: subOpacity,
        }}
      >
        {tagline}
      </div>
    </>
  );
}

// ── Act 2 — columns slide up ───────────────────────────────────────────
function Act2Columns({ props, T, s }: ActProps) {
  const { time: t } = useTimeline();
  const { products, colors, act2Kicker, act2TitleLine1, act2TitleLine2 } = props;
  const { h, wh, W, H } = s;
  const colW = W / products.length;

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
              <div
                style={{
                  color: colors.accent,
                  fontFamily: 'Nunito Sans, sans-serif',
                  fontWeight: 700,
                  fontSize: wh(14),
                  letterSpacing: `${wh(4)}px`,
                  textTransform: 'uppercase',
                  marginBottom: wh(10),
                }}
              >
                {act2Kicker}
              </div>
              <div
                style={{
                  color: colors.paper,
                  fontFamily: 'Fraunces, serif',
                  fontWeight: 300,
                  fontSize: wh(54),
                  letterSpacing: '-0.01em',
                  lineHeight: 1.05,
                }}
              >
                {act2TitleLine1}
                <br />
                <em style={{ fontWeight: 300 }}>{act2TitleLine2}</em>
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

function Act3Filmstrip({ props, T, s, focusOverride, onFocusClick }: Act3Props) {
  const { time: t } = useTimeline();
  const { products, colors, brand } = props;
  const { w, h, wh, W, H } = s;

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
            padding: `${wh(14)}px ${wh(20)}px`,
            background: 'rgba(245,243,239,0.95)',
            minWidth: wh(260),
          }}
        >
          <div
            style={{
              fontFamily: 'Nunito Sans, sans-serif',
              fontWeight: 700,
              fontSize: wh(10),
              letterSpacing: `${wh(2.5)}px`,
              color: colors.accentDark,
              textTransform: 'uppercase',
              marginBottom: wh(6),
            }}
          >
            {brand} · {product.color}
          </div>
          <div
            style={{
              fontFamily: 'Fraunces, serif',
              fontWeight: 300,
              fontSize: wh(24),
              lineHeight: 1.1,
              color: '#1A1A1A',
              letterSpacing: '-0.01em',
              marginBottom: wh(8),
            }}
          >
            {product.name}
          </div>
          <div
            style={{
              fontFamily: 'Nunito Sans, sans-serif',
              fontWeight: 700,
              fontSize: wh(16),
              color: '#1A1A1A',
            }}
          >
            {product.price}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: h(140),
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
            fontFamily: 'Fraunces, serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: wh(28),
            color: colors.paper,
            letterSpacing: '-0.01em',
          }}
        >
          {props.boutiqueName}
        </div>
        <div
          style={{
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700,
            fontSize: wh(11),
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
function Act4Outro({ props, T, s }: ActProps) {
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
  const { w, h, wh, W, H } = s;

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
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700,
            fontSize: wh(14),
            letterSpacing: `${wh(8)}px`,
            color: colors.accent,
            textTransform: 'uppercase',
            marginBottom: wh(40),
          }}
        >
          {outroKicker}
        </div>

        {logo ? (
          <img
            src={logo}
            alt={boutiqueName}
            style={{
              display: 'inline-block',
              maxWidth: w(720),
              maxHeight: h(360),
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.4))',
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: 'Fraunces, serif',
              fontWeight: 300,
              fontSize: wh(180),
              lineHeight: 0.9,
              color: colors.paper,
              letterSpacing: '-0.03em',
            }}
          >
            {boutiqueName}
          </div>
        )}

        <div
          style={{
            marginTop: wh(28),
            fontFamily: 'Fraunces, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: wh(30),
            color: 'rgba(245,243,239,0.72)',
            letterSpacing: '0.01em',
            opacity: tagOp,
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
          bottom: h(260),
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
            color: colors.background,
            border: 0,
            padding: `${wh(28)}px ${wh(72)}px`,
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700,
            fontSize: wh(16),
            letterSpacing: `${wh(4)}px`,
            textTransform: 'uppercase',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
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

        <div
          style={{
            marginTop: wh(28),
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700,
            fontSize: wh(11),
            letterSpacing: `${wh(3)}px`,
            color: 'rgba(245,243,239,0.5)',
            textTransform: 'uppercase',
          }}
        >
          {ctaFooter}
        </div>
      </div>
    </>
  );
}

// ── Instagram chrome ───────────────────────────────────────────────────
function InstagramChrome({ props, T, s }: ActProps) {
  const { time: t } = useTimeline();
  const { colors, igHandle, igSubtitle } = props;
  const { w, h, wh } = s;
  const op = interpolate([T(1.0), T(1.5)], [0, 1], Easing.easeOutCubic)(t);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: h(80),
          left: w(40),
          display: 'flex',
          alignItems: 'center',
          gap: wh(12),
          opacity: op * 0.9,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: wh(44),
            height: wh(44),
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.accentDark}, ${colors.paper})`,
            padding: wh(2),
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: colors.background,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Fraunces, serif',
              fontSize: wh(18),
              fontWeight: 400,
              color: colors.paper,
            }}
          >
            {igHandle.charAt(0).toUpperCase()}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: 'Nunito Sans',
              fontSize: wh(16),
              fontWeight: 700,
              color: colors.paper,
            }}
          >
            {igHandle}
          </div>
          <div
            style={{
              fontFamily: 'Nunito Sans',
              fontSize: wh(12),
              fontWeight: 400,
              color: 'rgba(245,243,239,0.7)',
            }}
          >
            {igSubtitle}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: w(40),
          bottom: h(380),
          display: 'flex',
          flexDirection: 'column',
          gap: wh(32),
          alignItems: 'center',
          opacity: op * 0.85,
          pointerEvents: 'none',
        }}
      >
        <IGIcon
          s={s}
          label="12.4K"
          path="M12 21s-7-4.35-7-10a5 5 0 019-3 5 5 0 019 3c0 5.65-7 10-7 10z"
        />
        <IGIcon
          s={s}
          label="284"
          path="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        />
        <IGIcon
          s={s}
          label="Share"
          path="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
        />
      </div>
    </>
  );
}

function IGIcon({ path, label, s }: { path: string; label: string; s: Scale }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: s.wh(6),
      }}
    >
      <svg
        width={s.wh(34)}
        height={s.wh(34)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F5F3EF"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
      <div
        style={{
          fontFamily: 'Nunito Sans',
          fontSize: s.wh(11),
          fontWeight: 700,
          color: '#F5F3EF',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Root scene ─────────────────────────────────────────────────────────
export function PhillipLimScene({
  props,
  timeScale = 1,
  width = BASE_W,
  height = BASE_H,
}: SceneProps) {
  const { time, duration } = useTimeline();
  const T = (x: number) => x * timeScale;
  const s = makeScale(width, height);
  const { w, h, wh } = s;

  const { colors, watermark } = props;
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

      <Act1Title props={props} T={T} s={s} />
      <Act2Columns props={props} T={T} s={s} />
      <Act3Filmstrip
        props={props}
        T={T}
        s={s}
        focusOverride={focusIdx}
        onFocusClick={(i) => setFocusIdx(i)}
      />
      <Act4Outro props={props} T={T} s={s} />

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
            width: `${clamp(time / duration, 0, 1) * 100}%`,
            background: colors.accent,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {time >= T(2.0) && time < T(7.0) && (
        <div
          style={{
            position: 'absolute',
            left: w(60),
            bottom: h(60),
            fontFamily: 'Fraunces, serif',
            fontWeight: 300,
            fontSize: wh(28),
            fontStyle: 'italic',
            color: 'rgba(245,243,239,0.85)',
            letterSpacing: '-0.01em',
            pointerEvents: 'none',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
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

      <InstagramChrome props={props} T={T} s={s} />
    </div>
  );
}
