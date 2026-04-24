import {
  Easing,
  clamp,
  interpolate,
  useTimeline,
  useSafeZone,
  useFieldColor,
  useFieldFormat,
} from '../../engine';
import type { EditorialProps } from './schema';
import { BoutiqueLogo } from '../BoutiqueLogo';

// Editorial — magazine-style masthead → 2×2 product grid → feature
// zoom → editor signature. Always-safe regime; composes against the
// content rect. See SAFE_ZONE_PATTERNS.md.
//
// Key lessons baked in (from Hero UX pass + Editorial UX pass):
// - Masthead chrome (rules + VOL / DATE row) was previously pinned to
//   h(160..230) and sat inside IG's 250-px top chrome on 9:16 — so
//   "VOLUME XII · AUTUMN 2026" was literally invisible on a phone.
//   Now anchored to contentTop.
// - Grid's running header had the same bug — same fix.
// - The 2×2 grid block is derived from the content rect, not a fixed
//   cellH * 2 formula. On 9:16 the cells stay roughly 1.31 aspect
//   (close to the designer's 1.35); on 4:5 they become near-square
//   so all 4 plates remain fully visible (previously the bottom row
//   was clipped by IG's bottom caption strip).

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
  safe: { top: number; bottom: number; left: number; right: number };
  /** Content-rect anchors in output pixels. See SAFE_ZONE_PATTERNS.md. */
  contentTop: number;
  contentBottom: number;
  contentLeft: number;
  contentRight: number;
  contentCX: number;
};

// ── Act 1 — Masthead & headline ────────────────────────────────────────
function Masthead({ props, T, s, safe, contentTop }: ActProps) {
  const { time: t } = useTimeline();
  const { masthead, issueDate, headlineLine1, headlineLine2, byline, colors } = props;
  const { w, h, wh } = s;
  // All horizontal anchors respect safe.left/right so nothing extends
  // into the 9:16 like-stack column (safe.right = 120 base-px).
  const sideInsetL = safe.left + w(80);
  const sideInsetR = safe.right + w(80);

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

  const ruleT = interpolate([T(0.1), T(0.7)], [0, 1], Easing.easeOutExpo)(t);
  const bottomRuleT = interpolate([T(0.3), T(0.9)], [0, 1], Easing.easeOutExpo)(t);

  const mastheadOp = interpolate([T(0.4), T(0.9), T(1.7), T(2.0)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);
  const headlineOp = interpolate([T(0.6), T(1.1), T(1.7), T(2.0)], [0, 1, 1, 0], Easing.easeInOutCubic)(t);
  const headlineY = interpolate([T(0.6), T(1.1)], [wh(20), 0], Easing.easeOutCubic)(t);

  // Masthead chrome anchored inside the content rect. Previously pinned
  // to h(160..230), which sat under IG's top chrome on 9:16.
  const ruleTop = contentTop + h(30);
  const mastheadRowTop = contentTop + h(60);
  const bottomRuleTop = contentTop + h(100);

  return (
    <>
      {/* Top rule */}
      <div
        style={{
          position: 'absolute',
          left: sideInsetL,
          right: sideInsetR,
          top: ruleTop,
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
          left: sideInsetL,
          right: sideInsetR,
          top: mastheadRowTop,
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
          left: sideInsetL,
          right: sideInsetR,
          top: bottomRuleTop,
          height: 1,
          background: colors.rule,
          transform: `scaleX(${bottomRuleT})`,
          transformOrigin: 'right',
        }}
      />

      {/* Headline stack — centered vertically at ~38% of canvas; its
       *  h(720) base position lands inside safe on both aspects. */}
      <div
        style={{
          position: 'absolute',
          left: sideInsetL,
          right: sideInsetR,
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
function Grid({ props, T, s, safe, contentTop, contentBottom, contentLeft, contentRight, contentCX }: ActProps) {
  const { time: t } = useTimeline();
  const { products, colors } = props;
  const { w, h, wh } = s;

  const gridIn = interpolate([T(1.8), T(2.4)], [0, 1], Easing.easeOutExpo)(t);
  const gridOut = interpolate([T(5.2), T(5.6)], [1, 0], Easing.easeInCubic)(t);
  const op = gridIn * gridOut;
  if (op <= 0) return null;

  // Grid block fitted to the content rect on all four edges. Previously
  // cellH was derived from cellW * 1.35 regardless of canvas height
  // (block 1181 base-px tall, overflowed the 1030-tall 4:5 safe window)
  // AND `outerMargin = w(100)` was symmetric, ignoring safe.right on
  // 9:16 (the right column bled 20 base-px into the IG like-stack).
  // Both axes now respect the content rect.
  const sideInsetL = safe.left + w(80);
  const sideInsetR = safe.right + w(80);
  const headerBandH = h(120);   // running header + breathing room
  const footerBandH = h(120);   // rule + category strip + breathing room
  const blockTop = contentTop + headerBandH;
  const blockBottom = contentBottom - footerBandH;
  const blockHAvail = blockBottom - blockTop;

  const sideMargin = w(80);
  const gutter = wh(20);
  const contentW = contentRight - contentLeft;
  const blockWAvail = contentW - sideMargin * 2;
  const cellW = (blockWAvail - gutter) / 2;
  const cellH = (blockHAvail - gutter) / 2;
  const blockLeft = contentCX - (cellW * 2 + gutter) / 2;
  const blockY = blockTop;

  return (
    <>
      {/* Running header "THE EDIT · 04 · PIECES" — anchored inside
       *  the content rect on both top edge and right edge (previously
       *  at h(160), under IG chrome, AND right: w(80) bled 40 base-px
       *  into the 9:16 like-stack). */}
      <div
        style={{
          position: 'absolute',
          left: sideInsetL,
          right: sideInsetR,
          top: contentTop + h(30),
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
        const cellX = blockLeft + col * (cellW + gutter);
        const cellY = blockY + row * (cellH + gutter);

        const start = T(1.8) + i * T(0.18);
        const cellT = interpolate([start, start + T(0.5)], [0, 1], Easing.easeOutExpo)(t);
        const cellY2 = (1 - cellT) * wh(30);
        const cellOp = cellT;

        // The caption area below each product image reserves ~wh(60)
        // on the original design. Keep the same reserve so the
        // category + name line sits below the image neatly.
        const captionH = wh(60);
        const imageH = Math.max(cellH - captionH, h(40));

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
                height: imageH,
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
            {/* Caption: numeral · name */}
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

      {/* Footer rule + category strip — anchored above the visible
       *  bottom edge (content-rect pattern §2) and respects safe.right
       *  so the category labels don't run under the like-stack. */}
      <div
        style={{
          position: 'absolute',
          left: sideInsetL,
          right: sideInsetR,
          bottom: safe.bottom + h(30),
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

// ── Act 3 — Feature zoom (on product 1) ────────────────────────────────
function Feature({ props, T, s, safe, contentTop, contentBottom, contentCX }: ActProps) {
  const { time: t } = useTimeline();
  const { products, featureCaption, colors } = props;
  const { w, h, wh } = s;
  const hero = products[0];
  if (!hero) return null;

  const fadeIn = interpolate([T(5.4), T(6.0)], [0, 1], Easing.easeOutExpo)(t);
  const fadeOut = interpolate([T(7.3), T(7.6)], [1, 0], Easing.easeInCubic)(t);
  const op = fadeIn * fadeOut;
  if (op <= 0) return null;

  const zoomT = clamp((t - T(5.4)) / T(2.0), 0, 1);
  const scale = 1 + 0.08 * zoomT;

  // Image + caption composed inside the content rect. Image is
  // centered on contentCX (not canvas center) so it sits dead-centre
  // in the visible area, including on 9:16 where safe.right = 120
  // pushes the content centre 60 base-px left of canvas centre.
  const topPad = h(40);
  const captionBandH = h(260);
  const imgW = w(680);
  const imgX = contentCX - imgW / 2;
  const imgY = contentTop + topPad;
  const imgH = contentBottom - captionBandH - imgY;
  const sideInsetL = safe.left + w(120);
  const sideInsetR = safe.right + w(120);

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

      {/* Caption below — anchored to the caption band that sits just
       *  above the visible bottom edge, and respects safe.left/right. */}
      <div
        style={{
          position: 'absolute',
          left: sideInsetL,
          right: sideInsetR,
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
function Signature({ props, T, s, safe, contentTop }: ActProps) {
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
  const logoColor = useFieldColor('logo', colors.ink);
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

  // Signature stack anchored relative to the content rect top so the
  // rule + kicker + logo land proportionally on both aspects.
  const ruleTop = contentTop + h(60);
  const kickerTop = contentTop + h(120);
  const logoTop = contentTop + h(220);
  const signatureTop = contentTop + h(580);

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

      {/* Top rule — respects safe.left/right. */}
      <div
        style={{
          position: 'absolute',
          left: safe.left + w(80),
          right: safe.right + w(80),
          top: ruleTop,
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
          top: kickerTop,
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
          top: logoTop,
          textAlign: 'center',
          opacity: fadeIn,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={logoColor}
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
          top: signatureTop,
          textAlign: 'center',
          ...signatureTextStyle,
          opacity: fadeIn,
        }}
      >
        — {signatureText} —
      </div>

      {/* CTA — anchored to the visible bottom edge (content-rect §2). */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: safe.bottom + h(60),
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

  const contentTop = safe.top;
  const contentBottom = height - safe.bottom;
  const contentLeft = safe.left;
  const contentRight = width - safe.right;
  const contentCX = (contentLeft + contentRight) / 2;

  const actProps: ActProps = {
    props,
    T,
    s,
    safe,
    contentTop,
    contentBottom,
    contentLeft,
    contentRight,
    contentCX,
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: props.colors.paper,
        overflow: 'hidden',
      }}
    >
      <Masthead {...actProps} />
      <Grid {...actProps} />
      <Feature {...actProps} />
      <Signature {...actProps} />
    </div>
  );
}
