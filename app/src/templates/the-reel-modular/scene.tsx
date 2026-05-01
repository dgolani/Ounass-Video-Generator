// The Reel — Modular. Architecture mirrors The Reel exactly:
// project-bg video plays underneath, dim layer above it, then four
// scene blocks cut to a dynamic timeline. The difference: each scene
// reads its `*Type` discriminator and renders the matching variant.
//
// Today scenes 1/3/4 each have one variant (ports of The Reel's
// chrome). Scene 2 (Content) has four:
//   - phone-preview (port of The Reel's mechanic)
//   - heading-products (storyboard sequence)
//   - vouri-plp (simplified PLP mockup)
//   - gravity-collapse (8 tiles into a 2x4 grid)
//
// The timeline is computed each render from per-scene durations
// (introDur / contentDur / uspsDur / finaleDur). When contentType is
// 'heading-products', contentDur is overridden by
// (productCount + 1) * 2.2s so cadence stays consistent regardless
// of how many products the marketer added.

import {
  Easing,
  clamp,
  interpolate,
  useFieldFormat,
  useHasProjectBackground,
  useSafeZone,
  useTimeline,
} from '../../engine';
import {
  computeTimeline,
  type ReelModularProps,
  type ReelPhoneAnim,
  type ContentType,
} from './schema';
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
  props: ReelModularProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

const FADE_DEFAULT = 0.55;
const FADE_S2_OUT = 1.0;

/** Per-scene cross-fade envelope: 1 inside [in, out], rises over fadeIn,
 *  falls over fadeOut. */
function sceneOpacity(
  t: number,
  inAt: number,
  outAt: number,
  fadeIn = FADE_DEFAULT,
  fadeOut = FADE_DEFAULT,
): number {
  if (t <= inAt - 0.01) return 0;
  if (t >= outAt + fadeOut) return 0;
  const upP = clamp((t - inAt) / fadeIn, 0, 1);
  const downP = clamp((t - outAt) / fadeOut, 0, 1);
  return Easing.easeOutCubic(upP) * (1 - Easing.easeOutCubic(downP));
}

export function ReelModularScene({
  props,
  timeScale = 1,
  width = BASE_W,
  height = BASE_H,
}: SceneProps) {
  const { time: t } = useTimeline();
  const T = (x: number) => x * timeScale;
  const s = makeScale(width, height);
  const { wh, h } = s;
  const { base: safe } = useSafeZone({ width, height });
  const hasProjectBg = useHasProjectBackground();
  const is45 = Math.abs(width / height - 4 / 5) < 0.01;
  void safe.left;
  void safe.right;

  const {
    logo,
    s1Mark,
    s1Tag,
    videoSrc,
    videoDim,
    contentType,
    s2Anim,
    productImage,
    s2hpHeading,
    s2hpProducts,
    s2vpHeading,
    s2vpSub,
    s2vpTitle,
    s2vpBrandChip,
    s2vpResults,
    s2vpTiles,
    s2gcImgs,
    s3Eyebrow,
    s3Line1,
    s3Line2,
    s4Pre,
    s4Mark,
    s4Cta,
    colors,
  } = props;

  // Timeline (dynamic, scaled by timeScale).
  const tl = computeTimeline(props);
  const op1 = sceneOpacity(t, T(tl.s1In), T(tl.s1Out));
  const op2 = sceneOpacity(t, T(tl.s2In), T(tl.s2Out), FADE_DEFAULT, FADE_S2_OUT);
  const op3 = sceneOpacity(t, T(tl.s3In), T(tl.s3Out));
  const op4 = sceneOpacity(t, T(tl.s4In), T(tl.s4Out));

  // Per-text typography hooks.
  const s1MarkStyle = useFieldFormat('s1Mark', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(is45 ? 150 : 200),
    fontWeight: 400,
    letterSpacing: '0.08em',
    color: '#ffffff',
  });
  const s1TagStyle = useFieldFormat('s1Tag', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontSize: wh(18),
    fontWeight: 600,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  });
  // Heading-products headline — matches the prototype's CSS exactly:
  // serif (NOT italic), regular weight, uppercase, ~96px on 9:16 /
  // 72px on 4:5, with positive letter-spacing for the all-caps look.
  const s2hpHeadingStyle = useFieldFormat('s2hpHeading', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(is45 ? 72 : 96),
    fontWeight: 400,
    lineHeight: 1.15,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#ffffff',
  });
  // Per-product wildcard hooks for the heading-products variant —
  // every rendered product card spreads these on its brand + price
  // text so the Aa drawer reaches every frame.
  const s2hpProductBrandStyle = useFieldFormat('s2hpProducts.*.brand', {
    fontFamily: 'var(--font-body)',
    fontWeight: 800,
    fontSize: wh(is45 ? 24 : 30),
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: '#ffffff',
  });
  const s2hpProductPriceStyle = useFieldFormat('s2hpProducts.*.price', {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: wh(is45 ? 20 : 26),
    letterSpacing: '0.1em',
    color: '#B87253',
  });
  // Vouri-plp text hooks — earlier these styles were hardcoded inside
  // the variant component, so the Aa drawer for these fields had no
  // effect. Wired up the same way every other text field in this
  // template is.
  const s2vpHeadingStyle = useFieldFormat('s2vpHeading', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontSize: wh(is45 ? 15 : 18),
    fontWeight: 500,
    letterSpacing: '0.55em',
    textTransform: 'uppercase',
    color: 'rgba(244,239,232,0.65)',
  });
  const s2vpSubStyle = useFieldFormat('s2vpSub', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(is45 ? 72 : 92),
    fontWeight: 400,
    letterSpacing: '0.01em',
    color: '#F2EFEA',
  });
  const s2vpTitleStyle = useFieldFormat('s2vpTitle', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontSize: wh(16),
    fontWeight: 500,
    letterSpacing: '0.01em',
    color: '#F2EFEA',
  });
  const s2vpBrandChipStyle = useFieldFormat('s2vpBrandChip', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontSize: wh(11),
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#F2EFEA',
  });
  const s2vpResultsStyle = useFieldFormat('s2vpResults', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontSize: wh(12),
    fontWeight: 500,
    letterSpacing: '0.02em',
    color: 'rgba(242,239,234,0.55)',
  });
  const s3EyebrowStyle = useFieldFormat('s3Eyebrow', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontSize: wh(16),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  });
  const s3LineStyle = useFieldFormat('s3Line1', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(is45 ? 88 : 110),
    fontWeight: 300,
    lineHeight: 1.0,
    letterSpacing: '-0.01em',
    color: '#ffffff',
  });
  const s3Line2Style = useFieldFormat('s3Line2', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(is45 ? 88 : 110),
    fontWeight: 300,
    lineHeight: 1.0,
    letterSpacing: '-0.01em',
    color: '#ffffff',
  });
  const s4PreStyle = useFieldFormat('s4Pre', {
    fontFamily: 'var(--font-mono, var(--font-body))',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  });
  const s4MarkStyle = useFieldFormat('s4Mark', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(is45 ? 140 : 180),
    fontWeight: 400,
    lineHeight: 1.0,
    letterSpacing: '0.06em',
    color: '#ffffff',
  });
  const s4CtaStyle = useFieldFormat('s4Cta', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(22),
    fontWeight: 700,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#ffffff',
  });
  const s1FontPx = typeof s1MarkStyle.fontSize === 'number' ? s1MarkStyle.fontSize : wh(200);
  const s4FontPx = typeof s4MarkStyle.fontSize === 'number' ? s4MarkStyle.fontSize : wh(180);

  // ── Scene 1 — wordmark stagger ────────────────────────────────
  const s1LocalT = t - T(tl.s1In);
  const s1Letters = s1Mark.split('').map((ch, i) => {
    const delay = 0.05 + i * 0.08;
    const dur = 0.7;
    const p = clamp((s1LocalT - delay) / dur, 0, 1);
    const e = Easing.easeOutCubic(p);
    return { ch, opacity: e, ty: (1 - e) * wh(30) };
  });
  const tagP = clamp((s1LocalT - 0.6) / 0.7, 0, 1);
  const tagE = Easing.easeOutCubic(tagP);
  const s1TagOp = tagE;
  const s1TagTy = (1 - tagE) * wh(8);

  // ── Scene 2 — content variant routing ─────────────────────────
  const s2LocalT = t - T(tl.s2In);
  const s2DurEff = T(tl.s2Out) - T(tl.s2In);

  // ── Scene 3 — USP flashes ─────────────────────────────────────
  const s3LocalT = t - T(tl.s3In);
  const eyeP = clamp((s3LocalT - 0.05) / 0.5, 0, 1);
  const eyeE = Easing.easeOutCubic(eyeP);
  const s3EyebrowOp = eyeE;
  const s3EyebrowTy = (1 - eyeE) * wh(8);
  // USPs split the available duration evenly, clamped to a 1.1s slice.
  const s3Half = Math.max(0.6, (T(tl.s3Out) - T(tl.s3In) - 0.4) / 2);
  const l1 = uspLineStyle(s3LocalT, 0.25, s3Half, wh(20));
  const l2 = uspLineStyle(s3LocalT, 0.25 + s3Half, s3Half, wh(20));

  // ── Scene 4 — Discover + huge mark + CTA ──────────────────────
  const s4LocalT = t - T(tl.s4In);
  const preP = clamp((s4LocalT - 0.1) / 0.6, 0, 1);
  const preE = Easing.easeOutCubic(preP);
  const s4PreOp = preE;
  const s4PreTy = (1 - preE) * wh(8);
  const markP = clamp((s4LocalT - 0.35) / 0.85, 0, 1);
  const markE = Easing.easeOutCubic(markP);
  const s4MarkOp = markE;
  const s4MarkScale = 1.15 - markE * 0.15;
  const ctaP = clamp((s4LocalT - 0.95) / 0.7, 0, 1);
  const ctaE = Easing.easeOutCubic(ctaP);
  const s4CtaOp = ctaE;
  const s4CtaTy = (1 - ctaE) * wh(20);
  const s4CtaScale = 0.92 + ctaE * 0.08;
  // CTA shimmer — diagonal light sweep that loops across the pill
  // every 1.4s starting 1.7s after Scene 4 becomes active. Mirrors the
  // prototype's `@keyframes ctaShimmer` (translateX -130% → 130% over
  // 60% of cycle, holds for the remaining 40%). Visible only after
  // the CTA's entry animation has settled.
  const CTA_SHIMMER_START = 1.7;
  const CTA_SHIMMER_CYCLE = 1.4;
  const shimmerLocalT = Math.max(0, s4LocalT - CTA_SHIMMER_START);
  const shimmerPhase = (shimmerLocalT % CTA_SHIMMER_CYCLE) / CTA_SHIMMER_CYCLE;
  const s4ShimmerTx =
    shimmerPhase < 0.6 ? -130 + (shimmerPhase / 0.6) * 260 : 130;
  const s4ShimmerVisible = s4LocalT >= CTA_SHIMMER_START;

  const ROOT_BG = hasProjectBg ? 'transparent' : '#000000';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: ROOT_BG,
        overflow: 'hidden',
        color: '#ffffff',
      }}
    >
      {/* Legacy backdrop for projects that pre-date project.background. */}
      {!hasProjectBg && videoSrc ? (
        <MediaBackground src={videoSrc} style={{ zIndex: 1 }} />
      ) : null}
      {!hasProjectBg ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: '#000',
            opacity: clamp(videoDim ?? 0, 0, 1),
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* ── Scene 1 — wordmark ────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          opacity: op1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {logo ? (
            <div style={{ opacity: tagE, filter: 'drop-shadow(0 4px 32px rgba(0,0,0,0.45))' }}>
              <BoutiqueLogo
                logo={logo}
                boutiqueName={s1Mark}
                color="#ffffff"
                width={s1FontPx * 3.0}
                height={s1FontPx * 1.1}
                fontSize={s1FontPx}
                letterSpacing="0.08em"
                nameStyle={s1MarkStyle}
              />
            </div>
          ) : (
            <div
              style={{
                whiteSpace: 'nowrap',
                textShadow: '0 4px 32px rgba(0,0,0,0.45)',
                ...s1MarkStyle,
              }}
            >
              {s1Letters.map((ltr, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    opacity: ltr.opacity,
                    transform: `translateY(${ltr.ty}px)`,
                  }}
                >
                  {ltr.ch}
                </span>
              ))}
            </div>
          )}
          {s1Tag ? (
            <div
              style={{
                marginTop: wh(28),
                transform: `translateY(${s1TagTy}px)`,
                ...s1TagStyle,
                opacity: s1TagOp * ((s1TagStyle.opacity as number | undefined) ?? 1),
              }}
            >
              {s1Tag}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Scene 2 — content variant ─────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 11,
          opacity: op2,
          pointerEvents: 'none',
        }}
      >
        {contentType === 'phone-preview' ? (
          <PhonePreview
            scale={s}
            is45={is45}
            colors={colors}
            anim={s2Anim}
            localT={s2LocalT}
            durEff={s2DurEff}
            productImage={productImage}
          />
        ) : null}
        {contentType === 'heading-products' ? (
          <HeadingProducts
            scale={s}
            is45={is45}
            heading={s2hpHeading}
            headingStyle={s2hpHeadingStyle}
            brandStyle={s2hpProductBrandStyle}
            priceStyle={s2hpProductPriceStyle}
            count={Math.max(1, Math.min(6, s2hpProducts.length))}
            products={s2hpProducts}
            localT={s2LocalT}
          />
        ) : null}
        {contentType === 'vouri-plp' ? (
          <VouriPlp
            scale={s}
            is45={is45}
            colors={colors}
            heading={s2vpHeading}
            sub={s2vpSub}
            title={s2vpTitle}
            brandChip={s2vpBrandChip}
            results={s2vpResults}
            tiles={s2vpTiles}
            headingStyle={s2vpHeadingStyle}
            subStyle={s2vpSubStyle}
            titleStyle={s2vpTitleStyle}
            brandChipStyle={s2vpBrandChipStyle}
            resultsStyle={s2vpResultsStyle}
            localT={s2LocalT}
            durEff={s2DurEff}
          />
        ) : null}
        {contentType === 'gravity-collapse' ? (
          <GravityCollapse
            scale={s}
            urls={s2gcImgs.split(',').map((u) => u.trim()).filter(Boolean)}
            localT={s2LocalT}
            durEff={s2DurEff}
          />
        ) : null}
      </div>

      {/* ── Scene 3 — USP flashes ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 12,
          opacity: op3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ textAlign: 'center', width: '90%', position: 'relative' }}>
          {s3Eyebrow ? (
            <div
              style={{
                marginBottom: wh(28),
                transform: `translateY(${s3EyebrowTy}px)`,
                ...s3EyebrowStyle,
                opacity: s3EyebrowOp * ((s3EyebrowStyle.opacity as number | undefined) ?? 1),
              }}
            >
              {s3Eyebrow}
            </div>
          ) : null}
          <div style={{ position: 'relative', height: wh(160) }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: `translateY(-50%) translateY(${l1.ty}px)`,
                filter: `blur(${l1.blur}px)`,
                textAlign: 'center',
                textShadow: '0 4px 32px rgba(0,0,0,0.5)',
                ...s3LineStyle,
                opacity: l1.opacity * ((s3LineStyle.opacity as number | undefined) ?? 1),
              }}
            >
              {s3Line1}
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: `translateY(-50%) translateY(${l2.ty}px)`,
                filter: `blur(${l2.blur}px)`,
                textAlign: 'center',
                textShadow: '0 4px 32px rgba(0,0,0,0.5)',
                ...s3Line2Style,
                opacity: l2.opacity * ((s3Line2Style.opacity as number | undefined) ?? 1),
              }}
            >
              {s3Line2}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scene 4 — Discover + mark + CTA ──────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 13,
          opacity: op4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {s4Pre ? (
            <div
              style={{
                marginBottom: wh(30),
                transform: `translateY(${s4PreTy}px)`,
                ...s4PreStyle,
                opacity: s4PreOp * ((s4PreStyle.opacity as number | undefined) ?? 1),
              }}
            >
              {s4Pre}
            </div>
          ) : null}
          <div
            style={{
              opacity: s4MarkOp,
              transform: `scale(${s4MarkScale})`,
              marginBottom: wh(60),
              filter: 'drop-shadow(0 4px 32px rgba(0,0,0,0.5))',
            }}
          >
            {logo ? (
              <BoutiqueLogo
                logo={logo}
                boutiqueName={s4Mark}
                color="#ffffff"
                width={s4FontPx * 3.0}
                height={s4FontPx * 1.1}
                fontSize={s4FontPx}
                letterSpacing="0.06em"
                nameStyle={s4MarkStyle}
              />
            ) : (
              <div
                style={{
                  whiteSpace: 'nowrap',
                  textShadow: '0 4px 32px rgba(0,0,0,0.5)',
                  ...s4MarkStyle,
                }}
              >
                {s4Mark}
              </div>
            )}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: wh(14),
              padding: `${wh(28)}px ${wh(64)}px`,
              background: '#000',
              borderRadius: 999,
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.15),
                0 ${wh(14)}px ${wh(40)}px rgba(0,0,0,0.55)
              `,
              transform: `translateY(${s4CtaTy}px) scale(${s4CtaScale})`,
              position: 'relative',
              overflow: 'hidden',
              pointerEvents: 'auto',
              ...s4CtaStyle,
              opacity: s4CtaOp * ((s4CtaStyle.opacity as number | undefined) ?? 1),
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>{s4Cta}</span>
            <span style={{ fontSize: wh(24), lineHeight: 1, color: '#fff', position: 'relative', zIndex: 2 }}>→</span>
            {/* Diagonal shimmer sweep — runs continuously after the
             *  CTA's entry animation has settled. */}
            {s4ShimmerVisible ? (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0) 65%, transparent 80%)',
                  transform: `translateX(${s4ShimmerTx}%)`,
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
      {void h /* keep h() reachable; reserved for future variant work */}
    </div>
  );
}

// ── Variant: phone-preview ────────────────────────────────────────

type PhonePreviewProps = {
  scale: Scale;
  is45: boolean;
  colors: ReelModularProps['colors'];
  anim: ReelPhoneAnim;
  localT: number;
  durEff: number;
  productImage?: string;
};

function PhonePreview({ scale, is45, colors, anim, localT, durEff, productImage }: PhonePreviewProps) {
  void durEff;
  const { wh } = scale;
  const phoneEntry = phoneEntryStyle(anim, localT);
  const screenReveal = phoneScreenReveal(anim, localT);

  const imgP = clamp((localT - 0.55) / 1.0, 0, 1);
  const imgE = Easing.easeOutCubic(imgP);
  const imgTx = (1 - imgE) * 105;

  // Iris bloom
  const bloomP = clamp(localT / 1.3, 0, 1);
  const bloomOp = bloomP < 0.2 ? (bloomP / 0.2) * 0.95 : Math.max(0, 1 - (bloomP - 0.2) / 0.8) * 0.95;
  const bloomScale = 0.4 + bloomP * 2.2;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        perspective: anim === 'tilt' ? `${wh(1600)}px` : undefined,
        perspectiveOrigin: anim === 'tilt' ? '50% 30%' : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: is45 ? wh(380) : wh(460),
          height: is45 ? wh(760) : wh(940),
          borderRadius: wh(64),
          background: colors.phoneFrame,
          padding: wh(14),
          boxShadow: `
            0 0 0 ${wh(2)}px rgba(255,255,255,0.06),
            0 0 0 ${wh(4)}px rgba(216,154,110,0.12),
            0 ${wh(40)}px ${wh(100)}px rgba(0,0,0,0.6)
          `,
          transform: phoneEntry.transform,
          transformOrigin: phoneEntry.origin,
          opacity: phoneEntry.opacity,
          boxSizing: 'border-box',
        }}
      >
        {anim === 'iris' ? (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) scale(${bloomScale})`,
              width: wh(260),
              height: wh(260),
              borderRadius: 999,
              background: `radial-gradient(circle,
                rgba(255,229,200,0.85) 0%,
                rgba(216,154,110,0.55) 30%,
                rgba(216,154,110,0) 70%)`,
              filter: `blur(${wh(8)}px)`,
              opacity: bloomOp,
              pointerEvents: 'none',
              zIndex: 6,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: wh(50),
            overflow: 'hidden',
            clipPath: screenReveal.clipPath,
            WebkitClipPath: screenReveal.clipPath,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: wh(50),
              overflow: 'hidden',
              background: colors.phoneScreen,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: wh(18),
                left: '50%',
                transform: 'translateX(-50%)',
                width: '28%',
                maxWidth: wh(140),
                height: wh(26),
                background: colors.phoneFrame,
                borderRadius: 999,
                zIndex: 3,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #2a2522, #0e0c0a)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-mono, var(--font-body))',
                fontSize: wh(13),
                fontWeight: 600,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                zIndex: 0,
              }}
            >
              Phone screen
            </div>
            {productImage ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url("${productImage}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transform: `translateX(${imgTx}%)`,
                  zIndex: 1,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Variant: heading-products ─────────────────────────────────────

type HeadingProductsProps = {
  scale: Scale;
  is45: boolean;
  heading: string;
  headingStyle: React.CSSProperties;
  brandStyle: React.CSSProperties;
  priceStyle: React.CSSProperties;
  count: number;
  products: ReelModularProps['s2hpProducts'];
  localT: number;
};

function HeadingProducts({ scale, is45, heading, headingStyle, brandStyle, priceStyle, count, products, localT }: HeadingProductsProps) {
  const { wh } = scale;
  // Frame 0 = heading, frames 1..N = product cards.
  const SLICE = 2.2;
  const totalFrames = 1 + count;
  // Strict no-overlap fade pattern from the prototype CSS:
  // fade-OUT runs 0.8s starting at frame end - 0.8s; fade-IN runs
  // 0.8s with a 0.8s delay (so it begins after the previous frame
  // has fully faded out). Each frame holds at opacity 1 in between.
  const frameIdxFloat = localT / SLICE;
  const frameIdx = Math.max(0, Math.floor(frameIdxFloat));
  const frameLocal = localT - frameIdx * SLICE;
  // Fade-in: 0–0.8s after delayed start (we treat "delay" as already
  // baked into frameLocal — frameLocal=0 is when the new frame starts
  // fading in). Fade-out begins at 1.4s, ends at 2.2s.
  const inP = clamp(frameLocal / 0.8, 0, 1);
  const outP = clamp((frameLocal - 1.4) / 0.8, 0, 1);
  const opacity = Easing.easeOutCubic(inP) * (1 - Easing.easeOutCubic(outP));

  if (frameIdx >= totalFrames) {
    return null;
  }

  if (frameIdx === 0) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `0 ${wh(80)}px`,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: is45 ? '80%' : '70%',
            opacity,
            ...headingStyle,
            textShadow: '0 4px 32px rgba(0,0,0,0.5)',
          }}
        >
          {heading}
        </div>
      </div>
    );
  }

  const product = products[frameIdx - 1];
  if (!product) return null;

  // Product frame matches the prototype exactly:
  //   - 70% width column, image + meta stacked, 36px gap
  //   - Image: white background, contain-fit so the full product
  //     shows; deep drop-shadow
  //   - Brand: sans 800, uppercase, 0.16em letter-spacing
  //   - Price: sans 600, BRONZE accent
  const colWidth = is45 ? '70%' : '70%';
  const imgAspect = '3 / 4';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          width: colWidth,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: wh(36),
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: imgAspect,
            background: '#ffffff',
            backgroundImage: product.imageUrl ? `url("${product.imageUrl}")` : undefined,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            // No box-shadow — the marketer asked for clean product
            // shots without a drop shadow underneath the white card.
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(18,18,18,0.18)',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: wh(26),
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
          }}
        >
          {product.imageUrl ? null : `Product ${frameIdx}`}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              textShadow: '0 2px 18px rgba(0,0,0,0.5)',
              marginBottom: wh(14),
              ...brandStyle,
            }}
          >
            {product.brand}
          </div>
          <div
            style={{
              textShadow: '0 2px 18px rgba(0,0,0,0.5)',
              ...priceStyle,
            }}
          >
            {product.price}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Variant: vouri-plp ────────────────────────────────────────────

type VouriPlpProps = {
  scale: Scale;
  is45: boolean;
  colors: ReelModularProps['colors'];
  heading: string;
  sub: string;
  title: string;
  brandChip: string;
  results: string;
  tiles: ReelModularProps['s2vpTiles'];
  /** Pre-resolved typography overrides for each editable text. */
  headingStyle: React.CSSProperties;
  subStyle: React.CSSProperties;
  titleStyle: React.CSSProperties;
  brandChipStyle: React.CSSProperties;
  resultsStyle: React.CSSProperties;
};

function VouriPlp({
  scale,
  is45,
  heading,
  sub,
  title,
  brandChip,
  results,
  tiles,
  headingStyle,
  subStyle,
  titleStyle,
  brandChipStyle,
  resultsStyle,
  localT,
  durEff,
}: VouriPlpProps & { localT: number; durEff: number }) {
  const { wh } = scale;
  const IVORY = '#F2EFEA';
  const SCREEN_BG = '#0E0E0E';
  const ACCENT = '#E85A2C'; // PLP price/badge orange — matches the prototype

  // Phone settle (0.7s @ 0.1s, scale 0.92 → 0.96)
  const phoneP = clamp((localT - 0.1) / 0.7, 0, 1);
  const phoneE = Easing.easeOutCubic(phoneP);
  const phoneScale = 0.92 + phoneE * 0.04;

  // Eyebrow fade-up (0.9s @ 0.55s, ty 14 → 0)
  const eyeP = clamp((localT - 0.55) / 0.9, 0, 1);
  const eyeE = Easing.easeOutCubic(eyeP);
  const eyeOp = eyeE;
  const eyeTy = (1 - eyeE) * wh(14);

  // Grid auto-scroll: starts at 1.0s, runs 6s, translates -720px on 9:16.
  // We map that translation to a fraction of the original 920px screen
  // height so it scales with the phone size.
  const scrollSpan = (durEff > 0.1 ? Math.min(6.0, durEff - 1.2) : 6.0);
  const scrollP = clamp((localT - 1.0) / Math.max(0.5, scrollSpan), 0, 1);
  const scrollE = Easing.easeInOutCubic(scrollP);
  const scrollPx = -scrollE * (is45 ? wh(560) : wh(720));

  // Phone proportions ported from the prototype: 460×920 on 9:16,
  // 380×760 on 4:5. Scaled by wh() so the same phone fits both
  // aspects relative to the canvas.
  const pw = is45 ? wh(380) : wh(460);
  const ph = is45 ? wh(760) : wh(920);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Eyebrow above the phone */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: is45 ? '72%' : '70%',
          transform: `translate(-50%, ${eyeTy}px)`,
          opacity: eyeOp,
          textAlign: 'center',
          color: IVORY,
          width: 'max-content',
          zIndex: 4,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            marginBottom: wh(is45 ? 12 : 16),
            paddingLeft: '0.55em',
            ...headingStyle,
          }}
        >
          {heading}
        </div>
        <div
          style={{
            lineHeight: 1,
            ...subStyle,
          }}
        >
          {sub}
        </div>
      </div>

      {/* Phone */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: is45 ? '58%' : '56%',
          width: pw,
          height: ph,
          transform: `translate(-50%, -50%) scale(${phoneScale})`,
          borderRadius: wh(56),
          background: 'linear-gradient(180deg, #1a1411, #0E0B09 60%, #1a1411)',
          boxShadow: `
            0 0 0 ${wh(1)}px rgba(216,154,110,0.35),
            0 0 0 ${wh(8)}px #0E0B09,
            0 ${wh(60)}px ${wh(120)}px rgba(0,0,0,0.7),
            0 ${wh(12)}px ${wh(30)}px rgba(0,0,0,0.5),
            inset 0 0 0 ${wh(2)}px rgba(216,154,110,0.15)
          `,
          padding: wh(14),
          boxSizing: 'border-box',
          opacity: phoneP,
          zIndex: 3,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: wh(44),
            overflow: 'hidden',
            background: SCREEN_BG,
            color: IVORY,
          }}
        >
          {/* Notch */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: wh(8),
              transform: 'translateX(-50%)',
              width: wh(110),
              height: wh(28),
              background: '#000',
              borderRadius: `0 0 ${wh(18)}px ${wh(18)}px`,
              zIndex: 5,
            }}
          />

          {/* Status bar */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: wh(44),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${wh(14)}px ${wh(30)}px 0`,
              fontFamily: 'var(--font-mono, var(--font-body))',
              fontSize: wh(15),
              fontWeight: 600,
              color: IVORY,
              background: SCREEN_BG,
              zIndex: 4,
              boxSizing: 'border-box',
            }}
          >
            <span>9:39</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: wh(6) }}>
              {/* signal bars */}
              <svg viewBox="0 0 18 12" width={wh(17)} height={wh(11)} aria-hidden>
                <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
                <rect x="5" y="5" width="3" height="7" rx="0.5" fill="currentColor" />
                <rect x="10" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
                <rect x="15" y="0" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.35" />
              </svg>
              {/* wifi */}
              <svg viewBox="0 0 16 12" width={wh(15)} height={wh(11)} aria-hidden>
                <path d="M8 11.2 L9.7 9.5 a2.4 2.4 0 0 0 -3.4 0 z" fill="currentColor" />
                <path d="M5 8.5 a4.2 4.2 0 0 1 6 0 l-1 1 a2.8 2.8 0 0 0 -4 0 z" fill="currentColor" />
                <path d="M2.5 6 a7.7 7.7 0 0 1 11 0 l-1 1 a6.3 6.3 0 0 0 -9 0 z" fill="currentColor" />
                <path d="M0 3.5 a11.3 11.3 0 0 1 16 0 l-1 1 a9.9 9.9 0 0 0 -14 0 z" fill="currentColor" />
              </svg>
              {/* battery */}
              <span
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: wh(26),
                  height: wh(12),
                  border: `1px solid currentColor`,
                  borderRadius: wh(3),
                  marginLeft: wh(1),
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    right: -wh(3),
                    top: wh(3),
                    width: wh(2),
                    height: wh(4),
                    background: 'currentColor',
                    borderRadius: `0 ${wh(1)}px ${wh(1)}px 0`,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono, var(--font-body))',
                    fontSize: wh(8),
                    fontWeight: 700,
                    color: SCREEN_BG,
                    background: 'currentColor',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: wh(1),
                  }}
                >
                  74
                </span>
              </span>
            </span>
          </div>

          {/* Top nav */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: wh(44),
              padding: `${wh(8)}px ${wh(16)}px ${wh(14)}px`,
              background: SCREEN_BG,
              zIndex: 3,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `${wh(32)}px 1fr auto`,
                alignItems: 'center',
                gap: wh(10),
                padding: `${wh(8)}px ${wh(4)}px ${wh(14)}px`,
              }}
            >
              <span style={{ color: IVORY, display: 'inline-flex' }}>
                <svg viewBox="0 0 24 24" width={wh(22)} height={wh(22)}>
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span
                style={{
                  textAlign: 'center',
                  ...titleStyle,
                }}
              >
                {title}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: wh(14), color: IVORY }}>
                <svg viewBox="0 0 24 24" width={wh(20)} height={wh(20)} aria-hidden>
                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <svg viewBox="0 0 24 24" width={wh(22)} height={wh(22)} aria-hidden>
                    <path d="M12 20s-7-4.5-7-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7 2.8C19 15.5 12 20 12 20z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  <span
                    style={{
                      position: 'absolute',
                      top: -wh(4),
                      right: -wh(8),
                      background: '#E85A2C',
                      color: '#fff',
                      fontFamily: 'var(--font-mono, var(--font-body))',
                      fontSize: wh(9),
                      fontWeight: 700,
                      padding: `${wh(2)}px ${wh(4)}px`,
                      borderRadius: 999,
                      minWidth: wh(16),
                      textAlign: 'center',
                    }}
                  >
                    161
                  </span>
                </span>
              </span>
            </div>

            {/* Chips */}
            <div
              style={{
                display: 'flex',
                gap: wh(8),
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                padding: `0 ${wh(4)}px`,
              }}
            >
              <PlpChip label="Filter (1)" />
              <PlpChip label="Sort" />
              <PlpChip label={`${title} ×`} />
              <PlpChip label={brandChip} outlined styleOverride={brandChipStyle} />
            </div>
            <div
              style={{
                textAlign: 'center',
                marginTop: wh(16),
                ...resultsStyle,
              }}
            >
              Showing {results} results
            </div>
          </div>

          {/* Grid clip — auto-scrolls vertically */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: wh(218),
              bottom: wh(64),
              overflow: 'hidden',
              background: SCREEN_BG,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: `${wh(18)}px ${wh(12)}px`,
                padding: `${wh(14)}px ${wh(14)}px ${wh(40)}px`,
                transform: `translateY(${scrollPx}px)`,
                willChange: 'transform',
              }}
            >
              {tiles.slice(0, 8).map((tile, i) => (
                <div
                  key={i}
                  style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '3 / 4',
                      background: tile.imageUrl
                        ? `url("${tile.imageUrl}") center/cover no-repeat`
                        : '#1B1B1B',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Fav heart */}
                    <span
                      style={{
                        position: 'absolute',
                        top: wh(8),
                        right: wh(8),
                        color: '#fff',
                        zIndex: 2,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
                      }}
                    >
                      <svg viewBox="0 0 24 24" width={wh(22)} height={wh(22)}>
                        <path d="M12 20s-7-4.5-7-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7 2.8C19 15.5 12 20 12 20z" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {tile.tag ? (
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: 0,
                          transform: 'translateX(-50%)',
                          background: SCREEN_BG,
                          color: IVORY,
                          fontFamily: 'var(--font-mono, var(--font-body))',
                          fontSize: wh(9),
                          fontWeight: 700,
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          padding: `${wh(6)}px ${wh(14)}px`,
                          zIndex: 2,
                        }}
                      >
                        {tile.tag}
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      padding: `${wh(10)}px ${wh(2)}px 0`,
                      textAlign: 'center',
                      color: IVORY,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono, var(--font-body))',
                        fontWeight: 700,
                        fontSize: wh(11),
                        lineHeight: 1.1,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        marginBottom: wh(4),
                      }}
                    >
                      {tile.brand}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono, var(--font-body))',
                        fontWeight: 400,
                        fontSize: wh(11),
                        lineHeight: 1.3,
                        marginBottom: wh(6),
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {tile.name}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        gap: wh(8),
                        alignItems: 'baseline',
                        marginBottom: wh(4),
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, var(--font-body))',
                          fontWeight: 600,
                          fontSize: wh(11),
                          letterSpacing: '0.04em',
                          color: ACCENT,
                        }}
                      >
                        {tile.price}
                      </span>
                      {tile.was ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, var(--font-body))',
                            fontWeight: 500,
                            fontSize: wh(11),
                            letterSpacing: '0.04em',
                            color: 'rgba(242,239,234,0.45)',
                            textDecoration: 'line-through',
                          }}
                        >
                          {tile.was}
                        </span>
                      ) : null}
                    </div>
                    {tile.off ? (
                      <div
                        style={{
                          fontFamily: 'var(--font-mono, var(--font-body))',
                          fontWeight: 500,
                          fontSize: wh(9.5),
                          letterSpacing: '0.06em',
                          color: 'rgba(242,239,234,0.65)',
                        }}
                      >
                        {tile.off}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: wh(64),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: `0 ${wh(4)}px ${wh(8)}px`,
              background: SCREEN_BG,
              borderTop: `1px solid rgba(242,239,234,0.08)`,
              zIndex: 4,
              boxSizing: 'border-box',
              color: IVORY,
            }}
          >
            <PlpTab label="Discover" />
            <PlpTab label="Categories" active />
            <PlpTab label="For You" />
            <PlpTab label="Bag" />
            <PlpTab label="More" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlpChip({
  label,
  outlined,
  styleOverride,
}: {
  label: string;
  outlined?: boolean;
  /** Per-field typography override applied via the Aa drawer. Spread
   *  AFTER the chip's own typography so the marketer's edits win. */
  styleOverride?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderRadius: 6,
        fontFamily: 'var(--font-mono, var(--font-body))',
        fontWeight: 600,
        fontSize: 11,
        lineHeight: 1,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: outlined ? '#F2EFEA' : '#1A1410',
        background: outlined ? 'transparent' : '#F2EFEA',
        border: outlined ? '1px solid rgba(242,239,234,0.18)' : 'none',
        ...styleOverride,
      }}
    >
      {label}
    </span>
  );
}

function PlpTab({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        fontFamily: 'var(--font-mono, var(--font-body))',
        fontSize: 9,
        fontWeight: active ? 700 : 500,
        color: active ? '#F2EFEA' : 'rgba(242,239,234,0.6)',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 9, background: active ? '#F2EFEA' : 'transparent', border: active ? 'none' : '1px solid rgba(242,239,234,0.4)' }} />
      <span>{label}</span>
    </span>
  );
}

// ── Variant: gravity-collapse ─────────────────────────────────────

type GravityCollapseProps = {
  scale: Scale;
  urls: string[];
  localT: number;
  durEff: number;
};

function GravityCollapse({ scale, urls, localT, durEff }: GravityCollapseProps) {
  const { wh } = scale;
  const tiles = Array.from({ length: 8 }, (_, i) => urls[i] ?? '');
  // Phase 1: tiles fall in staggered (0 → 1.6s). Phase 2: settle (1.6 → durEff).
  const fallDur = 1.6;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: wh(720),
          height: wh(900),
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: wh(8),
        }}
      >
        {tiles.map((src, i) => {
          const delay = i * 0.18;
          const p = clamp((localT - delay) / fallDur, 0, 1);
          const e = Easing.easeOutCubic(p);
          const ty = (1 - e) * -wh(400);
          const exitP = clamp((localT - (durEff - 0.6)) / 0.6, 0, 1);
          const exitE = Easing.easeOutCubic(exitP);
          const opacity = e * (1 - exitE);
          return (
            <div
              key={i}
              style={{
                background: src ? `url("${src}") center/cover no-repeat` : '#1a1a1a',
                borderRadius: wh(6),
                transform: `translateY(${ty}px)`,
                opacity,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

type PhoneEntry = { transform: string; origin: string; opacity: number };

function phoneEntryStyle(anim: ReelPhoneAnim, localT: number): PhoneEntry {
  const exitP = clamp((localT - 3.4) / 0.6, 0, 1);
  const exitE = Easing.easeOutCubic(exitP);
  const exitScale = 1 + exitE * 0.35;
  const exitOpacity = 1 - exitE;

  if (anim === 'iris' || anim === 'streak') {
    const p = clamp(localT / 0.6, 0, 1);
    const e = Easing.easeOutCubic(p);
    const settleScale = 0.96 + e * 0.04;
    return {
      transform: `translate(-50%, -50%) scale(${settleScale * exitScale})`,
      origin: '50% 50%',
      opacity: e * exitOpacity,
    };
  }
  if (anim === 'drop') {
    const p = clamp((localT - 0.05) / 1.1, 0, 1);
    const ty = piecewiseDrop(p);
    const opP = clamp(p / 0.6, 0, 1);
    return {
      transform: `translate(-50%, ${ty}%) scale(${exitScale})`,
      origin: '50% 50%',
      opacity: opP * exitOpacity,
    };
  }
  if (anim === 'tilt') {
    const p = clamp((localT - 0.05) / 1.2, 0, 1);
    const e = Easing.easeOutCubic(p);
    const rotateX = 60 - 60 * e;
    const ty = -90 + 40 * e;
    const scale = (0.95 + 0.05 * e) * exitScale;
    return {
      transform: `translate(-50%, ${ty}%) rotateX(${rotateX}deg) scale(${scale})`,
      origin: '50% 100%',
      opacity: clamp(p / 0.6, 0, 1) * exitOpacity,
    };
  }
  return { transform: 'translate(-50%, -50%)', origin: '50% 50%', opacity: 1 };
}

function piecewiseDrop(p: number): number {
  if (p <= 0.6) return -180 + Easing.easeOutCubic(p / 0.6) * 134;
  if (p <= 0.8) return -46 + ((p - 0.6) / 0.2) * -6;
  return -52 + ((p - 0.8) / 0.2) * 2;
}

function phoneScreenReveal(anim: ReelPhoneAnim, localT: number): { clipPath: string } {
  if (anim === 'iris') {
    const p = clamp((localT - 0.05) / 1.3, 0, 1);
    const e = Easing.easeOutCubic(p);
    return { clipPath: `circle(${e * 80}% at 50% 50%)` };
  }
  if (anim === 'streak') {
    const p = clamp((localT - 0.25) / 1.4, 0, 1);
    const e = Easing.easeOutCubic(p);
    return { clipPath: `inset(${(1 - e) * 100}% 0 0 0)` };
  }
  return { clipPath: 'inset(0 0 0 0)' };
}

function uspLineStyle(localT: number, startAt: number, dur: number, tyAmp: number) {
  const p = clamp((localT - startAt) / dur, 0, 1);
  if (p <= 0) return { opacity: 0, ty: tyAmp, blur: 8 };
  if (p >= 1) return { opacity: 0, ty: -tyAmp, blur: 6 };
  if (p < 0.2) {
    const local = p / 0.2;
    const e = Easing.easeOutCubic(local);
    return { opacity: e, ty: tyAmp * (1 - e), blur: 8 * (1 - e) };
  }
  if (p < 0.8) return { opacity: 1, ty: 0, blur: 0 };
  const local = (p - 0.8) / 0.2;
  const e = Easing.easeOutCubic(local);
  return { opacity: 1 - e, ty: -tyAmp * e, blur: 6 * e };
}

void interpolate; // reserved for future variant work
// `ContentType` is imported as a type so TS narrows the contentType
// switch above; reference it once here to keep the import non-empty
// in case the linter removes unused type imports.
const _ContentTypeAnchor: ContentType | undefined = undefined;
void _ContentTypeAnchor;
