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
import type {
  ReelModularProps,
  ReelPhoneAnim,
  ContentType,
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

/** Compute per-scene in/out times from the props' *Dur fields. The
 *  heading-products variant overrides contentDur so cadence is
 *  consistent: 2.2s per frame (heading + N products). */
function computeTimeline(p: ReelModularProps): {
  s1In: number;
  s1Out: number;
  s2In: number;
  s2Out: number;
  s3In: number;
  s3Out: number;
  s4In: number;
  s4Out: number;
  total: number;
} {
  const d1 = Math.max(0.1, p.introDur);
  let d2: number;
  if (p.contentType === 'heading-products') {
    const count = Math.max(1, Math.min(6, Math.round(p.s2hpCount) || 4));
    const SLICE = 2.2;
    d2 = (count + 1) * SLICE;
  } else {
    d2 = Math.max(0.1, p.contentDur);
  }
  const d3 = Math.max(0.1, p.uspsDur);
  const d4 = Math.max(0.1, p.finaleDur);
  const s1In = 0;
  const s1Out = s1In + d1;
  const s2In = s1Out;
  const s2Out = s2In + d2;
  const s3In = s2Out;
  const s3Out = s3In + d3;
  const s4In = s3Out;
  const s4Out = s4In + d4;
  return { s1In, s1Out, s2In, s2Out, s3In, s3Out, s4In, s4Out, total: s4Out };
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
    s2hpCount,
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
  const s2hpHeadingStyle = useFieldFormat('s2hpHeading', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(is45 ? 92 : 116),
    fontWeight: 300,
    lineHeight: 1.05,
    letterSpacing: '-0.01em',
    color: '#ffffff',
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
            count={Math.max(1, Math.min(6, Math.round(s2hpCount) || 4))}
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
            <span>{s4Cta}</span>
            <span style={{ fontSize: wh(24), lineHeight: 1, color: '#fff' }}>→</span>
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
  count: number;
  products: ReelModularProps['s2hpProducts'];
  localT: number;
};

function HeadingProducts({ scale, is45, heading, headingStyle, count, products, localT }: HeadingProductsProps) {
  void is45;
  const { wh } = scale;
  // Frame 0 = heading, frames 1..N = product cards.
  const SLICE = 2.2;
  const totalFrames = 1 + count;
  // Determine which frame is currently fading in / fading out so we
  // can crossfade at frame boundaries (200ms overlap).
  const frameIdxFloat = localT / SLICE;
  const frameIdx = Math.max(0, Math.floor(frameIdxFloat));
  const frameLocal = localT - frameIdx * SLICE;
  // Fade-in over 0–0.45, hold to 1.95, fade-out over 1.95–2.20.
  const inP = clamp(frameLocal / 0.45, 0, 1);
  const outP = clamp((frameLocal - 1.95) / 0.25, 0, 1);
  const opacity = Easing.easeOutCubic(inP) * (1 - Easing.easeOutCubic(outP));

  // Render only the current frame (others are at opacity 0 anyway).
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
            opacity,
            ...headingStyle,
            textShadow: '0 4px 32px rgba(0,0,0,0.55)',
          }}
        >
          {heading}
        </div>
      </div>
    );
  }

  const product = products[frameIdx - 1];
  if (!product) return null;
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
          width: wh(620),
          background: 'rgba(20,20,20,0.85)',
          borderRadius: wh(20),
          overflow: 'hidden',
          boxShadow: `0 ${wh(40)}px ${wh(100)}px rgba(0,0,0,0.6)`,
        }}
      >
        <div
          style={{
            width: '100%',
            paddingBottom: '125%',
            background: product.imageUrl
              ? `url("${product.imageUrl}") center/cover no-repeat`
              : 'linear-gradient(135deg, #2a2522, #0e0c0a)',
          }}
        />
        <div style={{ padding: `${wh(28)}px ${wh(36)}px ${wh(32)}px` }}>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: wh(16),
              fontWeight: 700,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: wh(10),
            }}
          >
            {product.brand}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-numeric, var(--font-body))',
              fontSize: wh(34),
              fontWeight: 600,
              color: '#fff',
              letterSpacing: '0.02em',
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
};

function VouriPlp({ scale, is45, colors, heading, sub, title, brandChip, results, tiles }: VouriPlpProps) {
  const { wh } = scale;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: wh(20),
        padding: `${wh(120)}px 0 0`,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          color: '#fff',
        }}
      >
        <div
          style={{
            fontSize: wh(22),
            fontWeight: 700,
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            opacity: 0.7,
            marginBottom: wh(8),
          }}
        >
          {heading}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: wh(60),
            fontWeight: 400,
          }}
        >
          {sub}
        </div>
      </div>

      <div
        style={{
          width: is45 ? wh(540) : wh(620),
          height: is45 ? wh(900) : wh(1080),
          borderRadius: wh(50),
          background: colors.phoneFrame,
          padding: wh(10),
          boxShadow: `
            0 0 0 ${wh(2)}px rgba(255,255,255,0.06),
            0 ${wh(40)}px ${wh(100)}px rgba(0,0,0,0.6)
          `,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#fff',
            borderRadius: wh(40),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            color: '#111',
            fontFamily: 'var(--font-body)',
          }}
        >
          {/* Top bar */}
          <div
            style={{
              padding: `${wh(20)}px ${wh(24)}px ${wh(12)}px`,
              borderBottom: `1px solid rgba(0,0,0,0.06)`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: wh(18),
                fontWeight: 600,
                marginBottom: wh(10),
              }}
            >
              <span>‹</span>
              <span>{title}</span>
              <span style={{ opacity: 0.6 }}>♡</span>
            </div>
            <div style={{ display: 'flex', gap: wh(8), flexWrap: 'wrap' }}>
              <Chip>{`Filter (1)`}</Chip>
              <Chip>Sort</Chip>
              <Chip strong>{title} ×</Chip>
              <Chip strong>{brandChip}</Chip>
            </div>
            <div style={{ marginTop: wh(8), fontSize: wh(14), color: 'rgba(0,0,0,0.6)' }}>
              Showing {results} results
            </div>
          </div>
          {/* Grid */}
          <div
            style={{
              flex: 1,
              padding: wh(12),
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: wh(10),
              overflow: 'hidden',
            }}
          >
            {tiles.slice(0, 8).map((tile, i) => (
              <div
                key={i}
                style={{
                  background: tile.imageUrl
                    ? `url("${tile.imageUrl}") center/cover no-repeat`
                    : '#f1eee9',
                  borderRadius: wh(8),
                  position: 'relative',
                  paddingBottom: '125%',
                }}
              >
                {tile.tag ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: wh(8),
                      left: wh(8),
                      background: colors.accent,
                      color: '#fff',
                      fontSize: wh(10),
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      padding: `${wh(4)}px ${wh(8)}px`,
                      borderRadius: wh(2),
                      textTransform: 'uppercase',
                    }}
                  >
                    {tile.tag}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid rgba(0,0,0,0.16)',
        background: strong ? '#111' : '#fff',
        color: strong ? '#fff' : '#111',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {children}
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
