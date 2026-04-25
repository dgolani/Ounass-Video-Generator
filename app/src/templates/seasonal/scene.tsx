// Seasonal Campaign — SS editorial refrain + floating products + dark
// sun-lit hold. Ported from the Claude-Design HTML prototype
// `02-seasonal-campaign`. Three-word serif crossfade, ticker scrolls,
// products stagger-in then drift, final frame blooms over dark ink.
//
// Safe-zone pattern — this scene uses the **content-rect** model
// (see SAFE_ZONE_PATTERNS.md). Instead of anchoring elements to
// canvas edges with `Math.max(h(X), safe.edge + h(Y))`, we derive a
// content rect from the safe zone and compose against that rect.
// When safe=OFF, the rect collapses to the full canvas and the scene
// looks like the original design. When safe=ON, the rect shrinks into
// the safe area and the whole composition reflows coherently — no
// single element "jumps" while others stay put.

import {
  Easing,
  clamp,
  interpolate,
  useTimeline,
  useSafeZone,
  useFieldColor,
  useFieldFormat,
} from '../../engine';
import type { SeasonalProps } from './schema';
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
  props: SeasonalProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

const WORD_PER = 3.0;
const FINAL_IN = 11.5;

export function SeasonalScene({
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

  // ── Content rect (the visible "safe window" in output-px) ────────────
  // When safe enforcement is OFF, every margin is 0 → the rect collapses
  // to the full canvas and every formula below degrades gracefully to
  // the original design. When ON, every element reflows into the rect.
  const contentTop = safe.top;
  const contentBottom = height - safe.bottom;
  const contentLeft = safe.left;
  const contentRight = width - safe.right;
  const contentW = contentRight - contentLeft;
  const contentH = contentBottom - contentTop;
  // contentCX omitted deliberately — the final frame uses padded-flex
  // centring so it doesn't need a manual centre X; other templates
  // porting this pattern should add `const contentCX = (contentLeft
  // + contentRight) / 2;` when they absolute-position a centred
  // element. See SAFE_ZONE_PATTERNS.md.
  const contentCY = (contentTop + contentBottom) / 2;

  // ── Products-layer transform ────────────────────────────────────────
  // The floating products were authored at base-canvas (1080×1920) coords
  // and scale via w()/h() to the output canvas. To keep every product
  // inside the safe rect when ON — without reshuffling per-product x/y —
  // we wrap the whole layer in a uniform scale-and-center transform that
  // fits the base canvas into the content rect. On OFF the scale is 1
  // and the translate is 0 (identity). On ON 9:16 the products shrink
  // ~29 % to clear the top/bottom/right safe strips coherently.
  const productLayerScale = Math.min(contentW / width, contentH / height);
  const productLayerW = width * productLayerScale;
  const productLayerH = height * productLayerScale;
  const productLayerX = contentLeft + (contentW - productLayerW) / 2;
  const productLayerY = contentTop + (contentH - productLayerH) / 2;

  // Destructure brand-driven props BEFORE the format hooks so the hook
  // bases reference live brand colors (accent / paper / etc.) instead
  // of literal hex values that would go stale if the boutique edits
  // its palette. Editing `brand.colors.accent` now re-renders every
  // scene with the new value.
  const {
    colors,
    boutiqueName,
    sideEditorialLine,
    tickerItems,
    word1,
    word2,
    word3,
    products,
    seasonChip,
    finalKicker,
    finalHeadline,
    finalSubline,
    ctaButton,
    logo,
  } = props;
  const logoColor = useFieldColor('logo', colors.ink);

  // Per-field format overrides — hook bases use dynamic brand values
  // so an un-overridden field updates when the brand kit changes.
  const refrainStyle = useFieldFormat('word1', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(520),
    fontWeight: 300,
    lineHeight: 0.9,
    letterSpacing: '-0.04em',
    color: colors.accent,
  });
  const word2Style = useFieldFormat('word2', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(520),
    fontWeight: 300,
    lineHeight: 0.9,
    letterSpacing: '-0.04em',
    color: colors.accent,
  });
  const word3Style = useFieldFormat('word3', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(520),
    fontWeight: 300,
    lineHeight: 0.9,
    letterSpacing: '-0.04em',
    color: colors.accent,
  });
  const sideEditorialLineStyle = useFieldFormat('sideEditorialLine', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(20),
    fontWeight: 700,
    letterSpacing: '0.6em',
    textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.60)',
  });
  const seasonChipStyle = useFieldFormat('seasonChip', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(110),
    color: colors.cream,
    letterSpacing: '-0.02em',
  });
  const boutiqueNameStyle = useFieldFormat('boutiqueName', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(28),
    fontWeight: 300,
    letterSpacing: '-0.03em',
  });
  const finalKickerStyle = useFieldFormat('finalKicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const finalHeadlineStyle = useFieldFormat('finalHeadline', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(128),
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  });
  const finalSublineStyle = useFieldFormat('finalSubline', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 400,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  });
  const ctaButtonStyle = useFieldFormat('ctaButton', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 800,
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
    color: '#fff',
  });

  const words = [word1, word2, word3];
  const wordStyles = [refrainStyle, word2Style, word3Style];

  // Word phase: three 3-second phases, then freeze word 3 until FINAL_IN.
  let activeWordIdx: number;
  let localPhase: number;
  if (time < T(WORD_PER)) {
    activeWordIdx = 0;
    localPhase = time / T(WORD_PER);
  } else if (time < T(WORD_PER * 2)) {
    activeWordIdx = 1;
    localPhase = (time - T(WORD_PER)) / T(WORD_PER);
  } else if (time < T(WORD_PER * 3)) {
    activeWordIdx = 2;
    localPhase = (time - T(WORD_PER * 2)) / T(WORD_PER);
  } else {
    activeWordIdx = 2;
    localPhase = 1;
  }

  // Word transform
  let wordScale = 1;
  let wordRot = 0;
  let wordOp = 0;
  let wordDy = 0;
  if (time < T(FINAL_IN)) {
    if (localPhase < 0.18) {
      const p = localPhase / 0.18;
      wordScale = interpolate([0, 1], [1.25, 1], Easing.easeOutExpo)(p);
      wordRot = interpolate([0, 1], [-3, 0], Easing.easeOutExpo)(p);
      wordDy = interpolate([0, 1], [60, 0], Easing.easeOutExpo)(p);
      wordOp = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(p);
    } else if (localPhase > 0.82) {
      const p = (localPhase - 0.82) / 0.18;
      wordScale = interpolate([0, 1], [1, 0.92], Easing.easeInCubic)(p);
      wordRot = interpolate([0, 1], [0, 2], Easing.easeInCubic)(p);
      wordDy = interpolate([0, 1], [0, -40], Easing.easeInCubic)(p);
      wordOp = interpolate([0, 1], [1, 0], Easing.easeInCubic)(p);
    } else {
      const p = (localPhase - 0.18) / 0.64;
      wordScale = 1 + Math.sin(p * Math.PI) * 0.015;
      wordOp = 1;
    }
  } else {
    wordOp = 0;
  }

  // Ticker scroll offset — wraps on a 2400px base cycle
  const scrollX = (time * 180) % 2400;

  // Final frame opacity + sun scale
  const finalT = time - T(FINAL_IN);
  const finalP = clamp(finalT / Math.max(T(0.8), 0.01), 0, 1);
  const finalOp = time >= T(FINAL_IN)
    ? interpolate([0, 1], [0, 1], Easing.easeOutCubic)(finalP)
    : 0;
  const sunScale = time >= T(FINAL_IN)
    ? interpolate([0, 1], [0.8, 1], Easing.easeOutExpo)(finalP)
    : 0.8;

  // Design insets for content-rect anchoring. Expressed at base-canvas
  // scale so every aspect picks up the same proportional breathing room.
  const LOGO_INSET_Y = h(20);       // logo 20 base-px below the safe top
  const TICKER_GAP_Y = h(10);       // small visual gap under the logo bar
  const LOGO_HEIGHT = h(90);
  const TICKER_HEIGHT = h(44);
  const SIDE_EDITORIAL_INSET = w(48);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: colors.cream,
        color: colors.ink,
        overflow: 'hidden',
      }}
    >
      {/* Background gradient wash (copper tinted radials over cream → bone) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 20% 15%, rgba(184,114,83,0.18), transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(184,114,83,0.10), transparent 60%), linear-gradient(180deg, ${colors.cream} 0%, ${colors.backgroundDeep} 100%)`,
          zIndex: 0,
          opacity: time < T(FINAL_IN) ? 1 : 1 - finalOp,
        }}
      />

      {/* Top brand line — anchored inside the content rect's top edge
       *  so it stays 20-base-px below the platform chrome (or canvas
       *  top when safe is OFF). Width is constrained to the content
       *  rect so the logo centers on the visible area, not the canvas. */}
      <div
        style={{
          position: 'absolute',
          top: contentTop + LOGO_INSET_Y,
          left: contentLeft,
          width: contentW,
          height: LOGO_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          opacity: time < T(FINAL_IN) ? 1 : 1 - finalOp,
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
          nameStyle={boutiqueNameStyle}
        />
      </div>

      {/* Ticker — sits immediately below the brand bar inside the content
       *  rect, so it also reflows with the safe zone. */}
      <div
        style={{
          position: 'absolute',
          top: contentTop + LOGO_INSET_Y + LOGO_HEIGHT + TICKER_GAP_Y,
          left: contentLeft,
          width: contentW,
          height: TICKER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          zIndex: 5,
          borderTop: '1px solid rgba(0,0,0,0.12)',
          borderBottom: '1px solid rgba(0,0,0,0.12)',
          opacity: time < T(FINAL_IN) ? 1 : 1 - finalOp,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: w(48),
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-body)',
            fontSize: wh(18),
            fontWeight: 700,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: colors.ink,
            transform: `translateX(${-scrollX * (w(1) / 1)}px)`,
          }}
        >
          {/* Repeat items 3x so the scroll always fills the strip */}
          {Array.from({ length: 3 }).flatMap((_, r) =>
            tickerItems.map((item, i) => [
              <span key={`${r}-${i}-t`}>{item}</span>,
              <span
                key={`${r}-${i}-d`}
                style={{
                  display: 'inline-block',
                  width: w(8),
                  height: w(8),
                  background: colors.accent,
                  borderRadius: '50%',
                }}
              />,
            ]),
          )}
        </div>
      </div>

      {/* Giant serif refrain — vertically centered on the content rect
       *  (so it reads dead-centre on the phone once platform chrome eats
       *  the top+bottom strips), but left/right un-anchored so the word
       *  can still bleed past the canvas edges for dramatic editorial
       *  overflow. The bleed is intentional; only readability-critical
       *  copy (logo / CTA / kicker) is pinned inside the safe zone. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: contentCY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          pointerEvents: 'none',
          opacity: time < T(FINAL_IN) ? 1 : 0,
        }}
      >
        <div
          style={{
            whiteSpace: 'nowrap',
            textAlign: 'center',
            ...wordStyles[activeWordIdx],
            opacity: (wordStyles[activeWordIdx].opacity ?? 1) * wordOp,
            transform: `translateY(-50%) translateY(${h(wordDy)}px) scale(${wordScale}) rotate(${wordRot}deg)`,
          }}
        >
          {words[activeWordIdx]}
        </div>
      </div>

      {/* Floating products layer — compressed uniformly into the content
       *  rect via a single translate+scale transform. Each product keeps
       *  its designer-authored relative position; the whole layer just
       *  shrinks to clear platform chrome. OFF → scale 1, translate 0
       *  (identity, original composition). */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height,
          zIndex: 3,
          pointerEvents: 'none',
          opacity: time < T(FINAL_IN) ? 1 : 1 - finalOp,
          transform: `translate(${productLayerX}px, ${productLayerY}px) scale(${productLayerScale})`,
          transformOrigin: 'top left',
        }}
      >
        {products.map((p, i) => {
          const inStart = T(1.0 + i * 0.55);
          const inEnd = inStart + T(0.8);
          const outStart = T(9.5 + i * 0.08);
          const outEnd = outStart + T(0.8);

          let op = 0;
          let tx = 0;
          let ty = 0;
          let sc = p.size;
          const rot = p.rotation;

          if (time < inStart) {
            op = 0;
          } else if (time < inEnd) {
            const lp = (time - inStart) / (inEnd - inStart);
            op = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(lp);
            ty = interpolate([0, 1], [60, 0], Easing.easeOutExpo)(lp);
            sc = interpolate([0, 1], [0.8 * p.size, p.size], Easing.easeOutExpo)(lp);
          } else if (time < outStart) {
            op = 1;
            const lp = (time - inEnd) * 0.4;
            ty = Math.sin(lp + i) * 8;
            tx = Math.cos(lp + i * 0.7) * 6;
          } else if (time < outEnd) {
            const lp = (time - outStart) / (outEnd - outStart);
            op = interpolate([0, 1], [1, 0], Easing.easeInCubic)(lp);
            ty = interpolate([0, 1], [0, -40], Easing.easeInCubic)(lp);
            sc = interpolate([0, 1], [p.size, p.size * 0.95], Easing.easeInCubic)(lp);
          } else {
            op = 0;
          }

          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: w(p.x),
                top: h(p.y),
                width: w(340),
                height: h(510),
                background: colors.cream,
                boxShadow: `0 ${h(12)}px ${h(40)}px rgba(0,0,0,0.18)`,
                overflow: 'hidden',
                opacity: op,
                transform: `translate(${w(tx)}px, ${h(ty)}px) rotate(${rot}deg) scale(${sc})`,
              }}
            >
              <img
                src={p.src}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          );
        })}
      </div>

      {/* Side editorial line (rotated 90°) — right-anchored inside the
       *  content rect (IG like/share column covers the outer 120px on
       *  9:16 when ON), and vertically centered on the content rect so
       *  it reads mid-frame on phone. */}
      <div
        style={{
          position: 'absolute',
          right: safe.right + SIDE_EDITORIAL_INSET,
          top: contentCY,
          transform: 'translateY(-50%) rotate(90deg)',
          transformOrigin: 'right center',
          zIndex: 6,
          ...sideEditorialLineStyle,
          opacity:
            (sideEditorialLineStyle.opacity ?? 1) *
            (time < T(FINAL_IN) ? 1 : 1 - finalOp),
        }}
      >
        {sideEditorialLine}
      </div>

      {/* Final frame — full-bleed dark ink (so no cream leaks into the
       *  safe-zone strips) but the inner flex column is centred on the
       *  CONTENT rect rather than the canvas. We achieve this by
       *  padding the flex container with the safe margins so the
       *  flex-centered content box IS the safe rect. Keeps intrinsic
       *  child widths (the CTA button doesn't stretch) while the
       *  whole composition reads dead-centre on the phone. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          background: colors.inkDeep,
          color: '#fff',
          opacity: finalOp,
          pointerEvents: finalOp > 0.5 ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: safe.top,
          paddingBottom: safe.bottom,
          paddingLeft: safe.left,
          paddingRight: safe.right,
          boxSizing: 'border-box',
        }}
      >
        <div
            style={{
              width: wh(380),
              height: wh(380),
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'grid',
              placeItems: 'center',
              position: 'relative',
              marginBottom: h(70),
              transform: `scale(${sunScale})`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: wh(30),
                borderRadius: '50%',
                background: `radial-gradient(circle, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
                boxShadow: `0 0 ${wh(120)}px rgba(184,114,83,0.5)`,
              }}
            />
            <span
              style={{
                position: 'relative',
                zIndex: 2,
                ...seasonChipStyle,
              }}
            >
              {seasonChip}
            </span>
          </div>
          <div
            style={{
              marginBottom: h(18),
              ...finalKickerStyle,
            }}
          >
            {finalKicker}
          </div>
          <div
            style={{
              marginBottom: h(14),
              textAlign: 'center',
              ...finalHeadlineStyle,
            }}
          >
            {finalHeadline}
          </div>
          <div
            style={{
              marginBottom: h(48),
              ...finalSublineStyle,
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
