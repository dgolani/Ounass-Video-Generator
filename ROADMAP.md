# Ounass Video Ad Generator — Roadmap

SaaS-style video ad builder for the Ounass marketing team. Marketers pick a template, customize products/text/colors/duration/aspect, preview in-browser, and export a video file.

---

## Locked decisions (confirmed 2026-04-18)

| Decision | Choice |
|---|---|
| **Stack** | Vite + React + TypeScript |
| **Customization depth for MVP** | **Tier 1**: text, images, products, colors, logo, CTA, duration, aspect ratio. **Tier 2** (per-act timing + easing) stubbed behind an "Advanced" disclosure. **Tier 3** (add/reorder/remove acts) deferred. |
| **Export pipeline** | Frame-by-frame DOM → PNG sequence → **ffmpeg.wasm** → H.264 MP4 (client-only). Server-side headless render deferred unless requirements change. |

Change any of these mid-build → flag to user first. Drifting silently costs a lot because architecture branches off each.

---

## Template architecture

Every template is a self-contained folder. Add a template = add a folder. Editor generates the properties panel from the schema automatically — no editor code changes per new template.

```
src/templates/phillip-lim/
  ├─ schema.ts     // typed props: brand, kicker, tagline, products[], colors, CTA,
  │                //              per-act durations, supported aspects
  ├─ scene.tsx     // pure function of (props, time) — Act1/Act2/Act3/Act4
  ├─ meta.ts       // name, description, default props, default duration, aspects
  └─ preview/      // thumbnail or short preview loop
```

Engine primitives (`Stage`, `Sprite`, `useTime`, `interpolate`, `animate`, `Easing`) move to `src/engine/` and are shared across all templates.

---

## Phases

### Phase 0 — Foundation ✅ (complete 2026-04-18)
Vite + React + TS scaffold. Extract engine to `src/engine/`. Promote Phillip Lim to `src/templates/phillip-lim/` driven by a schema. Single route renders it identically to the current HTML file.

**Exit criteria:** `npm run dev` opens the Phillip Lim ad at 1080×1920 with the same playback bar, visually identical to today. Nothing else.

**Landed:**
- `app/` at Vite + React 19 + TS, launch config in `.claude/launch.json` (`vag-dev`, port 5173)
- `app/src/engine/` — `math.ts` (Easing/interpolate/animate/clamp), `timeline.tsx` (contexts + Sprite), `Stage.tsx` (+ PlaybackBar), `sprites.tsx` (Text/Image/Rect)
- `app/src/templates/phillip-lim/` — `schema.ts` (`PhillipLimProps` + `defaultProps`), `meta.ts` (`TemplateMeta<P>` with aspects/duration), `scene.tsx` (4 acts parameterized), `images/`
- Verified: Act 1 title whisper, Act 3 filmstrip hero/ribbon/thumbs/IG chrome, playback bar scrub + play/pause all render identical to prototype

### Phase 1 — Editor shell ✅ (complete 2026-04-18)
App chrome (nav, routes). Template gallery view. Editor view with three panes: scene/layer list (left), live auto-scaling canvas + playback bar (center), properties panel driven by the template schema (right). Projects persisted to localStorage.

**Exit criteria:** Marketer can open the template, edit text/colors/products via the right panel, and see the canvas update live. Reload preserves the project.

**Landed:**
- `react-router-dom@7` with `BrowserRouter` + layout route via `<Shell>`. Vite `resolve.dedupe: ['react', 'react-dom']` to avoid the stale-pre-bundle hook violations we hit.
- Design tokens extracted to `src/styles/tokens.css` (editor surfaces + existing Ounass palette); imported in `main.tsx`.
- Project store: `src/store/projects.ts` — `createProject`, `updateProject`, `deleteProject`, `getProject`, `useProjects`, `useProject`. Single localStorage key `vag:projects:v1`; change events dispatched on a custom bus so hooks stay in sync.
- Template registry: `src/templates/registry.ts` (`getTemplate`, `listTemplates`). Each template now exports `fields: FieldDescriptor[]` alongside `meta`, `scene`, `schema`. Phillip Lim gains `src/templates/phillip-lim/fields.ts` (5 sections, text/color/productList) and `meta.scenes` (4 acts w/ time ranges).
- Path helpers: `src/lib/path.ts` — `getPath`/`setPath` with immutable array/object cloning for nested writes.
- Engine refactor: `useStageController` hook split out of `Stage`. Stage now takes `controller` + `chromeless` props so editor can hoist time state and share it with the outline + its own playback bar. Backward break: old standalone `<Stage duration=… persistKey=…>` usage replaced everywhere.
- UI primitives: `src/ui/primitives.tsx` — `Button` (primary/secondary/ghost/danger), `Field`, `TextField`, `Textarea`, `ColorField`, `Section`, `Stack`, `Empty`.
- Routes: `Dashboard` (empty state + project cards w/ open/delete), `Gallery` (template cards, click → create project → nav to editor), `Editor` (top bar w/ editable name + autosave indicator, 3-pane grid: **`EditorBrandPanel`** (products + brand kit) / `Stage(chromeless)` + **`EditorTimelineDock`** / `PropertiesPanel`).
- `PropertiesPanel` auto-generates inputs from `fields[]` via `getPath`/`setPath`. `productList` renders per-product sub-cards (thumbnail + name/price/color). Debounced autosave (400ms) writes to localStorage with a "Saved" flash.
- **Verified**: created a project from the gallery → edited Brand to "TEST BRAND" → reloaded → edit persisted → canvas still shows "TEST BRAND · NOIR" in the product card. No console errors.

### Phase 2 — Customization depth (Tier 1) ✅ (complete 2026-04-18)
Product catalog CRUD (add/remove/reorder products, upload images). Brand Kit page (colors, boutique defaults). Aspect-ratio switcher UI. **Project duration** with proportional act scaling (via `timeScale` on scenes). Undo/redo. Autosave w/ quota handling.

**Exit criteria:** Every Tier-1 field in the Phillip Lim schema is editable. Brand Kit values propagate as defaults to new projects.

**Scope changes (2026-04-18):**
- SKU importer dropped. `/product/findbysku` is Kasada-gated; a server-side proxy or Vercel serverless function can't reach it without a real browser (Playwright) or an `ounass.ae` bookmarklet dance — not worth it for a free-tier internal tool. Marketers upload product images directly.
- Logo upload & in-scene logo rendering deferred. Brand kit stores colors + boutique name; a logo field requires template redesign (replacing Fraunces wordmark with an image) that's cleaner as a Phase 3 exercise when a second template exists.

**Landed:**
- **Image upload:** `src/lib/image.ts` (`resizeImageToDataURL`: 1080px JPEG q=0.85, ~300 KB data URLs from 4K photos). `ImageDropZone` in `PropertiesPanel` with click-to-pick + drag-drop. Storage-quota errors surface in the Editor as "Storage full — drop an image or two".
- **Product CRUD:** `FieldDescriptor.productList` gained `imagePath`, `newProductTemplate`, `addLabel`, `minProducts`, `maxProducts`. Phillip Lim declares min 2 / max 10. Per-row ↑/↓/× buttons with disabled-state honoring bounds. "+ Add product" generates a new row with a uid.
- **Undo/redo:** `src/lib/useHistory.ts` — linear stack, debounced commits (300ms), max depth 50, keyboard ⌘Z / ⌘⇧Z (ignored while typing). Top-bar buttons ↶ / ↷ with canUndo/canRedo disabled state. `resetHistory` called when switching projects.
- **Duration + scene time scaling:** Scene receives `timeScale` (`duration / defaultDuration`); multi-act templates wrap every time literal in `T(x) = x * timeScale`. `meta.scenes` is scaled the same way for the **timeline** (markers + segment labels on the video lane). **UX note (post–timeline work):** an early editor shipped a **compact duration `Slider` in the top bar** (5–20s). The **current** editor adjusts **`Project.duration`** with the **video clip’s right trim handle** on `EditorTimelineDock` (clamped per project rules), not a top-bar duration control—closer to a consumer NLE. Changing duration still rescales acts and timeline scene layout end-to-end.
- **Aspect switcher UI:** Pill selector keyed off `meta.aspects`. For Phillip Lim (single aspect) it shows the label disabled; multi-aspect templates will activate it automatically in Phase 3.
- **Brand Kit:** New route `/brand` with boutique name + 4 color fields + Reset. Store `src/store/brand.ts` with `useBrand`, `applyBrand(defaults, brand)` deep-merge helper. Gallery's "Use template" pipes through `applyBrand` so new projects inherit the kit. Verified end-to-end: set `boutiqueName="TEST BOUTIQUE"` + 4 orange-ish colors → new project's `props.boutiqueName` and `props.colors` picked up the overrides.
- **Scene hardening:** Act 2 columns, Act 3 hero card, and Act 3 thumbnails now render a placeholder block when a product has no image (prevents empty-`src` Chrome warnings when the marketer adds a product before uploading).

**Deferred to later phases:**
- ~~Logo upload + in-scene logo rendering~~ → **Landed 2026-04-18** (see Pass 1 below).
- ~~Multi-aspect Phillip Lim~~ → **Landed 2026-04-18** — supports 9:16, 4:5, 1:1 (see Pass 1 below).
- SKU importer — infrastructure tradeoff not worth it for the cited free-tier constraint. Revisit if/when moving to an Ounass-hosted environment that's exempt from Kasada.

### Phase 3 — Multi-template + second templates

Goal: build the "multiple templates, easily" capability into the engine, then add 2–3 more templates that stress-test it. Sets us up for an eventual AI template mixer (user-noted future work — we keep templates as composable data, not imperative bespoke code).

#### Pass 1 — Dimension-agnostic scenes + logo ✅ (complete 2026-04-18)

**Shipped:**
- `SceneComponentProps` in registry now includes `width: number; height: number`. Editor threads the current aspect's dimensions down.
- Phillip Lim scene converted from pixel-hardcoded (1080×1920) to **ratio-based positioning**. `makeScale(W, H)` produces `{ w, h, wh }` helpers; every prior `top: 780` / `fontSize: 96` / padding / gap now reads through `w(px)` / `h(px)` / `wh(px)` scaled against the base 1080×1920 design. Acts receive the scale object via prop drilling.
- Phillip Lim `meta.aspects` now declares **9:16 (Story), 4:5 (Feed), 1:1 (Square)**. Aspect switcher pill in Editor becomes live; clicking swaps canvas dimensions and the scene re-lays out.
- `FieldDescriptor` gained `kind: 'image'` with `aspectRatio` and `hint`. `ImageDropZone` now exported and reusable between product rows (small, 88×120, `objectFit: cover`) and standalone image fields (large, aspect-ratio'd, `objectFit: contain`, optional × clear button).
- Phillip Lim's schema gained an optional `logo` (data URL). Act 4 renders logo in place of the Fraunces wordmark when set; falls back to text when absent.
- `BrandKit` gained a `logo` field with its own dropzone on `/brand`. `applyBrand` propagates logo (plus existing boutique name + colors) to new projects on create.
- **Verified end-to-end**: uploaded a synthetic "LOGO" PNG → appeared in properties panel → Act 4 renders the logo in place of wordmark → canvas switches cleanly between 9:16, 4:5, 1:1 without any text clipping or layout breaks.

#### Pass 2 — Three additional templates ✅ (complete 2026-04-18)

Built 3 new templates, each designed to stress a different seam of the abstraction:

- **Editorial — The Edit** (`src/templates/editorial/`) — 9s · 9:16/4:5/1:1 · serif-forward magazine layout. 4 products in a 2×2 grid, feature zoom on Product 01, editor's signature sign-off. Tests: alternate composition (grid vs vertical columns), light/cream background (vs dark), *multi-product but fixed at 4* (min=max=4 in field descriptor).
- **Sale Countdown — Blowout** (`src/templates/countdown/`) — 7s · same aspects · bold italic headline, diagonal bronze swash, body/terms, CTA slam. Tests: **template with no `productList`** — just copy fields + one accent image. Tests: field descriptor set handles a promo template purely through `text` + `image` + `color`.
- **Hero — Single Piece** (`src/templates/hero/`) — 8s · same aspects · full-frame Ken-Burns zoom on one product, headline lockup, lockup CTA. Tests: **single product as a nested object** (`product.image`, `product.name`, `product.price`) rather than an array. Path-based field descriptors handle it cleanly via `getPath("product.image")` / `setPath(...)`.

**Placeholders (shared):** `src/assets/placeholders.ts` emits luxury-fashion SVGs as data URLs (inlined at build, survive localStorage + Vercel hashing): 6 numbered product plates, 1 hero silhouette, 1 sale motif. Editorial uses 4 product plates; Hero uses the silhouette; Countdown uses the sale motif as an accent background.

**Leak found + fixed:** `TemplateMeta` / `AspectRatio` / `SceneOutline` had been defined inside `phillip-lim/meta.ts` — making Phillip Lim an implicit parent that every other template had to import from. Lifted to shared `src/templates/types.ts`. No template now references another.

**Exit criteria met:**
- `listTemplates()` returns all 4; gallery lists them uniformly with no per-template branching.
- Grepping `src/app/` for any template ID (`phillip-lim`, `editorial`, `countdown`, `hero`) returns **zero matches**. Editor is fully generic.
- Field descriptor set (`section`, `text`, `color`, `image`, `productList`) handled every template without new kinds.
- Same editor UI edits all 4 templates; reload persists; aspect switch works for all.

**Future (post-Phase-3): AI template generation/mixing.** Not built yet, but the current direction — templates as declarative `{meta, schema, fields, scene}` — is compatible with a future AI step that synthesizes new templates or blends two. `fields.ts` is already close to a serialisable intent-form. No upfront cost now.

### Phase 3 — See dedicated section above (moved up to reflect active work).

### Phase 4 — Export ✅ (complete 2026-04-18)
Frame-by-frame DOM rasterization → ffmpeg.wasm → H.264 MP4 download. Client-only, free-tier-safe. Skipped MediaRecorder/WebM intermediate — direct PNG-to-MP4 was simpler and more deterministic.

**Exit criteria:** Marketer clicks Export, waits, gets an MP4 that matches the in-browser preview.

**Landed:**
- `src/lib/export.ts` — `exportVideoToMP4({ canvasEl, controller, width, height, duration, fps, onProgress, signal })`. Pauses controller's autoplay, steps `setTime(i / fps)` for each frame, waits 2 RAFs for React commit + paint, rasterizes via `html-to-image.toBlob` (passing pre-computed `fontEmbedCSS` so Fraunces + Nunito Sans render in the MP4), writes each PNG to ffmpeg's virtual FS, then runs `libx264 -pix_fmt yuv420p -preset fast -crf 22 -movflags +faststart`.
- `@ffmpeg/core` bundled locally (no CDN dep). Imports use the package's official `exports` field: `'@ffmpeg/core?url'` and `'@ffmpeg/core/wasm?url'` → Vite serves from same-origin hashed URLs.
- `src/app/components/ExportModal.tsx` — 4 phases: idle (settings preview) → running (progress bar + frame counter + cancel) → done (filename + size + download button) → error (with retry). AbortController-aware cancel.
- Editor top bar: Export button is live; opens modal. Canvas ref threaded through `Stage` (new `canvasRef` prop) so the modal can rasterize the inner 1080×1920 canvas, not the auto-scaled wrapper.
- **Verified end-to-end**: created Sale Countdown project → 5s × 1:1 (1080×1080) export → 150 frames rendered in ~80s + ffmpeg encode in ~5s → "Ready to download untitled-sale-countdown.mp4 · 8.2 MB" → download button live.

**Three ffmpeg.wasm gotchas hit (and fixed) — captured here so they don't bite again:**

1. **CDN load via `toBlobURL` from unpkg silently hung.** ffmpeg's worker tried to importScripts the blob URL but got an empty response somewhere along the way. Fix: vendor `@ffmpeg/core` locally and pass Vite-served URLs directly.
2. **Vite pre-bundling broke `new URL('./worker.js', import.meta.url)`.** ffmpeg spawns its worker via that pattern; Vite's dep-pre-bundler rewrote the relative URL to a path that didn't resolve. Fix: `optimizeDeps.exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']` in `vite.config.ts`.
3. **UMD core in a module worker → "failed to import ffmpeg-core.js"** silently. The worker tries `importScripts(coreURL)` (fails on module workers) then falls back to `import(coreURL.replace('/umd/','/esm/'))` — but our coreURL was a blob URL, so the replace was a no-op. Fix: import via `'@ffmpeg/core?url'` (the package's `exports` field maps `.` → `dist/esm/ffmpeg-core.js`); the dynamic `import()` fallback then succeeds.

**Performance characteristics observed:**
- ~1–2 fps rasterization on a single-product 1080×1080 scene; complex multi-act scenes (Phillip Lim 5-column grid) drop to ~0.5–1 fps. So a 9s ad takes ~3–4 minutes wall time.
- ffmpeg encode for 150–270 frames is ~5–10s.
- ffmpeg.wasm core is ~30 MB but lazy-loaded on first export click and cached per-session.

**Known limitations / Phase 5 polish candidates:**
- `backdrop-filter`, `mix-blend-mode` and a few `filter:` properties don't always rasterize 1:1 with the live preview (foreignObject/SVG limitation in browsers, not our bug). Output is ~95% visually identical for the luxury aesthetic; flagging here so future templates can avoid these properties on critical layers.
- Render speed could roughly double with parallel rasterization (Worker pool drawing into canvases) — out of MVP scope.
- No "WebM-only" fast-path; everything goes through ffmpeg. Acceptable since MP4 is what marketers ship to social.
- localStorage quota: each project is text + data-URL images; large projects with many uploaded high-res images can approach the ~5 MB cap. Already shows "Storage full — drop an image or two" in the save indicator.

### Phase 5 — Polish
Keyboard shortcuts (space, arrows, cmd-z). Shareable preview URLs (read-only). Onboarding empty states. Error states for failed renders. Dashboard polish. Tier-2 "Advanced" disclosure surfaces per-act timing/easing.

### Phase 5b — Audio & layered timeline (in progress, 2026-04-18)

**Visual target:** Consumer-style editors (Instagram Reels / CapCut pattern): **video as a layer** (filmstrip / thumbnails + optional trim handles), **music as a layer** below, **fixed vertical playhead** with tracks scrolling horizontally, clear empty state (“Add audio”). A reference screenshot was shared in-session (2026-04-18); optionally commit a copy under `docs/references/` for permanent design anchor.

#### Landed (incremental)
- **Project model:** `backgroundTrackId`, `musicVolume`, `musicAnchorVideoTime`, `musicTrimStartSec`, `musicEndVideoTime`, `videoClipStartSec`, `duration` on `Project` (and related export paths); normalized on read for older saves.
- **Editor:** `EditorTimelineDock.tsx` — **fixed center playhead** + horizontally scrollable **time ruler** + **filmstrip** (JPEG thumbnails via `html-to-image` samples + `useFilmstripCapture`); **video (cyan) lane** with slip/trim handles, **scene start markers** (click to seek), and **per-scene name strips** proportional to act length (from `meta.scenes` × `timeScale`); **music lane** with draggable bronze clip + **“Add audio”** empty state; sound mix popover; `useEditorMusicPreview.ts` ties `<audio>` to `useStageController`. **Cinema mode** slim rail reuses markers + labels.
- **Editor — left column:** `EditorBrandPanel.tsx` + `splitEditorFields()` — **PRODUCTS** block first (when `productList` / `products` exists), then **BRAND KIT** (logo + all color fields). Right `PropertiesPanel` receives `fields` minus those paths. Grid left column **~288px**. `Outline.tsx` remains in the tree as legacy; **Editor** does not import it.
- **Export:** `export.ts` muxes music with **volume + `atrim` (trim) + `adelay` (anchor)** + looped bed + `-shortest`; **Export modal** summarizes editor audio (no duplicate controls).
- **Curated beds:** `src/lib/musicTracks.ts` + `public/audio/` (replace placeholder with licensed tracks before ship).

#### Next steps (ordered — build toward the reference UI)
1. **Timeline polish** — Pinch / modifier+wheel **zoom** of `PX_PER_SEC`; optional **snap** grid (0.1s / 0.25s); reduce scroll↔seek fighting during drag.
2. **Video layer (trim UI)** — **Yellow in/out** handles only when export supports **sub-range** distinct from full project duration (today duration = edit length; filmstrip is seek + preview).
3. **Audio row polish** — **Waveform** via **Wavesurfer.js v7** + **Regions** (`@wavesurfer/react`) for in-file trim/slip; optional richer “Add audio” picker when multiple beds ship.
4. **Gestures / feel** — `@use-gesture/react` or pointer refinements; optional haptic-style audio slip.
5. **Export parity** — Any new timeline keys (fade, trim end, multiple stems) ship with `export.ts` + HANDOFF note if non-obvious.

#### Libraries vs custom (decision log)
- **There is no turnkey npm package** that drops a Reels-grade timeline onto a **custom React DOM stage** like ours. Every serious product composes pieces.
- **Pragmatic stack:** **Custom** scroll + playhead + filmstrip data (we own the clock: `useStageController`). **Wavesurfer** (or **Peaks.js** + custom canvas) for the **music waveform + regions** when we need waveform editing. Avoid adopting a full “non-linear editor” engine unless we commit to its data model for years.

---

## Out of scope (for now)

- Backend / multi-user collab / real cloud persistence (localStorage only)
- Auth, teams, role permissions
- Third template family beyond what Phase 3 ships
- AI-assisted copywriting or product-picking
- Scheduled posting / social integrations
- Analytics on ad performance
- Server-side rendering farm

Revisit after Phase 5.
