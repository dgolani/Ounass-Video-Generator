import {
  Easing,
  clamp,
  interpolate,
  useTimeline,
  useSafeZone,
  useFieldFormat,
} from '../../engine';
import type { EditorialProps } from './schema';
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
  props: EditorialProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

type ActProps = {
  props: EditorialProps;
  T: (x: number) => number;
  s: Scale;
  /** Resolved safe zone for the current aspect (output pixels). */
  safe: { top: number; bottom: number; left: number; right: number };
};

// ── Act 1 — Masthead & headline ────────────────────────────────────────
function Masthead({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { masthead, issueDate, headlineLine1, headlineLine2, byline, colors } = props;
  const { w, h, wh } = s;

  const headlineLine1Style = useFieldFormat('headlineLine1', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(132),
    fontWeight: 300,
    lineHeight: 0.95,
    letterSpacing: '-0.03em',
    color: colors.ink,
  });
  const headlineLine2Style = useFieldFormat('headlineLine2', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(132),
    fontWeight: 300,
    lineHeight: 0.95,
    letterSpacing: '-0.02em',
    color: colors.accent,
  });
  const mastheadStyle = useFieldFormat('masthead', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: `${wh(4)}px`,
    textTransform: 'uppercase',
    color: colors.ink,
  });
  const issueDateStyle = useFieldFormat('issueDate', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: `${wh(4)}px`,
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const bylineStyle = useFieldFormat('byline', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: `${wh(6)}px`,
    textTransform: 'uppercase',
    color: colors.ink,
  });

  // Top rule draws in
  const ruleT = interpolate([T(0.1), T(0.7)], [0, 1], Easing.easeOutExpo)(t);
  const bottomRuleT = interpolate([T(0.3), T(0.9)], [0, 1], Easing.easeOutExpo)(t);

  const mastheadOp = interpolate([T(0.4), T(0.9), T(1.7), T(2.0)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);
  const headlineOp = interpolate([T(0.6), T(1.1), T(1.7), T(2.0)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);
  const headlineY = interpolate([T(0.6), T(1.1)], [wh(20), 0], Easing.easeOutCubic)(t);

  return (
    <>
      {/* Top rule */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: h(160),
          height: 1,
          background: colors.rule,
          transform: `scaleX(${ruleT})`,
          transformOrigin: 'left',
        }}
      />
      {/* Masthead row: VOL · DATE */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: h(190),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          opacity: mastheadOp,
        }}
      >
        <span style={mastheadStyle}>{masthead}</span>
        <span style={issueDateStyle}>{issueDate}</span>
      </div>
      {/* Bottom rule under masthead */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: h(230),
          height: 1,
          background: colors.rule,
          transform: `scaleX(${bottomRuleT})`,
          transformOrigin: 'right',
        }}
      />

      {/* Headline stack */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: h(720),
          opacity: headlineOp,
          transform: `translateY(${headlineY}px)`,
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: wh(6), ...headlineLine1Style }}>
          {headlineLine1}
        </div>
        <div style={{ marginBottom: wh(50), ...headlineLine2Style }}>
          {headlineLine2}
        </div>
        <div style={{ ...bylineStyle, opacity: 0.68 }}>
          — {byline} —
        </div>
      </div>
    </>
  );
}

// ── Act 2 — 2×2 product grid ───────────────────────────────────────────
function Grid({ props, T, s, safe }: ActProps) {
  const { time: t } = useTimeline();
  const { products, colors } = props;
  const { w, h, wh, W, H } = s;

  const gridIn = interpolate([T(1.8), T(2.4)], [0, 1], Easing.easeOutExpo)(t);
  const gridOut = interpolate([T(5.2), T(5.6)], [1, 0], Easing.easeInCubic)(t);
  const op = gridIn * gridOut;
  if (op <= 0) return null;

  // 2×2 layout — centered block within safe margins
  const outerMargin = w(100);
  const gutter = wh(20);
  const cellW = (W - outerMargin * 2 - gutter) / 2;
  const cellH = cellW * 1.35;
  const blockH = cellH * 2 + gutter;
  const blockY = (H - blockH) / 2 + h(60);

  return (
    <>
      {/* Running header "THE EDIT N°01" */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: h(160),
          display: 'flex',
          justifyContent: 'space-between',
          opacity: op * 0.8,
          fontFamily: 'var(--font-body)',
          fontSize: wh(22),
          fontWeight: 700,
          letterSpacing: `${wh(3)}px`,
          textTransform: 'uppercase',
          color: colors.ink,
        }}
      >
        <span>The Edit</span>
        <span>04 · Pieces</span>
      </div>

      {products.slice(0, 4).map((p, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const cellX = outerMargin + col * (cellW + gutter);
        const cellY = blockY + row * (cellH + gutter);

        // Stagger reveal: each cell fades + slides up in turn
        const start = T(1.8) + i * T(0.18);
        const cellT = interpolate([start, start + T(0.5)], [0, 1], Easing.easeOutExpo)(t);
        const cellY2 = (1 - cellT) * wh(30);
        const cellOp = cellT;

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: cellX,
              top: cellY,
              width: cellW,
              height: cellH,
              opacity: op * cellOp,
              transform: `translateY(${cellY2}px)`,
            }}
          >
            {/* Image */}
            <div
              style={{
                width: '100%',
                height: cellH - wh(60),
                overflow: 'hidden',
                background: colors.rule,
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
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(180deg, ${colors.accent}, ${colors.ink})`,
                  }}
                />
              )}
            </div>
            {/* Caption: category · numeral · name */}
            <div
              style={{
                marginTop: wh(10),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: wh(16),
                  letterSpacing: `${wh(2)}px`,
                  textTransform: 'uppercase',
                  color: colors.accent,
                }}
              >
                0{i + 1}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontWeight: 300,
                  fontSize: wh(22),
                  color: colors.ink,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '75%',
                }}
              >
                {p.name}
              </span>
            </div>
          </div>
        );
      })}

      {/* Footer rule + category strip — above the bottom safe zone so
       *  the IG caption doesn't hide the category labels. */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          bottom: Math.max(h(140), safe.bottom + h(20)),
          opacity: op,
        }}
      >
        <div style={{ height: 1, background: colors.rule, marginBottom: wh(16) }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-body)',
            fontSize: wh(20),
            fontWeight: 700,
            letterSpacing: `${wh(2.5)}px`,
            textTransform: 'uppercase',
            color: colors.ink,
          }}
        >
          {products.slice(0, 4).map((p) => (
            <span key={p.id}>{p.category}</span>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Act 3 — Feature zoom (on product 01) ───────────────────────────────
function Feature({ props, T, s, safe: _safe }: ActProps) {
  const { time: t } = useTimeline();
  const { products, featureCaption, colors } = props;
  const { w, h, wh, W } = s;
  const hero = products[0];
  if (!hero) return null;

  const fadeIn = interpolate([T(5.4), T(6.0)], [0, 1], Easing.easeOutExpo)(t);
  const fadeOut = interpolate([T(7.3), T(7.6)], [1, 0], Easing.easeInCubic)(t);
  const op = fadeIn * fadeOut;
  if (op <= 0) return null;

  // Slow Ken-Burns zoom
  const zoomT = clamp((t - T(5.4)) / T(2.0), 0, 1);
  const scale = 1 + 0.08 * zoomT;

  const imgW = w(680);
  const imgH = h(1020);
  const imgX = (W - imgW) / 2;
  const imgY = h(280);

  return (
    <div style={{ opacity: op }}>
      {/* Softly coloured paper backdrop covering earlier act */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.paper,
        }}
      />

      {/* Image */}
      <div
        style={{
          position: 'absolute',
          left: imgX,
          top: imgY,
          width: imgW,
          height: imgH,
          overflow: 'hidden',
        }}
      >
        {hero.src ? (
          <img
            src={hero.src}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              transition: 'transform 0.1s linear',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(180deg, ${colors.accent}, ${colors.ink})`,
            }}
          />
        )}
      </div>

      {/* Caption below */}
      <div
        style={{
          position: 'absolute',
          left: w(120),
          right: w(120),
          top: imgY + imgH + h(40),
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: wh(22),
            letterSpacing: `${wh(3)}px`,
            textTransform: 'uppercase',
            color: colors.accent,
            marginBottom: wh(18),
          }}
        >
          N° 01 — {hero.category}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: wh(34),
            lineHeight: 1.35,
            color: colors.ink,
            opacity: 0.9,
          }}
        >
          "{featureCaption}"
        </div>
      </div>
    </div>
  );
}

// ── Act 4 — Signature sign-off ─────────────────────────────────────────
function Signature({ props, T, s, safe }: ActProps) {
  const { time: t } = useTimeline();
  const {
    closingKicker,
    signatureText,
    boutiqueName,
    ctaText,
    ctaFooter,
    logo,
    colors,
  } = props;
  const { w, h, wh } = s;

  const ctaTextStyle = useFieldFormat('ctaText', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: `${wh(4)}px`,
    textTransform: 'uppercase',
    color: colors.paper,
  });
  const closingKickerStyle = useFieldFormat('closingKicker', {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: wh(22),
    letterSpacing: `${wh(5)}px`,
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const signatureTextStyle = useFieldFormat('signatureText', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(38),
    color: colors.accent,
  });
  const ctaFooterStyle = useFieldFormat('ctaFooter', {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: wh(22),
    letterSpacing: `${wh(2.5)}px`,
    textTransform: 'uppercase',
    color: colors.ink,
  });

  if (t < T(7.4)) return null;

  const fadeIn = interpolate([T(7.4), T(8.0)], [0, 1], Easing.easeOutExpo)(t);
  const ctaIn = interpolate([T(8.1), T(8.6)], [0, 1], Easing.easeOutCubic)(t);
  const underT = interpolate([T(8.5), T(9.1)], [0, 1], Easing.easeInOutCubic)(t);

  return (
    <>
      {/* Paper backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.paper,
          opacity: fadeIn,
        }}
      />

      {/* Top rule */}
      <div
        style={{
          position: 'absolute',
          left: w(80),
          right: w(80),
          top: h(300),
          height: 1,
          background: colors.rule,
          opacity: fadeIn,
        }}
      />

      {/* Kicker */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(360),
          textAlign: 'center',
          ...closingKickerStyle,
          opacity: fadeIn,
        }}
      >
        {closingKicker}
      </div>

      {/* Boutique name / logo */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(460),
          textAlign: 'center',
          opacity: fadeIn,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={colors.ink}
          width={w(700)}
          height={h(280)}
          fontSize={wh(180)}
        />
      </div>

      {/* Signature scroll */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(820),
          textAlign: 'center',
          ...signatureTextStyle,
          opacity: fadeIn,
        }}
      >
        — {signatureText} —
      </div>

      {/* CTA — anchored above the bottom safe zone so the "read more"
       *  button stays clear of the IG caption area. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Math.max(h(260), safe.bottom + h(60)),
          textAlign: 'center',
          opacity: ctaIn,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert('Tapping through…');
          }}
          style={{
            background: colors.ink,
            border: 0,
            padding: `${wh(32)}px ${wh(76)}px`,
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
              height: wh(2),
              width: `${underT * 100}%`,
              background: colors.accent,
            }}
          />
        </button>
        <div style={{ marginTop: wh(24), ...ctaFooterStyle, opacity: 0.55 }}>
          {ctaFooter}
        </div>
      </div>
    </>
  );
}

// ── Root scene ─────────────────────────────────────────────────────────
export function EditorialScene({
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
        background: props.colors.paper,
        overflow: 'hidden',
      }}
    >
      <Masthead props={props} T={T} s={s} safe={safe} />
      <Grid props={props} T={T} s={s} safe={safe} />
      <Feature props={props} T={T} s={s} safe={safe} />
      <Signature props={props} T={T} s={s} safe={safe} />
    </div>
  );
}
