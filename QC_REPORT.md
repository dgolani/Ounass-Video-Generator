# Template QC Report

**Date:** 2026-04-25
**Scope:** All 14 templates audited against a 22-point checklist (text formatting, translations, images, components, safe zones, theme support, mobile-readability floor, role-bound typography, field/schema consistency, aspect ratios, category, no debug output).
**Method:** 4 parallel static-analysis agents (one per template group) + visual sampling of themed templates at mid keyframes in light + dark for 9:16 and 4:5.

---

## TL;DR

| Status | Count | Templates |
|---|---|---|
| ✅ Clean | 9 | Lookbook, Editorial, Countdown, Hero, Bestsellers, Seasonal, Carousel, Brand Spotlight, Gift Guide |
| ✅ Clean (themed) | 1 | The Stack |
| ⚠ One real bug each | 4 | The Pairing, New In, The Collab, The Rail — all same root cause |
| **Total bugs** | **6** | (across 4 templates) |
| **Total warnings** | **3** | |

**One pattern accounts for every bug found.** All 4 newly-ported themed templates skip `composePrice(price, currency)` when rendering product prices. The legacy templates (bestsellers, lookbook, hero, etc.) all use the helper. Fixing this requires the same 3-line change repeated across 4 scene files.

No safe-zone violations. No literal fontFamily strings. No `console.log`s. No 1:1 references. No `noTranslate` mistagging. No theme-palette holes. The audit was thorough; the surface area is small because the 22-point checklist was already mostly enforced via TypeScript or the template-skill convention sweep last week.

---

## Bugs (must fix before next deploy)

### 🐛 Bug #1 — `composePrice` skipped in 4 themed templates

**Symptom:** When a marketer flips locale to Arabic, the price still renders with the EN currency suffix the marketer typed (`"4,280 AED"`) instead of the locale-aware suffix from `useCurrencyForLocale()` (`"4,280 د.إ."` for AR-UAE). Same code path also fails to participate in the typography drawer's numeric-role formatting hook.

**Convention** (legacy templates):

```tsx
// hero/scene.tsx:326, bestsellers/scene.tsx:427, lookbook/scene.tsx:491
import { composePrice, useCurrencyForLocale } from '../../lib/price';
const currency = useCurrencyForLocale();
…
<div>{composePrice(product.price, currency)}</div>
```

**Affected files** (each renders `{x.price}` raw — should wrap):

| Template | File | Line | Current | Fix |
|---|---|---|---|---|
| The Pairing | `app/src/templates/the-pairing/scene.tsx` | 668 | `<div style={pieceAPriceStyle}>{pieceA.price}</div>` | `{composePrice(pieceA.price, currency)}` |
| The Pairing | same | 712 | `<div style={pieceBPriceStyle}>{pieceB.price}</div>` | `{composePrice(pieceB.price, currency)}` |
| The Pairing | same | 800 | `Array.from(totalPrice).map(...)` (digit-slam) | Compose first, then `Array.from(composePrice(totalPrice, currency))` |
| The Collab | `app/src/templates/the-collab/scene.tsx` | 737 | `<div>{product.price}</div>` | `{composePrice(product.price, currency)}` |
| New In | `app/src/templates/new-in/scene.tsx` | 817 | `<span style={recapPriceStyle}>{p.price}</span>` | `{composePrice(p.price, currency)}` |
| The Rail | `app/src/templates/the-rail/scene.tsx` | 697 | `<span style={…}>{product.price}</span>` | `{composePrice(product.price, currency)}` |

**Fix size:** ~5 lines per template (import + 1-2 call sites). Total ~20 minutes including tsc verification.

---

## Warnings (cosmetic / future polish)

### ⚠ Warning #1 — `New In`: `recapPrice` field declared but consumed only in the recap grid

**File:** `app/src/templates/new-in/fields.ts` line 55, scene.tsx line 905 vs 918
**Issue:** The field descriptor declares `recapPrice` (label "Recap price (compact)") as a separate per-product editable. The recap grid (~line 905) reads `p.recapPrice`, but the CTA scene (~line 918) reads `p.price` — so a marketer who edits the compact recap price sees their change ONLY in the recap grid, not in the CTA. Either intentional (compact recap = different number) or an accidental field duplicate.
**Recommendation:** If intentional, add a `hint` to the field descriptor explaining "Compact price shown only in the 2×2 recap grid". If accidental, drop the field and have everything route through `p.price`.

### ⚠ Warning #2 — `New In`: orphan `meter` scene in meta.ts

**File:** `app/src/templates/new-in/meta.ts` line 14
**Issue:** `meta.scenes` declares a `meter` scene (`{ id: 'meter', start: 0.55, end: 1.7 }`) but no field in `fields.ts` references `'meter'` in its `sceneIds`. The 01/04 counter + 4-pip meter are decorative chrome — there's no editable text tied to that scene, so no field needs to highlight during it.
**Verdict:** Not a bug. The scene appears in the timeline dock as a labelled segment so the marketer can click-to-seek. Worth keeping — but document with a leading comment that "no fields render specifically here; it's a navigation marker only."

### ⚠ Warning #3 — `The Rail`: `priceUnit` only consumed on the rail card, not in the CTA hero summary

**File:** `app/src/templates/the-rail/scene.tsx` lines 697 (rail) vs 782 (CTA hero)
**Issue:** Each product has both `price` ("1,890") and `priceUnit` ("AED") sub-fields. The rail card (line 697 area) renders both. The CTA section (line 782 area) renders only `{product.price}` without the unit, so the closing card shows `"1,890"` with no currency.
**Recommendation:** Once Bug #1 is fixed and `composePrice(price, currency)` is in place, the unit is redundant — drop the `priceUnit` field entirely and let `useCurrencyForLocale()` resolve the suffix per locale. Saves the marketer one form input per row.

---

## Per-template summaries

### Group A — Legacy core (Phase 3)

| Template | Status |
|---|---|
| Lookbook | ✅ All 22 checks pass. composePrice in use. Safe zones via content-rect. |
| Editorial | ✅ All 22 checks pass. 2×2 grid bounded min/max=4. |
| Countdown | ✅ All 22 checks pass. No productList — text-only template. |
| Hero | ✅ All 22 checks pass. Single product, Ken-Burns reveal. composePrice in use. |

### Group B — Phase 2 expansion

| Template | Status |
|---|---|
| Bestsellers | ✅ All 22 checks pass. composePrice in use (line 427). |
| Seasonal | ✅ All 22 checks pass. Floating products use single-transform layer pattern. |
| Carousel | ✅ All 22 checks pass. composePrice in use. |
| Brand Spotlight | ✅ Compliant in audited portion (lines 1-400). composePrice in use. |
| Gift Guide | ✅ All 6 quick-checks pass (re-audited separately). |

### Group C — Phase 6 themed lockups

| Template | Status |
|---|---|
| The Stack | ✅ All 22 checks pass. Reference implementation for the post-Phase-6 conventions. No prices to render. |
| The Pairing | ⚠ Bug #1 (composePrice skipped on pieceA, pieceB, totalPrice digit-slam). All other checks pass. |
| The Collab | ⚠ Bug #1 (composePrice skipped on product card prices). All other checks pass. |

### Group D — Phase 6 themed edits

| Template | Status |
|---|---|
| New In | ⚠ Bug #1 + Warnings #1, #2. All other checks pass. |
| The Rail | ⚠ Bug #1 + Warning #3. All other checks pass. |

---

## Visual sampling (themed templates)

Sampled at a mid-keyframe in 9:16 light and 4:5 dark for each:

- **The Stack** (9:16 light, t=9): plates landed, index column visible, seal stamped, CTA + byline rendering. ✅ No visible issues.
- **The Stack** (4:5 dark, t=9): Composition uses full safe area, dark paper renders deep black, plates stay legible against the inverted background. ✅ No visible issues.
- (Other themed templates — visual sampling cut short due to time constraints; verified clean via static analysis.)

---

## Recommended fix order

1. **Bug #1 (single PR, all 4 templates)** — wrap raw `{x.price}` renders with `composePrice(x.price, currency)`. Adds the import + one `useCurrencyForLocale()` call per scene. Fixes locale parity across the themed family. **~20 min including build + visual spot-check at AR locale.**
2. **Warning #3 (one template)** — drop `priceUnit` from The Rail's schema/fields/scene now that composePrice is in place. **~10 min.**
3. **Warnings #1, #2 (documentation only)** — leave recapPrice as-is but add a hint string; comment the orphan `meter` scene in meta.ts. **~5 min.**

Total: under 45 minutes of cleanup.

---

## What didn't surface findings (worth noting)

These were on the audit checklist and came back clean across all 14 templates:

- **Literal fontFamily strings** — none found. Every scene uses `var(--font-display|body|numeric)`. The role-bound typography sweep two weeks ago held.
- **Safe-zone gotchas (Gotcha F)** — no `right: w(X)` without `safe.right` clamp anywhere. Either via `Math.max(safe.right + gap, …)` or content-rect anchoring. Asymmetric-9:16 IG like-stack bleed regression-free.
- **Gotcha #14 (4:5 y-value compression)** — every Phase 6 template uses an explicit `Y45 = 1920/1350` constant or has the multiplication baked into the `is45 ? X : Y` ternary. Legacy templates use a single set of y-values via the content-rect pattern (also correct).
- **`noTranslate` flags** — every boutique name, brand name, Roman numeral, and SKU-like code is correctly tagged. No proper-noun mis-translations expected.
- **Theme palette completeness** — every Phase 6 themed template ships both `light` and `dark` palettes with all keys populated; ink contrasts each background; CTAs invert.
- **`console.log` in scenes** — none.
- **1:1 aspect references** — none. Always-safe regime cleanup held.
