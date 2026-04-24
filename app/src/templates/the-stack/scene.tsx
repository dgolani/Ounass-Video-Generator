// The Stack — four luxury houses drop as metallic bullion plates,
// stacking with gravity. Each landing compresses the stack below,
// then a bronze-foil seal stamps lower-right. Ported from the
// Claude-Design HTML prototype `The Stack.html` — CSS animation-delay
// timings are translated directly to interpolate() / animate() calls
// on useTimeline().time.
//
// Timeline (exactly mirrors the HTML comment):
//   T0.00 – T0.90  Logo + kicker + hairline settle
//   T0.90 – T2.10  Plate 01 VALENTINO drops, wobbles
//   T2.10 – T3.30  Plate 02 drops (stack compresses)
//   T3.30 – T4.50  Plate 03 drops
//   T4.50 – T5.70  Plate 04 drops (stack locks)
//   T5.70 – T7.30  Index column 01-04 draws in
//   T7.30 – T8.40  SEAL stamp presses in
//   T8.40 – T10.5  CTA + byline

import {
  Easing,
  animate,
  clamp,
  interpolate,
  useFieldColor,
  useFieldFormat,
  useSafeZone,
  useThemedColors,
  useTimeline,
} from '../../engine';
import type { StackProps } from './schema';
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
  props: StackProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

// Stack-Y positions (base px) — each plate lands 170px below the one above
// on 9:16, 125px on 4:5 (the HTML uses the same override pattern).
const PLATE_Y_9_16 = [0, 170, 340, 510];
const PLATE_Y_4_5 = [0, 125, 250, 375];

// Per-plate drop timing (seconds) — matches the CSS animation-delay /
// duration of each .pN plate in the HTML.
const DROP_START = [0.60, 1.80, 3.00, 4.20];
const DROP_DUR = [1.15, 1.05, 1.0, 1.0];
// Rake (light sheen) timing — runs once as the plate lands.
const RAKE_START = [1.55, 2.65, 3.80, 4.95];
const RAKE_DUR = 0.7;
// Entry rotations — each plate enters at a slightly different tilt
// so the motion reads organic (not mechanical).
const ENTRY_ROT = [-3, 2.5, -2, 3];
const BOUNCE_ROT = [2, -1.8, 1.2, -1];
// Index column strokes (each number fades in staggered, 5.90-6.35s).
const INDEX_FADE_START = [5.90, 6.05, 6.20, 6.35];
// Seal + CTA entry times.
const SEAL_START = 7.30;
const SEAL_DUR = 0.65;
const CTA_START = 8.40;
const CTA_DUR = 0.6;
const BYLINE_START = 8.60;
const BYLINE_DUR = 0.55;
const RULE_START = 0.50;
const RULE_DUR = 0.90;

export function TheStackScene({
  props,
  timeScale = 1,
  width = BASE_W,
  height = BASE_H,
}: SceneProps) {
  const { time: t } = useTimeline();
  const T = (x: number) => x * timeScale;
  const s = makeScale(width, height);
  const { w, h, wh, W } = s;
  const { base: safe } = useSafeZone({ width, height });
  const is45 = Math.abs(width / height - 4 / 5) < 0.01;

  // Theme resolution — this template opts into supportsThemes. Returns
  // `colors.light` or `colors.dark` depending on editor's theme toggle.
  const colors = useThemedColors(props.colors);

  // Destructure brand-driven props BEFORE any useFieldFormat call so
  // brand-color edits (via the palette) re-trigger the hook's deps.
  const {
    boutiqueName,
    logo,
    backgroundImage,
    kickerSmall,
    kickerMain,
    kickerSmallRight,
    plates,
    sealWord1,
    sealWord2,
    sealWord3,
    ctaText,
    bylineStart,
    bylineItalic,
  } = props;

  // Logo tint override (Aa button on the logo field).
  const logoColor = useFieldColor('logo', colors.ink);

  // ── Per-field format overrides (chrome text + CTA) ────────────────
  const kickerSmallStyle = useFieldFormat('kickerSmall', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(16),
    fontWeight: 500,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
  });
  const kickerMainStyle = useFieldFormat('kickerMain', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 800,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: colors.ink,
  });
  const ctaStyle = useFieldFormat('ctaText', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(30),
    fontWeight: 700,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: colors.ctaText,
  });
  const bylineStyle = useFieldFormat('bylineStart', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: wh(26),
    letterSpacing: '0.02em',
    color: colors.ink,
    opacity: 0.6,
  });

  // The HTML uses --safe-cx (480 on 9:16, 540 on 4:5) as the
  // horizontal centering anchor. Reproduce that directly.
  // (safe.top isn't referenced by name here because the fixed base-px
  //  y positions in the HTML prototype already sit inside the safe rect
  //  — we keep them verbatim for layout fidelity.)
  const safeCX = is45 ? 540 : 480;
  void safe;

  // ── Intro chrome fades (logo / kicker / top rule) ─────────────────
  const logoOpacity = interpolate([T(0.05), T(0.05 + 0.55)], [0, 1], Easing.easeOutCubic)(t);
  const kickerOpacity = interpolate(
    [T(0.30), T(0.30 + 0.55)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const ruleScaleX = animate({
    from: 0,
    to: 1,
    start: T(RULE_START),
    end: T(RULE_START + RULE_DUR),
    ease: Easing.easeOutExpo,
  })(t);

  // ── Plate drop helper ─────────────────────────────────────────────
  // The CSS drop keyframe is a 5-stop curve:
  //   0%   y = -1400, rot = entryRot, opacity 0
  //   3%   opacity 1
  //   55%  y = land + 24, rot unchanged (pre-bounce overshoot)
  //   65%  y = land + 28, rot = bounceRot (max bounce)
  //   78%  y = land - 4,  rot = bounceRot * -0.3 (settle back a touch)
  //   100% y = land, rot = 0
  function plateTransform(i: number, landY: number) {
    const start = T(DROP_START[i]);
    const dur = T(DROP_DUR[i]);
    const p = clamp((t - start) / dur, 0, 1);
    if (p <= 0) {
      return { y: -1400, rot: ENTRY_ROT[i], opacity: 0 };
    }
    if (p >= 1) {
      // Post-drop: check for load-press effects from later plates
      // landing on top of this one. Values come from the HTML's
      // .press-N classes (each press adds a 2-6 px dip + settle).
      let settled = landY;
      // Plates press the ones BELOW them in the stack sequence.
      // Press events fire when each subsequent plate lands.
      const pressEvents: Array<{ at: number; press: number; settle: number }> = [];
      if (i === 0) {
        pressEvents.push({ at: DROP_START[1] + DROP_DUR[1], press: 3, settle: 1 });
        pressEvents.push({ at: DROP_START[2] + DROP_DUR[2], press: 4, settle: 2 });
        pressEvents.push({ at: DROP_START[3] + DROP_DUR[3], press: 6, settle: 3 });
      } else if (i === 1) {
        pressEvents.push({ at: DROP_START[2] + DROP_DUR[2], press: 2, settle: 1 });
        pressEvents.push({ at: DROP_START[3] + DROP_DUR[3], press: 4, settle: 2 });
      } else if (i === 2) {
        pressEvents.push({ at: DROP_START[3] + DROP_DUR[3], press: 2, settle: 1 });
      }
      for (const ev of pressEvents) {
        const pressDur = 0.55;
        const tp = clamp((t - T(ev.at)) / T(pressDur), 0, 1);
        if (tp > 0 && tp < 1) {
          // During the press, dip toward landY + press, then ease back to landY + settle.
          const dip = tp < 0.4 ? (tp / 0.4) * ev.press : ev.press - ((tp - 0.4) / 0.6) * (ev.press - ev.settle);
          settled = landY + dip;
        } else if (tp >= 1) {
          settled = landY + ev.settle;
        }
      }
      return { y: settled, rot: 0, opacity: 1 };
    }
    // During drop animation
    let y: number;
    let rot: number;
    const opacity = p >= 0.03 ? 1 : interpolate([0, 0.03], [0, 1])(p);
    if (p < 0.55) {
      // -1400 → land + 24 (with easeOutExpo-like feel; we approximate)
      const q = p / 0.55;
      const eased = 1 - Math.pow(1 - q, 3); // easeOutCubic proxy
      y = -1400 + (landY + 24 - -1400) * eased;
      rot = ENTRY_ROT[i];
    } else if (p < 0.65) {
      const q = (p - 0.55) / 0.10;
      y = landY + 24 + q * (landY + 28 - (landY + 24));
      rot = ENTRY_ROT[i] + q * (BOUNCE_ROT[i] - ENTRY_ROT[i]);
    } else if (p < 0.78) {
      const q = (p - 0.65) / 0.13;
      y = landY + 28 + q * (landY - 4 - (landY + 28));
      rot = BOUNCE_ROT[i] + q * (BOUNCE_ROT[i] * -0.3 - BOUNCE_ROT[i]);
    } else {
      const q = (p - 0.78) / 0.22;
      y = landY - 4 + q * (landY - (landY - 4));
      rot = BOUNCE_ROT[i] * -0.3 + q * (0 - BOUNCE_ROT[i] * -0.3);
    }
    return { y, rot, opacity };
  }

  // ── Light-rake sheen (once per plate as it lands) ─────────────────
  function rakeX(i: number): { left: number; opacity: number } {
    const start = T(RAKE_START[i]);
    const end = T(RAKE_START[i] + RAKE_DUR);
    const p = clamp((t - start) / (end - start), 0, 1);
    if (p <= 0) return { left: -25, opacity: 0 };
    if (p >= 1) return { left: 125, opacity: 0 };
    const left = -25 + p * 150;
    const opacity = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
    return { left, opacity };
  }

  // ── Index column (rail + 4 numbers) ──────────────────────────────
  const railScaleY = animate({
    from: 0,
    to: 1,
    start: T(5.70),
    end: T(5.70 + 1.0),
    ease: Easing.easeOutExpo,
  })(t);
  const indexTextOpacity = (i: number) => {
    const start = T(INDEX_FADE_START[i]);
    return interpolate([start, start + T(0.5)], [0, 1], Easing.easeOutExpo)(t);
  };
  const indexTextTx = (i: number) => {
    const start = T(INDEX_FADE_START[i]);
    return interpolate([start, start + T(0.5)], [-8, 0], Easing.easeOutExpo)(t);
  };

  // ── Seal stamp (presses in at T7.30) ──────────────────────────────
  const sealP = clamp((t - T(SEAL_START)) / T(SEAL_DUR), 0, 1);
  const sealOpacity = sealP > 0.4 ? 1 : sealP / 0.4;
  const sealScale = 1.8 - sealP * 0.8; // 1.8 → 1.0

  // ── CTA + byline fades ────────────────────────────────────────────
  const ctaOpacity = interpolate(
    [T(CTA_START), T(CTA_START + CTA_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);
  const ctaShineLeft = interpolate(
    [T(9.0), T(9.0 + 1.6)],
    [-40, 140],
    Easing.easeOutCubic,
  )(t);
  const bylineOpacity = interpolate(
    [T(BYLINE_START), T(BYLINE_START + BYLINE_DUR)],
    [0, 1],
    Easing.easeOutCubic,
  )(t);

  // ── Layout positions (base px) ────────────────────────────────────
  const logoTop = is45 ? 150 : 290;
  const kickerTop = is45 ? 245 : 405;
  const ruleTop = is45 ? 295 : 475;
  const stackTop = is45 ? 330 : 560;
  const stackIndexLeft = is45 ? 70 : 60;
  const stackIndexTop = is45 ? 330 : 560;
  const indexNYPositions = is45 ? [55, 180, 305, 430] : [80, 250, 420, 590];
  const sealRight = is45 ? 80 : 90;
  const sealTop = is45 ? 950 : 1350;
  const sealSize = is45 ? 90 : 100;
  const ctaTop = is45 ? 970 : 1470;
  const bylineTop = is45 ? 1095 : 1575;
  const plateW = is45 ? 820 : 760;
  const plateH = is45 ? 125 : 170;
  const plateLeftOffset = 40; // offset right so plates clear the left index gutter
  // Sized so the longest supported brand name ("BOTTEGA VENETA" = 14 chars at
  // letter-spacing 0.18em) still clears the left origin label (~80px inc. pad)
  // and the right year/subheading label zone (~160px inc. pad) on both aspects.
  const plateBrandSize = is45 ? 40 : 44;
  const plateYPositions = is45 ? PLATE_Y_4_5 : PLATE_Y_9_16;

  const metalGradient = `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.0) 12%, rgba(0,0,0,0.0) 88%, rgba(0,0,0,0.25) 100%), linear-gradient(170deg, ${colors.metalDark} 0%, ${colors.metalMid} 25%, ${colors.metalLight} 50%, ${colors.metalMid} 75%, ${colors.metalDeepest} 100%)`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: colors.background,
        overflow: 'hidden',
        color: colors.ink,
      }}
    >
      {/* Background — either uploaded image (replaces gradient) or paper + grain */}
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at 50% 42%, ${lighten(colors.background, 0.03)} 0%, ${colors.background} 50%, ${colors.backgroundDeep} 100%)`,
              zIndex: 0,
            }}
          />
          {/* Subtle grain */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.35,
              mixBlendMode: 'multiply',
              backgroundImage: `radial-gradient(${hexToRgba(colors.ink, 0.04)} 1px, transparent 1px), radial-gradient(${hexToRgba(colors.ink, 0.03)} 1px, transparent 1px)`,
              backgroundSize: '3px 3px, 7px 7px',
              backgroundPosition: '0 0, 1px 2px',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* ── Act 0: logo + kicker + top rule ──────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(logoTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          opacity: logoOpacity,
        }}
      >
        <BoutiqueLogo
          logo={logo}
          boutiqueName={boutiqueName}
          color={logoColor}
          width={w(is45 ? 360 : 420)}
          height={h(is45 ? 80 : 90)}
          fontSize={wh(is45 ? 64 : 72)}
          letterSpacing="14px"
        />
      </div>

      {/* Kicker row */}
      <div
        style={{
          position: 'absolute',
          top: h(kickerTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'baseline',
          gap: wh(18),
          opacity: kickerOpacity,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={kickerSmallStyle}>{kickerSmall}</span>
        <span
          aria-hidden
          style={{
            width: wh(6),
            height: wh(6),
            borderRadius: '50%',
            background: colors.accent,
            alignSelf: 'center',
          }}
        />
        <span style={kickerMainStyle}>{kickerMain}</span>
        <span
          aria-hidden
          style={{
            width: wh(6),
            height: wh(6),
            borderRadius: '50%',
            background: colors.accent,
            alignSelf: 'center',
          }}
        />
        <span style={kickerSmallStyle}>{kickerSmallRight}</span>
      </div>

      {/* Top rule — hairline between kicker and stack */}
      <div
        style={{
          position: 'absolute',
          top: h(ruleTop),
          left: w(safeCX),
          transform: `translateX(-50%) scaleX(${ruleScaleX})`,
          transformOrigin: 'center',
          width: w(720),
          height: 1,
          background: colors.ink,
          opacity: 0.45,
        }}
      />

      {/* ── The Stack — 4 plates that drop and stack ─────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(stackTop),
          left: 0,
          width: W,
          height: h(is45 ? 600 : 780),
        }}
      >
        {plates.slice(0, 4).map((plate, i) => {
          const landY = plateYPositions[i] ?? 0;
          const { y, rot, opacity } = plateTransform(i, landY);
          const rake = rakeX(i);
          return (
            <div
              key={plate.id}
              style={{
                position: 'absolute',
                // Offset right so plates clear the left index gutter (x=60-110)
                left: w(safeCX + plateLeftOffset),
                width: w(plateW),
                height: h(plateH),
                transform: `translateX(-50%) translateY(${h(y)}px) rotate(${rot}deg)`,
                opacity,
                background: metalGradient,
                borderRadius: wh(6),
                boxShadow: `0 ${h(2)}px 0 ${hexToRgba(colors.engraved, 0.08)} inset, 0 ${h(-3)}px 0 rgba(0,0,0,0.35) inset, 0 ${h(30)}px ${h(60)}px ${h(-25)}px ${hexToRgba(colors.ink, 0.4)}, 0 ${h(8)}px ${h(20)}px ${h(-10)}px ${hexToRgba(colors.ink, 0.3)}`,
                overflow: 'hidden',
              }}
            >
              {/* Moving highlight band (rake) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${rake.left}%`,
                  width: '50%',
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%)',
                  transform: 'skewX(-18deg)',
                  opacity: rake.opacity,
                  pointerEvents: 'none',
                }}
              />

              {/* Engraved brand name (center) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 800,
                  fontSize: wh(plateBrandSize),
                  letterSpacing: '0.18em',
                  color: colors.engraved,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textShadow: '0 -1px 0 rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                {plate.brand}
              </div>

              {/* Tiny metadata engraved on each plate — left origin + right year */}
              <div
                style={{
                  position: 'absolute',
                  left: wh(30),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: wh(12),
                  letterSpacing: '0.24em',
                  color: hexToRgba(colors.engraved, 0.45),
                  lineHeight: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                {plate.indexLabel}
                <br />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: wh(13),
                    letterSpacing: '0.02em',
                    color: hexToRgba(colors.engraved, 0.35),
                    textTransform: 'none',
                  }}
                >
                  {plate.origin}
                </span>
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: wh(30),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: wh(14),
                  letterSpacing: '0.22em',
                  color: colors.foil,
                  textAlign: 'right',
                  lineHeight: 1.5,
                }}
              >
                {plate.yearRoman}
                <br />
                <span
                  style={{
                    fontWeight: 500,
                    color: hexToRgba(colors.foil, 0.6),
                    fontSize: wh(12),
                  }}
                >
                  {plate.subheading}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Stack index gutter on the left ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          left: w(stackIndexLeft),
          top: h(stackIndexTop),
          width: w(60),
          height: h(is45 ? 600 : 780),
          pointerEvents: 'none',
        }}
      >
        {/* Vertical rail */}
        <div
          style={{
            position: 'absolute',
            left: w(10),
            top: 0,
            width: 1,
            height: '100%',
            background: colors.ink,
            opacity: 0.35,
            transform: `scaleY(${railScaleY})`,
            transformOrigin: 'top',
          }}
        />
        {/* Index numbers — 01 / 02 / 03 / 04 */}
        {plates.slice(0, 4).map((plate, i) => {
          const yPos = indexNYPositions[i] ?? 0;
          return (
            <div
              key={plate.id}
              style={{
                position: 'absolute',
                left: 0,
                top: h(yPos),
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: wh(18),
                letterSpacing: '0.1em',
                color: colors.ink,
                opacity: indexTextOpacity(i),
                transform: `translateX(${w(indexTextTx(i))}px)`,
              }}
            >
              {plate.indexLabel}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: wh(8),
                  top: wh(10),
                  width: wh(20),
                  height: 1,
                  background: colors.ink,
                  opacity: 0.35,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Bronze foil seal — stamps in at T7.30 ────────────────── */}
      <div
        style={{
          position: 'absolute',
          right: w(sealRight),
          top: h(sealTop),
          width: wh(sealSize),
          height: wh(sealSize),
          opacity: sealOpacity,
          transform: `rotate(-8deg) scale(${sealScale})`,
        }}
      >
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <radialGradient id="stack-foil-grad" cx="35%" cy="35%" r="80%">
              <stop offset="0%" stopColor={lighten(colors.foil, 0.2)} />
              <stop offset="55%" stopColor={colors.accent} />
              <stop offset="100%" stopColor={darken(colors.accent, 0.45)} />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#stack-foil-grad)" />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
          />
          <circle
            cx="100"
            cy="100"
            r="78"
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={1}
          />
          <text
            x="100"
            y="86"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontWeight={400}
            fontSize={22}
            fill={colors.background}
            letterSpacing={2}
          >
            {sealWord1}
          </text>
          <text
            x="100"
            y="118"
            textAnchor="middle"
            fontFamily="var(--font-body)"
            fontWeight={800}
            fontSize={18}
            fill={colors.background}
            letterSpacing={4}
          >
            {sealWord2}
          </text>
          <text
            x="100"
            y="146"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontWeight={400}
            fontSize={18}
            fill={colors.background}
            letterSpacing={4}
          >
            {sealWord3}
          </text>
        </svg>
      </div>

      {/* ── CTA + byline ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: h(ctaTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          textAlign: 'center',
          opacity: ctaOpacity,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            alert('Entering the houses…');
          }}
          style={{
            display: 'inline-block',
            padding: `${h(26)}px ${w(58)}px`,
            background: colors.ctaBg,
            border: 0,
            borderRadius: 999,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            ...ctaStyle,
          }}
        >
          {ctaText}
          {/* CTA shimmer — sweeps across once, starting at T9.0 */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${ctaShineLeft}%`,
              width: '30%',
              background:
                'linear-gradient(90deg, rgba(245,240,232,0) 0%, rgba(245,240,232,0.28) 50%, rgba(245,240,232,0) 100%)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: h(bylineTop),
          left: w(safeCX),
          transform: 'translateX(-50%)',
          width: w(960),
          textAlign: 'center',
          whiteSpace: 'nowrap',
          ...bylineStyle,
          // Multiply animation opacity onto the base-style's hierarchy opacity.
          opacity: (bylineStyle.opacity ?? 1) * bylineOpacity,
        }}
      >
        {bylineStart}{' '}
        <em style={{ fontStyle: 'italic' }}>{bylineItalic}</em>
      </div>
    </div>
  );
}

// ── Tiny color utilities ────────────────────────────────────────────
// We avoid pulling in a full color lib for five one-off tweaks.

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : c;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(0,0,0,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clampChannel(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lighten(hex: string, amt: number): string {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : c;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  const r = clampChannel(((n >> 16) & 255) + 255 * amt);
  const g = clampChannel(((n >> 8) & 255) + 255 * amt);
  const b = clampChannel((n & 255) + 255 * amt);
  return `rgb(${r}, ${g}, ${b})`;
}

function darken(hex: string, amt: number): string {
  return lighten(hex, -amt);
}
