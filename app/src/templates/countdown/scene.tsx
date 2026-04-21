import {
  Easing,
  interpolate,
  useTimeline,
  useSafeZone,
  useFieldFormat,
} from '../../engine';
import type { CountdownProps } from './schema';
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
  props: CountdownProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

type ActProps = {
  props: CountdownProps;
  T: (x: number) => number;
  s: Scale;
  /** Resolved safe zone for the current aspect (output pixels). */
  safe: { top: number; bottom: number; left: number; right: number };
};

// ── Accent swash ───────────────────────────────────────────────────────
// A diagonal bronze slab that sweeps in behind the type. Sits as a
// persistent background element animated per-act.
function AccentSwash({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { colors } = props;
  const { w, h, W, H } = s;

  const swashIn = interpolate([T(0.1), T(0.9)], [0, 1], Easing.easeOutExpo)(t);
  const swashShift = interpolate(
    [T(2.0), T(5.0)],
    [0, 0.3],
    Easing.easeInOutCubic,
  )(t);
  const swashOut = interpolate([T(5.0), T(6.0)], [1, 0.6], Easing.easeInOutCubic)(t);

  return (
    <div
      style={{
        position: 'absolute',
        left: -w(200),
        top: h(600) + swashShift * H * 0.2,
        width: W * 2,
        height: h(480),
        background: `linear-gradient(90deg, transparent 0%, ${colors.accentDark} 25%, ${colors.accent} 50%, ${colors.accentDark} 75%, transparent 100%)`,
        transform: `translateX(${(1 - swashIn) * -W}px) rotate(-8deg)`,
        transformOrigin: 'center',
        opacity: 0.92 * swashOut,
        filter: 'blur(0.5px)',
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Act 1 — Hook (kicker → headline slam) ──────────────────────────────
function Hook({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { kicker, headline, subhead, colors } = props;
  const { h, wh } = s;

  const kickerStyle = useFieldFormat('kicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: `${wh(8)}px`,
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const headlineStyle = useFieldFormat('headline', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(260),
    fontWeight: 300,
    lineHeight: 0.9,
    letterSpacing: '-0.04em',
    color: colors.paper,
  });
  const subheadStyle = useFieldFormat('subhead', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(42),
    fontWeight: 300,
    color: colors.paper,
  });

  const kickerOp = interpolate([T(0.2), T(0.6), T(1.7), T(2.0)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);
  const headlineOp = interpolate([T(0.5), T(0.9), T(1.9), T(2.2)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);
  const headlineScale = interpolate([T(0.5), T(0.9)], [0.82, 1], Easing.easeOutBack)(t);
  const subheadOp = interpolate([T(0.9), T(1.3), T(1.8), T(2.1)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);

  return (
    <>
      {/* Kicker */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(360),
          textAlign: 'center',
          ...kickerStyle,
          opacity: (kickerStyle.opacity ?? 1) * kickerOp,
        }}
      >
        {kicker}
      </div>

      {/* Headline slam */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(640),
          textAlign: 'center',
          transformOrigin: 'center',
          textShadow: '0 6px 40px rgba(0,0,0,0.6)',
          ...headlineStyle,
          opacity: (headlineStyle.opacity ?? 1) * headlineOp,
          transform: `scale(${headlineScale})`,
        }}
      >
        {headline}
      </div>

      {/* Subhead */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(1040),
          textAlign: 'center',
          ...subheadStyle,
          opacity: (subheadStyle.opacity ?? 1) * subheadOp,
        }}
      >
        {subhead}
      </div>
    </>
  );
}

// ── Act 2 — Body (subhead, body text, terms) ───────────────────────────
function Body({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { subhead, body, endsText, terms, accentImage, colors } = props;
  const { w, h, wh, H } = s;

  if (t < T(2.0) || t > T(5.0)) return null;

  const fadeIn = interpolate([T(2.0), T(2.5)], [0, 1], Easing.easeOutExpo)(t);
  const fadeOut = interpolate([T(4.6), T(5.0)], [1, 0], Easing.easeInCubic)(t);
  const op = fadeIn * fadeOut;

  return (
    <div style={{ opacity: op }}>
      {/* Accent image background — dim and offset behind text */}
      {accentImage && (
        <div
          style={{
            position: 'absolute',
            right: w(-60),
            top: h(200),
            width: w(620),
            height: h(920),
            opacity: 0.35,
            filter: 'saturate(1.15) contrast(1.05)',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 40%, #000 100%)',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0%, #000 40%, #000 100%)',
          }}
        >
          <img
            src={accentImage}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Ends badge */}
      <div
        style={{
          position: 'absolute',
          left: w(100),
          top: h(380),
          display: 'inline-block',
          padding: `${wh(12)}px ${wh(22)}px`,
          background: colors.accent,
          color: colors.background,
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: wh(22),
          letterSpacing: `${wh(3)}px`,
          textTransform: 'uppercase',
        }}
      >
        {endsText}
      </div>

      {/* Subhead */}
      <div
        style={{
          position: 'absolute',
          left: w(100),
          right: w(100),
          top: h(460),
          fontFamily: 'var(--font-display)',
          fontWeight: 300,
          fontSize: wh(84),
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: colors.paper,
        }}
      >
        {subhead}
      </div>

      {/* Rule */}
      <div
        style={{
          position: 'absolute',
          left: w(100),
          top: h(640),
          width: wh(60),
          height: wh(2),
          background: colors.accent,
        }}
      />

      {/* Body */}
      <div
        style={{
          position: 'absolute',
          left: w(100),
          right: w(140),
          top: h(700),
          fontFamily: 'var(--font-display)',
          fontWeight: 300,
          fontSize: wh(32),
          lineHeight: 1.45,
          color: colors.paper,
          opacity: 0.88,
        }}
      >
        {body}
      </div>

      {/* Terms bottom */}
      <div
        style={{
          position: 'absolute',
          left: w(100),
          bottom: H * 0.12,
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: wh(20),
          letterSpacing: `${wh(3)}px`,
          textTransform: 'uppercase',
          color: colors.accent,
          opacity: 0.8,
        }}
      >
        {terms}
      </div>
    </div>
  );
}

// ── Act 3 — CTA slam ───────────────────────────────────────────────────
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

  if (t < T(4.8)) return null;

  const fadeIn = interpolate([T(4.8), T(5.4)], [0, 1], Easing.easeOutExpo)(t);
  const nameIn = interpolate([T(5.2), T(5.8)], [0, 1], Easing.easeOutCubic)(t);
  const nameY = interpolate([T(5.2), T(5.8)], [wh(20), 0], Easing.easeOutCubic)(t);
  const ctaIn = interpolate([T(5.7), T(6.2)], [0, 1], Easing.easeOutCubic)(t);
  const ctaY = interpolate([T(5.7), T(6.2)], [wh(16), 0], Easing.easeOutCubic)(t);
  const underT = interpolate([T(6.1), T(6.8)], [0, 1], Easing.easeInOutCubic)(t);

  return (
    <>
      {/* Full wipe to background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.background,
          opacity: fadeIn,
        }}
      />
      {/* Accent glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${colors.accent}22, transparent 60%)`,
          opacity: fadeIn,
        }}
      />

      {/* Boutique lockup */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(680),
          textAlign: 'center',
          opacity: nameIn,
          transform: `translateY(${nameY}px)`,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={colors.paper}
          width={w(680)}
          height={h(300)}
          fontSize={wh(160)}
        />
      </div>

      {/* CTA — above the bottom safe zone so the tap-through button
       *  stays clear of the IG caption area. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Math.max(h(320), safe.bottom + h(60)),
          textAlign: 'center',
          opacity: ctaIn,
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
            padding: `${wh(34)}px ${wh(84)}px`,
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

        <div
          style={{
            marginTop: wh(26),
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: wh(22),
            letterSpacing: `${wh(3)}px`,
            textTransform: 'uppercase',
            color: colors.paper,
            opacity: 0.6,
          }}
        >
          {ctaFooter}
        </div>
      </div>
    </>
  );
}

// ── Root scene ─────────────────────────────────────────────────────────
export function CountdownScene({
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
      <AccentSwash props={props} T={T} s={s} safe={safe} />
      <Hook props={props} T={T} s={s} safe={safe} />
      <Body props={props} T={T} s={s} safe={safe} />
      <CTA props={props} T={T} s={s} safe={safe} />
    </div>
  );
}
