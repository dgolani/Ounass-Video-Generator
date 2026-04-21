import {
  Easing,
  clamp,
  interpolate,
  useTimeline,
  useSafeZone,
  useFieldFormat,
} from '../../engine';
import { composePrice, useCurrencyForLocale } from '../../lib/price';
import type { HeroProps } from './schema';
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
  props: HeroProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

type ActProps = {
  props: HeroProps;
  T: (x: number) => number;
  s: Scale;
  /** Resolved safe zone for the current aspect (output pixels). */
  safe: { top: number; bottom: number; left: number; right: number };
};

// ── Background hero (persistent, Ken-Burns across the full duration) ──
function HeroImage({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { product, colors } = props;
  const { W, H } = s;

  const fadeIn = interpolate([T(0.0), T(1.2)], [0, 1], Easing.easeOutExpo)(t);
  // Slow Ken-Burns: scale from 1.04 → 1.14 across the whole runtime
  const fullDuration = T(8.0);
  const zoom = 1.04 + 0.10 * clamp(t / fullDuration, 0, 1);

  // Dimming curve: bright during reveal, dim during copy/cta so text reads
  const dim = interpolate(
    [T(0), T(2.0), T(5.0), T(8.0)],
    [1, 1, 0.55, 0.4],
    Easing.easeInOutCubic,
  )(t);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: fadeIn,
      }}
    >
      {product.image ? (
        <img
          src={product.image}
          alt=""
          style={{
            width: W,
            height: H,
            objectFit: 'cover',
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'transform 0.1s linear',
            filter: `brightness(${dim.toFixed(3)}) saturate(1.05)`,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(180deg, ${colors.accentDark}, ${colors.background})`,
            filter: `brightness(${dim.toFixed(3)})`,
          }}
        />
      )}
      {/* Persistent bottom gradient for legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(10,8,6,0.1) 0%, rgba(10,8,6,0.0) 30%, rgba(10,8,6,0.55) 70%, rgba(10,8,6,0.9) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

// ── Act 1 — Reveal (pre-title + thin rule) ─────────────────────────────
function Reveal({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { preTitle, colors } = props;
  const { w, h, wh } = s;

  const preTitleStyle = useFieldFormat('preTitle', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: `${wh(8)}px`,
    textTransform: 'uppercase',
    color: colors.accent,
  });

  const kickerOp = interpolate([T(0.6), T(1.2), T(2.0), T(2.3)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);
  const ruleT = interpolate([T(0.2), T(1.4)], [0, 1], Easing.easeOutExpo)(t);
  const ruleOp = interpolate([T(0.2), T(1.4), T(2.0), T(2.3)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);

  return (
    <>
      {/* Top hairline */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: h(160),
          height: 1,
          background: colors.paper,
          opacity: ruleOp * 0.5,
          transform: `scaleX(${ruleT})`,
          transformOrigin: 'center',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(200),
          textAlign: 'center',
          ...preTitleStyle,
          opacity: (preTitleStyle.opacity ?? 1) * kickerOp,
        }}
      >
        {preTitle}
      </div>
    </>
  );
}

// ── Act 2 — Copy lockup ────────────────────────────────────────────────
function Copy({ props, T, s, safe }: ActProps) {
  const { time: t } = useTimeline();
  const { headlineLine1, headlineLine2, subhead, product, colors } = props;
  const { w, h, wh, H } = s;
  const currency = useCurrencyForLocale();

  const headlineLine1Style = useFieldFormat('headlineLine1', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(140),
    fontWeight: 300,
    lineHeight: 0.95,
    letterSpacing: '-0.03em',
    color: colors.paper,
  });
  const headlineLine2Style = useFieldFormat('headlineLine2', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(140),
    fontWeight: 300,
    lineHeight: 0.95,
    letterSpacing: '-0.02em',
    color: colors.accent,
  });
  const subheadStyle = useFieldFormat('subhead', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(34),
    fontWeight: 300,
    color: colors.paper,
  });

  if (t < T(2.0) || t > T(5.2)) return null;

  const fadeIn = interpolate([T(2.0), T(2.6)], [0, 1], Easing.easeOutExpo)(t);
  const fadeOut = interpolate([T(4.8), T(5.2)], [1, 0], Easing.easeInCubic)(t);
  const line1Y = interpolate([T(2.0), T(2.6)], [wh(24), 0], Easing.easeOutCubic)(t);
  const line2In = interpolate([T(2.3), T(2.9)], [0, 1], Easing.easeOutExpo)(t);
  const line2Y = interpolate([T(2.3), T(2.9)], [wh(24), 0], Easing.easeOutCubic)(t);
  const subIn = interpolate([T(2.8), T(3.4)], [0, 1], Easing.easeOutCubic)(t);
  const productIn = interpolate([T(3.4), T(4.0)], [0, 1], Easing.easeOutCubic)(t);

  const op = fadeIn * fadeOut;

  return (
    <div style={{ opacity: op }}>
      {/* Two-line headline */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: H * 0.38,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            textShadow: '0 4px 24px rgba(0,0,0,0.5)',
            ...headlineLine1Style,
            transform: `translateY(${line1Y}px)`,
          }}
        >
          {headlineLine1}
        </div>
        <div
          style={{
            textShadow: '0 4px 24px rgba(0,0,0,0.5)',
            ...headlineLine2Style,
            opacity: (headlineLine2Style.opacity ?? 1) * line2In,
            transform: `translateY(${line2Y}px)`,
          }}
        >
          {headlineLine2}
        </div>
      </div>

      {/* Subhead */}
      <div
        style={{
          position: 'absolute',
          left: w(100),
          right: w(100),
          top: H * 0.58,
          textAlign: 'center',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          ...subheadStyle,
          opacity: (subheadStyle.opacity ?? 1) * subIn,
        }}
      >
        {subhead}
      </div>

      {/* Product tag overlay — bottom left, above the bottom safe zone
       *  so the accent-bordered tag stays readable over the IG caption. */}
      <div
        style={{
          position: 'absolute',
          left: Math.max(w(80), safe.left),
          bottom: Math.max(h(320), safe.bottom + h(60)),
          opacity: productIn,
          padding: `${wh(18)}px ${wh(24)}px`,
          background: 'rgba(10,8,6,0.6)',
          backdropFilter: 'blur(6px)',
          borderLeft: `3px solid ${colors.accent}`,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: wh(20),
            letterSpacing: `${wh(3)}px`,
            textTransform: 'uppercase',
            color: colors.accent,
            marginBottom: wh(8),
          }}
        >
          {product.category}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            fontSize: wh(36),
            lineHeight: 1.1,
            color: colors.paper,
            marginBottom: wh(8),
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-numeric)',
            fontWeight: 700,
            fontSize: wh(26),
            color: colors.paper,
          }}
        >
          {composePrice(product.price, currency)}
        </div>
      </div>
    </div>
  );
}

// ── Act 3 — CTA ────────────────────────────────────────────────────────
function CTA({ props, T, s, safe }: ActProps) {
  const { time: t } = useTimeline();
  const { boutiqueName, ctaText, ctaFooter, logo, colors } = props;
  const { w, h, wh } = s;

  const ctaTextStyle = useFieldFormat('ctaText', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: `${wh(4)}px`,
    textTransform: 'uppercase',
    color: colors.paper,
  });
  const ctaFooterStyle = useFieldFormat('ctaFooter', {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: wh(22),
    letterSpacing: `${wh(3)}px`,
    textTransform: 'uppercase',
    color: colors.paper,
  });

  if (t < T(5.0)) return null;

  const fadeIn = interpolate([T(5.0), T(5.6)], [0, 1], Easing.easeOutExpo)(t);
  const lockY = interpolate([T(5.2), T(5.8)], [wh(20), 0], Easing.easeOutCubic)(t);
  const ctaOp = interpolate([T(5.8), T(6.4)], [0, 1], Easing.easeOutCubic)(t);
  const ctaY = interpolate([T(5.8), T(6.4)], [wh(16), 0], Easing.easeOutCubic)(t);
  const underT = interpolate([T(6.3), T(7.0)], [0, 1], Easing.easeInOutCubic)(t);

  return (
    <>
      {/* Lockup */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(520),
          textAlign: 'center',
          opacity: fadeIn,
          transform: `translateY(${lockY}px)`,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={colors.paper}
          width={w(680)}
          height={h(280)}
          fontSize={wh(160)}
          shadow="0 4px 24px rgba(0,0,0,0.5)"
        />
      </div>

      {/* CTA — above the bottom safe zone so the primary tap-through
       *  button and its footer line stay clear of the IG caption. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Math.max(h(300), safe.bottom + h(60)),
          textAlign: 'center',
          opacity: ctaOp,
          transform: `translateY(${ctaY}px)`,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert('Tapping through…');
          }}
          style={{
            background: colors.accent,
            border: 0,
            padding: `${wh(32)}px ${wh(80)}px`,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            ...ctaTextStyle,
            color: ctaTextStyle.color ?? colors.background,
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
        <div style={{ marginTop: wh(26), ...ctaFooterStyle, opacity: 0.6 }}>
          {ctaFooter}
        </div>
      </div>
    </>
  );
}

// ── Root scene ─────────────────────────────────────────────────────────
export function HeroScene({
  props,
  timeScale = 1,
  width = BASE_W,
  height = BASE_H,
}: SceneProps) {
  const T = (x: number) => x * timeScale;
  const s = makeScale(width, height);
  const { base: safe } = useSafeZone({ width, height });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: props.colors.background,
        overflow: 'hidden',
      }}
    >
      <HeroImage props={props} T={T} s={s} safe={safe} />
      <Reveal props={props} T={T} s={s} safe={safe} />
      <Copy props={props} T={T} s={s} safe={safe} />
      <CTA props={props} T={T} s={s} safe={safe} />
    </div>
  );
}
