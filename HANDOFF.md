# HANDOFF — Ounass Video Ad Generator

**Audience:** any AI coder or human engineer who's been dropped into this project cold. Read this top-to-bottom **before** the ROADMAP. The ROADMAP is "what we built and why"; this is "how to keep building it without re-discovering everything painful."

> **Maintain this file.** Whenever you finish a phase, change a major architectural decision, hit a non-obvious gotcha, or change a convention — update HANDOFF.md *in the same change*. Look for the **MAINTENANCE** sections at the bottom of every section that needs touching.

---

## 0. TL;DR (45 seconds)

- **Product:** SaaS-style video ad generator for the Ounass marketing team. Marketer picks a template → edits text/images/colors → previews live → exports an MP4. **Free-tier hostable** (Vercel static + client-side render).
- **Status:** Phases 0–4 complete (foundation → editor → customization → multi-template → MP4 export). Phase 5 = polish, not started.
- **Stack:** Vite 6 + React 19 + TypeScript, single-page app, localStorage for state, ffmpeg.wasm for encoding.
- **Live demo:** `cd app && npm run dev` → http://localhost:5173. Or via Claude Preview MCP: configured in `.claude/launch.json` as `vag-dev`.
- **Last session ended:** Phase 4 verified end-to-end (Sale Countdown 5s × 1:1 → 8.2 MB MP4).
- **Read order from here:** §1 Quick start → §3 Mental model → §6 How to add a new template → §9 Gotchas. **§18 Git workflow** describes how we branch and merge (sequential contributors—see there).

---

## 1. Quick start

```bash
cd /Users/dgolani/Documents/Claude\ Projects/VideoAds/app
npm install                # if first time
npm run dev                # opens 5173
npx tsc -b --noEmit        # typecheck (run before any handoff)
```

Or with the Claude Preview MCP:

```ts
preview_start({ name: 'vag-dev' })   // reads .claude/launch.json at project root
```

There's no separate build step in dev. `npm run build` runs `tsc -b && vite build` (production bundle).

**Verify it works:**
1. Visit `/` → Dashboard (empty state if first run, otherwise project cards)
2. Visit `/templates` → 4 template cards
3. Click "Use template" on any → enters Editor at `/editor/:id`
4. Edit a text field → canvas updates live
5. Click Export → modal → Start → wait → download MP4

---

## 2. What this is, in three sentences

The marketer opens the app, picks a template (Lookbook, Editorial, Sale Countdown, or Hero), and lands in a 3-pane editor — **brand kit column** (products + logo + colors when present) / **live canvas + layered timeline** / **properties panel** for the remaining fields from the template's `fields[]`. They tweak copy/images/colors/duration/aspect; everything autosaves to localStorage. **Scene timing** is reflected in `meta.scenes` (scaled with duration) and surfaced on the **timeline video bar** (markers + scene names), not a separate left outline list. When they're happy, Export rasterizes the canvas frame-by-frame in the browser and pipes the PNGs through ffmpeg.wasm to produce an MP4 (yuv420p, social-ready).

There is **no backend**. No login. No accounts. No Ounass API access (Kasada blocks it). The whole tool is one user × one browser. Eventually deploys to Vercel free tier with zero serverless functions.

---

## 3. Mental model (the only diagram you need)

```
                    ┌──────────────────────────────────┐
                    │          Template registry       │
                    │  src/templates/registry.ts       │
                    │  4 entries today: phillip-lim,   │
                    │  editorial, countdown, hero      │
                    └────┬───────────────┬─────────────┘
                         │ meta          │ Scene + fields
                         ▼               ▼
   ┌─────────────────────────────────────────────────┐
   │                  EDITOR (one route)             │
   │  src/app/routes/Editor.tsx                      │
   │                                                 │
   │  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │
   │  │EditorBrand │  │   Stage      │  │ Properties  │  │
   │  │Panel       │  │ + Scene      │  │ (remaining   │  │
   │  │PRODUCTS / │  │ + Editor     │  │  fields[])   │  │
   │  │BRAND KIT   │  │ TimelineDock │  │             │  │
   │  └────────────┘  └──────┬───────┘  └─────────────┘  │
   └─────────────────────┼───────────────────────────┘
                         │ shared StageController
                         │ (time, playing, setTime)
                         ▼
                ┌──────────────────────┐
                │ useStageController() │  ← RAF loop, keyboard, persist
                │ src/engine/          │
                └──────────────────────┘
```

Three rules of the architecture:

1. **The Editor never branches on template id.** Adding a new template = registering it in `registry.ts`. Zero editor edits. (Verified: `grep -r "phillip-lim\|editorial\|countdown\|hero" src/app/` returns 0 matches.)
2. **Templates are pure data + one component.** A template = `{ meta, fields, defaultProps, Scene }`. Scene is a pure function of `(props, time)` that reads time via `useTimeline()`.
3. **Scenes are dimension-agnostic.** Every scene receives `width` + `height` props and uses `makeScale(W, H)` helpers (`w(px)`, `h(px)`, `wh(px)`). No hardcoded pixel literals — they all read through the helpers so any aspect just works.

If you internalize those three rules, you can navigate the codebase blind.

---

## 4. Repo layout (annotated)

```
VideoAds/
├── ROADMAP.md                  ← Phase-by-phase log of decisions and what landed
├── HANDOFF.md                  ← (this file)
├── .claude/
│   └── launch.json             ← Claude Preview MCP config — server "vag-dev" on :5173
├── Ounass/                     ← The original Phillip Lim HTML prototype. Reference only;
│                                  the actual app lives in app/.
└── app/                        ← The Vite app (everything below is relative to here)
    ├── package.json
    ├── vite.config.ts          ← !! ffmpeg gotchas live here (optimizeDeps.exclude)
    ├── index.html              ← Loads Google Fonts (Fraunces + Nunito Sans)
    ├── tsconfig.*.json
    └── src/
        ├── main.tsx            ← StrictMode + BrowserRouter mounting
        ├── App.tsx             ← Routes: / /templates /brand /editor/:id
        ├── index.css           ← Body reset only — keep minimal
        │
        ├── styles/
        │   └── tokens.css      ← Design tokens (--ink, --bone, --bronze, etc.)
        │
        ├── engine/             ← The animation engine. Template-agnostic.
        │   ├── Stage.tsx       ← Auto-scaling canvas + PlaybackBar.
        │   │                     New canvasRef prop = export pipeline target.
        │   ├── useStageController.ts   ← Time state + RAF loop + keyboard.
        │   ├── timeline.tsx    ← TimelineContext + Sprite + useTime/useSprite hooks.
        │   ├── math.ts         ← Easing functions, interpolate, animate, clamp.
        │   ├── sprites.tsx     ← TextSprite/ImageSprite/RectSprite — unused by current
        │   │                     templates but available for future ones.
        │   └── index.ts        ← barrel export
        │
        ├── templates/
        │   ├── types.ts        ← Shared TemplateMeta / AspectRatio / SceneOutline.
        │   │                     !! Lifted out of (legacy) phillip-lim/meta.ts in Phase 3
        │   │                        to break the implicit-parent leak.
        │   ├── fields.ts       ← FieldDescriptor union (section/text/color/image/productList).
        │   ├── registry.ts     ← Add template = register here. Type SceneComponentProps.
        │   ├── lookbook/       ← 4-act luxury vertical (5 columns + filmstrip + outro).
        │   │                     Renamed from phillip-lim in Phase 5 to be brand-neutral.
        │   ├── editorial/      ← Magazine 2×2 grid + feature zoom + signature.
        │   ├── countdown/      ← Bold promo, no products, diagonal swash.
        │   └── hero/           ← Single product, full-frame Ken-Burns zoom.
        │   Each template folder: schema.ts + meta.ts + fields.ts + scene.tsx + index.ts
        │
        ├── assets/
        │   └── placeholders.ts ← Inline SVG luxury-fashion placeholders (data URLs).
        │                         User plans to replace with image-gen PNGs;
        │                         keep the same export names: productPlaceholders.p01..06,
        │                         heroSilhouette, salePlaceholder.
        │
        ├── store/
        │   ├── types.ts        ← Project includes template props + aspectIndex, duration,
        │   │                     background music (track id, volume, anchor, trim), timestamps
        │   ├── projects.ts     ← localStorage CRUD + useProjects/useProject hooks.
        │   │                     Throws StorageQuotaError on quota; surfaced in Editor.
        │   └── brand.ts        ← Brand kit (boutique name + 4 colors + optional logo).
        │                         applyBrand(defaults, brand) deep-merges into new projects.
        │
        ├── lib/
        │   ├── path.ts         ← getPath/setPath dot-notation. Powers the properties
        │   │                     panel — works for nested keys like 'product.image'.
        │   ├── quickHash.ts    ← Tiny string fingerprint (filmstrip cache keys).
        │   ├── uid.ts          ← Single shared id generator.
        │   ├── image.ts        ← resizeImageToDataURL — caps uploads at 1080px JPEG q=0.85.
        │   ├── useHistory.ts   ← Undo/redo with debounced commits. Cmd-Z / Cmd-Shift-Z.
        │   ├── export.ts       ← !! THE EXPORT PIPELINE. ffmpeg gotchas captured at top.
        │   └── musicTracks.ts  ← Curated beds (`public/audio/`) + resolveAudioUrl.
        │
        ├── ui/
        │   ├── primitives.tsx  ← Button/Field/TextField/Textarea/ColorField/Section/Stack/Empty.
        │   └── Slider.tsx      ← Horizontal slider used for the duration control.
        │
        └── app/                 ← Editor app shell + routes + components.
            ├── Shell.tsx       ← Sidebar + topbar; Outlet for routes.
            ├── routes/
            │   ├── Dashboard.tsx
            │   ├── Gallery.tsx ← Lists templates from listTemplates(); applyBrand on create.
            │   ├── Editor.tsx  ← The 3-pane editor (brand column + stage + properties).
            │   └── BrandKit.tsx
            └── components/
                ├── EditorBrandPanel.tsx  ← Left column: PRODUCTS + BRAND KIT; splitEditorFields().
                ├── Outline.tsx            ← Legacy scene list UI; not mounted by Editor (timeline owns scenes).
                ├── PropertiesPanel.tsx  ← Renders any template's fields[] generically.
                │                          Exports ImageDropZone (reused by BrandKit). `compact` prop for left column.
                ├── TemplatePreview.tsx  ← Live mini-render of a template scene; played
                │                          on hover from gallery + dashboard cards.
                │                          Mounts paused by default; multi-instance safe
                │                          (keyboard: false, no persistKey).
                ├── EditorTimelineDock.tsx  ← Layered timeline (filmstrip + music + playhead)
                └── ExportModal.tsx
```

**MAINTENANCE — update §4 when you:** add/move/rename a top-level src directory, add a new template folder, or add a non-trivial new file in `lib/` or `engine/`.

---

## 5. Conventions in this codebase

These are not aesthetic — every one of them is here because deviating from it broke something. If you change one, you're signing up to update everything that depends on it.

### 5.1 Template anatomy
Every template is a folder with **exactly five files**:

```
templates/<id>/
  schema.ts   → TS types + defaultProps (fully populated, including placeholder images)
  meta.ts     → meta: TemplateMeta<P>  (id, name, aspects, scenes, defaultDuration, defaultProps)
  fields.ts   → fields: FieldDescriptor[]  (drives the properties panel)
  scene.tsx   → Scene component: ({ props, timeScale?, width, height }) => JSX
  index.ts    → barrel re-exports
```

Then add ONE entry to `src/templates/registry.ts`:
```ts
import * as <id> from './<id>';
const entries = {
  ...,
  [<id>.meta.id]: {
    meta: <id>.meta as unknown as TemplateMeta<unknown>,
    fields: <id>.fields,
    Scene: <id>.<Name>Scene as unknown as ComponentType<SceneComponentProps>,
  },
};
```

That's it. The Editor and Gallery pick it up automatically. **If you find yourself wanting to add an `if (templateId === 'foo')` branch in `src/app/`, stop — extend the schema/fields/registry instead.**

### 5.2 Scene authoring
- Scene is a pure function of props + time (read time via `useTimeline()`).
- All time literals wrap in `T(x) = x * timeScale`. Never write a bare `0.4` for a time value.
- All pixel literals wrap in `w(px)`, `h(px)`, or `wh(px)` (smaller of the two ratios — for fontSize, padding, etc.). Never write a bare `top: 780` — use `top: h(780)`.
- Base canvas is **1080 × 1920**. All your literals are pixel values *as if you were drawing for that canvas.* `makeScale(W, H)` does the rest.
- Acts pass `props`, `T`, and `s` (the Scale object) down via prop drilling. We chose this over context to keep the data flow obvious — it's the right amount of friction.

### 5.3 Field descriptors
The only valid `kind`s are `section | text | color | image | productList`. If a template wants something new, **first** check whether it can be expressed via existing kinds (e.g. nested paths like `product.image` work without a new kind). Adding a new kind means updating `PropertiesPanel.tsx` to render it.

`productList` has knobs: `imagePath` (which key holds the image), `newProductTemplate` (default shape for + Add), `minProducts` / `maxProducts`, `addLabel`. Phillip Lim uses 2/10. Editorial uses 4/4 (fixed grid).

### 5.4 State + persistence
- All projects: `localStorage['vag:projects:v1']` — array of Project (includes `backgroundTrackId`, `musicVolume`, `musicAnchorVideoTime`, `musicTrimStartSec` for timeline + export).
- Brand kit: `localStorage['vag:brand:v1']` — single object.
- Per-project playhead: `localStorage['project:<id>:t']` — last seek position.
- Hooks (`useProjects`, `useProject`, `useBrand`) listen to a custom CustomEvent bus AND the native `storage` event so cross-tab edits stay in sync.
- Storage quota: `writeAll` throws `StorageQuotaError`. Editor's autosave catches it and shows "Storage full — drop an image or two" instead of "Saved".

### 5.5 Routing
`react-router-dom@7`. Layout route via `<Shell />` for Dashboard/Gallery/BrandKit. Editor is a sibling layout (no shell — it's full-bleed), gated by `isEditor` check inside Shell.

### 5.6 Code style
- Functional components with hooks. No class components.
- `const X = () => {}` for utility functions; `function X() {}` for components and exported helpers (helps stack traces).
- All styling is inline-style objects using design-token CSS variables (`var(--editor-accent)` etc.). No CSS modules, no styled-components, no Tailwind. Keeps the codebase grep-able.
- TypeScript everywhere; type assertions only at the registry boundary (`as unknown as TemplateMeta<unknown>`).

**MAINTENANCE — update §5 when you:** introduce a new convention, deprecate an existing one, change the template anatomy, or add/remove a FieldDescriptor kind.

---

## 6. Recipe: add a new template (10 minutes, copy this checklist)

1. `mkdir src/templates/<id>` (use a short kebab-case id).
2. **`schema.ts`** — define props type + defaultProps (use `placeholders.p01..06` or `heroSilhouette` or `salePlaceholder` for image defaults so it looks polished out of the box).
3. **`meta.ts`** —
   ```ts
   import { defaultProps, type FooProps } from './schema';
   import type { TemplateMeta } from '../types';
   export const meta: TemplateMeta<FooProps> = {
     id: '<id>', name: '...', description: '...',
     defaultDuration: 9,
     aspects: [
       { label: '9:16 (Story)', width: 1080, height: 1920 },
       { label: '4:5 (Feed)',   width: 1080, height: 1350 },
       { label: '1:1 (Square)', width: 1080, height: 1080 },
     ],
     scenes: [{ id: '...', label: '...', start: 0, end: 2 }, ...],
     defaultProps,
   };
   ```
4. **`fields.ts`** — declare which props are editable. Group with `{ kind: 'section', label: 'Brand' }` headers.
5. **`scene.tsx`** — copy the makeScale + ActProps boilerplate from `phillip-lim/scene.tsx`. Each Act receives `{ props, T, s }`. Wrap every time literal in `T(...)` and every pixel in `s.w/s.h/s.wh`. Single-aspect-coded scenes are not allowed.
6. **`index.ts`** — `export { FooScene } from './scene'; export { meta } from './meta'; export { fields } from './fields'; export { defaultProps, type FooProps } from './schema';`
7. **Register in `src/templates/registry.ts`** (3-line addition).
8. `npx tsc -b --noEmit` → must pass.
9. Open `/templates` → click your new card → land in editor. Edit a text field; canvas should update. Try the 3 aspects.
10. **Update ROADMAP.md** Phase 3 Pass 2 section ("Templates currently registered: …") if you want a record.

---

## 7. Recipe: extend an existing template

- **New text/color field:** add to `schema.ts` (with default), reference in `scene.tsx`, add an entry in `fields.ts`. Three files. No registry change.
- **New image field:** same as above, but use `kind: 'image'` in fields.ts (it'll auto-render the drop zone).
- **New aspect:** add to `meta.ts` `aspects[]`. Scene already adapts because of the ratio helpers. Verify visually in editor.
- **Per-act timing tweak:** edit the `T(...)` bounds inside the scene's Act components. Update the `meta.scenes[]` ranges so the **timeline** scene markers and segment labels stay accurate (Editor passes scaled scenes into `EditorTimelineDock`).
- **Add a new act:** new component in `scene.tsx`, render it from the root `<Foo>Scene`. Add to `meta.scenes`. Wrap all times in `T()`.

---

## 8. Recipe: debug an export

If export hangs, fails, or produces wrong output — check in this order:

1. **Browser console:** ExportModal logs `[Export] failed:` on catch. Copy the message.
2. **"Failed to import ffmpeg-core.js"** → §9 gotcha #3. Check that imports in `lib/export.ts` use `'@ffmpeg/core?url'` not a path-string.
3. **"Loading encoder…" hangs forever** → §9 gotcha #2. Check `vite.config.ts` has `optimizeDeps.exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']`.
4. **Output MP4 has wrong fonts (system serif fallback)** → `getFontEmbedCSS(canvasEl)` either threw silently or returned empty. The catch in `lib/export.ts` swallows it. Add a `console.warn` inside that catch to see the underlying error.
5. **Export visually differs from preview** → known limitation: `backdrop-filter`, `mix-blend-mode`, and a couple of `filter:` properties don't always rasterize in foreignObject. The luxury aesthetic is ~95% intact; if a specific element looks wrong, replace those CSS properties on that layer with a flat alternative.
6. **Render speed hits ~0.5 fps** → not a bug, just complex DOM. The 5-column Phillip Lim grid is the slowest. Optimisation candidates (Phase 5): worker-pool rasterization, OffscreenCanvas.
7. **Export silently produces no download** → check `downloadBlob()` isn't being blocked by browser popup blocker. The button click is a user gesture so it should work.

---

## 9. Gotchas hall of fame

The painful lessons. Numbered so you can grep for "Gotcha #N" in PRs.

### Gotcha #1 — Vite + React 19 + react-router-dom 7: stale dep cache → "Invalid hook call" cascade
**Symptom:** Dashboard renders, but console floods with "Invalid hook call. Hooks can only be called inside of the body of a function component." React DevTools blames a duplicate React.
**Cause:** Vite's `node_modules/.vite/deps/` had pre-bundled React from before we installed react-router-dom; the post-install version drift produced two React copies.
**Fix:** `rm -rf node_modules/.vite && npm run dev`. Plus `resolve.dedupe: ['react', 'react-dom']` in `vite.config.ts` (already in place).
**Lesson:** any time you `npm install` a React-adjacent package, clear `.vite/` before next dev.

### Gotcha #2 — Vite pre-bundling breaks ffmpeg's worker URL
**Symptom:** `ffmpeg.load()` hangs at "Loading encoder…" forever. No errors. No network requests to ffmpeg-core.
**Cause:** `@ffmpeg/ffmpeg` spawns a worker via `new Worker(new URL('./worker.js', import.meta.url))`. Vite's dep pre-bundler rewrites that URL to point to its own bundled artefact, where `./worker.js` no longer resolves correctly.
**Fix:** `optimizeDeps.exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']` in `vite.config.ts`.
**Already applied.** Don't remove this exclude.

### Gotcha #3 — UMD core in module worker fails to importScripts
**Symptom:** "Error: failed to import ffmpeg-core.js" from inside the ffmpeg worker.
**Cause:** Vite spawns ffmpeg's worker as a **module** worker. The worker tries `importScripts(coreURL)` (only valid in classic workers); on failure it falls back to `import(coreURL.replace('/umd/', '/esm/'))`. If you passed a UMD path, the fallback swap works. If you passed a **blob URL** wrapping UMD, the regex doesn't match — the swap is a no-op — `import()` fails to parse UMD as a module — silent failure.
**Fix:** Use the package's `exports` field, not a string path:
```ts
import ffmpegCoreURL from '@ffmpeg/core?url';      // → /dist/esm/ffmpeg-core.js
import ffmpegWasmURL from '@ffmpeg/core/wasm?url'; // → /dist/esm/ffmpeg-core.wasm
```
**Already applied** in `src/lib/export.ts`. **Do not** revert to `?url` imports of `dist/umd/...` paths or to `toBlobURL` wrappers.

### Gotcha #4 — Ounass /product/findbysku is Kasada-gated
**Symptom:** Any server-side or `localhost`-origin fetch to `https://www.ounass.ae/product/findbysku?sku=…` returns 429 with a JS-challenge HTML page.
**Cause:** Kasada bot protection requires a cookie + a header signed by JS that runs on an actual ounass.ae page. Headers alone don't bypass.
**Implication:** **There is no SKU importer.** Marketers upload product images directly. We tested 4 alternatives (Playwright headless, bookmarklet, server proxy with pasted cookies, hosted-on-ounass.ae) — none viable for free-tier solo-marketer scope.
**If anyone re-opens this:** the cleanest path is an Ounass-hosted deploy with same-origin fetches. Until then, don't waste time.

### Gotcha #5 — TemplateMeta lived inside phillip-lim/meta.ts (now fixed, watch for regression)
**Symptom:** Adding a 5th template requires `import type { TemplateMeta } from '../phillip-lim/meta'`. Feels weird — and is.
**Cause:** Pre-Phase-3, `TemplateMeta` was defined inside Phillip Lim's meta file. Lifted to `src/templates/types.ts` so Phillip Lim is no longer an implicit parent.
**Watch for:** never re-locate shared types into a specific template's folder. Anything used by 2+ templates lives in `templates/types.ts` or higher.

### Gotcha #6 — Empty `<img src="">` warning during scene render
**Symptom:** Console floods with `An empty string ("") was passed to the src attribute…` while a marketer is mid-edit (e.g. just added a new product, hasn't uploaded image yet).
**Cause:** Scene rendered `<img src={p.src}>` unconditionally; `p.src` was an empty string before upload.
**Fix:** All scene img tags now wrapped: `{p.src ? <img …/> : <placeholder />}`. New templates must do the same — see Phillip Lim Act 2 columns or Hero `HeroImage` for the pattern.

### Gotcha #7 — Stage's auto-fit transform interferes with rasterization
**Symptom:** Pre-Phase-4 Stage applied `transform: scale(N)` to the inner canvas to fit the viewport. html-to-image rasterized the *visually-scaled* element, not the native 1080×1920.
**Fix:** Stage now exposes a `canvasRef` prop. Editor passes its own ref so it can target the inner canvas directly. Export call also passes `style: { transform: 'none' }` to html-to-image as belt-and-braces.

### Gotcha #9 — Multiple Stages on one page conflict on the global keyboard listener
**Symptom:** Press space anywhere on the gallery — all 4 mini-previews toggle play/pause at once.
**Cause:** `useStageController` registers a window keydown listener (space/arrows/home). Each `<TemplatePreview>` instantiates a controller, so N previews = N listeners.
**Fix:** `useStageController({ keyboard: false })` disables that listener for previews. The Editor still gets the default `keyboard: true`. **Always pass `keyboard: false` for any controller used outside the main Editor.**

### Gotcha #10 — Headless tabs throttle requestAnimationFrame to ~1 Hz
**Symptom:** Hover-to-play looks stuck in Claude Preview MCP (or any headless Chrome). Time hook reads a stale value across seconds.
**Cause:** Chrome throttles RAF aggressively when a tab isn't visible/focused. The MCP browser context falls into the throttled bucket.
**Implication:** Don't trust the MCP preview to verify hover-play visually — verify by inspecting React fiber state instead (proves wiring), then trust real-browser playback.
**Confirmed working:** dispatching `mouseenter` flips `hovered=true` on the card, `playing=true` on the preview's controller, time hook is writable. In a real focused tab the animation plays at 60fps.

### Gotcha #8 — localStorage quota at ~5 MB
**Symptom:** Saving fails silently after the marketer uploads 8+ high-res product images.
**Fix:** `resizeImageToDataURL` caps at 1080px JPEG q=0.85 (~200–400 KB each). `writeAll` throws `StorageQuotaError`; Editor surfaces "Storage full — drop an image or two".
**If this becomes a real problem:** migrate image storage to IndexedDB (Phase 5+ candidate). Keep the project metadata in localStorage; just move the data-URL blobs.

**MAINTENANCE — add to §9 when you:** burn 30+ minutes debugging anything that wasn't obvious from the code. The next person should not re-burn that time.

---

## 10. Locked decisions (from memory + ROADMAP)

These are settled. Don't re-litigate without raising it explicitly.

| Decision | Choice | Why |
|---|---|---|
| Stack | Vite + React 19 + TypeScript | Locked Phase 0. Architecture ripples are too costly mid-build. |
| Persistence | localStorage only (single browser) | Free tier; no backend. Cross-device requires cloud (deferred). |
| Customization tier | Tier 1 (text / images / products / colors / logo / duration / aspect) | Tier 2 (per-act timing/easing) deferred behind future "Advanced" disclosure. |
| Export pipeline | Frame-by-frame DOM → ffmpeg.wasm → MP4 | Client-only, deterministic, free-tier-safe. Skipped MediaRecorder/WebM. |
| Aspect strategy | Each scene reads `width/height` from props; ratio helpers map base-1080×1920 literals | Multi-aspect was a Phase 3 deliverable. |
| Image storage | Resized JPEG data URLs in localStorage | Acceptable up to ~10 products per project. |
| SKU import | **Not built** (Kasada). Marketers upload images directly. | See Gotcha #4. |

Full rationale: see [ROADMAP.md](ROADMAP.md) and the project memory file at `~/.claude/projects/-Users-dgolani-Documents-Claude-Projects-VideoAds/memory/build_decisions.md`.

---

## 11. Status snapshot

| Phase | Status | Notes |
|---|---|---|
| 0 — Foundation | ✅ | Vite scaffold, engine extracted, Phillip Lim ported. |
| 1 — Editor shell | ✅ | Routes, 3-pane editor, schema-driven properties panel. |
| 2 — Customization depth | ✅ | Image upload, product CRUD, undo/redo, duration slider w/ act scaling, aspect switcher, Brand Kit. |
| 3 — Multi-template | ✅ | Logo upload + in-scene rendering, multi-aspect Phillip Lim, 3 new templates (editorial, countdown, hero), 8 SVG luxury placeholders. |
| 4 — Export | ✅ | Frame-by-frame → ffmpeg.wasm → MP4. Verified with Sale Countdown 5s × 1:1 → 8.2 MB. |
| 5 — Polish | ⬜ | Not started. Candidates listed below. |

### Phase 5 candidates (not committed; pick from this menu when starting)

- Keyboard shortcuts (cmd-S to manual save indicator, cmd-E for export, etc.)
- Shareable read-only preview URLs (encode project state in URL for review)
- Onboarding empty states (better empty-Dashboard CTA, gallery hover preview loops)
- Tier 2 "Advanced" panel: per-act timing + easing (the only thing Tier 1 doesn't cover)
- Parallel rasterization (worker pool) to halve export time
- IndexedDB-backed image storage (lifts the ~5 MB localStorage cap)
- Replace SVG placeholders with image-gen PNGs (user is generating these — drop-in swap; see §12)
- Vercel deploy + custom domain
- Cloud sync (Vercel Blob or Supabase free tier) for cross-device
- More templates (3 more would round out: e.g. "Carousel Reveal", "Mood Board", "Quote Card")

---

## 12. Pending external work

- **Placeholder PNGs from user.** User is generating luxury fashion vector-style placeholder images via Claude's image generator (prompt was provided in chat). When delivered, drop into `app/src/assets/placeholders/` and update `placeholders.ts` to import + base64-encode them, keeping the **same export names**: `productPlaceholders.p01..06`, `heroSilhouette`, `salePlaceholder`. Templates pick them up automatically.

**MAINTENANCE — update §11 + §12 when you:** complete a phase, commit a Phase 5 item, take a candidate off the list, or add/remove a pending external dependency.

---

## 13. Files that need updating together (changes that span boundaries)

If you change… | …also touch
---|---
A FieldDescriptor kind | `templates/fields.ts` + `app/components/PropertiesPanel.tsx` (renderer) + every template's `fields.ts` that uses it
The Project type | `store/types.ts` + `store/projects.ts` + every consumer of `useProject`
The TemplateMeta type | `templates/types.ts` + every template's `meta.ts` + `templates/registry.ts`
The Scene contract | `templates/registry.ts` (`SceneComponentProps`) + every template's `scene.tsx` + `app/routes/Editor.tsx` (where it's invoked)
The Stage `controller` API | `engine/Stage.tsx` + `engine/useStageController.ts` + `app/routes/Editor.tsx` + `lib/export.ts`
A token/color | `styles/tokens.css` (single source of truth — never hardcode)
ROADMAP scope | ROADMAP.md + this HANDOFF §10 / §11

---

## 14. Verification checklist (before declaring a session done)

Run these. They take ~2 minutes total.

```bash
cd app
npx tsc -b --noEmit            # must pass with no output
```

In the running preview:
1. Dashboard `/` — empty state OR project list both render
2. Gallery `/templates` — 4 cards present, all have aspect labels
3. Click "Use template" on each → enters editor, no console errors
4. In editor:
   - Edit a text field → canvas updates within 400ms
   - Click an aspect pill → canvas re-lays out
   - Drag duration slider → timeline scene layout scales + canvas timing scales (`timeScale`)
   - Click ↶/↷ → undo/redo works
5. Brand Kit `/brand` — boutique name + 4 colors + logo dropzone all editable; "Saved" flashes
6. Export (use a 5s × 1:1 project for speed):
   - Modal opens
   - Start → progresses through Loading / Embedding fonts / Rendering / Encoding
   - Finishes with "Ready to download" + filename + MB
   - Download MP4 → file downloads (in browser context — MCP just sees the click happen)

If any of these fail, **don't mark the session done.** Update HANDOFF §9 with the new gotcha, fix it, re-run the checklist.

---

## 15. Pointers to memory + decision log

- [ROADMAP.md](ROADMAP.md) — full phase log with rationale and "what landed" per phase.
- `~/.claude/projects/-Users-dgolani-Documents-Claude-Projects-VideoAds/memory/MEMORY.md` — index of memory files.
- `…/memory/roadmap_location.md` — pointer to ROADMAP.md (a fresh session reads this first).
- `…/memory/build_decisions.md` — the three locked decisions (stack / customization tier / export). Don't drift from these without flagging.

---

## 16. Common useful commands

```bash
# Dev server
cd app && npm run dev

# Typecheck
cd app && npx tsc -b --noEmit

# Production build
cd app && npm run build

# Clear Vite dep cache (after npm install or weird HMR errors)
rm -rf app/node_modules/.vite

# Find any place that branches on template id (should be empty!)
grep -rn "phillip-lim\|editorial\|countdown\|hero" app/src/app

# Find any hardcoded pixel literal in a scene (should be wrapped in w/h/wh)
grep -nE "top: [0-9]+|left: [0-9]+|fontSize: [0-9]+" app/src/templates/*/scene.tsx
```

---

## 17. If everything is on fire

Order of operations:

1. `cd app && rm -rf node_modules/.vite && npm run dev` — solves 60% of HMR weirdness.
2. `cd app && npx tsc -b --noEmit` — surfaces any type drift.
3. Open browser console, look for the actual error. ExportModal logs `[Export] failed:` so check there for export issues.
4. `git diff` — what changed since last working state?
5. Check §9 Gotchas — most "weird" issues are documented.
6. If still stuck: `git stash`, verify checklist §14 passes on the clean tree, then re-apply stash and bisect.

---

## 18. Git workflow (sequential contributors)

Contributors **never work in parallel** on this repo—only one active stream at a time (different people or different sessions, but not overlapping). The process stays light.

### 18.1 `main` and starting a session

- **`main`** is the source of truth: it should stay runnable and typeclean.
- **Before any work:** `git checkout main` → `git pull` so you are building on the latest tree (including HANDOFF/ROADMAP).

### 18.2 Branches: named by task, not by person

- **Non-trivial or risky change** (feature, refactor, anything you might want to drop cleanly): create a **short-lived branch** named for the work, e.g. `feature/export-music`, `fix/editor-autosave`. Finish it, merge to `main`, delete the branch.
- **Tiny, obvious fix** (one-liner, typo): committing **directly on `main`** after the pull is fine.
- **Do not** use long-lived personal branches (“my branch” / per-tool identity). **Do not** add a `develop` layer unless the team explicitly decides it needs one—we do not need it for sequential work.

### 18.3 Merge and paper trail

- Merge task branches into **`main`** when the task is done (self-merge is OK).
- A **PR with a one-line description** is optional but useful as a history log; use it when you want review or an audit trail.

### 18.4 Docs and quality

- **HANDOFF.md** = how to run, conventions, gotchas. **ROADMAP.md** = phased history and rationale. Update them **in the same merge** as the code when behavior, setup, or conventions change (same rule as the banner at the top of this file).
- Before merge: at minimum **`cd app && npx tsc -b --noEmit`**; for user-visible changes, match **§14 Verification checklist** where it applies.

**MAINTENANCE — update §18 when you:** rename the default branch, start parallel development for real, or add a required review / CI gate.

---

**Last meaningful update:** 2026-04-18 — **Editor:** left **`EditorBrandPanel`** (PRODUCTS, then BRAND KIT: logo + colors; ~288px column); **`EditorTimelineDock`** scene markers + proportional scene-name segments on the video lane (from scaled `meta.scenes`); `PropertiesPanel` `compact` + right-hand field split. **`Outline.tsx`** unused by Editor (kept for reference). Docs: root **README**, **ROADMAP** Phase 1 + 5b, **app/README**. **§18** sequential Git workflow unchanged.
