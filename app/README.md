# Ounass Cutroom (Vite app)

**Cut. Brand. Ship.** — Browser-only editor and export pipeline for Ounass marketing. Source of truth for commands and tooling lives here.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc -b && vite production bundle
npm run lint
```

Typecheck only:

```bash
npx tsc -b --noEmit
```

## Layout (editor)

- **Left column (~288px):** `EditorBrandPanel` — **PRODUCTS** (when the template has `productList` at `products`), then **BRAND KIT** (logo at path `logo` + all `color` fields). Renders through `PropertiesPanel` with `compact` padding. Remaining `fields` stay in the right-hand Properties column (paths excluded from the left list).
- **Center:** `Stage` (chromeless) + `EditorTimelineDock` — ruler, filmstrip, **video lane** (cyan) with scene boundary markers, proportional **scene name** segments (from `template.meta.scenes` scaled by project duration), music lane, playhead.
- **Right:** `PropertiesPanel` for non–brand-kit fields.

Scene list UI previously lived in `Outline.tsx`; the Editor route no longer uses it — scenes are driven from `meta.scenes` on the timeline instead.

## Stack notes

- Vite 6, React 19, TypeScript; `vite.config.ts` excludes `@ffmpeg/ffmpeg` from `optimizeDeps` (see repo `HANDOFF.md` for ffmpeg gotchas).
- Curated music beds: `src/lib/musicTracks.ts` + files under `public/audio/` (see `public/audio/README.md`).

For architecture, conventions, and how to add templates, read the repo root **[HANDOFF.md](../HANDOFF.md)** and **[ROADMAP.md](../ROADMAP.md)**.
