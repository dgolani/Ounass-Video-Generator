# Safe-Zone Patterns — always-safe templates

**Audience:** anyone authoring or polishing a Cutroom template. Read this alongside `template_skill.md` *Conventions → Safe-zone anchoring* and `HANDOFF.md §5.9`.

**Why this doc exists:** every Cutroom ad lives inside platform chrome (Instagram caption, TikTok like-stack, Story progress bar), so scenes must keep readability-critical content inside a per-aspect "safe rect". The patterns below describe how to anchor that content cleanly using the engine's `useSafeZone` helper.

## The always-safe regime (post-2026-04-24)

Cutroom only ships ads to **9:16 (Story)** and **4:5 (Feed)**. 1:1 is no longer supported. Safe margins are **always applied** at render time — there is no "enforcement off" render state. The editor's **Safe zones toggle** controls only the dim-overlay visibility (so the marketer can preview the canvas without the viewfinder hint); the composition is identical either way, and exports always match what the editor shows.

Practical consequence: **authors only reason about one state per aspect.** Design for the safe rect. Decorative non-readability elements can bleed past it (see pattern §5). The verification matrix is **2 aspects × 1 state = 2 shots per keyframe**, not 6.

---

## The core idea — compose against a content rect

Every aspect has a **content rect** in output pixels, derived once at the scene root:

```tsx
const { base: safe } = useSafeZone({ width, height });

const contentTop    = safe.top;
const contentBottom = height - safe.bottom;
const contentLeft   = safe.left;
const contentRight  = width  - safe.right;
const contentW      = contentRight - contentLeft;
const contentH      = contentBottom - contentTop;
const contentCX     = (contentLeft + contentRight) / 2;
const contentCY     = (contentTop  + contentBottom) / 2;
```

Thread these into Act components alongside `T`, `s`, and `safe`. For both supported aspects the safe margins are non-zero, so the rect is always inset from the canvas.

---

## Element patterns — pick the right one per role

### §1. Top-anchored readable chrome (logo, masthead, running kicker)

```tsx
top: contentTop + h(20)
```

The element sits a fixed designer-inset below the visible top edge. 20 base-px is the common value; tune as the design demands.

### §2. Bottom-anchored readable chrome (CTA, footer)

```tsx
bottom: safe.bottom + h(60)
```

Same shape, anchored from the bottom.

### §3. Side-anchored readable chrome (side editorial pill, corner badge)

```tsx
right: safe.right + w(48)
```

Fixed inset from the visible right edge. Mirror-flip `left`/`right` for RTL if the element is directional (usually not necessary — the Stage's `dir="rtl"` injection handles most cases).

### §4. Centered hero content (final-frame stack, inline logo row)

Two options, pick based on whether children need their intrinsic widths preserved.

**Option A — full-bleed background + flex-center + padded safe margins.** Best when children naturally size themselves (buttons, intrinsic-width text) and you want the background to fill edge-to-edge (no background strips leaking into the safe zone).

```tsx
<div
  style={{
    position: 'absolute',
    inset: 0,
    background: colors.inkDeep,
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
  {/* children keep their intrinsic widths */}
</div>
```

The flex content box becomes the safe rect; flex-centered children land on `contentCX / contentCY` without any manual math. Used in Seasonal's final frame.

**Option B — absolutely-positioned wrapper at `(contentCX, contentCY)` with `translate(-50%, -50%)`.** Use for a single known-width element (a hero image, a sun disc). Not for flex columns with mixed-width children — the wrapper's auto-width tracks the widest child, and CTA buttons will visibly stretch to match the kicker's letter-spacing width.

```tsx
<div
  style={{
    position: 'absolute',
    left: contentCX,
    top: contentCY,
    transform: 'translate(-50%, -50%)',
    width: w(420),      // always set an explicit width for Option B
    height: wh(420),
  }}
/>
```

### §5. Full-width overflow elements (giant word refrain, dramatic bleed type)

These **center vertically on `contentCY`** but are **not** horizontally constrained — the overflow is the design.

```tsx
<div
  style={{
    position: 'absolute',
    left: 0, right: 0,             // full canvas width for bleed
    top: contentCY,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  <div
    style={{
      whiteSpace: 'nowrap',
      ...refrainStyle,
      transform: `translateY(-50%) …other anim transforms…`,
    }}
  >
    {word}
  </div>
</div>
```

Decorative typography can bleed past the canvas L/R edges — platform chrome only crops the top/bottom strips, and readability-critical copy is already pinned inside via §1–§3.

### §6. Positioned-in-space layers (floating products, scattered ornaments)

Products authored with absolute `(p.x, p.y)` in base-1080×1920 coords can't be re-anchored per-element; the designer authored them as a relative cluster. Wrap the **whole layer** in a single translate+scale transform that maps the base canvas onto the content rect, centered and uniformly scaled:

```tsx
// At scene root:
const productLayerScale = Math.min(contentW / width, contentH / height);
const productLayerW     = width  * productLayerScale;
const productLayerH     = height * productLayerScale;
const productLayerX     = contentLeft + (contentW - productLayerW) / 2;
const productLayerY     = contentTop  + (contentH - productLayerH) / 2;

<div
  style={{
    position: 'absolute',
    left: 0, top: 0, width, height,
    transform: `translate(${productLayerX}px, ${productLayerY}px) scale(${productLayerScale})`,
    transformOrigin: 'top left',
  }}
>
  {/* products rendered at their original w(p.x) / h(p.y) — no per-item math */}
</div>
```

On 9:16 the products shrink ~29% to clear the 250 top / 300 bottom / 120 right safe strips. Relative arrangement preserved. On 4:5 the shrink is milder.

---

## The decision tree

For every element in a scene, answer in order:

1. **Is it readability-critical?** (logo, kicker, headline, subline, CTA, price, badge, editorial line.) If yes → must stay inside the content rect. Skip to 2. If no (background wash, gradient, decorative image) → anchor freely, use `inset: 0`, move on.

2. **What anchor does it want?**
   - Top edge → §1
   - Bottom edge → §2
   - Left/right edge → §3
   - Centered on content → §4 (pick A or B by child-width needs)
   - Decorative bleed past edges → §5
   - Positioned in space by (x, y) coords → §6 (wrap the whole layer)

3. **Is it in a flex column with mixed-width children (kicker + headline + CTA)?** Use §4 Option A. Never Option B — the auto-width wrapper will stretch the button.

4. **Does animation modify `opacity`?** Multiply: `opacity: (baseStyle.opacity ?? 1) * animT`. A hard override clobbers marketer-dimming; a hard spread disables intro animations.

---

## Gotchas worth naming

### Gotcha A — flex column + absolute wrapper + mixed-width children ⇒ button stretches

Triggered by §4 Option B when children have different intrinsic widths. Outer wrapper auto-sizes to the widest child's width. The button then visibly stretches to the full wrapper width and its text wraps to two lines.

**Fix:** use §4 Option A (padded full-bleed flex). Or set `width: fit-content` explicitly on the wrapper with `align-self: center` on each child.

### Gotcha B — shrinking a full-bleed background into the content rect leaves strips

You might be tempted to make the whole scene fit inside the content rect. Don't — it leaves visible strips in the safe zone where platform chrome sits, and it looks weird in the editor. Keep backgrounds on `inset: 0`; only the readable content column anchors against the content rect.

### Gotcha C — `boxSizing: border-box` is required for the padded-flex pattern

`content-box` (CSS default) adds the padding to the outer width, making the container *larger* than the canvas and pushing the centering origin off-screen. Always set `boxSizing: 'border-box'` when using §4 Option A.

### Gotcha D — scaling a product layer changes its drop shadow

Box shadows transform with `scale()`. A `boxShadow: '0 12px 40px rgba(...)'` at scale 0.71 becomes ~8.5px y-offset / 28px blur — softer. Usually fine; flag if the design relies on a crisp shadow for legibility.

### Gotcha E — vestigial `Math.max(h(X), safe.edge + h(Y))` patterns

Pre-cleanup templates use this pattern (Hero, Countdown, Brand Spotlight, Gift Guide, Carousel, Editorial, Lookbook). It still produces the correct output in the always-safe regime (because `safe.*` is always the real margin) but is unnecessarily complex. When polishing one of these templates, simplify to the content-rect pattern (§1–§3). No behaviour change; just cleaner code.

---

## Verification checklist

For every template polish pass, check 2 aspects × 2–3 keyframes in the Claude Preview MCP. Confirm:

- Logo, kicker, CTA, headline/subline, side pills all inside the content rect.
- Decorative typography bleeding past the canvas is intentional.
- Positioned-in-space layers (products) clear of the safe strips.
- The editor "Safe zones" toggle only shows/hides the dim overlay — composition is identical either way.
- `npx tsc -b --noEmit` clean.
- `npm run build` clean.

---

## Maintenance

Update when:

- A new pattern earns its spot (e.g. RTL-specific mirror anchoring, masking techniques that interact with safe zones).
- A template port surfaces a gotcha not listed above — add it to §"Gotchas worth naming".
- `DEFAULT_SAFE_ZONES` values in `engine/safeZones.ts` change (Brand Kit Phase 4 allows per-boutique overrides; per-project overrides are PHASE_7_BACKLOG #12).
- A new aspect returns (e.g. 1:1 for a future placement) — add it to `AspectKey` + `DEFAULT_SAFE_ZONES` + each template's `meta.aspects[]`.

Cross-references to keep in sync: `HANDOFF.md §5.9`, `template_skill.md` *Conventions → Safe-zone anchoring*. Both link back to this file as the deep dive.
