// Gift Guide — black gift box opens, 4 curated picks stagger into a 2×2
// grid, sparkles pop, a diagonal copper ribbon slides across and ties
// the frame shut before the foot CTA fades in.
// Ported from the Claude-Design HTML prototype `04-gift-guide`.

import {
  Easing,
  clamp,
  interpolate,
  useTimeline,
  useSafeZone,
  useFieldColor,
  useFieldFormat,
} from '../../engine';
import type { GiftGuideProps } from './schema';
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
  props: GiftGuideProps;
  timeScale?: number;
  width?: number;
  height?: number;
};

// Sparkle positions on base 1080×1920 canvas. Slightly deterministic so the
// sparkle pattern is reproducible at the same timeScale; per-sparkle delay
// from a fixed array rather than Math.random so SSR/hydration is safe.
const SPARKLES = [
  { x: 180, y: 700,  delay: 0.12 },
  { x: 900, y: 780,  delay: 0.48 },
  { x: 120, y: 1400, delay: 0.21 },
  { x: 940, y: 1320, delay: 0.64 },
  { x: 540, y: 600,  delay: 0.05 },
  { x: 260, y: 1620, delay: 0.35 },
  { x: 820, y: 1580, delay: 0.72 },
];

const LID_OPEN_START = 1.2;
const LID_OPEN_END = 2.2;
const CELLS_IN_START = 2.2;
const RIBBON_START = 7.5;
const FOOT_START = 8.2;

export function GiftGuideScene({
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

  // Destructure before hooks so bases reference live brand values.
  const {
    colors,
    boutiqueName,
    kicker,
    headLine1,
    headLine2,
    boxLabel,
    picks,
    ribbonLabel,
    footKicker,
    footHead,
    ctaButton,
    logo,
  } = props;
  const logoColor = useFieldColor('logo', colors.ink);

  const kickerStyle = useFieldFormat('kicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const headLineStyle = useFieldFormat('headLine1', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(150),
    fontWeight: 300,
    lineHeight: 0.95,
    letterSpacing: '-0.03em',
    color: colors.ink,
  });
  const footHeadStyle = useFieldFormat('footHead', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(76),
    lineHeight: 1,
    letterSpacing: '-0.02em',
    color: colors.ink,
  });
  const ctaButtonStyle = useFieldFormat('ctaButton', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(26),
    fontWeight: 800,
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const headLine2Style = useFieldFormat('headLine2', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(150),
    fontWeight: 300,
    lineHeight: 0.95,
    letterSpacing: '-0.03em',
    color: colors.ink,
  });
  const boxLabelStyle = useFieldFormat('boxLabel', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(86),
    letterSpacing: '-0.02em',
    color: colors.cream,
  });
  const ribbonLabelStyle = useFieldFormat('ribbonLabel', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 800,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: colors.accent,
  });
  const footKickerStyle = useFieldFormat('footKicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.60)',
  });
  const pickNameStyle = useFieldFormat('picks.*.name', {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: wh(24),
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: colors.ink,
  });
  const pickSubStyle = useFieldFormat('picks.*.sub', {
    fontFamily: 'var(--font-body)',
    fontStyle: 'normal',
    fontSize: wh(20),
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: colors.accent,
  });
  const boutiqueNameStyle = useFieldFormat('boutiqueName', {
    fontFamily: 'var(--font-display)',
    fontSize: wh(28),
    fontWeight: 300,
    letterSpacing: '-0.03em',
  });

  // Title fade-in
  const titleP = clamp(time / Math.max(T(0.8), 0.01), 0, 1);
  const titleOp = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(titleP);
  const titleY = interpolate([0, 1], [30, 0], Easing.easeOutExpo)(titleP);

  // Lid rotation + lift
  let lidRot = 0;
  let lidTy = 0;
  let lidOp = 1;
  if (time < T(LID_OPEN_START)) {
    lidRot = 0;
    lidTy = 0;
    lidOp = 1;
  } else if (time < T(LID_OPEN_END)) {
    const p = (time - T(LID_OPEN_START)) / (T(LID_OPEN_END) - T(LID_OPEN_START));
    lidRot = interpolate([0, 1], [0, -110], Easing.easeOutExpo)(p);
    lidTy = interpolate([0, 1], [0, -40], Easing.easeOutExpo)(p);
    lidOp = p > 0.6 ? interpolate([0.6, 1], [1, 0.4], Easing.linear)(p) : 1;
  } else {
    lidRot = -130;
    lidTy = -80;
    const p = clamp((time - T(LID_OPEN_END)) / Math.max(T(0.5), 0.01), 0, 1);
    lidOp = interpolate([0, 1], [0.4, 0], Easing.easeInCubic)(p);
  }

  // Ribbon slide + label scale-in
  const ribbonP = clamp((time - T(RIBBON_START)) / Math.max(T(0.7), 0.01), 0, 1);
  const ribbonOp = time >= T(RIBBON_START)
    ? interpolate([0, 1], [0, 1], Easing.easeOutCubic)(ribbonP)
    : 0;
  const ribbonTx = time >= T(RIBBON_START)
    ? interpolate([0, 1], [-1200, 0], Easing.easeOutExpo)(ribbonP)
    : -1200;
  const labelP = clamp((time - T(RIBBON_START + 0.4)) / Math.max(T(0.5), 0.01), 0, 1);
  const labelOp = time >= T(RIBBON_START + 0.4)
    ? interpolate([0, 1], [0, 1], Easing.easeOutCubic)(labelP)
    : 0;
  const labelScale = time >= T(RIBBON_START + 0.4)
    ? interpolate([0, 1], [0.7, 1], Easing.easeOutExpo)(labelP)
    : 0.7;

  // Foot CTA fade-in + title fade-out when CTA arrives
  const footP = clamp((time - T(FOOT_START)) / Math.max(T(0.7), 0.01), 0, 1);
  const footOp = time >= T(FOOT_START)
    ? interpolate([0, 1], [0, 1], Easing.easeOutCubic)(footP)
    : 0;
  const footY = time >= T(FOOT_START)
    ? interpolate([0, 1], [30, 0], Easing.easeOutExpo)(footP)
    : 30;
  const titleFadeP = clamp((time - T(FOOT_START)) / Math.max(T(0.6), 0.01), 0, 1);
  const titleLateOp = time >= T(FOOT_START)
    ? interpolate([0, 1], [1, 0], Easing.easeInCubic)(titleFadeP)
    : 1;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: colors.background,
        color: colors.ink,
        overflow: 'hidden',
      }}
    >
      {/* Warm paper wash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, rgba(255,248,242,0.8), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(184,114,83,0.08), transparent 65%)`,
          zIndex: 0,
        }}
      />

      {/* Top — brand + kicker + head. Pinned below the top safe zone so
       *  "For her, with love." doesn't sit under the IG progress bar. */}
      <div
        style={{
          position: 'absolute',
          top: Math.max(h(80), safe.top),
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          opacity: titleOp * titleLateOp,
          transform: `translateY(${h(titleY)}px)`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: h(22) }}>
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
        <div
          style={{
            ...kickerStyle,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            marginTop: h(18),
            padding: `0 ${w(40)}px`,
            ...headLineStyle,
          }}
        >
          {headLine1}
          <br />
          <span style={{ ...headLine2Style }}>{headLine2}</span>
        </div>
      </div>

      {/* Gift box */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h(620),
          bottom: h(260),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: w(720),
            height: h(880),
            perspective: `${wh(1800)}px`,
            perspectiveOrigin: '50% 40%',
          }}
        >
          {/* Body */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: h(180),
              bottom: 0,
              background: `linear-gradient(180deg, #1a1a1a 0%, ${colors.ink} 100%)`,
              boxShadow: `inset 0 ${h(30)}px ${h(60)}px rgba(0,0,0,0.6), 0 ${h(20)}px ${h(60)}px rgba(0,0,0,0.4)`,
              overflow: 'hidden',
              zIndex: 4,
            }}
          >
            {/* Copper body seam */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: w(24),
                transform: 'translateX(-50%)',
                background: colors.accent,
                zIndex: 5,
              }}
            />
            {/* 2×2 grid of picks */}
            <div
              style={{
                position: 'absolute',
                inset: w(40),
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: w(18),
                zIndex: 3,
              }}
            >
              {picks.slice(0, 4).map((p, i) => {
                const inStart = T(CELLS_IN_START + i * 0.35);
                const inEnd = inStart + T(0.8);
                let op = 0;
                let sc = 0.7;
                let ty = 80;
                if (time < inStart) {
                  op = 0;
                  sc = 0.7;
                  ty = 80;
                } else if (time < inEnd) {
                  const lp = (time - inStart) / (inEnd - inStart);
                  op = interpolate([0, 1], [0, 1], Easing.easeOutCubic)(lp);
                  ty = interpolate([0, 1], [80, 0], Easing.easeOutExpo)(lp);
                  sc = interpolate([0, 1], [0.7, 1], Easing.easeOutExpo)(lp);
                } else {
                  op = 1;
                  const lp = time - inEnd;
                  ty = Math.sin(lp + i) * 3;
                  sc = 1;
                }
                return (
                  <div
                    key={p.id}
                    style={{
                      position: 'relative',
                      background: colors.cream,
                      overflow: 'hidden',
                      opacity: op,
                      transform: `translateY(${h(ty)}px) scale(${sc})`,
                    }}
                  >
                    <img
                      src={p.src}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: w(14),
                        bottom: h(14),
                        right: w(14),
                        ...pickNameStyle,
                      }}
                    >
                      {p.name}
                      <small
                        style={{
                          display: 'block',
                          marginTop: h(4),
                          ...pickSubStyle,
                        }}
                      >
                        {p.sub}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lid (tilts back, lifts) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: h(220),
              background: `linear-gradient(180deg, ${colors.ink} 0%, #1a1a1a 100%)`,
              zIndex: 8,
              boxShadow: `0 ${h(12)}px ${h(30)}px rgba(0,0,0,0.35)`,
              transformOrigin: '50% 100%',
              transform: `translateY(${h(lidTy)}px) rotateX(${lidRot}deg)`,
              opacity: lidOp,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: w(24),
                transform: 'translateX(-50%)',
                background: colors.accent,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                ...boxLabelStyle,
              }}
            >
              {boxLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Sparkles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9 }}>
        {SPARKLES.map((sp, i) => {
          const at = T(3.2 + sp.delay + i * 0.1);
          const dur = T(0.7);
          let op = 0;
          let rot = 45;
          let scale = 0.3;
          if (time >= at && time <= at + dur) {
            const p = (time - at) / dur;
            op = Math.sin(p * Math.PI);
            rot = 45 + p * 180;
            scale = interpolate([0, 1], [0.3, 1.4], Easing.easeOutExpo)(p);
          }
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: w(sp.x),
                top: h(sp.y),
                width: wh(14),
                height: wh(14),
                background: colors.accent,
                opacity: op,
                transform: `rotate(${rot}deg) scale(${scale})`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: wh(28),
                  height: wh(1.5),
                  background: colors.accent,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: wh(1.5),
                  height: wh(28),
                  background: colors.accent,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Copper ribbon + tag */}
      <div
        style={{
          position: 'absolute',
          left: -w(100),
          right: -w(100),
          top: '50%',
          height: h(56),
          background: colors.accent,
          transform: `translateY(-50%) rotate(-6deg) translateX(${w(ribbonTx)}px)`,
          zIndex: 15,
          opacity: ribbonOp,
          boxShadow: `0 ${h(12)}px ${h(32)}px rgba(184,114,83,0.35)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 2,
            background: 'rgba(255,255,255,0.35)',
            left: w(220),
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 2,
            background: 'rgba(255,255,255,0.35)',
            right: w(220),
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) rotate(-6deg) scale(${labelScale})`,
          zIndex: 16,
          padding: `${h(18)}px ${w(48)}px`,
          background: colors.ink,
          whiteSpace: 'nowrap',
          ...ribbonLabelStyle,
          opacity: (ribbonLabelStyle.opacity ?? 1) * labelOp,
        }}
      >
        {ribbonLabel}
      </div>

      {/* Foot CTA — lifted above the bottom safe zone so the "Shop the
       *  gift edit" button and its headline clear the IG caption area. */}
      <div
        style={{
          position: 'absolute',
          bottom: Math.max(h(60), safe.bottom),
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 20,
          opacity: footOp,
          transform: `translateY(${h(footY)}px)`,
        }}
      >
        <div
          style={{
            marginBottom: h(14),
            ...footKickerStyle,
          }}
        >
          {footKicker}
        </div>
        <div
          style={{
            marginBottom: h(24),
            padding: `0 ${w(60)}px`,
            ...footHeadStyle,
          }}
        >
          {footHead}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert('Tapping through…');
          }}
          style={{
            padding: `${h(22)}px ${w(60)}px`,
            background: colors.ink,
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
