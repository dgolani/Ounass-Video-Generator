# Skill — Authoring a new video-ad template

## When to use this skill

Invoke when the user asks to add a new template to **Ounass Cutroom** (*Cut. Brand. Ship.*) — a browser-only React + TypeScript app (Vite 6, React 19) where marketers build vertical ads and export them to MP4 via `ffmpeg.wasm`. The existing templates live at `app/src/templates/<slug>/` and are registered in `app/src/templates/registry.ts`. This skill turns a one-paragraph creative brief into a drop-in template folder plus a registry entry.

Do **not** use this skill for: modifying shared engine code, changing the template contract itself, or authoring export-pipeline changes. Those are out of scope.

## Two phases, one workflow

Template work usually splits into two phases. Don't merge them.

1. **Design-preview phase** — produce HTML previews that explore motion and layout. Often delegated to an external tool (e.g. claude.design, Figma Make). Output: one self-contained `.html` per template, playable in a browser.
2. **Code-port phase** — port each preview into the app's template contract as a real folder under `app/src/templates/<slug>/`. Output: drop-in template code + registry entry, typecheck clean, build clean.

The rest of this doc is primarily the code-port contract (phase 2). The answers to design-preview tools (phase 1) are fixed below so you don't re-derive them each time.

## Pre-answered: design-preview phase (phase 1)

When an external design tool asks clarifying questions before producing HTML previews, these are the standing answers. They reflect two invariants: **(a) the app already exists** — don't scaffold it; **(b) previews are throwaway for evaluating motion + layout** — don't over-engineer them with export buttons or tweaks panels.

| Question | Answer | Why |
|---|---|---|
| **What should I deliver?** | Five self-contained HTML previews, one per archetype. Inline CSS + vanilla JS/SVG, no build step. 1080×1920 canvas each. **Don't scaffold the React/Vite app — it already exists.** | Scaffolding the app wastes a day. Single-canvas showcases hide per-template detail. Five standalone HTMLs port 1:1. |
| **Aspect ratio for previews?** | 9:16 only (1080×1920). | The real `scene.tsx` handles 9:16 and 4:5 via `w/h/wh` scale helpers at port time. Generating variants during preview is wasted effort. |
| **Which archetypes?** | Five that **don't overlap** with the four in production (Lookbook, Editorial, Countdown, Hero). Good starter set: Bestsellers Countdown (ranked 5→1), Seasonal Campaign (occasion-driven), Category Carousel (depth in one category), Style the Look (outfit builder), Gift Guide (curated picks with gift framing). Skip Hero Drop, Lookbook, Flash Sale w/ ticking clock, Sale/Price Drop, New Arrivals Grid — all duplicate or drift-close to existing templates. | Archetype coverage, not archetype count, is the goal. Each new template should cover a mechanic the library doesn't already have. |
| **How should I use the product illustrations?** | Use them **as-is** — they ARE the production product imagery. Don't treat them as silhouettes or editorial abstractions. | `photos.*` JPEGs are what the real `defaultProps` references. Previews must be visually faithful so porting is 1:1, not a re-design. |
| **Brand name to show?** | **OUNASS**, using the attached SVG as the wordmark. | `DEFAULT_BRAND.boutiqueName = 'Ounass'` and the SVG is pre-wired as the brand-kit default. Generic "BOUTIQUE" drifts from what marketers will see on first open. |
| **Motion character?** | **Mix across the 5**, but only between *Subtle & luxurious* and *Editorial & kinetic*. **No Bold & experimental** (liquid morphs, 3D, unexpected transitions) — off-brand for luxury Middle East boutique. | Existing 4 templates sit in the Subtle–Editorial-Kinetic band (Lookbook/Editorial = subtle; Countdown/Hero = editorial-kinetic). Ratio the new 5 similarly so the full library of 9 reads coherent. |
| **Export needs from preview?** | **Playable HTML only** — preview in a browser, nothing else. No export button, no screen-recording prep, no frame-by-frame capture. | The real app has `ffmpeg.wasm` export. Export work in the preview is code that gets discarded at port time. |
| **Editable tweaks in preview?** | **No** — fixed demos showing the concept, with the exact Ounass defaults from the brand kit. | The real app's `FieldDescriptor` properties panel IS the tweaks panel. Building a second one in each of 5 previews is throwaway work. Copy-length edge cases get stress-tested in the real editor after port. |
| **Motion-per-archetype default mapping** | Bestsellers → editorial-kinetic (numerals slam). Style the Look → editorial-kinetic (snappy outfit assembly). Seasonal Campaign → subtle (warmth, not urgency). Category Carousel → subtle (each piece lingers). Gift Guide → subtle (delicate flourishes). | Covers the full Subtle ↔ Editorial-Kinetic range at a 3:2 ratio, matching the existing 2:2 split. |

If an external tool asks a question not in the table above, ask the user before inventing an answer.

## What the user provides

- A brief — archetype, tone, 1–2 lines of storyboard intent (e.g. *"Bestsellers countdown, numbered 05 → 01, punchy 1.5s per slot"*). If the brief is vague, ask **one** targeted question before scaffolding (e.g. *"How many products, and should prices animate in?"*). Don't interrogate.
- Optionally: brand assets. Assume the brand kit is already wired — the Ounass SVG lives at `app/src/assets/ounass-logo.svg` and renders through `<BoutiqueLogo>`. Placeholder product imagery lives at `app/src/assets/photos/` and is exported via `app/src/assets/placeholders.ts` (`photos.dress`, `photos.trouser`, `photos.blouse`, `photos.outerwear`, `photos.handbag`, `photos.shoes`, `photos.sunglasses`, `photos.watch`, `photos.jewellery`, `photos.knitwear`).
- Optionally: HTML previews from phase 1. When present, the port is a translation exercise — keep the preview's motion, timing, and layout; re-express it in `scene.tsx` using `animate` / `interpolate` / the scale helpers.

## Read before writing

Copy the act-structure, scaling, and timing patterns from the existing templates — do not invent new patterns:

- `app/src/templates/lookbook/scene.tsx` — gold standard for multi-act structure, `Act*` sub-components, scale + safe-zone threading, full `useFieldFormat` coverage.
- `app/src/templates/countdown/scene.tsx` — punchy timing + CTA slam pattern.
- `app/src/templates/hero/scene.tsx` — minimal act count, clean safe-zone anchoring on the outro CTA, price via `composePrice`.
- `app/src/templates/BoutiqueLogo.tsx` — the logo rendering contract (SVG mask-recolour, raster fallback, text fallback). Never use `<img src={logo}>`.
- `app/src/templates/fields.ts` — the `FieldDescriptor` union (`section | text | color | image | productList`). Every marketer-editable string must surface via this list. `kind: 'text'` fields automatically get the `Aa` format button next to the input; clicking it opens the right-side Format drawer, which drives overrides via `useFieldFormat` (see below).
- `app/src/templates/types.ts` — the `TemplateMeta<P>` shape every template must satisfy.
- `app/src/engine/math.ts` — `animate`, `interpolate`, `Easing`, `clamp`.
- `app/src/engine/timeline.tsx` — `useTimeline()` returns `{ time, duration, compositionStartSec }`.
- `app/src/engine/safeZones.ts` — `useSafeZone(aspect)` returns the resolved keep-clear margins for the current aspect + enforcement state. Every bottom-/top-anchored element near an edge must thread through this. Phase 3+.
- `app/src/engine/fieldFormatContext.ts` — `useFieldFormat(path, baseStyle)` resolves per-field family/weight/italic/color/letter-spacing overrides the marketer sets in the drawer. `useFieldColor(path, baseColor)` is the color-only variant (used for logo tint overrides). Phase 5+. Every editable text field should call `useFieldFormat` or drawer edits will silently no-op on that field.
- `app/src/engine/locale.ts` — `useLocale()` + `isRTL(locale)`. The Stage auto-injects `dir="rtl"` on the canvas root and prepends Noto Kufi Arabic to the font stacks when locale is Arabic, so most scenes don't need locale directly; reach for it only when you're mirroring directional chrome (e.g. a corner-pinned pill). Phase 6+.
- `app/src/lib/price.ts` — `composePrice(raw, currency)` + `useCurrencyForLocale()`. Non-destructively swaps known currency trails (AED / SAR / BHD / USD / EUR / GBP + Arabic abbreviations) so prices render correctly in both EN and AR. Use this for every price string you render.

## File contract (strict)

Every template is a directory at `app/src/templates/<slug>/` with exactly five files:

### 1. `schema.ts` — Props type, sub-types, `defaultProps`

- Exports a `<Name>Props` type and a `defaultProps: <Name>Props`.
- MUST include these brand-kit-overlaid keys: `boutiqueName: string`, `logo?: string`, `colors: { background: string; paper: string; accent: string; accentDark: string }`. The `applyBrand()` helper overlays these at render time; keys must exist (even set to `undefined`) for the overlay to fire.
- Product images go through `photos.<name>` from `placeholders.ts`. Never hardcode a local file path inside the template folder.
- If the template has products, define a `<Name>Product` type with at least `{ id, src, name, price }`. Price strings include currency (`'1,890 AED'`), not numbers.

### 2. `fields.ts` — properties-panel descriptors

- Exports `fields: FieldDescriptor[]`.
- Every user-editable string, colour, image, or product list in `defaultProps` needs a matching entry. If it's not in `fields.ts`, the marketer can't change it.
- Group fields under `{ kind: 'section', label: '…' }` headers. Typical grouping: Brand → Opening → per-act → Products → Outro → Colors.
- For colours, use `{ kind: 'color', path: 'colors.xxx' }`. Every colour shows in the left-side BRAND KIT column by default; pass `brandColumn: false` to keep an accent-only colour on the right panel.
- For a product list: `{ kind: 'productList', path: 'products', imagePath: 'src', productFields: [...], addLabel, minProducts, maxProducts, newProductTemplate }`.

### 3. `meta.ts` — `TemplateMeta<Props>`

- `id`: kebab-case slug, unique across the registry.
- `name`: human label shown in the gallery (e.g. `"Bestsellers — Top 5"`).
- `description`: one-sentence pitch for the gallery card.
- `defaultDuration`: 7–12 seconds for most templates; up to 15 if the ad carries 6+ products.
- `aspects`: **exactly two** — `9:16 (Story) 1080×1920` (primary) and `4:5 (Feed) 1080×1350`. 1:1 is not supported; if marketing ever needs it back, add it here + in `engine/safeZones.ts`.
- `scenes`: a list of `{ id, label, start, end }` — the act outline shown in the timeline strip. Start/end in seconds, can overlap slightly for crossfades.
- `defaultProps`: re-export from `schema.ts`.

### 4. `scene.tsx` — the renderer

- Exports `<Name>Scene` as a named function component with signature `({ props, timeScale = 1, width, height }) => JSX`.
- Break the timeline into `Act*` sub-components that each take `{ props, T, s, safe }`. This keeps the root small and makes timing tweaks local.
- Call `const { base: safe } = useSafeZone({ width, height })` once at the scene root and thread the result through to every Act component. See *Conventions → Safe-zone anchoring*.
- Every editable text field routes its style through `useFieldFormat(path, baseStyle)`. See *Conventions → Per-field format hooks*.
- Every price string routes through `composePrice(raw, useCurrencyForLocale())`. See *Conventions → Price composition*.
- Use the scaling helpers and the `T(x) = x * timeScale` wrapper (see *Conventions* below).
- Root returns an absolutely-positioned `<div style={{ position:'absolute', inset:0, overflow:'hidden', background: colors.background }}>` so every scene is self-contained at any aspect.

### 5. `index.ts` — barrel

Re-export the Scene, `meta`, `fields`, `defaultProps`, and every exported type from `schema.ts`.

```ts
export { <Name>Scene } from './scene';
export { meta } from './meta';
export { fields } from './fields';
export { defaultProps, type <Name>Props, type <Name>Product } from './schema';
```

## Conventions (copy, do not improvise)

### Scaling — base canvas is always 1080×1920

```ts
const BASE_W = 1080;
const BASE_H = 1920;

type Scale = { W: number; H: number; w: (px:number)=>number; h: (px:number)=>number; wh:(px:number)=>number };

function makeScale(W: number, H: number): Scale {
  const sw = W / BASE_W, sh = H / BASE_H;
  return { W, H, w: p => p*sw, h: p => p*sh, wh: p => p*Math.min(sw,sh) };
}
```

- `w(px)` — horizontal distances, widths, left/right offsets.
- `h(px)` — vertical distances, heights, top/bottom offsets.
- `wh(px)` — anything that must shrink with the tighter dimension: font sizes, border radii, stroke widths, letter-spacing in px, shadows.

Never write a raw pixel literal in a style object. Every `16px`, `280px`, `1080px` you're tempted to type goes through one of the three helpers.

### Timing — everything through `T`

```tsx
const T = (x: number) => x * timeScale;
```

Then use `T(0.4)`, `T(2.1)`, `T(5.6)` etc. This lets the same scene run at `defaultDuration: 9` or stretch to 15 with no act-by-act retuning.

Read current time with `useTimeline()`:

```tsx
const { time: t } = useTimeline();
```

Drive motion with `animate` / `interpolate` from `../../engine` — don't reach for `requestAnimationFrame` or CSS transitions.

### Brand kit — expose three hooks

`boutiqueName`, `logo`, and `colors` are overlaid from the user's brand kit before render. Rules:

- The key must exist in `defaultProps` (even as `undefined`) for the overlay to apply — `applyBrand` checks `'logo' in out`.
- Never hardcode the Ounass wordmark; always use `{boutiqueName}` from props.
- Never render `<img src={logo}>`. Use `<BoutiqueLogo>`:

```tsx
import { BoutiqueLogo } from '../BoutiqueLogo';

<BoutiqueLogo
  logo={logo}
  boutiqueName={boutiqueName}
  color={colors.paper}               // pick the palette ink that reads against the current background
  width={w(720)}
  height={h(180)}                    // match ~5:1 aspect — too tall leaves dead space
  shadow="0 4px 24px rgba(0,0,0,0.4)" // optional
/>
```

For dark backgrounds pass `color={colors.paper}`; for paper backgrounds pass `color={colors.ink}` or the darkest palette colour in scope.

If the template should respect the editor's logo color control, resolve the tint through the format map:

```tsx
import { useFieldColor } from '../../engine';
const logoColor = useFieldColor('logo', colors.ink);
// ...
<BoutiqueLogo logo={logo} boutiqueName={boutiqueName} color={logoColor} ... />
```

### Typography palette — always via CSS variables, never hardcoded

Typography is role-bound through CSS custom properties set on the Stage root. Templates reference the role, not the family — that way a Brand Kit change swaps the whole library without touching scene code, and the Arabic fallback (Noto Kufi) can cleanly prepend to the stack when locale flips to AR.

- **Display / serif** — `fontFamily: 'var(--font-display)'`. Weight 300, letter-spacing `-0.02em` to `-0.03em` for large headlines. Italic variant for tagline / signature / in-quote copy.
- **UI / sans** — `fontFamily: 'var(--font-body)'`. Weight 700 for kickers, uppercase + wide tracking (`letterSpacing: \`${wh(6)}px\``). Weight 500 for body copy.
- **Numeric / prices** — `fontFamily: 'var(--font-numeric)'`. Tabular numerals for counts, prices, rank indicators. Noto Serif Display in the default boutique stack.
- **Arabic** — not directly referenced. The Stage prepends `'Noto Kufi Arabic'` to both display and body stacks when locale is Arabic (via `unicode-range`-gated `@font-face`). Arabic glyphs route there automatically; Latin passes through to the boutique family.

**Hard rule:** never write `'Fraunces'`, `'Nunito Sans'`, `'Portrait'`, or any literal family name in `scene.tsx`. Always `var(--font-*)`. Monospace is off-brand — avoid.

### Safe-zone anchoring — always-safe, content-rect model

Every ad lives inside platform chrome — Instagram caption, TikTok like-stack, Story progress bar. Scenes always render with safe margins applied; the editor's "Safe zones" toggle only shows/hides the dim overlay, it does not change the composition. Exports match what the editor shows.

> **Deep dive:** [`SAFE_ZONE_PATTERNS.md`](SAFE_ZONE_PATTERNS.md) is the canonical reference — decision tree for picking the right pattern per element, full-bleed vs padded-flex vs absolute-wrapper, how to handle floating positioned-in-space layers, and the five named gotchas. Read it before porting a new template or polishing an existing one.

**Quick recipe** — at the scene root, derive the content rect once:

```tsx
import { useSafeZone } from '../../engine';

const { base: safe } = useSafeZone({ width, height });

const contentTop    = safe.top;
const contentBottom = height - safe.bottom;
const contentLeft   = safe.left;
const contentRight  = width  - safe.right;
const contentCX     = (contentLeft + contentRight) / 2;
const contentCY     = (contentTop  + contentBottom) / 2;

// pass into each Act alongside `T` and `s`
<Outro props={props} T={T} s={s} safe={safe} contentCX={contentCX} contentCY={contentCY} />
```

Then anchor elements to the content rect, not the canvas:

```tsx
// Top-anchored readable chrome (logo, masthead):
top: contentTop + h(20)          // 20 base-px inside the visible top edge

// Bottom-anchored (CTA, footer):
bottom: safe.bottom + h(60)

// Side-anchored (side editorial pill):
right: safe.right + w(48)

// Centered on phone-visible center (giant refrain, hero element):
top: contentCY; transform: translateY(-50%)
```

Full-bleed background + internal content column? Use the **padded-flex** pattern — set `paddingTop/Right/Bottom/Left: safe.*` on the flex centre container so its content box becomes the safe rect (the flex center lands on content-rect center; children keep their intrinsic widths — no button text wrapping). See `SAFE_ZONE_PATTERNS.md` §4 Option A.

Positioned-in-space products? Wrap the whole layer in a single translate+scale transform — see §6.

**Legacy pattern still in some templates:** `Math.max(h(X), safe.edge + h(Y))`. It produces correct output in the always-safe regime but is more complex than the content-rect pattern. Simplify when you polish one of those templates; no behaviour change.

**Supported aspects:** only 9:16 and 4:5. 1:1 was removed — marketing doesn't ship square placements. Pre-resolved zones: `9:16 → { top: 250, bottom: 300, left: 0, right: 120 }`, `4:5 → { top: 120, bottom: 200, left: 0, right: 0 }`. Reference implementations: `app/src/templates/seasonal/scene.tsx`, `app/src/templates/bestsellers/scene.tsx`.

### Per-field format hooks

Every marketer-editable text field must route its style through `useFieldFormat(path, baseStyle)` or the Format drawer's overrides will silently no-op on that field (the `Aa` button opens the drawer, the drawer saves the override, but the scene ignores it).

```tsx
import { useFieldFormat } from '../../engine';

function Hook({ props, T, s }: ActProps) {
  const { kicker, headline, colors } = props;  // destructure `colors` FIRST
  const { wh } = s;

  const kickerStyle = useFieldFormat('kicker', {
    fontFamily: 'var(--font-body)',
    fontSize: wh(24),
    fontWeight: 700,
    letterSpacing: `${wh(8)}px`,
    textTransform: 'uppercase',
    color: colors.accent,                       // live brand color, not a hex literal
  });

  const kickerOp = interpolate([T(0.2), T(0.6)], [0, 1], Easing.easeOutCubic)(t);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0, right: 0, top: h(360),
        textAlign: 'center',
        ...kickerStyle,
        opacity: (kickerStyle.opacity ?? 1) * kickerOp,  // multiply, don't replace
      }}
    >
      {kicker}
    </div>
  );
}
```

Two gotchas that have bitten every template port:

1. **Destructure `colors` BEFORE the hook calls.** The hook's deps array captures the base object; if `colors.accent` is read lazily inside the render, brand-color edits don't re-trigger the hook and un-overridden fields freeze on the first palette they saw. Pull `colors` out at the top of the component.
2. **Animation opacity multiplies with override opacity.** When you spread `kickerStyle` and then set `opacity`, use `(kickerStyle.opacity ?? 1) * animT`. A hard override (e.g. `opacity: animT`) clobbers a marketer-dimmed field; a hard ignore (e.g. just the spread) disables intro animations.

The `path` string you pass is the dotted field path as it appears in `fields.ts` (e.g. `'kicker'`, `'ctaText'`, `'headlineLine1'`). It doubles as the override key in the project's stored overrides map — keep it stable.

For `productList` subfields, use wildcard keys so one override applies to every row:

```tsx
const brandlineStyle = useFieldFormat('products.*.brandline', { ... });
const nameStyle = useFieldFormat('products.*.name', { ... });
const priceStyle = useFieldFormat('products.*.price', { ... });
```

The editor now surfaces these as global product controls (not per-row formatting buttons).

### Price composition

Every price string in a template must render through `composePrice` + `useCurrencyForLocale` so the currency suffix follows the active locale (AED in EN, د.إ. in AR) without the marketer having to edit per-locale.

```tsx
import { composePrice, useCurrencyForLocale } from '../../lib/price';

const currency = useCurrencyForLocale();

// in the JSX:
<span style={{ fontFamily: 'var(--font-numeric)', fontWeight: 700, fontSize: wh(26) }}>
  {composePrice(product.price, currency)}
</span>
```

### Product image scale (global product-zone control)

`productList` sections expose one image-scale slider that writes `imageScale` to all product rows. If your scene supports this control, apply it to the animated card/container transform (not only the inner `<img>`) so translate/rotate/scale choreography remains coherent.

`composePrice` strips any known currency trail from the raw prop (`'1,890 AED'`, `'1,890 SAR'`, `'1,890 USD'`, Arabic abbreviations, etc.) before re-appending the active-locale currency — so a boutique switching from AED to SAR in Brand Kit doesn't need to re-author every price.

### Editor-only chrome escape hatch

If you ever render something meant to be visible only in the editor (selection handles, live measurement chips, debug overlays — **not** something the export should bake in), tag its root element with `data-export-ignore="true"`. The MP4 pipeline's `html-to-image` filter skips any node with that attribute, so the editor chrome never leaks into the video even if you forget to gate it on a "not exporting" flag. `SafeZoneOverlay` is the canonical example — see `app/src/engine/SafeZoneOverlay.tsx`.

### Mobile-readability floor (NON-NEGOTIABLE)

A 1080 canvas previews at ~400px on a phone — a 0.37× scale. Enforce these minimums **at base canvas**:

- Body copy: ≥ **28pt**
- Micro / caption / footer: ≥ **20pt**
- CTA button label: ≥ **26pt**
- Logo rendered height: ≥ `h(140)` against any non-solid backdrop
- Never rely on a thin `font-weight: 200` for anything under 40pt

### Aspect safety

Both supported aspects share the 1080 width but crop vertically. Keep critical copy and faces within the safe rect for each aspect (see `SAFE_ZONE_PATTERNS.md` for margins). 4:5 is the tighter of the two — double-check there.

### Interactivity

- Root `<div>` receives the scene's `onClick` for the editor's tap-ripple effect. Copy the pattern from `lookbook/scene.tsx` (setTapMark + keyframes).
- Any interactive child (CTA button, chip) MUST call `e.stopPropagation()` in its handler so it wins over the ripple.
- Never attach global keyboard listeners from inside a scene. Multiple scenes can mount at once (gallery preview cards) — the engine disables keyboard for those via `useStageController({ keyboard: false })`.

## Registry step (don't forget)

Add an import + entry to `app/src/templates/registry.ts`:

```ts
import * as <slug> from './<slug>';

// inside the `entries` record:
[<slug>.meta.id]: {
  meta: <slug>.meta as unknown as TemplateMeta<unknown>,
  fields: <slug>.fields,
  Scene: <slug>.<Name>Scene as unknown as ComponentType<SceneComponentProps>,
},
```

Template order in `registry.ts` sets gallery order; insert near peers of similar archetype.

## Deliverable checklist

Before handing back, verify:

1. Five files created under `app/src/templates/<slug>/`: `schema.ts`, `fields.ts`, `meta.ts`, `scene.tsx`, `index.ts`.
2. Registry entry added to `app/src/templates/registry.ts`.
3. Every string visible in the rendered scene is either from `props` or is a structural literal (e.g. `"—"`, `"· "`). No hidden hardcoded headline copy.
4. Every path referenced in `fields.ts` resolves in `defaultProps` (no drift between the two).
5. No literal font family name in `scene.tsx` — every `fontFamily` is `var(--font-display)` / `var(--font-body)` / `var(--font-numeric)`.
6. Every bottom/top/side-anchored element near an edge anchors to the **content rect** (`contentTop + h(X)`, `safe.right + w(X)`, etc.) — see `SAFE_ZONE_PATTERNS.md`. No raw `h(X)` for CTAs, footers, kickers, and no leftover legacy `Math.max(h(X), safe.{edge} + h(Y))` either. Full-bleed flex-centered layouts use the padded-flex pattern (§4 Option A). Positioned-in-space layers (floating products) use the layer-transform pattern (§6).
7. Every editable text field in `fields.ts` has a matching `useFieldFormat(path, base)` call in `scene.tsx`. Path spellings match exactly.
8. Every price string renders via `composePrice(raw, useCurrencyForLocale())` — never `{product.price}` directly.
9. `colors` is destructured BEFORE any `useFieldFormat` call in every Act component (brand-color reactivity).
10. `npx tsc --noEmit` clean.
11. `npm run build` clean.
12. Spot-check 4:5 in the editor — no overflow, no below-floor text. (1:1 is not supported; 9:16 is the primary target.) The "Safe zones" toggle only affects the dim overlay — composition should be identical either way.
13. Spot-check Arabic locale — switch the editor to AR and confirm the scene renders RTL without layout breaks.
14. One commit per template when multiple are being added in a batch, so review stays tractable.

## Tone + archetype guidance

Brand voice is luxury Middle East boutique — hushed, editorial, confident. Avoid shouty e-com tropes (`"BUY NOW!!!"`, exclamation points, neon palettes). Price strings are AED by default. When a brief is underspecified, lean toward restraint: slower pacing, fewer elements per frame, more negative space.

Before scaffolding a new archetype, check whether it already exists. Current coverage (9 templates):

Phase 1 (originals):
- **Lookbook** — multi-act editorial narrative, 5 products, slow reveal.
- **Editorial** — volume / issue framing, masthead typography, monochrome.
- **Countdown** — time-driven urgency, ticking clock, dramatic CTA slam.
- **Hero** — single-product arrival / drop reveal.

Phase 2 expansion (code-port of the five archetypes from the design-preview pre-answers above):
- **Bestsellers — Top 5** — ranked 05 → 01 with numeric slam.
- **Seasonal Campaign** — occasion-driven, warmth over urgency.
- **Category Carousel** — depth in one category, slow lingering reveal.
- **Brand Spotlight** — single-brand hero + companion strip.
- **Gift Guide** — curated picks with gift framing.

If the brief overlaps with any of the nine, either (a) suggest the user extend the existing template via its fields, or (b) clearly differentiate — e.g. a new "Price Drop" template is **price-driven**, distinct from Countdown's **time-driven** urgency.
