# Ounass Video Ad Generator

A browser-only SaaS-style video ad generator for the Ounass marketing team. Pick a template → edit text/images/colors/duration/aspect → preview live → export an MP4. No backend; runs free-tier on Vercel.

## Quick start

```bash
cd app
npm install
npm run dev          # http://localhost:5173
```

Typecheck before any commit:

```bash
cd app && npx tsc -b --noEmit
```

## Status

Phases 0–4 complete: foundation, editor, customization depth, multi-template + logo, MP4 export.
Phase 5 (polish) candidates: see [ROADMAP.md](ROADMAP.md#phase-5-candidates-not-committed-pick-from-this-menu-when-starting).

## Templates currently shipping

| Template | Duration | Aspects | Schema shape |
|---|---|---|---|
| **Phillip Lim — Quiet Power** | 9s | 9:16 / 4:5 / 1:1 | 4 acts, 5-column grid, filmstrip |
| **Editorial — The Edit** | 9s | 9:16 / 4:5 / 1:1 | Magazine 2×2 grid + feature zoom |
| **Sale Countdown — Blowout** | 7s | 9:16 / 4:5 / 1:1 | No products — promo copy + CTA |
| **Hero — Single Piece** | 8s | 9:16 / 4:5 / 1:1 | Single product, Ken-Burns zoom |

Add a new template = one folder + one entry in `src/templates/registry.ts`. The Editor never branches on template id.

## Documentation

- **[HANDOFF.md](HANDOFF.md)** — read this first if you're picking up the project. Architecture, conventions, gotchas, recipes for adding templates / debugging exports.
- **[ROADMAP.md](ROADMAP.md)** — phase-by-phase log of what shipped and why.

## Stack

Vite 6 · React 19 · TypeScript · react-router-dom 7 · ffmpeg.wasm + html-to-image (export) · localStorage (persistence). No CSS framework — design tokens in `app/src/styles/tokens.css`, inline-styled primitives.
