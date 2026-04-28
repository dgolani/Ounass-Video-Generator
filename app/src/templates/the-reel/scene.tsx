// The Reel — full-bleed B-roll video behind 4 editorial overlays cut to
// a 12-second timeline. Ported from the Claude-Design HTML prototype
// `The Reel.html`. The CSS @keyframes / animation-delay choreography
// translates to interpolate() / clamp() calls on `useTimeline().time`.
//
// Layer stack (back-to-front):
//   1. <video> background (full-bleed, autoplay loop muted) via MediaBackground
//   2. Black dim overlay (opacity from videoDim slider)
//   3. Scene 1 — wordmark (per-letter stagger fade)
//   4. Scene 2 — phone body + iris/streak/drop/tilt entry + product image swipe-in
//   5. Scene 3 — eyebrow + two italic USP lines flashing one after another
//   6. Scene 4 — DISCOVER ON + huge wordmark + Shop Now pill (with shimmer)
//
// Timeline (no overlap; each scene cross-fades with its neighbours):
//   T0.0 – T2.5  : Scene 1 (logo)
//   T2.5 – T6.5  : Scene 2 (phone reveal)
//   T6.5 – T9.0  : Scene 3 (USP flashes)
//   T9.0 – T12.0 : Scene 4 (Discover + CTA)

import {
  Easing,
  clamp,
  interpolate,
  useFieldFormat,
  useSafeZone,
  useTimeline,
} from '../../engine';
import type { ReelProps, ReelPhoneAnim } from './schema';
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
  props: ReelProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

// Scene boundaries (HTML prototype: TWEAKS.s1In/Out, etc).
const S1_IN = 0.0;
const S1_OUT = 2.5;
const S2_IN = 2.5;
const S2_OUT = 6.5;
const S3_IN = 6.5;
const S3_OUT = 9.0;
const S4_IN = 9.0;
const S4_OUT = 12.0;

// Crossfade durations between scenes (mirror the HTML's per-scene
// `transition: opacity` rules — scene-2 fades for 1.4s, scene-3 0.85s,
// the rest 0.55s).
const FADE_DEFAULT = 0.55;
const FADE_S2_OUT = 1.4;
const FADE_S3_IN = 0.85;

/** Smooth in/out window. Returns 1 inside [inAt, outAt], rises over
 *  fadeIn before inAt's end, falls over fadeOut before outAt. Used as
 *  the master opacity for each scene block. */
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
  const upE = Easing.easeOutCubic(upP);
  const downE = Easing.easeOutCubic(downP);
  return upE * (1 - downE);
}

export function ReelScene({
  props,
  timeScale = 1,
  width = BASE_W,
  height = BASE_H,
}: SceneProps) {
  const { time: t } = useTimeline();
  const T = (x: number) => x * timeScale;
  const s = makeScale(width, height);
  const { wh } = s;
  const { base: safe } = useSafeZone({ width, height });
  const is45 = Math.abs(width / height - 4 / 5) < 0.01;
  // Reference safe rect so the import is exercised on every aspect.
  // The Reel is full-bleed by design and centres scene chrome on the
  // canvas centre; we still call useSafeZone for parity with the rest
  // of the templates and so future chrome (progress bar, etc.) can
  // anchor to safe.top / safe.bottom.
  void safe.left;
  void safe.right;

  const {
    logo,
    s1Mark,
    s1Tag,
    videoSrc,
    videoDim,
    s2Anim,
    productImage,
    s3Eyebrow,
    s3Line1,
    s3Line2,
    s4Pre,
    s4Mark,
    s4Cta,
    colors,
  } = props;

  // ─── Per-text typography hooks (Aa drawer wires these) ───
  // Wordmark sizes scale with the active aspect via `wh()`. Each scene
  // exposes its own hook so the marketer can size the Scene-1 mark and
  // the huge Scene-4 mark independently from the same Boutique logo.
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

  // Derive a fontSize-driven width for the BoutiqueLogo SVG/raster
  // bounding boxes so when the marketer resizes the wordmark via the
  // Aa drawer, the SVG render scales alongside the text fallback.
  const s1FontPx = typeof s1MarkStyle.fontSize === 'number' ? s1MarkStyle.fontSize : wh(200);
  const s4FontPx = typeof s4MarkStyle.fontSize === 'number' ? s4MarkStyle.fontSize : wh(180);

  // ─── Scene opacities (cross-fade master) ───
  const op1 = sceneOpacity(t, T(S1_IN), T(S1_OUT));
  const op2 = sceneOpacity(t, T(S2_IN), T(S2_OUT), FADE_DEFAULT, FADE_S2_OUT);
  const op3 = sceneOpacity(t, T(S3_IN), T(S3_OUT), FADE_S3_IN);
  const op4 = sceneOpacity(t, T(S4_IN), T(S4_OUT));

  // ─── Scene 1 — per-letter stagger ───
  const s1LocalT = t - T(S1_IN);
  const s1LetterCount = Math.max(1, s1Mark.length);
  const s1Letters = s1Mark.split('').map((ch, i) => {
    const delay = 0.05 + i * 0.08;
    const dur = 0.7;
    const p = clamp((s1LocalT - delay) / dur, 0, 1);
    const e = Easing.easeOutCubic(p);
    return {
      ch,
      opacity: e,
      ty: (1 - e) * wh(30),
    };
  });
  void s1LetterCount;
  // Tag fades up after the last letter lands.
  const tagP = clamp((s1LocalT - 0.6) / 0.7, 0, 1);
  const tagE = Easing.easeOutCubic(tagP);
  const s1TagOp = tagE;
  const s1TagTy = (1 - tagE) * wh(8);

  // ─── Scene 2 — phone body + screen reveal ───
  const s2LocalT = t - T(S2_IN);
  const phoneEntry = phoneEntryStyle(s2Anim, s2LocalT);
  const screenReveal = phoneScreenReveal(s2Anim, s2LocalT);
  // Product image swipes in from the right ~0.55s after the phone lands.
  const imgP = clamp((s2LocalT - 0.55) / 1.0, 0, 1);
  const imgE = Easing.easeOutCubic(imgP);
  const imgTx = (1 - imgE) * 105; // percent
  // Shimmer sweep across screen as image arrives.
  const shimmerP = clamp((s2LocalT - 0.85) / 1.2, 0, 1);
  const shimmerE = Easing.easeInOutCubic(shimmerP);
  const shimmerTx = -130 + shimmerE * 260; // percent

  // Streak bar (only for s2Anim === 'streak')
  const streakP = clamp((s2LocalT - 0.15) / 1.6, 0, 1);
  const streakTopStart = wh(14);
  const streakTopEnd = is45 ? wh(746) : wh(926);
  const streakTop = interpolate([0, 0.85, 1], [streakTopStart, streakTopEnd, streakTopEnd + wh(44)], (x) => x)(streakP);
  const streakHeight = streakP < 0.85 ? wh(30) - (wh(16) * (streakP / 0.85)) : wh(14) - wh(10) * ((streakP - 0.85) / 0.15);
  const streakOp = streakP < 0.1 ? streakP * 10 : streakP < 0.85 ? 1 : Math.max(0, 1 - (streakP - 0.85) / 0.15) * 0.9;

  // Iris bloom (only for s2Anim === 'iris')
  const bloomP = clamp(s2LocalT / 1.3, 0, 1);
  const bloomOp = bloomP < 0.2 ? (bloomP / 0.2) * 0.95 : Math.max(0, 1 - (bloomP - 0.2) / 0.8) * 0.95;
  const bloomScale = 0.4 + bloomP * 2.2;

  // ─── Scene 3 — two USP flashes ───
  const s3LocalT = t - T(S3_IN);
  const eyeP = clamp((s3LocalT - 0.05) / 0.5, 0, 1);
  const eyeE = Easing.easeOutCubic(eyeP);
  const s3EyebrowOp = eyeE;
  const s3EyebrowTy = (1 - eyeE) * wh(8);
  // USP 1: visible 0.25–1.35s, fades out by 1.45s.
  const l1 = uspLineStyle(s3LocalT, 0.25, 1.1, wh(20));
  // USP 2: visible 1.30–2.40s, fades out by 2.50s.
  const l2 = uspLineStyle(s3LocalT, 1.30, 1.1, wh(20));

  // ─── Scene 4 — Discover + huge mark + CTA ───
  const s4LocalT = t - T(S4_IN);
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

  // Background tone — solid black behind the video so any letterboxing
  // reads as part of the design, not a glitch.
  const ROOT_BG = '#000000';

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
      {/* Layer 1 — full-bleed video / image */}
      {videoSrc ? <MediaBackground src={videoSrc} style={{ zIndex: 1 }} /> : null}

      {/* Layer 2 — black dim overlay */}
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

      {/* ─── SCENE 1 — Wordmark ─────────────────────────────────── */}
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
          {/* If the boutique uploaded a logo, render the SVG/raster
            *  using the Aa-drawer-driven font size; otherwise render the
            *  per-letter staggered text wordmark. The two paths share the
            *  same source string + colour so the marketer can move
            *  fluidly between them. */}
          {logo ? (
            <div
              style={{
                opacity: tagE, // ride the tag fade so the logo doesn't pop in instantly
                filter: 'drop-shadow(0 4px 32px rgba(0,0,0,0.45))',
              }}
            >
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

      {/* ─── SCENE 2 — Phone reveal ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 11,
          opacity: op2,
          pointerEvents: 'none',
          // 3D context for the tilt variant
          perspective: s2Anim === 'tilt' ? `${wh(1600)}px` : undefined,
          perspectiveOrigin: s2Anim === 'tilt' ? '50% 30%' : undefined,
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
              0 ${wh(40)}px ${wh(100)}px rgba(0,0,0,0.6),
              0 ${wh(16)}px ${wh(36)}px rgba(0,0,0,0.5)
            `,
            transform: phoneEntry.transform,
            transformOrigin: phoneEntry.origin,
            opacity: phoneEntry.opacity,
            boxSizing: 'border-box',
          }}
        >
          {/* Streak bar — only for streak variant */}
          {s2Anim === 'streak' ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: streakTop,
                transform: 'translate(-50%, -50%)',
                width: is45 ? wh(500) : wh(580),
                height: streakHeight,
                pointerEvents: 'none',
                background: `linear-gradient(180deg,
                  rgba(216,154,110,0) 0%,
                  rgba(216,154,110,0.55) 35%,
                  rgba(255,229,200,1) 50%,
                  rgba(216,154,110,0.55) 65%,
                  rgba(216,154,110,0) 100%)`,
                boxShadow: `
                  0 0 ${wh(40)}px ${wh(8)}px rgba(216,154,110,0.55),
                  0 0 ${wh(90)}px ${wh(22)}px rgba(216,154,110,0.30)
                `,
                opacity: streakOp,
                borderRadius: 999,
                filter: `blur(${wh(1)}px)`,
                zIndex: 5,
              }}
            />
          ) : null}

          {/* Iris bloom — only for iris variant */}
          {s2Anim === 'iris' ? (
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

          {/* Screen container — clip-path drives iris/streak reveals */}
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
              {/* Notch */}
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
              {/* Placeholder gradient (shows through before image arrives) */}
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
              {/* Product image — swipes in from the right */}
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
              {/* Shimmer sweep */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.25) 48%, transparent 65%)',
                  transform: `translateX(${shimmerTx}%)`,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── SCENE 3 — USP flashes ──────────────────────────────── */}
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

      {/* ─── SCENE 4 — Discover + huge mark + CTA ──────────────── */}
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
    </div>
  );
}

// ─── Scene-2 entry choreography helpers ───
type PhoneEntry = { transform: string; origin: string; opacity: number };

function phoneEntryStyle(anim: ReelPhoneAnim, localT: number): PhoneEntry {
  // Common exit zoom across all variants: scale stays at 1 / opacity at
  // 1 until ~3.4s (85% of the 4.0s scene), then zooms to 1.35 + fades to
  // 0 over the remaining 0.6s. Translated from @keyframes s2PhoneZoomOut.
  const exitP = clamp((localT - 3.4) / 0.6, 0, 1);
  const exitE = Easing.easeOutCubic(exitP);
  const exitScale = 1 + exitE * 0.35;
  const exitOpacity = 1 - exitE;

  if (anim === 'iris' || anim === 'streak') {
    // Settle: scale 0.96 → 1, opacity 0 → 1 over 0.6s.
    const p = clamp(localT / 0.6, 0, 1);
    const e = Easing.easeOutCubic(p);
    const settleScale = 0.96 + e * 0.04;
    const settleOpacity = e;
    const finalScale = settleScale * exitScale;
    return {
      transform: `translate(-50%, -50%) scale(${finalScale})`,
      origin: '50% 50%',
      opacity: settleOpacity * exitOpacity,
    };
  }

  if (anim === 'drop') {
    // Drop with bounce: ty goes 0% → 60% (-180% → -46%) then 60% → 80%
    // (-46% → -52%) then 80% → 100% (-52% → -50%).
    const p = clamp((localT - 0.05) / 1.1, 0, 1);
    const ty = piecewiseDrop(p);
    const opP = clamp(p / 0.6, 0, 1);
    const opacity = opP * exitOpacity;
    return {
      transform: `translate(-50%, ${ty}%) scale(${exitScale})`,
      origin: '50% 50%',
      opacity,
    };
  }

  if (anim === 'tilt') {
    // Tilt: rotateX 60deg → 0deg, scale 0.95 → 1, ty -90% → -50%.
    const p = clamp((localT - 0.05) / 1.2, 0, 1);
    const e = Easing.easeOutCubic(p);
    const rotateX = 60 - 60 * e;
    const ty = -90 + 40 * e;
    const scale = (0.95 + 0.05 * e) * exitScale;
    const opP = clamp(p / 0.6, 0, 1);
    const opacity = opP * exitOpacity;
    return {
      transform: `translate(-50%, ${ty}%) rotateX(${rotateX}deg) scale(${scale})`,
      origin: '50% 100%',
      opacity,
    };
  }

  return { transform: 'translate(-50%, -50%)', origin: '50% 50%', opacity: 1 };
}

/** Piecewise easing for the drop bounce. Returns translateY % (negative
 *  = above centre). 0 = -180%, 0.6 = -46%, 0.8 = -52%, 1 = -50%. */
function piecewiseDrop(p: number): number {
  if (p <= 0.6) {
    const local = p / 0.6;
    const e = Easing.easeOutCubic(local);
    return -180 + e * 134;
  }
  if (p <= 0.8) {
    const local = (p - 0.6) / 0.2;
    return -46 + local * -6;
  }
  const local = (p - 0.8) / 0.2;
  return -52 + local * 2;
}

/** Returns the screen-interior clip-path string for the iris/streak
 *  variants. drop/tilt have no clip-path (the screen is fully visible
 *  from the start; the phone body itself does the entry). */
function phoneScreenReveal(anim: ReelPhoneAnim, localT: number): { clipPath: string } {
  if (anim === 'iris') {
    // 0% → 80% radius circle at centre over 1.3s starting at 0.05s.
    const p = clamp((localT - 0.05) / 1.3, 0, 1);
    const e = Easing.easeOutCubic(p);
    const radius = e * 80;
    return { clipPath: `circle(${radius}% at 50% 50%)` };
  }
  if (anim === 'streak') {
    // inset(100% 0 0 0) → inset(0 0 0 0) over 1.4s starting at 0.25s.
    const p = clamp((localT - 0.25) / 1.4, 0, 1);
    const e = Easing.easeOutCubic(p);
    const top = (1 - e) * 100;
    return { clipPath: `inset(${top}% 0 0 0)` };
  }
  return { clipPath: 'inset(0 0 0 0)' };
}

/** Scene-3 USP line lifecycle: blur-in 8 → 0px, ty +20 → 0, opacity
 *  0 → 1 → 0. Returns the live values for the given local time and
 *  start-of-line offset. */
function uspLineStyle(localT: number, startAt: number, dur: number, tyAmp: number): {
  opacity: number;
  ty: number;
  blur: number;
} {
  const p = clamp((localT - startAt) / dur, 0, 1);
  if (p <= 0) return { opacity: 0, ty: tyAmp, blur: 8 };
  if (p >= 1) return { opacity: 0, ty: -tyAmp, blur: 6 };
  // 0 → 0.2 ease-in (rise), 0.2 → 0.8 hold, 0.8 → 1 ease-out (fall).
  if (p < 0.2) {
    const local = p / 0.2;
    const e = Easing.easeOutCubic(local);
    return { opacity: e, ty: tyAmp * (1 - e), blur: 8 * (1 - e) };
  }
  if (p < 0.8) {
    return { opacity: 1, ty: 0, blur: 0 };
  }
  const local = (p - 0.8) / 0.2;
  const e = Easing.easeOutCubic(local);
  return { opacity: 1 - e, ty: -tyAmp * e, blur: 6 * e };
}
