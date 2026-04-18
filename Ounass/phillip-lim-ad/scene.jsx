// scene.jsx — 3.1 Phillip Lim x Ounass — 9-second luxury ad
// 1080×1920 vertical. Uses Stage/Sprite from animations.jsx.

const { useTime, useTimeline, Easing, interpolate, animate, clamp, useSprite } = window;

// Product catalog — all 3.1 Phillip Lim on Ounass
const PRODUCTS = [
  { id: 'skirt',   src: 'images/skirt.png',   name: 'Eyelet Wrap Midi Skirt',     price: '2,480 AED', color: 'Midnight' },
  { id: 'trouser', src: 'images/trouser.png', name: 'Drawstring Wide-leg Trouser',price: '1,890 AED', color: 'Ivory' },
  { id: 'top',     src: 'images/top.png',     name: 'Structured Shoulder Top',    price: '2,120 AED', color: 'Noir' },
  { id: 'denim',   src: 'images/denim.png',   name: 'Pashli Denim Mini Bag',      price: '3,650 AED', color: 'Indigo' },
  { id: 'dress',   src: 'images/dress.png',   name: 'Printed Silk Midi Dress',    price: '4,280 AED', color: 'Emerald' },
];

// ── Act 1 (0.0–1.2s) — title whisper over darkness ─────────────────────
function Act1Title() {
  const { time } = useTimeline();
  const t = time;
  // Bronze hairline grows from center
  const lineH = animate({ from: 0, to: 1080, start: 0.1, end: 0.9, ease: Easing.easeOutExpo })(t);
  // Title fade + rise
  const titleOpacity = interpolate([0.4, 0.8, 1.8, 2.1], [0, 1, 1, 0], Easing.easeInOutCubic)(t);
  const titleY = interpolate([0.4, 0.8], [16, 0], Easing.easeOutCubic)(t);
  const subOpacity = interpolate([0.6, 1.0, 1.8, 2.1], [0, 1, 1, 0], Easing.easeInOutCubic)(t);

  return (
    <>
      {/* vertical hairline */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 1, height: lineH,
        background: 'linear-gradient(to bottom, rgba(196,147,115,0), #C49373 20%, #C49373 80%, rgba(196,147,115,0))',
        transform: 'translate(-0.5px, -50%)',
        opacity: t < 2.0 ? 1 : interpolate([2.0, 2.2], [1, 0])(t),
      }}/>
      {/* kicker */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 780,
        textAlign: 'center',
        color: '#C49373',
        fontFamily: 'Nunito Sans, sans-serif',
        fontWeight: 700, fontSize: 18, letterSpacing: '6px',
        textTransform: 'uppercase',
        opacity: subOpacity,
        transform: `translateY(${titleY}px)`,
      }}>
        On Ounass · Spring '26
      </div>
      {/* brand name */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 870,
        textAlign: 'center',
        color: '#F5F3EF',
        fontFamily: 'Fraunces, serif',
        fontWeight: 300, fontSize: 96, letterSpacing: '-0.02em',
        lineHeight: 1,
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
      }}>
        3.1 Phillip Lim
      </div>
      {/* italic tagline */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 990,
        textAlign: 'center',
        color: 'rgba(245,243,239,0.6)',
        fontFamily: 'Fraunces, serif',
        fontStyle: 'italic', fontWeight: 300, fontSize: 32, letterSpacing: '0.01em',
        opacity: subOpacity,
      }}>
        a study in quiet power
      </div>
    </>
  );
}

// ── Act 2 (2.0–4.2s) — 5 columns slide up from floor (venetian blind reveal)
function Act2Columns() {
  const { time } = useTimeline();
  const t = time;

  // Columns each 216px wide (1080/5)
  const colW = 1080 / 5;

  return (
    <>
      {PRODUCTS.map((p, i) => {
        // Stagger entry: each column rises from below
        const start = 2.0 + i * 0.09;
        const riseT = interpolate([start, start + 0.8], [0, 1], Easing.easeOutExpo)(t);
        const y = (1 - riseT) * 1920;

        // Fine subtle drift during hold (parallax)
        const driftT = clamp((t - (start + 0.8)) / 1.6, 0, 1);
        const drift = driftT * (i % 2 === 0 ? -12 : 12);

        // Exit: columns converge toward center (scale X down + translateX toward center)
        const exitStart = 3.8;
        const exitT = interpolate([exitStart, 4.2], [0, 1], Easing.easeInCubic)(t);
        const centerOffset = (i - 2) * colW;
        const exitX = -centerOffset * exitT;
        const exitScaleX = 1 - exitT * 0.85;
        const exitOpacity = 1 - exitT;

        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: i * colW,
            top: 0,
            width: colW,
            height: 1920,
            transform: `translate(${exitX}px, ${y + drift}px) scaleX(${exitScaleX})`,
            transformOrigin: 'center center',
            opacity: exitOpacity,
            overflow: 'hidden',
            willChange: 'transform, opacity',
          }}>
            <img src={p.src} style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 1080, height: 1620,
              transform: `translate(${-i * colW - colW/2 + 540}px, -50%)`,
              objectFit: 'cover',
              filter: 'saturate(1.05) contrast(1.03)',
            }}/>
            {/* Subtle dark gradient on each for depth */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(${i % 2 === 0 ? '180deg' : '0deg'}, rgba(0,0,0,0.25), transparent 40%, transparent 70%, rgba(0,0,0,0.35))`,
            }}/>
            {/* vertical separator */}
            {i < 4 && <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: 1, background: 'rgba(10,10,10,0.4)',
            }}/>}
          </div>
        );
      })}

      {/* Act 2 caption — sweeps in from left */}
      {t >= 2.4 && t < 4.0 && (() => {
        const capIn = interpolate([2.4, 2.9], [0, 1], Easing.easeOutExpo)(t);
        const capOut = interpolate([3.6, 4.0], [1, 0], Easing.easeInCubic)(t);
        const op = capIn * capOut;
        return (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 860,
            textAlign: 'center',
            opacity: op,
          }}>
            <div style={{
              display: 'inline-block',
              padding: '18px 36px',
              background: 'rgba(10,10,10,0.78)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(196,147,115,0.4)',
            }}>
              <div style={{
                color: '#C49373',
                fontFamily: 'Nunito Sans, sans-serif',
                fontWeight: 700, fontSize: 14, letterSpacing: '4px',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>Five Pieces · One Mood</div>
              <div style={{
                color: '#F5F3EF',
                fontFamily: 'Fraunces, serif',
                fontWeight: 300, fontSize: 54, letterSpacing: '-0.01em',
                lineHeight: 1.05,
              }}>The Considered<br/><em style={{fontWeight:300}}>Wardrobe</em></div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ── Act 3 (4.2–7.2s) — Filmstrip auto-advance ────────────────────────
function Act3Filmstrip({ focusOverride, onFocusClick }) {
  const { time } = useTimeline();
  const t = time;

  // Auto-cycle through products — each gets ~0.5s center
  const cycleStart = 4.3;
  const perProduct = 0.55;
  const autoIdx = Math.floor(clamp((t - cycleStart) / perProduct, 0, PRODUCTS.length - 0.01));
  const focusIdx = focusOverride != null ? focusOverride : autoIdx;

  // Entry: strip slides in from right
  const stripIn = interpolate([4.2, 4.7], [0, 1], Easing.easeOutExpo)(t);
  // Exit: strip dissolves
  const stripOut = interpolate([7.0, 7.4], [1, 0], Easing.easeInCubic)(t);
  const stripOpacity = stripIn * stripOut;

  if (stripOpacity <= 0) return null;

  // Hero card is centered — 720 wide, 1080 tall
  const heroW = 720, heroH = 1080;
  const heroX = (1080 - heroW) / 2;
  const heroY = (1920 - heroH) / 2 - 60;

  const product = PRODUCTS[focusIdx];

  return (
    <div style={{ opacity: stripOpacity }}>
      {/* Background blur layer using current product */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${product.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(80px) brightness(0.35) saturate(1.2)',
        transform: 'scale(1.2)',
        transition: 'background-image 0.3s',
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.2) 40%, rgba(10,10,10,0.85) 100%)',
      }}/>

      {/* Hero image card */}
      <div
        key={product.id}
        style={{
          position: 'absolute',
          left: heroX, top: heroY,
          width: heroW, height: heroH,
          overflow: 'hidden',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
          animation: 'heroIn 0.45s cubic-bezier(.2,.8,.2,1)',
        }}>
        <img src={product.src} style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}/>
        {/* product tag overlay — bottom-left */}
        <div style={{
          position: 'absolute',
          left: 28, bottom: 28,
          padding: '14px 20px',
          background: 'rgba(245,243,239,0.95)',
          minWidth: 260,
        }}>
          <div style={{
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700, fontSize: 10, letterSpacing: '2.5px',
            color: '#9C6B48',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>3.1 Phillip Lim · {product.color}</div>
          <div style={{
            fontFamily: 'Fraunces, serif',
            fontWeight: 300, fontSize: 24, lineHeight: 1.1,
            color: '#1A1A1A',
            letterSpacing: '-0.01em',
            marginBottom: 8,
          }}>{product.name}</div>
          <div style={{
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700, fontSize: 16,
            color: '#1A1A1A',
          }}>{product.price}</div>
        </div>
      </div>

      {/* Filmstrip thumbnails — bottom of frame */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 140,
        display: 'flex', justifyContent: 'center', gap: 10,
        padding: '0 40px',
      }}>
        {PRODUCTS.map((p, i) => {
          const isActive = i === focusIdx;
          return (
            <div
              key={p.id}
              onClick={(e) => { e.stopPropagation(); onFocusClick && onFocusClick(i); }}
              style={{
                width: isActive ? 110 : 90, height: isActive ? 150 : 124,
                overflow: 'hidden',
                border: isActive ? '2px solid #C49373' : '2px solid rgba(245,243,239,0.25)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(.2,.8,.2,1)',
                transform: isActive ? 'translateY(-6px)' : 'translateY(0)',
                boxShadow: isActive ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              <img src={p.src} style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: isActive ? 'none' : 'brightness(0.65)',
                transition: 'filter 0.25s',
              }}/>
            </div>
          );
        })}
      </div>

      {/* Top ribbon: brand + count */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 60px',
      }}>
        <div style={{
          fontFamily: 'Fraunces, serif', fontWeight: 300, fontStyle: 'italic',
          fontSize: 28, color: '#F5F3EF', letterSpacing: '-0.01em',
        }}>Ounass</div>
        <div style={{
          fontFamily: 'Nunito Sans, sans-serif', fontWeight: 700,
          fontSize: 11, letterSpacing: '3px', color: '#C49373',
          textTransform: 'uppercase',
        }}>
          0{focusIdx + 1} / 05
        </div>
      </div>
    </div>
  );
}

// ── Act 4 (7.2–9.0s) — Logo reveal + CTA ──────────────────────────────
function Act4Outro() {
  const { time } = useTimeline();
  const t = time;

  // Bronze diagonal wipe starts at 7.0, covers by 7.5
  const wipeT = interpolate([7.0, 7.5], [0, 1], Easing.easeInOutCubic)(t);
  // Wipe out: bronze retreats revealing black bg with logo
  const wipeOutT = interpolate([7.5, 8.0], [0, 1], Easing.easeInOutCubic)(t);

  if (t < 7.0) return null;

  // Wordmark appears at 7.7
  const wordmarkOp = interpolate([7.7, 8.2], [0, 1], Easing.easeOutCubic)(t);
  const wordmarkY = interpolate([7.7, 8.2], [20, 0], Easing.easeOutCubic)(t);
  // Tagline
  const tagOp = interpolate([8.0, 8.4], [0, 1], Easing.easeOutCubic)(t);
  // CTA
  const ctaOp = interpolate([8.3, 8.7], [0, 1], Easing.easeOutCubic)(t);
  const ctaY = interpolate([8.3, 8.7], [16, 0], Easing.easeOutCubic)(t);
  // Underline draw
  const underT = interpolate([8.6, 9.2], [0, 1], Easing.easeInOutCubic)(t);

  // Diagonal bronze sweep: two slashes
  const slashTranslate = 2400; // diagonal distance
  const slash1X = (1 - wipeT) * -slashTranslate + wipeOutT * slashTranslate;
  const slash2X = (1 - wipeT) * slashTranslate + wipeOutT * -slashTranslate;

  return (
    <>
      {/* Black base, revealed after wipe */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#0A0A0A',
        opacity: wipeT,
      }}/>
      {/* Subtle cream→bronze gradient field */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, rgba(196,147,115,0.14), transparent 60%)',
        opacity: wipeT * (1 - wipeOutT * 0.3),
      }}/>

      {/* Two diagonal bronze slashes performing the wipe */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, width: 2200, height: 2600,
        background: 'linear-gradient(90deg, transparent 0%, #9C6B48 40%, #C49373 50%, #9C6B48 60%, transparent 100%)',
        transformOrigin: 'top left',
        transform: `translate(${slash1X}px, -400px) rotate(18deg)`,
        opacity: 1 - wipeOutT,
      }}/>
      <div style={{
        position: 'absolute',
        right: 0, top: 0, width: 2200, height: 2600,
        background: 'linear-gradient(90deg, transparent 0%, #7A5238 40%, #9C6B48 50%, #7A5238 60%, transparent 100%)',
        transformOrigin: 'top right',
        transform: `translate(${slash2X}px, -400px) rotate(-18deg)`,
        opacity: 1 - wipeOutT,
      }}/>

      {/* Decorative hairline frame */}
      {wipeT > 0.9 && (
        <div style={{
          position: 'absolute', left: 80, right: 80, top: 220, bottom: 220,
          border: '1px solid rgba(196,147,115,0.3)',
          opacity: wordmarkOp,
        }}/>
      )}

      {/* Brand lockup */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 640,
        textAlign: 'center',
        opacity: wordmarkOp,
        transform: `translateY(${wordmarkY}px)`,
      }}>
        <div style={{
          fontFamily: 'Nunito Sans, sans-serif',
          fontWeight: 700, fontSize: 14, letterSpacing: '8px',
          color: '#C49373',
          textTransform: 'uppercase',
          marginBottom: 40,
        }}>— Exclusively at —</div>

        <div style={{
          fontFamily: 'Fraunces, serif',
          fontWeight: 300, fontSize: 180, lineHeight: 0.9,
          color: '#F5F3EF',
          letterSpacing: '-0.03em',
        }}>Ounass</div>

        <div style={{
          marginTop: 28,
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontWeight: 300,
          fontSize: 30, color: 'rgba(245,243,239,0.72)',
          letterSpacing: '0.01em',
          opacity: tagOp,
        }}>The definitive home of luxury.</div>
      </div>

      {/* CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 260,
        textAlign: 'center',
        opacity: ctaOp,
        transform: `translateY(${ctaY}px)`,
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); alert('Tapping through to Ounass…'); }}
          style={{
            background: '#C49373',
            color: '#0A0A0A',
            border: 0,
            padding: '28px 72px',
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700, fontSize: 16, letterSpacing: '4px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          Shop 3.1 Phillip Lim
          <span style={{
            position: 'absolute', left: 0, bottom: 0, height: 3,
            width: `${underT * 100}%`,
            background: '#F5F3EF',
          }}/>
        </button>

        <div style={{
          marginTop: 28,
          fontFamily: 'Nunito Sans, sans-serif', fontWeight: 700,
          fontSize: 11, letterSpacing: '3px',
          color: 'rgba(245,243,239,0.5)',
          textTransform: 'uppercase',
        }}>Tap · Delivered in 60 minutes · Dubai &amp; Abu Dhabi</div>
      </div>
    </>
  );
}

// ── Root Scene ───────────────────────────────────────────────────────
function PromoScene() {
  const { time, setTime, setPlaying, playing } = useTimeline();
  const [focusIdx, setFocusIdx] = React.useState(null);
  const [tapMark, setTapMark] = React.useState(null);

  // Reset focus override whenever we pass out of Act 3
  React.useEffect(() => {
    if (time < 4.2 || time > 7.2) setFocusIdx(null);
  }, [time]);

  // Ripple on tap
  const onCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = 1080 / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    setTapMark({ x, y, t: Date.now() });
    setTimeout(() => setTapMark(null), 700);
  };

  return (
    <div
      onClick={onCanvasClick}
      style={{
        position: 'absolute', inset: 0,
        background: '#0A0A0A',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes heroIn {
          from { transform: scale(1.04) translateX(14px); opacity: 0.4; }
          to { transform: scale(1) translateX(0); opacity: 1; }
        }
        @keyframes tapRipple {
          from { transform: translate(-50%,-50%) scale(0.2); opacity: 0.8; }
          to { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
        @keyframes progressPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      <Act1Title/>
      <Act2Columns/>
      <Act3Filmstrip
        focusOverride={focusIdx}
        onFocusClick={(i) => setFocusIdx(i)}
      />
      <Act4Outro/>

      {/* Film grain / luxe overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.35) 100%)
        `,
        mixBlendMode: 'multiply',
      }}/>

      {/* Progress indicator — thin bronze bar at top */}
      <div style={{
        position: 'absolute', left: 40, right: 40, top: 48,
        height: 2, background: 'rgba(245,243,239,0.12)',
        pointerEvents: 'none',
      }}>
        <div style={{
          height: '100%',
          width: `${clamp(time / 9, 0, 1) * 100}%`,
          background: '#C49373',
          transition: 'width 0.1s linear',
        }}/>
      </div>

      {/* Ounass logo corner watermark (persistent from 2s onward) */}
      {time >= 2.0 && time < 7.0 && (
        <div style={{
          position: 'absolute',
          left: 60, bottom: 60,
          fontFamily: 'Fraunces, serif',
          fontWeight: 300, fontSize: 28, fontStyle: 'italic',
          color: 'rgba(245,243,239,0.85)',
          letterSpacing: '-0.01em',
          pointerEvents: 'none',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}>Ounass</div>
      )}

      {/* Tap ripple */}
      {tapMark && (
        <div style={{
          position: 'absolute',
          left: tapMark.x, top: tapMark.y,
          width: 80, height: 80,
          borderRadius: '50%',
          border: '2px solid #C49373',
          pointerEvents: 'none',
          animation: 'tapRipple 700ms cubic-bezier(.2,.8,.2,1) forwards',
        }}/>
      )}

      {/* Instagram-style UI chrome (subtle) */}
      <InstagramChrome/>
    </div>
  );
}

function InstagramChrome() {
  const { time } = useTimeline();
  // Only show after initial 1s so it doesn't compete with opening
  const op = interpolate([1.0, 1.5], [0, 1], Easing.easeOutCubic)(time);

  return (
    <>
      {/* Top status-ish nav */}
      <div style={{
        position: 'absolute', top: 80, left: 40,
        display: 'flex', alignItems: 'center', gap: 12,
        opacity: op * 0.9,
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 44, height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #9C6B48, #F5F3EF)',
          padding: 2,
        }}>
          <div style={{
            width: '100%', height: '100%',
            borderRadius: '50%',
            background: '#0A0A0A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 400,
            color: '#F5F3EF',
          }}>O</div>
        </div>
        <div>
          <div style={{
            fontFamily: 'Nunito Sans', fontSize: 16, fontWeight: 700,
            color: '#F5F3EF',
          }}>ounass</div>
          <div style={{
            fontFamily: 'Nunito Sans', fontSize: 12, fontWeight: 400,
            color: 'rgba(245,243,239,0.7)',
          }}>Sponsored · Shop now</div>
        </div>
      </div>

      {/* Right action rail */}
      <div style={{
        position: 'absolute', right: 40, bottom: 380,
        display: 'flex', flexDirection: 'column', gap: 32,
        alignItems: 'center',
        opacity: op * 0.85,
        pointerEvents: 'none',
      }}>
        <IGIcon label="12.4K" path="M12 21s-7-4.35-7-10a5 5 0 019-3 5 5 0 019 3c0 5.65-7 10-7 10z"/>
        <IGIcon label="284" path="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
        <IGIcon label="Share" path="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
      </div>
    </>
  );
}

function IGIcon({ path, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F5F3EF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={path}/>
      </svg>
      <div style={{
        fontFamily: 'Nunito Sans', fontSize: 11, fontWeight: 700,
        color: '#F5F3EF', letterSpacing: '0.5px',
      }}>{label}</div>
    </div>
  );
}

window.PromoScene = PromoScene;
