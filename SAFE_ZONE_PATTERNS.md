# Safe-Zone Patterns — composition-preserving templates

**Audience:** anyone authoring or polishing a Cutroom template. Read this alongside `template_skill.md` *Conventions → Safe-zone anchoring* and `HANDOFF.md §5.9`.

**Why this doc exists:** the first pass of safe-zone retrofit (Phase 3) shipped a per-element `Math.max(h(X), safe.edge + h(Y))` pattern. That keeps any single element clear of platform chrome, but the other elements stay at their original positions — so when the user flips "safe zones" ON, the composition **splits apart**: the logo jumps down while the products hold still, a gap appears, the design reads "broken". The patterns below fix that.

The goal is that **both ON and OFF look deliberately composed** — not that ON is "the design plus some shifts". ON is the priority (it's what ships on phone), but OFF should still feel intentional as a designer-preview state.

---

## The core idea — compose against a content rect, not the canvas

Every aspect has a **content rect** in output pixels:

```
contentTop    = safe.top
contentBottom = height - safe.bottom
contentLeft   = safe.left
contentRight  = width  - safe.right
contentW      = contentRight - contentLeft
contentH      = contentBottom - contentTop
contentCX     = (contentLeft + contentRight) / 2
contentCY     = (contentTop  + contentBottom) / 2
```

When safe enforcement is **OFF**, `useSafeZone` returns all-zero margins so the rect collapses to the full canvas and every formula degrades gracefully to the original design. When **ON**, the rect shrinks into the safe area and every element composed against it reflows coherently — no single element "jumps" while others stay put.

**Compute these once at the scene root** and thread them through Act components alongside `T`, `s`, and `safe`.

---

## Element patterns — pick the right one per role

### 1. Top-anchored readable chrome (logo, masthead, running kicker)

Use a **designer-inset below the content top**, not a `Math.max` floor against the canvas top.

```tsx
// OLD (Phase 3 retrofit — don't use for new code):
top: Math.max(h(30), safe.top + h(40))

// NEW (content-rect anchored):
top: contentTop + h(20)
```

- Safe OFF → `top = h(20)` — logo 20 base-px below the canvas edge. Tight design, same as before.
- Safe ON 9:16 → `top = 250 + h(20) = 270` — logo 20 base-px below the safe top. Still tight, just inside the chrome band.

The element's *relative* position to its nearest edge is preserved in both states. No jump.

### 2. Bottom-anchored readable chrome (CTA, footer)

```tsx
bottom: safe.bottom + h(60)  // OR h(height - contentBottom) + h(60)
```

Same principle. The CTA sits a fixed design-inset above the visible bottom edge, whatever that edge happens to be.

### 3. Side-anchored readable chrome (side editorial pill, corner badge)

```tsx
right: safe.right + w(48)
```

Again, fixed inset from the visible-rect edge.

### 4. Centered hero content (final-frame stack, inline logo row)

Two options, pick based on whether children need their intrinsic widths preserved.

**Option A — full-bleed background + flex-center + padded safe margins.** Best when the children naturally size themselves (buttons, intrinsic-width text) and you want the background to fill edge-to-edge (so no cream-strip leak onto the safe zone).

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
    // pad by safe so the flex content box IS the safe rect:
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

Safe OFF → padding is all 0, flex-centers on canvas center. Safe ON → padding = safe margins, flex-centers on content-rect center. No absolute-positioning wrapper, no width constraint issues, no button wrap.

**Option B — absolutely-positioned wrapper at `(contentCX, contentCY)` with `translate(-50%, -50%)`.** Use when the element is a single known-width item (a giant sun disc, a hero image). Not for flex columns with mixed-width children — the wrapper's auto-width tracks the widest child, and it WILL bite you with unexpected flex stretching.

```tsx
<div
  style={{
    position: 'absolute',
    left: contentCX,
    top: contentCY,
    transform: 'translate(-50%, -50%)',
    width: w(420),    // <- always set an explicit width for single-element center
    height: wh(420),
  }}
/>
```

### 5. Full-width overflow elements (giant word refrain, dramatic bleed type)

These should **center vertically on contentCY** but **not** be horizontally constrained — the overflow is the point.

```tsx
<div
  style={{
    position: 'absolute',
    left: 0, right: 0,             // full canvas width for bleed
    top: contentCY,                // vertically anchored on content center
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

Safe OFF → `top: 0.5 * height` effectively, word centered on canvas. Safe ON → `top: contentCY` which is above canvas center by `(safe.top - safe.bottom)/2`. On a phone where the bottom chrome eats the bottom strip, this shift lands the word dead-centre in what the user actually sees.

The artistic overflow past the canvas L/R edges is preserved in both states — decorative bleed is fine; platform chrome isn't cropping readability-critical copy.

### 6. Positioned-in-space layers (floating products, scattered ornaments)

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

- Safe OFF → scale is 1, translate is 0 — identity, original design untouched.
- Safe ON 9:16 → scale ~0.71, products compress ~29% to clear the 250 top / 300 bottom / 120 right strips. They stay fully visible; relative arrangement preserved.

This shrinks products in the ON state. Trade-off: acceptable, because the alternative is clipping by IG's like-stack which is worse. If you want to keep product sizes constant in both states, you must redesign the layout so base positions live inside the safe rect natively — but that makes the OFF view feel cramped.

---

## The six-question decision tree

For every element in a scene, answer these in order:

1. **Is it readability-critical?** (logo, kicker, headline, subline, CTA, price, badge, editorial line.) If yes → must stay inside the content rect. Skip to 2. If no (pure decoration, gradient wash, background image) → anchor freely, use `inset: 0` and move on.

2. **What kind of anchor does it want?**
   - Top edge → §1 pattern
   - Bottom edge → §2 pattern
   - Left/right edge → §3 pattern
   - Centered → §4 pattern (pick A or B by child-width needs)
   - Positioned in space by (x, y) coords → §6 pattern (wrap the whole layer)

3. **Does it need to bleed past canvas edges for dramatic effect?** If yes → §5 pattern (center on contentCY, full canvas width).

4. **Is the element in a flex column with mixed-width children (kicker + headline + CTA)?** If yes → use §4 Option A (padded flex), never §4 Option B (absolute wrapper). Option B's auto-width will stretch the button to match the widest sibling.

5. **Will it live next to a full-bleed background?** If yes → keep `inset: 0` on the background, apply the centering pattern to the content column only. Do not shrink the background to the content rect — you'll leave ugly cream strips showing through.

6. **Does the animation modify `opacity`?** Multiply: `opacity: (baseStyle.opacity ?? 1) * animT`. The safe-zone pattern doesn't change this rule from `template_skill.md`, just reinforcing it — any format-drawer opacity override still wins.

---

## What to do with existing templates

Each template will get a composition-aware pass. The Seasonal Campaign polish (commit after 2026-04-24) is the reference implementation and the easiest to study — see `app/src/templates/seasonal/scene.tsx`. Look at the `// ── Content rect (…) ────` and `// ── Products-layer transform ─` blocks at the top of `SeasonalScene`, then trace how `contentTop`, `contentCY`, etc. are used throughout.

Working order (easy → hard):

1. **Hero** — single-product, single-focus. Just retarget the outro CTA + watermark to the content rect. 15 min.
2. **Countdown** — no products, just copy + one accent image. Retarget kicker, headline, countdown digits, CTA to content rect. 30 min.
3. **Brand Spotlight** — single brand hero + companion strip. Most elements already anchor sensibly; apply content-rect centering to the strip. 45 min.
4. **Gift Guide** — ~4-6 gift cards in a flex row. Products wrap-layer like §6; kicker/footer anchored top/bottom. 45 min.
5. **Bestsellers — Top 5** — 5 ranked cards with a big numeric slam. Products wrap-layer; numeric slam uses §5 bleed pattern; CTA uses §2. 1 hour.
6. **Category Carousel** — scrolling carousel (trickiest — the carousel track is positioned in-space). Use §6 on the carousel wrapper; anchor kicker/CTA separately. 1 hour.
7. **Seasonal** — ✅ done (reference implementation).
8. **Editorial** — fixed 4-product grid + signature block. Products wrap-layer like §6; signature is §4 Option A (flex column). 45 min.
9. **Lookbook** — 5-act narrative with per-act layouts. Biggest surface; port each Act one at a time. 2+ hours.

After each port, spot-check in the Claude Preview MCP using a `/visual-test/<slug>` route (or the editor + safe toggle) against all **3 aspects × ON/OFF × 3 keyframes**. 18 screenshots is cheap insurance.

---

## Gotchas worth naming

### Gotcha A — flex column + absolutely-positioned wrapper + mixed-width children ⇒ button stretches

Triggered by §4 Option B when children have different intrinsic widths. The outer wrapper auto-sizes to `max-content` = the widest child's width. Flex column with `align-items: center` then **horizontally centers narrower children inside the wider wrapper**, which is fine. But if any child (e.g. a button) has `align-self: stretch` implicitly, it fills the wrapper width and the button text wraps.

**Fix:** use §4 Option A (padded full-bleed flex) instead. Or set an explicit `width: fit-content` + `max-width` on the wrapper. Or set `align-self: center` on each child. The padded-flex approach is the one we use in Seasonal — fewer foot-guns.

### Gotcha B — `getComputedStyle().bottom` still a lie

Carried forward from `HANDOFF.md §9 Gotcha #13`. Don't reverse-infer which elements are bottom-anchored from computed `bottom`. Browsers will compute a pixel value for `bottom` even when only `top` was set. Check `el.style.bottom !== ''` (the inline-style string) if you need to classify elements programmatically.

### Gotcha C — shrinking a full-bleed background to the content rect leaves strips

You might be tempted to make the whole scene fit inside the content rect. Don't. The result is cream/ink strips visible in the safe zone (the area platform chrome would cover) and it looks weird in the editor. Keep the background on `inset: 0`; only the readable content column composes against the content rect.

### Gotcha D — scaling a product layer changes its drop shadow

Box shadows transform with `scale()`. A `boxShadow: '0 12px 40px rgba(...)'` at scale 0.71 becomes ~8.5px y-offset / 28px blur — softer. Usually fine; flag it if the design relies on a crisp shadow for legibility.

### Gotcha E — CSS `padding` on a flex-center container does change the centering origin

That IS the mechanism in §4 Option A. Double-check `boxSizing: 'border-box'` is set — default is `content-box`, which sizes the flex box to `content + padding`, making the container larger than the canvas and pushing the centering origin off-screen.

---

## Reference — the Seasonal polish before/after at 9:16 safe=ON (t=5)

**Before** (v1 `Math.max` retrofit): logo snapped to `safe.top = 250` while products stayed at their base `h(p.y)` positions. A 250-pixel cream void opened above the ticker; products sat at the same Y as in the OFF state, near the 1620 safe-bottom floor with zero headroom. The "in bloom" refrain was centered on canvas Y = 960, 25 px below the phone-visible center.

**After** (v2 content-rect): logo sits at `contentTop + h(20)` (in both states, just `h(20)` from whatever the top edge happens to be). Products compress into the content rect via a single `translate + scale` on the layer wrapper. "in bloom" centers on `contentCY` (= 935, the phone-visible center on 9:16 ON) without losing its dramatic horizontal bleed.

OFF state is pixel-close to the original design (identity transform on the products layer; 20 px cosmetic top inset on the logo that was 0 before — minor, arguably an improvement).

---

## Maintaining this doc

Update when:

- A new pattern earns its spot (e.g. RTL-specific mirror anchoring, masking techniques that interact with safe zones).
- A template port surfaces a gotcha not listed above — add it to §"Gotchas worth naming".
- The default `DEFAULT_SAFE_ZONES` values in `engine/safeZones.ts` change (Brand Kit Phase 4 now allows per-boutique overrides; per-project overrides are PHASE_7_BACKLOG #12).
- A template graduates from the "work queue" above (update the list + link to the polish commit).

Cross-references to keep in sync: `HANDOFF.md §5.9`, `template_skill.md` *Conventions → Safe-zone anchoring*. Both should link back to this file as the deep dive.
