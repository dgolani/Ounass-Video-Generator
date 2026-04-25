# Test Cases — Ounass Cutroom

The canonical list of behavior-level test cases that any feature must pass before being declared done. Organized by feature area. Each case has a precondition, a sequence of marketer actions, and the expected on-screen behavior.

## How this doc binds the team

1. **Build a feature** → add its test cases here in the same PR. No exceptions.
2. **After implementation** → spawn a QC agent with the test-case section as the prompt; the agent runs through each case and reports pass/fail with evidence (screenshots, console logs, file:line refs).
3. **Read the QC report** → fix every failed case before merging. Don't merge "yellow"; the next person inherits any unresolved bug.
4. **Update the test cases** when the feature changes shape. A stale test case is worse than no test case.

QC agent prompt template (drop at the top of any QC delegation):

```text
You are doing behavior-level QC on the [FEATURE] feature of the Ounass
Cutroom app. Read TEST_CASES.md §[FEATURE] for the test cases. For
each case: state preconditions, perform the steps in the running
preview at http://localhost:5173, observe the result, and record
PASS/FAIL with evidence (screenshot path, console output, exact
file:line of any code-level finding). Be exhaustive — do not skip.
Report findings as a markdown list.
```

---

## Index

1. [Templates — common behavior](#1-templates--common-behavior)
2. [Templates — per-template smoke tests](#2-templates--per-template-smoke-tests)
3. [Editor — Toolbar (settings umbrella, undo/redo, export)](#3-editor--toolbar)
4. [Editor — Stage (canvas, timeline, playback)](#4-editor--stage)
5. [Theme support — light/dark](#5-theme-support--lightdark)
6. [Locale + auto-translate (EN ↔ AR)](#6-locale--auto-translate-en--ar)
7. [Brand Kit](#7-brand-kit)
8. [Per-field format drawer ("Aa" button)](#8-per-field-format-drawer-aa-button)
9. [ProductList editing (add/remove/reorder)](#9-productlist-editing)
10. [Image upload (logo, product, background)](#10-image-upload)
11. [Ounass Importer (SKU fetch + paste fallback)](#11-ounass-importer)
12. [Gallery (category filter, dual-theme preview)](#12-gallery)
13. [Project save / load / autosave](#13-project-save--load--autosave)
14. [Aspect ratio switch (9:16 ↔ 4:5)](#14-aspect-ratio-switch)
15. [Safe-zone overlay](#15-safe-zone-overlay)
16. [Music layer + audio mix](#16-music-layer--audio-mix)
17. [Export to MP4](#17-export-to-mp4)

---

## 1. Templates — common behavior

These cases apply to every template. Run them on at least 3 templates from different categories before declaring a template-level change done.

| # | Test | Steps | Expected |
|---|---|---|---|
| 1.1 | Renders at 9:16 (default aspect) | Open editor for any template | Scene renders within the safe-zone bounds; no clipping; no console errors |
| 1.2 | Renders at 4:5 | Click `4:5` in the umbrella toolbar | Layout reflows; content stays inside safe zone (top:120, bottom:200); no element collapses to zero size |
| 1.3 | Plays smoothly | Press space (or click play in timeline dock) | Animation runs end-to-end without stutter; audio (if set) syncs; loop not triggered |
| 1.4 | Pauses and seeks | Click any scene marker on the timeline | Playhead jumps to that scene; scene-active highlights light up in the right panel |
| 1.5 | Keyboard shortcuts | Press `space`, `←`, `→`, `home`, `end` | space = toggle play; arrows = step ~1s; home = reset to clipStart; end = reset to clipEnd |

## 2. Templates — per-template smoke tests

For each of the 14 templates, the following cases must pass. Run via the visual-test harness at `/visual-test/<id>?aspect=9:16&time=<sec>&mode=<light|dark>`.

### 2.1 Lookbook
- Renders Title (Act 1), Columns (Act 2), Filmstrip (Act 3), Outro (Act 4) at expected timestamps.
- 5 product images render with names + colors below.
- Boutique logo appears in Act 4 only (verified — no top-left watermark in Acts 1-3).
- AR locale: layout flows RTL, products read right-to-left.

### 2.2 Editorial
- 2×2 grid renders 4 products with category labels at the bottom.
- Feature card (Act 3) zooms into product 01.
- Magazine masthead matches "ISSUE No. XXIV / VOL. 09" pattern.

### 2.3 Countdown
- "ENDS IN 24h" headline slams in.
- Body copy + terms render below.
- CTA "SHOP THE SALE" inverts on click.

### 2.4 Hero
- Single product image fills the frame with Ken-Burns zoom.
- Headline + subhead read as a vertical lockup.
- Logo appears at the bottom in the CTA scene.

### 2.5 Bestsellers
- Products render in 5→4→3→2→1 order with rank chip on each card.
- Card 01 stays on-screen longest with the brand + price below.
- "TOP 5" headline hangs at top during the cycle.

### 2.6 Seasonal
- 3 refrain words ("RAW · CLEAR · LIGHT") replace each other in the hero zone.
- Side editorial line ("FROM THE WORKBENCH") renders vertically.
- Final season chip + headline + subline lock at the close.

### 2.7 Carousel
- 3D rotating ring of category labels in the open.
- 6+ items glide in from left, each with brandline/name/price.
- Final headline + CTA sit on a darker surface.

### 2.8 Brand Spotlight
- Brand wordmark scales up letter-by-letter ("LETTERS" act).
- Hero product card slides in with brandline/name/price.
- Designer quote appears as block italic with attribution below.

### 2.9 Gift Guide
- Box label hovers in the hero region with sparkle particles.
- 4 picks render in a 2×2 grid with name + sub-line below each.
- Ribbon label spans the bottom; CTA renders below.

### 2.10 The Stack (themed)
- 4 bronze plates drop in sequence (Valentino → Saint Laurent → Bottega Veneta → Chloé).
- Index column 01-04 fades in down the left side.
- Bronze foil seal stamps in lower-right at T7.30.
- CTA "ENTER THE HOUSES" + byline at T8.40+.
- **Both light and dark palettes render correctly.**

### 2.11 The Pairing (themed)
- Piece A slides in from left with eyebrow / name / price.
- Piece B slides in from right.
- Operator morphs `+` → `=` mid-frame.
- Total price digit-slams (each digit translates upward staggered).
- "SHOP THE PAIR" CTA closes.
- **Both light and dark palettes render correctly.**

### 2.12 New In (themed)
- 4 product cards filmstrip horizontally with "JUST IN" chip on the active one.
- 01/04 → 04/04 counter ticks up.
- Recap grid (2×2) renders at the close with all 4 pieces.
- **Both light and dark palettes render correctly.**

### 2.13 The Collab (themed)
- "OUNASS × GUCCI" lockup with the `×` glyph as plain text (no foil ball).
- Both wordmarks (boutique + collab) load via BoutiqueLogo and accept SVG uploads.
- 3 capsule pieces render with category/name/price.
- "Two houses. One exclusive capsule." byline at the close.
- **Both light and dark palettes render correctly.**

### 2.14 The Rail (themed)
- 8 hanger cards dolly across the frame.
- Focus-pull dims non-hero cards to ~28% / sat 40%.
- Hero card lifts and scales 1.06-1.08.
- Hero label below: "CHOSEN FOR YOU / The Ember Silk Slip / 2,680 AED · Size S M L".
- **Both light and dark palettes render correctly.**

## 3. Editor — Toolbar

| # | Test | Steps | Expected |
|---|---|---|---|
| 3.1 | Settings umbrella renders | Open any project | One rounded container with Aspect / Safe / Theme (if applicable) / Locale + AR status, hairline-divided |
| 3.2 | No layout shift on click | Click EN, AR, EN, AR rapidly | Umbrella x-coordinate is stable (zero pixel delta) |
| 3.3 | Theme toggle (themed templates only) | Click sun, then moon | Stage flips palette; copper marker slides between sun/moon; no flash |
| 3.4 | Theme toggle hidden on non-themed | Open Lookbook | Theme group not rendered in umbrella |
| 3.5 | Aspect switch | Click 4:5 then 9:16 | Stage dimensions update; scene reflows; canvas re-fits viewport |
| 3.6 | Safe toggle | Click "Safe" | Dim strips appear/disappear at the safe-zone edges; toggle has copper-tinted active state |
| 3.7 | SAVED hint flash | Edit any text field | "SAVED" pill appears for ~1s after autosave; toolbar geometry doesn't shift |
| 3.8 | Locale-mismatch warning | Type all-Latin copy with AR locale active | Yellow "Locale mismatch" chip appears; right-cluster doesn't shift |
| 3.9 | Undo / Redo | Edit text, then click ↶, then ↷ | Edit reverses; redo re-applies; both keyboard ⌘Z / ⌘⇧Z work |
| 3.10 | Export button | Click "Export" | Modal opens with format options |
| 3.11 | Projects nav | Click "← PROJECTS" | Returns to dashboard |

## 4. Editor — Stage

| # | Test | Steps | Expected |
|---|---|---|---|
| 4.1 | Stage fits viewport | Resize browser | Stage scales to fit available space, maintaining aspect ratio |
| 4.2 | Cinema mode toggle | Click stage canvas | Toolbar/timeline collapse into slim rail; click again to restore |
| 4.3 | Playback bar | Play, pause, seek via scrub | Time updates smoothly; seek lands within ±50ms |
| 4.4 | Scene markers click-to-seek | Click any scene chip in timeline | Playhead jumps to scene start |
| 4.5 | Filmstrip thumbnails | Wait ~3s after open | Thumbnails generate (12 frames roughly) along the time ruler |

## 5. Theme support — light/dark

Applies to themed templates: The Stack, The Pairing, New In, The Collab, The Rail.

| # | Test | Steps | Expected |
|---|---|---|---|
| 5.1 | Toggle persists per project | Click moon → save → reopen project | Project loads in dark mode |
| 5.2 | Both palettes complete | Inspect schema's `colors.light` and `colors.dark` | Every key non-empty; dark.background dark, dark.ink light, dark.ctaBg cream, dark.ctaText dark |
| 5.3 | Gallery dual-preview | Visit `/templates`, find a themed card | Card shows LIGHT half / DARK half with copper hairline divider, "LIGHT" / "DARK" labels in corners |
| 5.4 | Theme toggle export-safe | Toggle theme, export MP4 | Theme pill itself does not appear in the rendered video frames |
| 5.5 | Dark-mode visual sweep | Each themed template at 4 keyframes in dark | No invisible text (ink not matching paper); CTA pill inverts (cream on dark); bronze accents stay legible |

## 6. Locale + auto-translate (EN ↔ AR)

| # | Test | Steps | Expected |
|---|---|---|---|
| 6.1 | EN→AR toggle | Click AR in umbrella | Locale flips immediately; RTL layout kicks in; Noto Kufi Arabic font swaps in |
| 6.2 | Auto-translate via Chrome (if API available) | First AR click on a fresh project | Status pill shows "Preparing AR · X%" (during pack download) → "Translating…" → "● Translated · N fields" briefly → "● Active · On-device" steady |
| 6.3 | Auto-translate via MyMemory fallback | First AR click in a Chrome without the flag | Status pill goes `Preparing` → `Translating` → `● Active · Cloud` |
| 6.4 | Translations persist | Toggle AR → EN → AR | Second AR toggle is instant (no re-translation); cached AR strings render |
| 6.5 | Manual edits in AR | Type new Arabic text into a field while AR active | New value persists; on EN toggle, EN base is unchanged |
| 6.6 | noTranslate fields stay original | boutiqueName, brand names, Roman numerals on AR | These render identical in both locales |
| 6.7 | Currency-aware composePrice | Toggle AR, observe any price | Currency suffix swaps EN "AED" → AR "د.إ." automatically |
| 6.8 | Translate pill popover (cloud working) | Click pill in AR mode after one batch | Popover opens: green "Auto-translate is working" + "Switch to on-device (faster)" expander collapsed |
| 6.9 | Translate pill popover (unavailable) | Browser without API + offline | Popover opens with red error block + Chrome flag instructions + Retry button |
| 6.10 | Boutique logo swap | Brand kit has both `logo` and `logoArabic` | AR locale renders the Arabic SVG logo; EN renders the Latin one |

## 7. Brand Kit

| # | Test | Steps | Expected |
|---|---|---|---|
| 7.1 | Logo upload (SVG) | Drop an SVG into the Boutique Logo slot | Renders in both Dark BG and Light BG previews; tints to match BG |
| 7.2 | Logo upload (Arabic variant) | Drop a second SVG into the Arabic logo slot | Renders in both BG previews; only used when locale = AR |
| 7.3 | Color edits | Change Background or Accent color | Preview updates immediately; existing projects do NOT change palette (per-project colors win) |
| 7.4 | Typography pickers | Change display family | Templates that opt into the role swap fonts; Arabic fallback (Noto Kufi) prepended automatically when AR |
| 7.5 | Safe zone override | Adjust safe-zone margins for an aspect | All templates respect the new margin via `useSafeZone()` |
| 7.6 | Locale default | Set brand-kit locale to AR | New projects default to AR; existing projects unaffected |
| 7.7 | Reset button | Click "Reset" | Brand kit returns to factory defaults; confirmation prompt fires first |

## 8. Per-field format drawer (Aa button)

| # | Test | Steps | Expected |
|---|---|---|---|
| 8.1 | Aa opens drawer | Click Aa next to any text field | Right-side drawer slides in with Family / Size / Weight / Italic / Transform / Color controls |
| 8.2 | Family change applies | Pick a different display family | Stage text re-renders with the new family within ~150ms |
| 8.3 | Size change applies | Move size slider | Stage text scales smoothly |
| 8.4 | Color picker applies | Pick a swatch | Stage text recolors |
| 8.5 | Drawer override survives reload | Edit + reload the project | Override persists |
| 8.6 | Override flag indicator | Field with non-empty override | Aa button shows the active-state highlight |
| 8.7 | Drawer for productList sub-field | Click Aa on `products.*.name` (top-of-list global) | Override applies to ALL product names in that list |
| 8.8 | Drawer for boutique name | Click Aa on `boutiqueName` field | Override flows through `<BoutiqueLogo nameStyle={…}>` to the text fallback |
| 8.9 | Currency / proper noun preserved | noTranslate field opens drawer | Drawer functional; AR doesn't auto-translate the value |

## 9. ProductList editing

| # | Test | Steps | Expected |
|---|---|---|---|
| 9.1 | Add product row | Click "+ Add product" at min-1 capacity | New row appears with `newProductTemplate` defaults |
| 9.2 | Add at max | Try to add when at maxProducts | Add button disabled or hidden |
| 9.3 | Remove product | Click × on a row | Row deletes; remaining rows re-index; min-bound respected (cannot drop below minProducts) |
| 9.4 | Move up / down | Click ↑ or ↓ | Row swaps with neighbour; first row's ↑ disabled, last row's ↓ disabled |
| 9.5 | Per-product image upload | Drop image on a row's thumbnail | Image stores as data URL; renders in stage immediately |
| 9.6 | Per-product subfield edit | Type into name / price / etc. | Stage updates within debounce window |
| 9.7 | Import via Ounass button | Click ↧ on a row | Modal opens (see §11) |

## 10. Image upload

| # | Test | Steps | Expected |
|---|---|---|---|
| 10.1 | SVG-only fields reject raster | Drop a PNG into a `svgOnly` field | Rejection toast appears; existing logo unchanged |
| 10.2 | Raster fields accept JPG/PNG | Drop a JPG | Encoded as data URL; renders in preview |
| 10.3 | Background image replaces paper | Upload a backdrop on a themed template | Paper gradient fully replaced (not layered) |
| 10.4 | Clear button | Click × on an existing image | Image removes; falls back to text/default |
| 10.5 | Upload size cap | Drop a >5MB image | Image is auto-resized in `lib/image.ts`; localStorage quota respected |

## 11. Ounass Importer

| # | Test | Steps | Expected |
|---|---|---|---|
| 11.1 | Open dialog | Click ↧ on any product row | Modal opens with SKU input, "Network blocked? Paste manually" link |
| 11.2 | Direct fetch path (when CORS allows) | Enter SKU, click Import | Spinner → success card → image picker → "Use this product" writes fields |
| 11.3 | Direct fetch fails (Kasada/CORS) | Enter SKU, fetch blocked | Auto-falls into paste mode with error block + URL chip + OPEN/COPY buttons |
| 11.4 | Paste-fallback parses JSON | Paste valid JSON, click Parse JSON | Success card with name / brand / price / category / images |
| 11.5 | Image picker (multiple) | Response has 4 images | Grid of thumbnails; click to select; copper border + ✓ badge on selected |
| 11.6 | Image picker (single) | Response has 1 image | Auto-selected with "Single image" hint |
| 11.7 | No images in response | Edge-case payload | Info note: "imported without an image; you can add one yourself" |
| 11.8 | Broken image URL | CDN 404s | Each broken thumb shows "⚠ Couldn't load" placeholder, not an empty box |
| 11.9 | Field mapping | Confirm import | Product row populated with name / brand / price / category / image; unknown sub-fields untouched |
| 11.10 | Cancel | Click Cancel or press Esc | Modal closes; product row unchanged |

## 12. Gallery

| # | Test | Steps | Expected |
|---|---|---|---|
| 12.1 | All 14 cards render | Visit `/templates` | 14 cards in grid; each has name / description / duration / aspects / "USE TEMPLATE" |
| 12.2 | Category chips | Click "Lockup" | Grid filters to 3 templates (Stack, Pairing, Collab); count chip shows "3" |
| 12.3 | "All" restores | Click "All" | All 14 cards back; count chip shows "14" |
| 12.4 | Themed cards dual-preview | Hover a themed card | Both LIGHT and DARK halves animate together |
| 12.5 | Use template | Click button | New project created in localStorage; navigates to editor |
| 12.6 | Empty category | (Future-proof) filter to a bucket with 0 templates | "No templates in this category yet." message |

## 13. Project save / load / autosave

| # | Test | Steps | Expected |
|---|---|---|---|
| 13.1 | Autosave on edit | Change a text field | Saved hint flashes within 400ms |
| 13.2 | Reload preserves state | Edit, reload | Edit persists; aspect, theme, locale, scroll position match |
| 13.3 | Multiple projects | Create 3 projects | Each lists separately on dashboard with unique IDs |
| 13.4 | Delete project | Click × on dashboard card | Confirmation prompt; project removes; storage cleaned |
| 13.5 | Quota error | Fill localStorage past 5MB | "Storage full!" error pill in red; further saves throw a clear toast |

## 14. Aspect ratio switch

| # | Test | Steps | Expected |
|---|---|---|---|
| 14.1 | 9:16 → 4:5 | Click `4:5` | Stage dimensions update; layout reflows; no element clips |
| 14.2 | Themed templates use Y45 | 4:5 dark mode rendered at mid-keyframe | Composition fills full safe area (top:120 → bottom:1150 of 1350); not crammed in upper half |
| 14.3 | Aspect persists per project | Switch, reload | Reopens at saved aspect |

## 15. Safe-zone overlay

| # | Test | Steps | Expected |
|---|---|---|---|
| 15.1 | Toggle on | Click "Safe" | Dim strips render at top (250 on 9:16), bottom (300 on 9:16), right (120 on 9:16) |
| 15.2 | Toggle off | Click again | Strips disappear; composition unchanged |
| 15.3 | Export-ignore | Export with overlay on | Overlay does NOT appear in MP4 frames |
| 15.4 | 4:5 zones | Switch to 4:5 with overlay on | Strips re-render at top:120 / bottom:200; right:0 (no IG like-stack on Feed) |

## 16. Music layer + audio mix

| # | Test | Steps | Expected |
|---|---|---|---|
| 16.1 | Add audio empty state | Open project with no music | "Add audio" button in music lane |
| 16.2 | Pick from library | Open picker, select a track | Bronze music clip renders in lane; preview audio plays during stage playback |
| 16.3 | Volume slider | Open mix popover, lower volume | Audio attenuates in real-time |
| 16.4 | Trim handles | Drag in/out points | Clip resizes; preview respects trim |
| 16.5 | Music anchor | Drag clip horizontally on the lane | Music timing offsets in playback |

## 17. Export to MP4

| # | Test | Steps | Expected |
|---|---|---|---|
| 17.1 | Open modal | Click Export | Modal with format options (no duplicate audio controls) |
| 17.2 | Run export | Confirm | Progress bar; ffmpeg.wasm crunches frames |
| 17.3 | Download triggers | Export complete | Browser save prompt; file size 5-15MB depending on duration |
| 17.4 | Visual fidelity | Open the MP4 | Frame-perfect match with editor preview; no editor chrome (Aa buttons, Safe overlay, theme pill) baked in |
| 17.5 | Audio muxed | Project with music | Music plays in MP4 at the configured volume + trim + anchor |
| 17.6 | Cancel export | Press Cancel mid-export | Process stops; modal closes; no leftover blob |

---

## When test cases fail — the fix loop

1. Read the QC report carefully. The first failure usually reveals a pattern.
2. Reproduce locally. Don't fix what you can't see.
3. Fix at the lowest layer that makes sense — if it's component-shaped (BoutiqueLogo's missing prop), fix the component once, not 14 templates separately.
4. Re-run the affected QC section after the fix. Don't assume a related test still passes.
5. Update the test case if the fix changed the expected behavior.

This doc is the project's contract with itself. Keep it current.
